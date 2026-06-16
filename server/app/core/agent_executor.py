import json
import logging
from dataclasses import dataclass, field
from typing import Awaitable, Callable

from app.core.ai_orchestrator import AIOrchestrator
from app.core.mcp_client import MCPClient

logger = logging.getLogger(__name__)

MAX_ITERATIONS = 15


@dataclass
class ReasoningStep:
    """Single step in the agent's reasoning process."""
    step_type: str  # "tool_call" | "tool_result" | "thinking"
    content: str
    tool_name: str | None = None
    tool_args: dict | None = None


@dataclass
class AgentResult:
    """Final result from agent execution."""
    final_answer: str
    reasoning_steps: list[ReasoningStep]
    raw_data: list[dict] = field(default_factory=list)


@dataclass
class AgentExecutor:
    """Execute AI agent with MCP tools access."""
    orchestrator: AIOrchestrator
    mcp_client: MCPClient
    on_step: Callable[[list["ReasoningStep"]], Awaitable[None]] | None = None

    async def run(self, system_prompt: str, user_prompt: str) -> AgentResult:
        """Run agent with MCP tools until completion or max iterations."""
        mcp_tools = await self.mcp_client.list_tools()
        tools_schema = [
            {
                "type": "function",
                "function": {
                    "name": t["name"],
                    "description": t["description"],
                    "parameters": {
                        "type": "object",
                        "properties": {},
                        "additionalProperties": True
                    },
                },
            }
            for t in mcp_tools
        ]

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]
        reasoning_steps: list[ReasoningStep] = []
        raw_data: list[dict] = []

        for iteration in range(MAX_ITERATIONS):
            response = await self.orchestrator.complete_with_tools(messages, tools_schema)

            if not response["tool_calls"]:
                return AgentResult(
                    final_answer=response["content"] or "",
                    reasoning_steps=reasoning_steps,
                    raw_data=raw_data,
                )

            messages.append({
                "role": "assistant",
                "content": response["content"],
                "tool_calls": response["tool_calls"]
            })

            for tool_call in response["tool_calls"]:
                tool_name = tool_call.function.name
                raw_args = (tool_call.function.arguments or "").strip()
                try:
                    tool_args = json.loads(raw_args) if raw_args else {}
                except (json.JSONDecodeError, ValueError):
                    tool_args = {}
                if not isinstance(tool_args, dict):
                    tool_args = {}

                reasoning_steps.append(ReasoningStep(
                    step_type="tool_call",
                    content=f"Calling {tool_name}",
                    tool_name=tool_name,
                    tool_args=tool_args,
                ))
                if self.on_step:
                    await self.on_step(reasoning_steps)

                try:
                    tool_result = await self.mcp_client.call_tool(tool_name, tool_args)
                    result_str = json.dumps(tool_result) if not isinstance(tool_result, str) else tool_result
                    raw_data.append({"tool": tool_name, "args": tool_args, "result": tool_result})
                except Exception as exc:  # noqa: BLE001 - feed tool errors back to the LLM
                    logger.warning("Tool %s failed: %s", tool_name, exc)
                    result_str = json.dumps({"error": str(exc)})
                    raw_data.append({"tool": tool_name, "args": tool_args, "error": str(exc)})

                reasoning_steps.append(ReasoningStep(
                    step_type="tool_result",
                    content=result_str[:2000],
                    tool_name=tool_name,
                ))
                if self.on_step:
                    await self.on_step(reasoning_steps)

                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": result_str,
                })

        return AgentResult(
            final_answer="Analysis incomplete: max iterations reached",
            reasoning_steps=reasoning_steps,
            raw_data=raw_data,
        )
