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
        data = self._parse_json(raw)

        # Tolerate dict wrappers like {"recommendations": [...]} or {"items": [...]}.
        if isinstance(data, dict):
            for key in ("recommendations", "items", "results", "data"):
                if isinstance(data.get(key), list):
                    data = data[key]
                    break
            else:
                # Single recommendation object, not an array.
                data = [data]

        if not isinstance(data, list):
            logger.warning("Recommendation response was not a JSON array; got %s", type(data))
            return []

        recommendations: list[RawRecommendation] = []
        for r in data:
            if not isinstance(r, dict):
                continue
            title = r.get("title") or r.get("name")
            description = r.get("description") or r.get("detail") or ""
            if not title:
                # Skip items without a usable title rather than crashing.
                continue
            recommendations.append(
                RawRecommendation(
                    title=str(title),
                    description=str(description),
                    impact=str(r.get("impact") or ""),
                    severity=self._coerce_severity(r.get("severity")),
                    level=self._coerce_level(r.get("level")),
                    action=r.get("action"),
                    script=r.get("script"),
                    script_type=r.get("script_type"),
                )
            )
        return recommendations

    @staticmethod
    def _parse_json(raw: str):
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            pass
        # Try to extract an array first, then an object.
        for open_ch, close_ch in (("[", "]"), ("{", "}")):
            start = raw.find(open_ch)
            end = raw.rfind(close_ch) + 1
            if start != -1 and end > start:
                try:
                    return json.loads(raw[start:end])
                except json.JSONDecodeError:
                    continue
        logger.warning("Could not parse recommendation JSON from model output")
        return []

    @staticmethod
    def _coerce_severity(value) -> RecommendationSeverity:
        try:
            return RecommendationSeverity(str(value).lower())
        except ValueError:
            return RecommendationSeverity.MEDIUM

    @staticmethod
    def _coerce_level(value) -> RecommendationLevel:
        try:
            return RecommendationLevel(str(value).lower())
        except ValueError:
            return RecommendationLevel.DESCRIPTIVE
