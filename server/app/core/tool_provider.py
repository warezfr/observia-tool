from typing import Any, Protocol


class ToolProvider(Protocol):
    async def list_tools(self) -> list[dict]:
        ...

    async def call_tool(self, tool_name: str, arguments: dict, timeout: float | None = None) -> Any:
        ...

    async def disconnect(self) -> None:
        ...

