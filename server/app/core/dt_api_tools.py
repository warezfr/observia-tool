import json
from dataclasses import dataclass
from typing import Any
from urllib.parse import urljoin

import httpx


@dataclass
class DynatraceApiToolProvider:
    """Tool provider for Dynatrace Managed via Environment API v2 (direct HTTP)."""

    base_url: str
    api_token: str
    timeout: float = 30.0

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

        def _u(path: str) -> str:
            return urljoin(self.base_url.rstrip("/") + "/", path.lstrip("/"))

        async with httpx.AsyncClient(timeout=t) as client:
            if tool_name == "list_problems":
                params = {}
                if arguments.get("relativeTime"):
                    params["relativeTime"] = arguments["relativeTime"]
                resp = await client.get(_u("/api/v2/problems"), headers=headers, params=params)
                resp.raise_for_status()
                return resp.json()

            if tool_name == "get_problem_details":
                pid = arguments.get("problem_id") or arguments.get("id")
                if not pid:
                    raise ValueError("problem_id is required")
                resp = await client.get(_u(f"/api/v2/problems/{pid}"), headers=headers)
                resp.raise_for_status()
                return resp.json()

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
                return resp.json()

            if tool_name == "list_entities":
                params = {}
                if arguments.get("entitySelector"):
                    params["entitySelector"] = arguments["entitySelector"]
                if arguments.get("pageSize"):
                    params["pageSize"] = arguments["pageSize"]
                resp = await client.get(_u("/api/v2/entities"), headers=headers, params=params)
                resp.raise_for_status()
                return resp.json()

        raise ValueError(f"Unknown tool: {tool_name}")

    async def disconnect(self) -> None:
        return None

