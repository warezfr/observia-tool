import logging
from app.core.agent_executor import AgentExecutor, AgentResult
from app.core.ai_orchestrator import AIOrchestrator, AIProviderConfig, AIProviderType
from app.core.mcp_client import MCPClient
from app.core.recommendation_engine import RecommendationEngine
from app.db.database import get_db, RecommendationDB
from app.db.repositories import EnvironmentRepository, AIProviderRepository, AnalysisRepository
from app.models.analysis import AnalysisStatus
from app.plugins import get_plugin
from app.plugins.base import AnalysisContext

logger = logging.getLogger(__name__)


async def run_analysis(analysis_id: int) -> None:
    """Execute a complete analysis workflow."""
    async for db in get_db():
        env_repo = EnvironmentRepository(db)
        provider_repo = AIProviderRepository(db)
        analysis_repo = AnalysisRepository(db)

        analysis = await analysis_repo.get_by_id(analysis_id)
        if not analysis:
            logger.error(f"Analysis {analysis_id} not found")
            return

        await analysis_repo.update_status(analysis_id, AnalysisStatus.RUNNING)

        try:
            env = await env_repo.get_by_id(analysis.environment_id)
            provider_db = await provider_repo.get_by_id(analysis.ai_provider_id)

            token = env_repo.get_token(env)
            api_key = provider_repo.get_api_key(provider_db)

            provider_config = AIProviderConfig(
                provider_type=AIProviderType(provider_db.provider_type),
                model=provider_db.model,
                api_key=api_key,
                endpoint=provider_db.endpoint,
                extra_config=provider_db.extra_config or {},
            )
            orchestrator = AIOrchestrator(providers=[provider_config])
            mcp_client = MCPClient(url=env.url, token=token, env_type=env.env_type)

            await mcp_client.connect()

            plugin = get_plugin(analysis.analysis_type)
            ctx = AnalysisContext(
                environment_url=env.url,
                environment_type=env.env_type,
                time_range_hours=analysis.time_range_hours,
                parameters=analysis.parameters or {},
            )
            system_prompt, user_prompt = plugin.build_prompts(ctx)

            executor = AgentExecutor(orchestrator=orchestrator, mcp_client=mcp_client)
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
            await mcp_client.disconnect()

        except Exception as e:
            logger.exception(f"Analysis {analysis_id} failed: {e}")
            await analysis_repo.update_status(analysis_id, AnalysisStatus.FAILED, error_message=str(e))
