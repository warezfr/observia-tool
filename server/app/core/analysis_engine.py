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
                provider_type=AIProviderType(provider_db.provider_type),
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
                        provider_type=AIProviderType(p.provider_type),
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

            await analysis_repo.update_status(
                analysis_id,
                AnalysisStatus.COMPLETED,
                result={"summary": agent_result.final_answer, "raw_data": agent_result.raw_data},
                reasoning_steps=[
                    {"type": s.step_type, "content": s.content, "tool": s.tool_name}
                    for s in agent_result.reasoning_steps
                ],
            )
            metrics.increment("analysis_completed")
            await tools_client.disconnect()

        except Exception as e:
            logger.exception(f"Analysis {analysis_id} failed: {e}")
            await analysis_repo.update_status(analysis_id, AnalysisStatus.FAILED, error_message=str(e))
            metrics.increment("analysis_failed")
