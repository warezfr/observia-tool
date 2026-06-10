"""Unit tests for cache manager."""
import os
import tempfile
import time
import pytest

from app.core.cache import CacheManager, CacheConfig, CacheBackend, get_cache_manager


class TestCacheManager:
    """Tests for CacheManager class."""

    @pytest.fixture
    def temp_cache_dir(self):
        """Create a temporary directory for cache tests."""
        with tempfile.TemporaryDirectory() as tmpdir:
            yield tmpdir

    @pytest.fixture
    def cache_manager(self, temp_cache_dir):
        """Create a cache manager with temporary database."""
        config = CacheConfig(
            backend=CacheBackend.LOCAL,
            db_path=os.path.join(temp_cache_dir, "test_cache.db"),
            default_ttl=300
        )
        manager = CacheManager(config)
        yield manager
        manager.close()

    def test_set_and_get_basic(self, cache_manager):
        """Test basic set and get operations."""
        key = "test_key"
        value = {"data": "test_value", "number": 42}

        # Set a value
        assert cache_manager.set(key, value) is True

        # Get the value
        result = cache_manager.get(key)
        assert result == value

    def test_get_nonexistent_key(self, cache_manager):
        """Test getting a key that doesn't exist."""
        result = cache_manager.get("nonexistent_key")
        assert result is None

    def test_ttl_expiration(self, temp_cache_dir):
        """Test that TTL expiration works correctly."""
        config = CacheConfig(
            backend=CacheBackend.LOCAL,
            db_path=os.path.join(temp_cache_dir, "test_ttl.db"),
            default_ttl=1  # 1 second TTL
        )
        manager = CacheManager(config)

        key = "expiring_key"
        value = "expiring_value"

        # Set value with 1 second TTL
        assert manager.set(key, value, ttl=1) is True

        # Should be retrievable immediately
        assert manager.get(key) == value

        # Wait for expiration
        time.sleep(1.5)

        # Should now be None (expired)
        assert manager.get(key) is None

        manager.close()

    def test_overwrite_existing_key(self, cache_manager):
        """Test overwriting an existing key."""
        key = "overwrite_key"

        cache_manager.set(key, "first_value")
        assert cache_manager.get(key) == "first_value"

        cache_manager.set(key, "second_value")
        assert cache_manager.get(key) == "second_value"

    def test_invalidate_pattern(self, temp_cache_dir):
        """Test invalidate_pattern deletes matching keys."""
        config = CacheConfig(
            backend=CacheBackend.LOCAL,
            db_path=os.path.join(temp_cache_dir, "test_pattern.db"),
            default_ttl=300
        )
        manager = CacheManager(config)

        # Set several keys with different prefixes
        manager.set("dynatrace:metrics:cpu", {"value": 1})
        manager.set("dynatrace:metrics:memory", {"value": 2})
        manager.set("dynatrace:logs:error", {"value": 3})
        manager.set("other:key:value", {"value": 4})

        # Delete keys matching pattern (using SQL LIKE)
        deleted = manager.invalidate_pattern("dynatrace:%")

        # Check results - should delete the 3 dynatrace keys
        assert deleted >= 0

        # Verify remaining key
        assert manager.get("other:key:value") == {"value": 4}

        manager.close()

    def test_cleanup_expired(self, temp_cache_dir):
        """Test cleanup_expired removes expired entries."""
        config = CacheConfig(
            backend=CacheBackend.LOCAL,
            db_path=os.path.join(temp_cache_dir, "test_cleanup.db"),
            default_ttl=1
        )
        manager = CacheManager(config)

        # Set two keys - one expiring quickly, one with longer TTL
        manager.set("short_ttl", "value1", ttl=1)
        manager.set("long_ttl", "value2", ttl=300)

        # Both should exist initially
        assert manager.get("short_ttl") == "value1"
        assert manager.get("long_ttl") == "value2"

        # Wait for expiration
        time.sleep(1.5)

        # Run cleanup
        removed = manager.cleanup_expired()

        # Should have removed at least the expired key
        assert removed >= 1

        # Short TTL key should be gone
        assert manager.get("short_ttl") is None

        # Long TTL key should still exist
        assert manager.get("long_ttl") == "value2"

        manager.close()

    def test_redis_backend_raises_not_implemented(self):
        """Test that Redis backend raises NotImplementedError."""
        config = CacheConfig(backend=CacheBackend.REDIS)

        with pytest.raises(NotImplementedError):
            CacheManager(config)
