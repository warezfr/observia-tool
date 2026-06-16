"""Outbound notifications (generic webhook + Slack) for analysis events."""
import logging

import httpx

from app.db.database import AsyncSessionLocal
from app.db.repositories import IntegrationRepository

logger = logging.getLogger(__name__)


async def notify_analysis_complete(
    analysis_id: int, analysis_type: str, status: str, recommendations: int
) -> None:
    """Send a notification to all enabled integrations. Best-effort; never raises."""
    text = (
        f"Observia: {analysis_type} analysis #{analysis_id} finished with status "
        f"'{status}' ({recommendations} recommendations)."
    )
    try:
        async with AsyncSessionLocal() as db:
            integrations = await IntegrationRepository(db).get_enabled()
    except Exception as exc:  # noqa: BLE001
        logger.warning("Could not load integrations for notifications: %s", exc)
        return

    if not integrations:
        return

    async with httpx.AsyncClient(timeout=10.0) as client:
        for integ in integrations:
            url = (integ.config or {}).get("url")
            if not url:
                continue
            try:
                if integ.kind == "slack":
                    await client.post(url, json={"text": text})
                else:  # generic webhook
                    await client.post(
                        url,
                        json={
                            "event": "analysis.complete",
                            "analysis_id": analysis_id,
                            "analysis_type": analysis_type,
                            "status": status,
                            "recommendations": recommendations,
                            "message": text,
                        },
                    )
            except Exception as exc:  # noqa: BLE001
                logger.warning("Notification to %s failed: %s", integ.kind, exc)
