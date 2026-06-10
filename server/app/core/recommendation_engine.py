import json
import logging
from dataclasses import dataclass

from app.core.ai_orchestrator import AIOrchestrator
from app.models.recommendation import RecommendationSeverity, RecommendationLevel

logger = logging.getLogger(__name__)

RECOMMENDATION_SYSTEM_PROMPT = """You are an expert observability engineer generating structured recommendations.
Given an analysis result, produce a JSON array of recommendations.
Each recommendation MUST be valid JSON with these exact fields:
- title: string (concise issue name)
- description: string (what is wrong and evidence)
- impact: string (quantified business/technical impact)
- severity: one of "critical", "high", "medium", "low"
- level: one of "descriptive", "prescriptive", "script"
- action: string or null (specific action to take, required for prescriptive/script)
- script: string or null (runnable script, only for level=script)
- script_type: one of "bash", "powershell", "terraform", null

Return ONLY the JSON array, no markdown, no explanation."""


@dataclass
class RawRecommendation:
    title: str
    description: str
    impact: str
    severity: RecommendationSeverity
    level: RecommendationLevel
    action: str | None
    script: str | None
    script_type: str | None


class RecommendationEngine:
    def __init__(self, orchestrator: AIOrchestrator):
        self.orchestrator = orchestrator

    async def generate(self, analysis_text: str, analysis_type: str) -> list[RawRecommendation]:
        """Generate structured recommendations from analysis text."""
        messages = [
            {"role": "system", "content": RECOMMENDATION_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": f"Analysis type: {analysis_type}\n\nAnalysis findings:\n{analysis_text}\n\nGenerate recommendations as JSON array.",
            },
        ]
        raw = await self.orchestrator.complete(messages=messages)
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            start = raw.find("[")
            end = raw.rfind("]") + 1
            data = json.loads(raw[start:end])

        return [
            RawRecommendation(
                title=r["title"],
                description=r["description"],
                impact=r["impact"],
                severity=RecommendationSeverity(r["severity"]),
                level=RecommendationLevel(r["level"]),
                action=r.get("action"),
                script=r.get("script"),
                script_type=r.get("script_type"),
            )
            for r in data
        ]
