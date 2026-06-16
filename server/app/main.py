from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.api.v1 import (
    environments,
    ai_providers,
    analyses,
    recommendations,
    reports,
    schedules,
    integrations,
    auth,
    users,
    audit,
)

app = FastAPI(title="Observia - Dynatrace AI Analysis Platform", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(environments.router, prefix="/api/v1/environments", tags=["environments"])
app.include_router(ai_providers.router, prefix="/api/v1/ai-providers", tags=["ai-providers"])
app.include_router(analyses.router, prefix="/api/v1/analyses", tags=["analyses"])
app.include_router(recommendations.router, prefix="/api/v1/recommendations", tags=["recommendations"])
app.include_router(reports.router, prefix="/api/v1/reports", tags=["reports"])
app.include_router(schedules.router, prefix="/api/v1/schedules", tags=["schedules"])
app.include_router(integrations.router, prefix="/api/v1/integrations", tags=["integrations"])
app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/v1/users", tags=["users"])
app.include_router(audit.router, prefix="/api/v1/audit-logs", tags=["audit"])

# Import metrics from reports module
from app.api.v1.reports import metrics


@app.on_event("startup")
async def startup():
    from app.db.database import init_db
    from app.core.cache import CacheConfig, get_cache_manager
    from app.core.scheduler import start_scheduler
    from app.core.security_auth import ensure_default_admin

    await init_db()
    # Initialize the global Dynatrace response cache with configured path/TTL.
    get_cache_manager(
        CacheConfig(
            db_path=settings.cache_db_path,
            default_ttl=settings.cache_default_ttl,
        )
    )
    await ensure_default_admin()
    await start_scheduler()


@app.on_event("shutdown")
async def shutdown():
    from app.core.scheduler import shutdown_scheduler

    shutdown_scheduler()


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/ready")
async def ready():
    return {"status": "ready"}


@app.get("/metrics")
async def get_metrics():
    """Get Prometheus metrics in text format.

    Counters are computed from the database so they survive restarts; the
    reports counter falls back to the in-memory value plus persisted reports.
    """
    from sqlalchemy import func, select

    from app.api.v1.reports import metrics
    from app.db.database import AnalysisDB, AsyncSessionLocal, ReportDB

    total = completed = failed = reports_count = 0
    try:
        async with AsyncSessionLocal() as db:
            total = int(await db.scalar(select(func.count()).select_from(AnalysisDB)) or 0)
            completed = int(
                await db.scalar(
                    select(func.count()).select_from(AnalysisDB).where(
                        AnalysisDB.status.in_(("completed", "partial"))
                    )
                )
                or 0
            )
            failed = int(
                await db.scalar(
                    select(func.count()).select_from(AnalysisDB).where(AnalysisDB.status == "failed")
                )
                or 0
            )
            reports_count = int(await db.scalar(select(func.count()).select_from(ReportDB)) or 0)
    except Exception:
        total, completed, failed = metrics.analysis_total, metrics.analysis_completed, metrics.analysis_failed
        reports_count = metrics.reports_generated

    lines = [
        "# HELP observia_analysis_total Total number of analyses requested",
        "# TYPE observia_analysis_total counter",
        f"observia_analysis_total {total}",
        "",
        "# HELP observia_analysis_completed Total number of completed analyses",
        "# TYPE observia_analysis_completed counter",
        f"observia_analysis_completed {completed}",
        "",
        "# HELP observia_analysis_failed Total number of failed analyses",
        "# TYPE observia_analysis_failed counter",
        f"observia_analysis_failed {failed}",
        "",
        "# HELP observia_reports_generated Total number of reports generated",
        "# TYPE observia_reports_generated counter",
        f"observia_reports_generated {reports_count}",
    ]
    return "\n".join(lines)
