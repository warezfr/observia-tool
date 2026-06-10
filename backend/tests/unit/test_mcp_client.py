"""Unit tests for MCP client."""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from app.core.mcp_client import MCPClient, MCPConnectionError, _connection_pool


class TestMCPClient:
    """Tests for MCPClient class."""

    def test_is_connected_returns_false_for_new_client(self):
        """Test that is_connected() returns False for a new client."""
        client = MCPClient(url="https://example.com", token="test", env_type="saas")
        assert client.is_connected() is False

    def test_is_connected_returns_true_when_session_exists(self):
        """Test that is_connected() returns True when _session is set."""
        client = MCPClient(url="https://example.com", token="test", env_type="saas")
        client._session = MagicMock()  # Simulate active session
        assert client.is_connected() is True

    @pytest.mark.asyncio
    async def test_get_from_pool_returns_same_instance_for_same_url(self):
        """Test that get_from_pool returns the same instance for identical URLs."""
        url = "https://test.example.com"
        token = "test_token"
        env_type = "saas"

        # Clear pool to ensure clean test
        _connection_pool.clear()

        # Get first instance
        client1 = await MCPClient.get_from_pool(url, token, env_type)

        # Get second instance for same URL
        client2 = await MCPClient.get_from_pool(url, token, env_type)

        # They should be the same instance
        assert client1 is client2

        # Verify it's in the pool
        assert url in _connection_pool

        # Cleanup
        _connection_pool.clear()

    @pytest.mark.asyncio
    async def test_get_from_pool_returns_different_instances_for_different_urls(self):
        """Test that get_from_pool returns different instances for different URLs."""
        url1 = "https://test1.example.com"
        url2 = "https://test2.example.com"
        token = "test_token"
        env_type = "saas"

        # Clear pool
        _connection_pool.clear()

        client1 = await MCPClient.get_from_pool(url1, token, env_type)
        client2 = await MCPClient.get_from_pool(url2, token, env_type)

        # They should be different instances
        assert client1 is not client2

        # Cleanup
        _connection_pool.clear()

    @pytest.mark.asyncio
    async def test_reconnect_disconnects_and_connects(self):
        """Test that reconnect properly disconnects and reconnects."""
        client = MCPClient(url="https://example.com", token="test", env_type="saas")
        client._session = MagicMock()

        with patch.object(client, "disconnect", new_callable=AsyncMock) as mock_disconnect, \
             patch.object(client, "connect", new_callable=AsyncMock) as mock_connect:
            mock_connect.return_value = True

            result = await client.reconnect()

            mock_disconnect.assert_called_once()
            mock_connect.assert_called_once()
            assert result is True

    @pytest.mark.asyncio
    async def test_call_tool_with_timeout(self):
        """Test that call_tool respects timeout parameter."""
        client = MCPClient(url="https://example.com", token="test", env_type="saas")

        mock_session = MagicMock()
        mock_session.call_tool = AsyncMock(return_value=MagicMock(content="result"))
        client._session = mock_session

        result = await client.call_tool("test_tool", {"arg": "value"}, timeout=5.0)

        mock_session.call_tool.assert_called_once_with("test_tool", {"arg": "value"})
        assert result == "result"

    @pytest.mark.asyncio
    async def test_call_tool_raises_when_not_connected(self):
        """Test that call_tool raises MCPConnectionError when not connected."""
        client = MCPClient(url="https://example.com", token="test", env_type="saas")
        client._session = None

        with pytest.raises(MCPConnectionError, match="Not connected"):
            await client.call_tool("test_tool", {})

    @pytest.mark.asyncio
    async def test_disconnect_removes_from_pool(self):
        """Test that disconnect removes the client from the connection pool."""
        url = "https://example.com"
        client = MCPClient(url=url, token="test", env_type="saas")
        _connection_pool[url] = client

        await client.disconnect()

        assert url not in _connection_pool

        # Cleanup
        _connection_pool.clear()
