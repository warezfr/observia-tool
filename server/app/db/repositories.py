from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from datetime import datetime, timezone

from app.db.database import (
    EnvironmentDB,
    AIProviderDB,
    AnalysisDB,
    RecommendationDB,
    ReportDB,
    ScheduleDB,
    IntegrationDB,
    AuditLogDB,
    UserDB,
)
from sqlalchemy import func
from app.models.environment import EnvironmentCreate, EnvironmentUpdate
from app.models.ai_provider import AIProviderCreate, AIProviderUpdate
from app.models.analysis import AnalysisCreate, AnalysisStatus
from app.models.schedule import ScheduleCreate, ScheduleUpdate


class EnvironmentRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: EnvironmentCreate) -> EnvironmentDB:
        from app.core.security import encrypt_value
        obj = EnvironmentDB(
            name=data.name,
            url=str(data.url),
            env_type=data.env_type.value,
            token_encrypted=encrypt_value(data.token),
            platform_token_encrypted=encrypt_value(data.platform_token)
            if data.platform_token
            else None,
        )
        self.db.add(obj)
        await self.db.commit()
        await self.db.refresh(obj)
        return obj

    async def get_by_id(self, env_id: int) -> EnvironmentDB | None:
        result = await self.db.execute(select(EnvironmentDB).where(EnvironmentDB.id == env_id))
        return result.scalar_one_or_none()

    async def get_all(self) -> list[EnvironmentDB]:
        result = await self.db.execute(select(EnvironmentDB))
        return list(result.scalars().all())

    async def update(self, env_id: int, data: EnvironmentUpdate) -> EnvironmentDB | None:
        from app.core.security import encrypt_value

        obj = await self.get_by_id(env_id)
        if not obj:
            return None
        if data.name is not None:
            obj.name = data.name
        if data.url is not None:
            obj.url = str(data.url)
        if data.env_type is not None:
            obj.env_type = data.env_type.value
        if data.token is not None:
            obj.token_encrypted = encrypt_value(data.token)
        if data.platform_token is not None:
            obj.platform_token_encrypted = (
                encrypt_value(data.platform_token) if data.platform_token else None
            )
        await self.db.commit()
        await self.db.refresh(obj)
        return obj

    async def delete(self, env_id: int) -> bool:
        result = await self.db.execute(delete(EnvironmentDB).where(EnvironmentDB.id == env_id))
        await self.db.commit()
        return result.rowcount > 0

    def get_token(self, env: EnvironmentDB) -> str:
        from app.core.security import decrypt_value
        return decrypt_value(env.token_encrypted)

    def get_platform_token(self, env: EnvironmentDB) -> str | None:
        from app.core.security import decrypt_value
        if not getattr(env, "platform_token_encrypted", None):
            return None
        return decrypt_value(env.platform_token_encrypted)


class AIProviderRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: AIProviderCreate) -> AIProviderDB:
        from app.core.security import encrypt_value
        obj = AIProviderDB(
            name=data.name,
            provider_type=data.provider_type.value,
            model=data.model,
            api_key_encrypted=encrypt_value(data.api_key) if data.api_key else None,
            endpoint=data.endpoint,
            extra_config=data.extra_config,
            is_default=data.is_default,
            fallback_order=data.fallback_order,
        )
        self.db.add(obj)
        await self.db.commit()
        await self.db.refresh(obj)
        return obj

    async def get_by_id(self, provider_id: int) -> AIProviderDB | None:
        result = await self.db.execute(select(AIProviderDB).where(AIProviderDB.id == provider_id))
        return result.scalar_one_or_none()

    async def update(self, provider_id: int, data: AIProviderUpdate) -> AIProviderDB | None:
        from app.core.security import encrypt_value

        obj = await self.get_by_id(provider_id)
        if not obj:
            return None
        if data.name is not None:
            obj.name = data.name
        if data.provider_type is not None:
            obj.provider_type = data.provider_type.value
        if data.model is not None:
            obj.model = data.model
        if data.api_key is not None:
            obj.api_key_encrypted = encrypt_value(data.api_key) if data.api_key else None
        if data.endpoint is not None:
            obj.endpoint = data.endpoint
        if data.extra_config is not None:
            obj.extra_config = data.extra_config
        if data.is_default is not None:
            obj.is_default = data.is_default
        if data.fallback_order is not None:
            obj.fallback_order = data.fallback_order
        await self.db.commit()
        await self.db.refresh(obj)
        return obj

    async def get_all(self) -> list[AIProviderDB]:
        result = await self.db.execute(
            select(AIProviderDB).order_by(AIProviderDB.fallback_order)
        )
        return list(result.scalars().all())

    async def get_default(self) -> AIProviderDB | None:
        result = await self.db.execute(
            select(AIProviderDB).where(AIProviderDB.is_default == True).limit(1)
        )
        return result.scalar_one_or_none()

    async def get_by_type(self, provider_type: str) -> list[AIProviderDB]:
        result = await self.db.execute(
            select(AIProviderDB)
            .where(AIProviderDB.provider_type == provider_type)
            .order_by(AIProviderDB.fallback_order)
        )
        return list(result.scalars().all())

    def get_api_key(self, provider: AIProviderDB) -> str | None:
        from app.core.security import decrypt_value
        if not provider.api_key_encrypted:
            return None
        return decrypt_value(provider.api_key_encrypted)


class AnalysisRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: AnalysisCreate) -> AnalysisDB:
        obj = AnalysisDB(
            environment_id=data.environment_id,
            ai_provider_id=data.ai_provider_id,
            analysis_type=data.analysis_type.value,
            time_range_hours=data.time_range_hours,
            parameters=data.parameters,
        )
        self.db.add(obj)
        await self.db.commit()
        await self.db.refresh(obj)
        return obj

    async def get_by_id(self, analysis_id: int) -> AnalysisDB | None:
        result = await self.db.execute(
            select(AnalysisDB).where(AnalysisDB.id == analysis_id)
        )
        return result.scalar_one_or_none()

    async def get_all(
        self,
        limit: int = 50,
        status: str | None = None,
        analysis_type: str | None = None,
    ) -> list[AnalysisDB]:
        query = select(AnalysisDB).order_by(AnalysisDB.created_at.desc()).limit(limit)
        if status:
            query = query.where(AnalysisDB.status == status)
        if analysis_type:
            query = query.where(AnalysisDB.analysis_type == analysis_type)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def delete(self, analysis_id: int) -> bool:
        result = await self.db.execute(delete(AnalysisDB).where(AnalysisDB.id == analysis_id))
        await self.db.commit()
        return result.rowcount > 0

    async def get_previous(self, analysis: AnalysisDB) -> AnalysisDB | None:
        """Find the most recent prior analysis of the same environment and type."""
        query = (
            select(AnalysisDB)
            .where(
                AnalysisDB.environment_id == analysis.environment_id,
                AnalysisDB.analysis_type == analysis.analysis_type,
                AnalysisDB.id != analysis.id,
                AnalysisDB.created_at <= analysis.created_at,
                AnalysisDB.status.in_(("completed", "partial")),
            )
            .order_by(AnalysisDB.created_at.desc())
            .limit(1)
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def update_status(
        self,
        analysis_id: int,
        status: AnalysisStatus,
        result: dict | None = None,
        reasoning_steps: list[dict] | None = None,
        error_message: str | None = None,
    ) -> None:
        values: dict = {"status": status.value}
        if result is not None:
            values["result"] = result
        if reasoning_steps is not None:
            values["reasoning_steps"] = reasoning_steps
        if error_message is not None:
            values["error_message"] = error_message
        if status in (
            AnalysisStatus.COMPLETED,
            AnalysisStatus.PARTIAL,
            AnalysisStatus.FAILED,
        ):
            values["completed_at"] = datetime.now(timezone.utc)
        await self.db.execute(
            update(AnalysisDB).where(AnalysisDB.id == analysis_id).values(**values)
        )
        await self.db.commit()

    async def update_progress(self, analysis_id: int, reasoning_steps: list[dict]) -> None:
        """Update live progress without changing status/completed_at."""
        await self.db.execute(
            update(AnalysisDB)
            .where(AnalysisDB.id == analysis_id)
            .values(reasoning_steps=reasoning_steps)
        )
        await self.db.commit()


class RecommendationRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_analysis_id(self, analysis_id: int) -> list[RecommendationDB]:
        result = await self.db.execute(
            select(RecommendationDB)
            .where(RecommendationDB.analysis_id == analysis_id)
            .order_by(RecommendationDB.created_at.desc())
        )
        return list(result.scalars().all())

    async def delete_by_analysis_id(self, analysis_id: int) -> int:
        """Delete all recommendations for a given analysis."""
        result = await self.db.execute(
            delete(RecommendationDB).where(RecommendationDB.analysis_id == analysis_id)
        )
        await self.db.commit()
        return result.rowcount


class ReportRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(
        self, analysis_id: int, fmt: str, content: str, include_raw_data: bool
    ) -> ReportDB:
        obj = ReportDB(
            analysis_id=analysis_id,
            format=fmt,
            content=content,
            include_raw_data=include_raw_data,
        )
        self.db.add(obj)
        await self.db.commit()
        await self.db.refresh(obj)
        return obj

    async def get_by_id(self, report_id: int) -> ReportDB | None:
        result = await self.db.execute(select(ReportDB).where(ReportDB.id == report_id))
        return result.scalar_one_or_none()

    async def list(self, analysis_id: int | None = None, limit: int = 50) -> list[ReportDB]:
        query = select(ReportDB).order_by(ReportDB.created_at.desc()).limit(limit)
        if analysis_id is not None:
            query = query.where(ReportDB.analysis_id == analysis_id)
        result = await self.db.execute(query)
        return list(result.scalars().all())


class ScheduleRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: ScheduleCreate) -> ScheduleDB:
        obj = ScheduleDB(
            name=data.name,
            environment_id=data.environment_id,
            ai_provider_id=data.ai_provider_id,
            analysis_type=data.analysis_type.value,
            time_range_hours=data.time_range_hours,
            cron=data.cron,
            enabled=data.enabled,
            parameters=data.parameters,
        )
        self.db.add(obj)
        await self.db.commit()
        await self.db.refresh(obj)
        return obj

    async def get_by_id(self, schedule_id: int) -> ScheduleDB | None:
        result = await self.db.execute(select(ScheduleDB).where(ScheduleDB.id == schedule_id))
        return result.scalar_one_or_none()

    async def get_all(self) -> list[ScheduleDB]:
        result = await self.db.execute(select(ScheduleDB).order_by(ScheduleDB.created_at.desc()))
        return list(result.scalars().all())

    async def update(self, schedule_id: int, data: ScheduleUpdate) -> ScheduleDB | None:
        obj = await self.get_by_id(schedule_id)
        if not obj:
            return None
        if data.name is not None:
            obj.name = data.name
        if data.environment_id is not None:
            obj.environment_id = data.environment_id
        if data.ai_provider_id is not None:
            obj.ai_provider_id = data.ai_provider_id
        if data.analysis_type is not None:
            obj.analysis_type = data.analysis_type.value
        if data.time_range_hours is not None:
            obj.time_range_hours = data.time_range_hours
        if data.cron is not None:
            obj.cron = data.cron
        if data.enabled is not None:
            obj.enabled = data.enabled
        if data.parameters is not None:
            obj.parameters = data.parameters
        await self.db.commit()
        await self.db.refresh(obj)
        return obj

    async def delete(self, schedule_id: int) -> bool:
        result = await self.db.execute(delete(ScheduleDB).where(ScheduleDB.id == schedule_id))
        await self.db.commit()
        return result.rowcount > 0


class IntegrationRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, kind: str, name: str, config: dict, enabled: bool = True) -> IntegrationDB:
        obj = IntegrationDB(kind=kind, name=name, config=config, enabled=enabled)
        self.db.add(obj)
        await self.db.commit()
        await self.db.refresh(obj)
        return obj

    async def get_all(self) -> list[IntegrationDB]:
        result = await self.db.execute(
            select(IntegrationDB).order_by(IntegrationDB.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_enabled(self) -> list[IntegrationDB]:
        result = await self.db.execute(
            select(IntegrationDB).where(IntegrationDB.enabled == True)  # noqa: E712
        )
        return list(result.scalars().all())

    async def delete(self, integration_id: int) -> bool:
        result = await self.db.execute(
            delete(IntegrationDB).where(IntegrationDB.id == integration_id)
        )
        await self.db.commit()
        return result.rowcount > 0


class AuditLogRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def log(
        self,
        action: str,
        entity_type: str | None = None,
        entity_id: int | None = None,
        actor: str | None = None,
        detail: dict | None = None,
    ) -> None:
        self.db.add(
            AuditLogDB(
                action=action,
                entity_type=entity_type,
                entity_id=entity_id,
                actor=actor,
                detail=detail or {},
            )
        )
        await self.db.commit()

    async def list(self, limit: int = 100) -> list[AuditLogDB]:
        result = await self.db.execute(
            select(AuditLogDB).order_by(AuditLogDB.created_at.desc()).limit(limit)
        )
        return list(result.scalars().all())


class UserRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, username: str, password_hash: str, role: str = "viewer") -> UserDB:
        obj = UserDB(username=username, password_hash=password_hash, role=role)
        self.db.add(obj)
        await self.db.commit()
        await self.db.refresh(obj)
        return obj

    async def get_by_id(self, user_id: int) -> UserDB | None:
        result = await self.db.execute(select(UserDB).where(UserDB.id == user_id))
        return result.scalar_one_or_none()

    async def get_by_username(self, username: str) -> UserDB | None:
        result = await self.db.execute(select(UserDB).where(UserDB.username == username))
        return result.scalar_one_or_none()

    async def get_all(self) -> list[UserDB]:
        result = await self.db.execute(select(UserDB).order_by(UserDB.created_at.asc()))
        return list(result.scalars().all())

    async def count(self) -> int:
        return int(await self.db.scalar(select(func.count()).select_from(UserDB)) or 0)

    async def delete(self, user_id: int) -> bool:
        result = await self.db.execute(delete(UserDB).where(UserDB.id == user_id))
        await self.db.commit()
        return result.rowcount > 0
