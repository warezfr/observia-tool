import hashlib
import json
import logging
from dataclasses import dataclass
from typing import Any
from urllib.parse import urljoin, urlparse, urlunparse

import httpx

from app.core.cache import get_cache_manager

logger = logging.getLogger(__name__)


def normalize_classic_url(url: str) -> str:
    """Return the classic Environment API base URL.

    Dynatrace SaaS classic APIs live on *.live.dynatrace.com, while the platform
    URL is *.apps.dynatrace.com. Managed/other URLs are returned as-is (trimmed).
    """
    u = (url or "").strip().rstrip("/")
    parsed = urlparse(u)
    if not parsed.scheme:
        parsed = urlparse("https://" + u)

    host = (parsed.hostname or "").lower()
    if host.endswith(".apps.dynatrace.com"):
        host = host.replace(".apps.dynatrace.com", ".live.dynatrace.com")

    netloc = host
    if parsed.port:
        netloc = f"{host}:{parsed.port}"
    return urlunparse((parsed.scheme or "https", netloc, "", "", "", ""))


@dataclass
class DynatraceApiToolProvider:
    """Tool provider for Dynatrace Managed via Environment API v2 (direct HTTP).

    Design decision (Managed + MCP): the official ``@dynatrace-oss/dynatrace-mcp-server``
    targets Grail/DQL on SaaS Platform tokens and requires interactive OAuth that
    cannot run headless in this container. For Managed clusters (and SaaS without a
    platform token) we therefore use this direct Environment API v2 provider, which
    is fully supported on both ``*.live.dynatrace.com`` and ``/e/{env-id}`` Managed
    URLs. Responses are cached (short TTL) to reduce latency and API consumption.
    """

    base_url: str
    api_token: str
    timeout: float = 30.0
    cache_ttl: int = 300

    def _cache_key(self, tool_name: str, arguments: dict) -> str:
        raw = json.dumps(
            {"u": self.base_url, "t": tool_name, "a": arguments},
            sort_keys=True,
            default=str,
        )
        return "dt:" + hashlib.sha256(raw.encode()).hexdigest()

    async def list_tools(self) -> list[dict]:
        # Minimal curated tools for managed. Descriptions are used by the LLM.
        return [
            {
                "name": "list_problems",
                "description": "List problems from Dynatrace Environment API v2 (/api/v2/problems). Args: relativeTime (e.g. 'hour', 'day') optional.",
            },
            {
                "name": "get_problem_details",
                "description": "Get problem details from Dynatrace Environment API v2 (/api/v2/problems/{problem_id}). Args: problem_id (string).",
            },
            {
                "name": "query_metrics",
                "description": "Query metrics from Dynatrace Environment API v2 (/api/v2/metrics/query). Args: metricSelector (string), from (string), to (string), resolution (string) optional.",
            },
            {
                "name": "list_entities",
                "description": "List entities from Dynatrace Environment API v2 (/api/v2/entities). Args: entitySelector (string) optional, pageSize (int) optional.",
            },
        ]

    async def call_tool(
        self, tool_name: str, arguments: dict, timeout: float | None = None
    ) -> Any:
        t = timeout or self.timeout
        headers = {"Authorization": f"Api-Token {self.api_token}", "Accept": "application/json"}

        # All Environment API v2 tools here are read-only GETs: cache responses
        # with a short TTL to cut latency and API consumption during an analysis.
        cache_key = self._cache_key(tool_name, arguments)
        try:
            cache = get_cache_manager()
            cached = cache.get(cache_key)
            if cached is not None:
                logger.debug("Dynatrace cache hit for %s", tool_name)
                return cached
        except Exception as exc:  # noqa: BLE001
            cache = None
            logger.debug("Cache unavailable: %s", exc)

        def _u(path: str) -> str:
            return urljoin(self.base_url.rstrip("/") + "/", path.lstrip("/"))

        def _store(value: Any) -> Any:
            if cache is not None:
                try:
                    cache.set(cache_key, value, ttl=self.cache_ttl)
                except Exception:  # noqa: BLE001
                    pass
            return value

        async with httpx.AsyncClient(timeout=t) as client:
            if tool_name == "list_problems":
                params = {}
                if arguments.get("relativeTime"):
                    params["relativeTime"] = arguments["relativeTime"]
                resp = await client.get(_u("/api/v2/problems"), headers=headers, params=params)
                resp.raise_for_status()
                return _store(resp.json())

            if tool_name == "get_problem_details":
                pid = arguments.get("problem_id") or arguments.get("id")
                if not pid:
                    raise ValueError("problem_id is required")
                resp = await client.get(_u(f"/api/v2/problems/{pid}"), headers=headers)
                resp.raise_for_status()
                return _store(resp.json())

            if tool_name == "query_metrics":
                metric_selector = arguments.get("metricSelector") or arguments.get("metric_selector")
                if not metric_selector:
                    raise ValueError("metricSelector is required")
                params = {"metricSelector": metric_selector}
                for k in ("from", "to", "resolution"):
                    if arguments.get(k) is not None:
                        params[k] = arguments[k]
                resp = await client.get(_u("/api/v2/metrics/query"), headers=headers, params=params)
                resp.raise_for_status()
                return _store(resp.json())

            if tool_name == "list_entities":
                params = {}
                if arguments.get("entitySelector"):
                    params["entitySelector"] = arguments["entitySelector"]
                if arguments.get("pageSize"):
                    params["pageSize"] = arguments["pageSize"]
                resp = await client.get(_u("/api/v2/entities"), headers=headers, params=params)
                resp.raise_for_status()
                return _store(resp.json())

        raise ValueError(f"Unknown tool: {tool_name}")

    async def disconnect(self) -> None:
        return None

