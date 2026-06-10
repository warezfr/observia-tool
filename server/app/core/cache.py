"""Cache manager with SQLite backend for caching Dynatrace data."""

import hashlib
import json
import logging
import os
import time
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any, Optional

import sqlite3

logger = logging.getLogger(__name__)


class CacheBackend(Enum):
    """Supported cache backends."""
    LOCAL = "local"  # SQLite
    REDIS = "redis"


@dataclass
class CacheConfig:
    """Configuration for the cache manager."""
    backend: CacheBackend = CacheBackend.LOCAL
    db_path: str = ".cache/observia.db"
    default_ttl: int = 3600  # 1 hour in seconds


class CacheManager:
    """Cache manager with SQLite backend for caching Dynatrace data."""

    def __init__(self, config: Optional[CacheConfig] = None):
        """Initialize the cache manager.

        Args:
            config: Cache configuration. Uses defaults if not provided.
        """
        self.config = config or CacheConfig()
        self._conn: Optional[sqlite3.Connection] = None

        if self.config.backend == CacheBackend.LOCAL:
            self._init_local_db()
        elif self.config.backend == CacheBackend.REDIS:
            raise NotImplementedError("Redis backend is not yet implemented")

    def _init_local_db(self) -> None:
        """Create SQLite table if it doesn't exist."""
        db_path = Path(self.config.db_path)
        db_path.parent.mkdir(parents=True, exist_ok=True)

        self._conn = sqlite3.connect(str(db_path), check_same_thread=False)
        self._conn.execute("PRAGMA journal_mode=WAL")

        self._conn.execute("""
            CREATE TABLE IF NOT EXISTS cache (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                expires_at REAL NOT NULL
            )
        """)

        self._conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_cache_expires_at ON cache(expires_at)
        """)

        self._conn.commit()
        logger.info(f"Cache initialized at {db_path}")

    def _hash_key(self, key: str) -> str:
        """Hash keys to avoid special character issues.

        Args:
            key: The cache key.

        Returns:
            A hashed version of the key.
        """
        return hashlib.sha256(key.encode()).hexdigest()[:32]

    def get(self, key: str) -> Optional[Any]:
        """Retrieve a value from the cache.

        Args:
            key: The cache key.

        Returns:
            The cached value, or None if not found or expired.
        """
        if self.config.backend == CacheBackend.REDIS:
            raise NotImplementedError("Redis backend is not yet implemented")

        hashed_key = self._hash_key(key)

        try:
            cursor = self._conn.execute(
                "SELECT value, expires_at FROM cache WHERE key = ?",
                (hashed_key,)
            )
            row = cursor.fetchone()

            if row is None:
                return None

            value_str, expires_at = row

            # Check if expired
            if time.time() > expires_at:
                self._conn.execute("DELETE FROM cache WHERE key = ?", (hashed_key,))
                self._conn.commit()
                return None

            return json.loads(value_str)
        except sqlite3.Error as e:
            logger.error(f"Cache get error: {e}")
            return None

    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """Store a value in the cache.

        Args:
            key: The cache key.
            value: The value to store.
            ttl: Time-to-live in seconds. Uses default if not provided.

        Returns:
            True if successful, False otherwise.
        """
        if self.config.backend == CacheBackend.REDIS:
            raise NotImplementedError("Redis backend is not yet implemented")

        hashed_key = self._hash_key(key)
        ttl = ttl or self.config.default_ttl
        expires_at = time.time() + ttl
        value_str = json.dumps(value)

        try:
            self._conn.execute(
                "INSERT OR REPLACE INTO cache (key, value, expires_at) VALUES (?, ?, ?)",
                (hashed_key, value_str, expires_at)
            )
            self._conn.commit()
            return True
        except sqlite3.Error as e:
            logger.error(f"Cache set error: {e}")
            return False

    def invalidate_pattern(self, pattern: str) -> int:
        """Delete keys matching a glob pattern.

        For simplicity, this performs a prefix search on hashed keys.
        The pattern is hashed to match against stored keys.

        Args:
            pattern: Glob-style pattern (e.g., "dynatrace:*")

        Returns:
            Number of keys deleted.
        """
        if self.config.backend == CacheBackend.REDIS:
            raise NotImplementedError("Redis backend is not yet implemented")

        # Convert glob pattern to SQL LIKE pattern
        # * becomes % and remaining chars are used for prefix matching
        # Since we hash keys, we'll match by prefix of hashed key
        like_pattern = pattern.replace("*", "%")

        try:
            # Get all keys that match the pattern
            cursor = self._conn.execute(
                "SELECT key FROM cache WHERE key LIKE ?",
                (like_pattern,)
            )
            keys_to_delete = [row[0] for row in cursor.fetchall()]

            if keys_to_delete:
                placeholders = ",".join("?" * len(keys_to_delete))
                self._conn.execute(
                    f"DELETE FROM cache WHERE key IN ({placeholders})",
                    keys_to_delete
                )
                self._conn.commit()

            return len(keys_to_delete)
        except sqlite3.Error as e:
            logger.error(f"Cache invalidate error: {e}")
            return 0

    def cleanup_expired(self) -> int:
        """Remove all expired entries from the cache.

        Returns:
            Number of expired entries removed.
        """
        if self.config.backend == CacheBackend.REDIS:
            raise NotImplementedError("Redis backend is not yet implemented")

        try:
            cursor = self._conn.execute(
                "DELETE FROM cache WHERE expires_at < ?",
                (time.time(),)
            )
            self._conn.commit()
            return cursor.rowcount
        except sqlite3.Error as e:
            logger.error(f"Cache cleanup error: {e}")
            return 0

    def close(self) -> None:
        """Close the database connection."""
        if self._conn:
            self._conn.close()
            self._conn = None


# Global cache manager instance
cache_manager: Optional[CacheManager] = None


def get_cache_manager(config: Optional[CacheConfig] = None) -> CacheManager:
    """Get or create the global cache manager instance.

    Args:
        config: Optional cache configuration.

    Returns:
        The cache manager instance.
    """
    global cache_manager
    if cache_manager is None:
        cache_manager = CacheManager(config)
    return cache_manager
