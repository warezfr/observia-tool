import asyncio
import logging
from dataclasses import dataclass, field
from typing import Any
from urllib.parse import urlparse, urlunparse

logger = logging.getLogger(__name__)


class MCPConnectionError(Exception):
    """Raised when MCP connection fails."""
    pass


# Connection pool: URL -> MCPClient instance
_connection_pool: dict[str, "MCPClient"] = {}
_pool_lock = asyncio.Lock()


@dataclass
class MCPClient:
    """Client for connecting to Dynatrace MCP servers (SaaS or Managed).

    Supports connection pooling, reconnection, and concurrent access protection.
    """
    url: str
    token: str
    platform_token: str | None = None
    env_type: str  # "saas" or "managed"
    timeout: int = 30
    max_retries: int = 3
    _session: Any = field(default=None, init=False, repr=False)
    _lock: asyncio.Lock = field(default_factory=asyncio.Lock, init=False, repr=False)

    async def connect(self) -> bool:
        """Establish connection to MCP server with retry logic."""
        async with self._lock:
            for attempt in range(self.max_retries):
                try:
                    await self._connect_mcp()
                    logger.info(f"MCP connected to {self.url}")
                    return True
                except Exception as e:
                    logger.warning(f"MCP connect attempt {attempt+1}/{self.max_retries} failed: {e}")
                    if attempt < self.max_retries - 1:
                        await asyncio.sleep(2 ** attempt)
            raise MCPConnectionError(
                f"Failed to connect to MCP at {self.url} after {self.max_retries} attempts"
            )

    async def _connect_mcp(self) -> dict:
        """Internal method to connect to MCP server via stdio.

        Uses the Dynatrace MCP server via npx (stdio).

        Dynatrace distinguishes between:
        - Platform URL: https://<env>.apps.dynatrace.com (platform services / MCP server)
        - Classic environment URL: https://<env>.live.dynatrace.com (classic environment APIs)

        The Dynatrace MCP server expects the Platform URL (apps.*).
        """
        from mcp import ClientSession, StdioServerParameters
        from mcp.client.stdio import stdio_client

        def _normalize_platform_url(url: str) -> str:
            # Trim whitespace and trailing slash
            u = url.strip().rstrip("/")
            parsed = urlparse(u)
            if not parsed.scheme:
                # assume https if user entered host only
                parsed = urlparse("https://" + u)

            host = (parsed.hostname or "").lower()
            if host.endswith(".live.dynatrace.com"):
                host = host.replace(".live.dynatrace.com", ".apps.dynatrace.com")

            # preserve explicit port if present
            netloc = host
            if parsed.port:
                netloc = f"{host}:{parsed.port}"

            return urlunparse((parsed.scheme, netloc, "", "", "", ""))

        try:
            # Use official Dynatrace MCP server package
            package = "@dynatrace-oss/dynatrace-mcp-server@latest"

            platform_url = _normalize_platform_url(self.url) if self.env_type == "saas" else self.url.strip().rstrip("/")
            env: dict[str, str] = {
                "DT_ENVIRONMENT": platform_url,
                # Ensure node is discoverable for scripts using /usr/bin/env node
                "PATH": "/usr/local/bin:/usr/local/sbin:/usr/sbin:/usr/bin:/sbin:/bin",
                # Headless/container friendly token storage
                "DT_MCP_TOKEN_STORAGE": "file",
                "HOME": "/app/data",
                "XDG_CONFIG_HOME": "/app/data/.config",
            }
            # Token routing:
            # - dt0s16.* platform tokens → DT_PLATFORM_TOKEN
            # - dt0c01.* classic API tokens → DT_API_TOKEN
            api_token = (self.token or "").strip()
            if api_token:
                env["DT_API_TOKEN"] = api_token

            plat = (self.platform_token or "").strip() if self.platform_token else ""
            if plat:
                env["DT_PLATFORM_TOKEN"] = plat

            server_params = StdioServerParameters(
                # Use absolute path to avoid PATH issues under supervisor/uvicorn
                command="/usr/local/bin/npx",
                args=["-y", package],
                env=env,
            )

            # Use context manager to properly manage stdio streams lifecycle
            stdio_cm = stdio_client(server_params)
            read, write = await stdio_cm.__aenter__()
            session = ClientSession(read, write)
            await session.initialize()
            self._session = session
            self._stdio_cm = stdio_cm  # Store for proper cleanup
            return {"status": "connected"}
        except ImportError as e:
            raise MCPConnectionError(f"MCP package not available: {e}")
        except Exception as e:
            raise MCPConnectionError(f"Failed to establish MCP connection: {e}")

    async def call_tool(self, tool_name: str, arguments: dict, timeout: float | None = None) -> Any:
        """Call an MCP tool and return its result.

        Args:
            tool_name: Name of the tool to call.
            arguments: Arguments to pass to the tool.
            timeout: Optional timeout in seconds for the tool call.
        """
        if not self._session:
            raise MCPConnectionError("Not connected. Call connect() first.")

        tool_coro = self._session.call_tool(tool_name, arguments)
        if timeout:
            result = await asyncio.wait_for(tool_coro, timeout=timeout)
        else:
            result = await tool_coro
        return result.content

    async def list_tools(self) -> list[dict]:
        """List all available tools from the MCP server."""
        if not self._session:
            raise MCPConnectionError("Not connected")
        result = await self._session.list_tools()
        return [{"name": t.name, "description": t.description} for t in result.tools]

    async def disconnect(self) -> None:
        """Close the MCP connection and cleanup resources."""
        async with self._lock:
            self._session = None
            # Properly close the stdio context manager
            if hasattr(self, '_stdio_cm') and self._stdio_cm is not None:
                await self._stdio_cm.__aexit__(None, None, None)
                self._stdio_cm = None
            # Remove from pool if present
            async with _pool_lock:
                if self.url in _connection_pool:
                    del _connection_pool[self.url]

    def is_connected(self) -> bool:
        """Check if the client is currently connected.

        Returns:
            True if _session is not None, False otherwise.
        """
        return self._session is not None

    async def reconnect(self) -> bool:
        """Reconnect to the MCP server.

        Disconnects first if already connected, then establishes a new connection.

        Returns:
            True if reconnection successful.
        """
        await self.disconnect()
        return await self.connect()

    @classmethod
    async def get_from_pool(
        cls, url: str, token: str, env_type: str, platform_token: str | None = None
    ) -> "MCPClient":
        """Get or create an MCPClient from the connection pool.

        Args:
            url: The MCP server URL.
            token: Authentication token.
            env_type: "saas" or "managed".

        Returns:
            MCPClient instance for the given URL (reused if already in pool).
        """
        async with _pool_lock:
            if url in _connection_pool:
                client = _connection_pool[url]
                logger.debug(f"Reusing pooled MCP connection for {url}")
                return client

            client = cls(url=url, token=token, platform_token=platform_token, env_type=env_type)
            _connection_pool[url] = client
            logger.debug(f"Created new MCP connection for {url}")
            return client
