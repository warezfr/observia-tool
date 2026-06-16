import logging
from app.core.agent_executor import AgentExecutor, AgentResult
from app.core.ai_orchestrator import AIOrchestrator, AIProviderConfig, AIProviderType
from app.core.dt_api_tools import DynatraceApiToolProvider, normalize_classic_url
from app.core.mcp_client import MCPClient
from app.core.metrics import metrics
from app.core.recommendation_engine import RecommendationEngine
from app.db.database import AsyncSessionLocal, RecommendationDB
from app.db.repositories import EnvironmentRepository, AIProviderRepository, AnalysisRepository
from app.models.analysis import AnalysisStatus
from app.plugins import get_plugin
from app.plugins.base import AnalysisContext

logger = logging.getLogger(__name__)


def _is_usable_result(entry: dict) -> bool:
    """A raw_data entry is usable if the tool succeeded and returned non-empty data."""
    if "error" in entry:
        return False
    result = entry.get("result")
    if result is None:
        return False
    if isinstance(result, (list, dict, str)) and len(result) == 0:
        return False
    return True


def _assess_completeness(plugin, raw_data: list[dict]) -> dict:
    """Check whether the analysis gathered the minimal data its plugin requires.

    Returns a dict with ``complete`` (bool), ``missing`` (list of tool names that
    produced no usable data) and ``satisfied`` (list of tools that did).
    """
    required = set(getattr(plugin, "required_signals", lambda: [])())
    satisfied = {
        entry.get("tool")
        for entry in (raw_data or [])
        if _is_usable_result(entry) and entry.get("tool") in required
    }
    missing = sorted(required - satisfied)
    # Complete when every required signal yielded data (or nothing was required).
    return {
        "complete": len(missing) == 0,
        "missing": missing,
        "satisfied": sorted(s for s in satisfied if s),
        "required": sorted(required),
    }


async def run_analysis(analysis_id: int) -> None:
    """Execute a complete analysis workflow."""
    # Use the app's sessionmaker (expire_on_commit=False) to avoid attribute
    # expiration/lazy-load IO that can trigger MissingGreenlet in background tasks.
    async with AsyncSessionLocal() as db:
        env_repo = EnvironmentRepository(db)
        provider_repo = AIProviderRepository(db)
        analysis_repo = AnalysisRepository(db)

        analysis = await analysis_repo.get_by_id(analysis_id)
        if not analysis:
            logger.error(f"Analysis {analysis_id} not found")
            return

        metrics.increment("analysis_total")
        await analysis_repo.update_status(analysis_id, AnalysisStatus.RUNNING)

        tools_client = None
        try:
            # Read IDs eagerly to avoid touching ORM attributes after commits.
            environment_id = analysis.environment_id
            ai_provider_id = analysis.ai_provider_id

            env = await env_repo.get_by_id(environment_id)
            provider_db = await provider_repo.get_by_id(ai_provider_id)

            token = env_repo.get_token(env)
            platform_token = env_repo.get_platform_token(env)
            api_key = provider_repo.get_api_key(provider_db)

            selected_provider = AIProviderConfig(
                provider_type=AIProviderType.from_db_value(provider_db.provider_type),
                model=provider_db.model,
                api_key=api_key,
                endpoint=provider_db.endpoint,
                extra_config=provider_db.extra_config or {},
            )

            # Build fallback chain: selected provider first, then others by fallback_order.
            all_providers_db = await provider_repo.get_all()
            providers: list[AIProviderConfig] = [selected_provider]
            for p in all_providers_db:
                if p.id == provider_db.id:
                    continue
                providers.append(
                    AIProviderConfig(
                        provider_type=AIProviderType.from_db_value(p.provider_type),
                        model=p.model,
                        api_key=provider_repo.get_api_key(p),
                        endpoint=p.endpoint,
                        extra_config=p.extra_config or {},
                    )
                )
            orchestrator = AIOrchestrator(providers=providers)

            # Tool provider selection:
            # - SaaS WITH a platform token (dt0s) -> official Dynatrace MCP (Grail/DQL).
            # - SaaS WITHOUT a platform token (only a classic dt0c token) -> direct
            #   Environment API v2 on the *.live host (MCP would otherwise require
            #   interactive OAuth, which cannot run headless in the container).
            # - Managed -> direct Environment API v2 on the cluster URL.
            use_mcp = env.env_type == "saas" and bool(platform_token)
            if use_mcp:
                tools_client = MCPClient(
                    url=env.url,
                    token=token,
                    platform_token=platform_token,
                    env_type=env.env_type,
                )
                await tools_client.connect()
                logger.info("Using Dynatrace MCP tool provider")
            else:
                base_url = normalize_classic_url(env.url) if env.env_type == "saas" else env.url
                tools_client = DynatraceApiToolProvider(base_url=base_url, api_token=token)
                logger.info(f"Using Dynatrace Environment API tool provider at {base_url}")

            plugin = get_plugin(analysis.analysis_type)
            ctx = AnalysisContext(
                environment_url=env.url,
                environment_type=env.env_type,
                time_range_hours=analysis.time_range_hours,
                parameters=analysis.parameters or {},
            )
            system_prompt, user_prompt = plugin.build_prompts(ctx)

            async def _on_step(steps):
                await analysis_repo.update_progress(
                    analysis_id,
                    [{"type": s.step_type, "content": s.content, "tool": s.tool_name} for s in steps],
                )

            executor = AgentExecutor(orchestrator=orchestrator, mcp_client=tools_client, on_step=_on_step)
            agent_result: AgentResult = await executor.run(system_prompt, user_prompt)

            # Completeness validation: ensure the agent actually retrieved the
            # minimal data the plugin requires; otherwise flag the report partial.
            completeness = _assess_completeness(plugin, agent_result.raw_data)

            rec_engine = RecommendationEngine(orchestrator=orchestrator)
            recommendations = await rec_engine.generate(
                analysis_text=agent_result.final_answer,
                analysis_type=analysis.analysis_type,
            )

            for rec in recommendations:
                db.add(RecommendationDB(
                    analysis_id=analysis_id,
                    title=rec.title,
                    description=rec.description,
                    impact=rec.impact,
                    level=rec.level.value,
                    severity=rec.severity.value,
                    action=rec.action,
                    script=rec.script,
                    script_type=rec.script_type,
                ))
            await db.commit()

            final_status = (
                AnalysisStatus.COMPLETED if completeness["complete"] else AnalysisStatus.PARTIAL
            )
            await analysis_repo.update_status(
                analysis_id,
                final_status,
                result={
                    "summary": agent_result.final_answer,
                    "raw_data": agent_result.raw_data,
                    "completeness": completeness,
                },
                reasoning_steps=[
                    {"type": s.step_type, "content": s.content, "tool": s.tool_name}
                    for s in agent_result.reasoning_steps
                ],
            )
            metrics.increment("analysis_completed")

            try:
                from app.core.notifications import notify_analysis_complete

                await notify_analysis_complete(
                    analysis_id,
                    analysis.analysis_type,
                    final_status.value,
                    len(recommendations),
                )
            except Exception as exc:  # noqa: BLE001
                logger.warning("Notification dispatch failed for %s: %s", analysis_id, exc)

        except Exception as e:
            logger.exception(f"Analysis {analysis_id} failed: {e}")
            await analysis_repo.update_status(analysis_id, AnalysisStatus.FAILED, error_message=str(e))
            metrics.increment("analysis_failed")
        finally:
            if tools_client is not None and hasattr(tools_client, "disconnect"):
                try:
                    await tools_client.disconnect()
                except Exception as exc:  # noqa: BLE001
                    logger.warning("MCP disconnect failed for analysis %s: %s", analysis_id, exc)
