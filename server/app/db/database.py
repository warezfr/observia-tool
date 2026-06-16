from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    DateTime,
    Boolean,
    JSON,
    ForeignKey,
    event,
)
from datetime import datetime, timezone
from app.config import settings


engine = create_async_engine(settings.database_url, echo=settings.debug)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


@event.listens_for(engine.sync_engine, "connect")
def _enable_sqlite_fk(dbapi_connection, _connection_record):
    """Enforce foreign keys on SQLite (off by default)."""
    try:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()
    except Exception:
        pass


class Base(DeclarativeBase):
    pass


class EnvironmentDB(Base):
    __tablename__ = "environments"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    url = Column(String(1024), nullable=False)
    env_type = Column(String(20), nullable=False)
    token_encrypted = Column(Text, nullable=False)
    platform_token_encrypted = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class AIProviderDB(Base):
    __tablename__ = "ai_providers"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    provider_type = Column(String(50), nullable=False)
    model = Column(String(255), nullable=False)
    api_key_encrypted = Column(Text, nullable=True)
    endpoint = Column(String(1024), nullable=True)
    extra_config = Column(JSON, default={})
    is_default = Column(Boolean, default=False)
    fallback_order = Column(Integer, default=999)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class AnalysisDB(Base):
    __tablename__ = "analyses"
    id = Column(Integer, primary_key=True, index=True)
    environment_id = Column(
        Integer, ForeignKey("environments.id", ondelete="CASCADE"), nullable=False, index=True
    )
    ai_provider_id = Column(
        Integer, ForeignKey("ai_providers.id", ondelete="SET NULL"), nullable=True, index=True
    )
    analysis_type = Column(String(50), nullable=False)
    status = Column(String(20), default="queued")
    result = Column(JSON, nullable=True)
    reasoning_steps = Column(JSON, default=[])
    error_message = Column(Text, nullable=True)
    parameters = Column(JSON, default={})
    time_range_hours = Column(Integer, default=24)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    completed_at = Column(DateTime, nullable=True)


class ScheduleDB(Base):
    __tablename__ = "schedules"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    environment_id = Column(Integer, nullable=False)
    ai_provider_id = Column(Integer, nullable=False)
    analysis_type = Column(String(50), nullable=False)
    time_range_hours = Column(Integer, default=24)
    cron = Column(String(120), nullable=False)
    enabled = Column(Boolean, default=True)
    parameters = Column(JSON, default={})
    last_run_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class IntegrationDB(Base):
    __tablename__ = "integrations"
    id = Column(Integer, primary_key=True, index=True)
    kind = Column(String(50), nullable=False)  # slack | webhook
    name = Column(String(255), nullable=False)
    config = Column(JSON, default={})  # {url: ...}
    enabled = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class AuditLogDB(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    action = Column(String(120), nullable=False)
    entity_type = Column(String(60), nullable=True)
    entity_id = Column(Integer, nullable=True)
    actor = Column(String(120), nullable=True)
    detail = Column(JSON, default={})
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class UserDB(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(120), nullable=False, unique=True)
    password_hash = Column(Text, nullable=False)
    role = Column(String(20), default="viewer")  # admin | viewer
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class ReportDB(Base):
    __tablename__ = "reports"
    id = Column(Integer, primary_key=True, index=True)
    analysis_id = Column(
        Integer, ForeignKey("analyses.id", ondelete="CASCADE"), nullable=False, index=True
    )
    format = Column(String(20), nullable=False)
    content = Column(Text, nullable=False)
    include_raw_data = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class RecommendationDB(Base):
    __tablename__ = "recommendations"
    id = Column(Integer, primary_key=True, index=True)
    analysis_id = Column(
        Integer, ForeignKey("analyses.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title = Column(String(512), nullable=False)
    description = Column(Text, nullable=False)
    impact = Column(Text, nullable=False)
    level = Column(String(20), nullable=False)
    severity = Column(String(20), nullable=False)
    status = Column(String(20), default="new")
    action = Column(Text, nullable=True)
    script = Column(Text, nullable=True)
    script_type = Column(String(20), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Lightweight migration: add platform_token_encrypted column if missing.
        try:
            result = await conn.exec_driver_sql("PRAGMA table_info(environments)")
            cols = [row[1] for row in result.fetchall()]
            if "platform_token_encrypted" not in cols:
                await conn.exec_driver_sql(
                    "ALTER TABLE environments ADD COLUMN platform_token_encrypted TEXT"
                )
        except Exception:
            # Best-effort; create_all() covers fresh installs.
            pass


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
