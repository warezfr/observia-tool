"""
Vercel serverless adapter for Observia FastAPI backend.
Exports the ASGI app for Vercel Python runtime.
"""
import os
import sys

# Add server to path for imports (api is sibling of server)
server_path = os.path.join(os.path.dirname(__file__), '..', 'server')
if server_path not in sys.path:
    sys.path.insert(0, os.path.abspath(server_path))

# Set environment variables for serverless
os.environ.setdefault('DATABASE_URL', 'sqlite+aiosqlite:///./data/observia.db')
os.environ.setdefault('SECRET_KEY', os.environ.get('SECRET_KEY', 'dev-secret-change-in-production'))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings

app = FastAPI(title="Observia - Dynatrace AI Analysis Platform", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import and include routers
from app.api.v1 import environments, ai_providers, analyses, recommendations, reports
app.include_router(environments.router, prefix="/api/v1/environments", tags=["environments"])
app.include_router(ai_providers.router, prefix="/api/v1/ai-providers", tags=["ai-providers"])
app.include_router(analyses.router, prefix="/api/v1/analyses", tags=["analyses"])
app.include_router(recommendations.router, prefix="/api/v1/recommendations", tags=["recommendations"])
app.include_router(reports.router, prefix="/api/v1/reports", tags=["reports"])

# Health endpoints
@app.get("/api/health")
async def health():
    return {"status": "ok"}

@app.get("/api/ready")
async def ready():
    return {"status": "ready"}

@app.get("/api/metrics")
async def metrics():
    from app.api.v1.reports import metrics as m
    lines = [
        "# HELP observia_analysis_total Total number of analyses requested",
        "# TYPE observia_analysis_total counter",
        f"observia_analysis_total {m.analysis_total}",
        "",
        "# HELP observia_analysis_completed Total number of completed analyses",
        "# TYPE observia_analysis_completed counter",
        f"observia_analysis_completed {m.analysis_completed}",
        "",
        "# HELP observia_analysis_failed Total number of failed analyses",
        "# TYPE observia_analysis_failed counter",
        f"observia_analysis_failed {m.analysis_failed}",
        "",
        "# HELP observia_reports_generated Total number of reports generated",
        "# TYPE observia_reports_generated counter",
        f"observia_reports_generated {m.reports_generated}",
    ]
    return "\n".join(lines)

# Startup event
@app.on_event("startup")
async def startup():
    from app.db.database import init_db
    await init_db()

# Vercel exports the ASGI app
vercel_app = app