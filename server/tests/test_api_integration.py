"""Integration tests for the REST API using an isolated in-memory database.

These exercise the real FastAPI routers (environments, ai-providers, analyses,
reports) with a temporary SQLite database injected via dependency override, so
no external Dynatrace/LLM calls are made.
"""
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.db.database import Base, get_db
from app.main import app


@pytest.fixture(autouse=True)
def _no_background_analysis(monkeypatch):
    """Prevent the create-analysis background task from touching the real DB."""
    import app.core.analysis_engine as engine_mod

    async def _noop(_analysis_id):
        return None

    monkeypatch.setattr(engine_mod, "run_analysis", _noop)


@pytest_asyncio.fixture
async def client():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    session_maker = async_sessionmaker(engine, expire_on_commit=False)

    async def _override_get_db():
        async with session_maker() as session:
            yield session

    app.dependency_overrides[get_db] = _override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()
    await engine.dispose()


@pytest.mark.asyncio
async def test_health(client):
    resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_environment_crud(client):
    create = await client.post(
        "/api/v1/environments/",
        json={
            "name": "Prod SaaS",
            "url": "https://abc12345.apps.dynatrace.com",
            "env_type": "saas",
            "token": "dt0c01.SECRET.TOKEN",
        },
    )
    assert create.status_code == 201, create.text
    env = create.json()
    env_id = env["id"]
    assert env["name"] == "Prod SaaS"

    listing = await client.get("/api/v1/environments/")
    assert listing.status_code == 200
    assert any(e["id"] == env_id for e in listing.json())

    patched = await client.patch(
        f"/api/v1/environments/{env_id}", json={"name": "Prod SaaS EU"}
    )
    assert patched.status_code == 200
    assert patched.json()["name"] == "Prod SaaS EU"

    deleted = await client.delete(f"/api/v1/environments/{env_id}")
    assert deleted.status_code == 204

    missing = await client.get(f"/api/v1/environments/{env_id}")
    assert missing.status_code == 404


@pytest.mark.asyncio
async def test_ai_provider_crud_and_update(client):
    create = await client.post(
        "/api/v1/ai-providers/",
        json={
            "name": "OpenAI",
            "provider_type": "openai",
            "model": "gpt-4o",
            "api_key": "sk-test",
        },
    )
    assert create.status_code == 201, create.text
    provider_id = create.json()["id"]

    patched = await client.patch(
        f"/api/v1/ai-providers/{provider_id}", json={"model": "gpt-4o-mini"}
    )
    assert patched.status_code == 200
    assert patched.json()["model"] == "gpt-4o-mini"

    deleted = await client.delete(f"/api/v1/ai-providers/{provider_id}")
    assert deleted.status_code == 204


@pytest.mark.asyncio
async def test_patch_missing_environment_returns_404(client):
    resp = await client.patch("/api/v1/environments/9999", json={"name": "x"})
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_schedule_crud(client):
    # Need an environment and provider for FK references.
    env = (await client.post(
        "/api/v1/environments/",
        json={"name": "E", "url": "https://x.live.dynatrace.com", "env_type": "managed", "token": "t"},
    )).json()
    prov = (await client.post(
        "/api/v1/ai-providers/",
        json={"name": "P", "provider_type": "openai", "model": "gpt-4o", "api_key": "k"},
    )).json()

    create = await client.post(
        "/api/v1/schedules/",
        json={
            "name": "Nightly perf",
            "environment_id": env["id"],
            "ai_provider_id": prov["id"],
            "analysis_type": "performance",
            "time_range_hours": 24,
            "cron": "0 2 * * *",
            "enabled": True,
        },
    )
    assert create.status_code == 201, create.text
    sid = create.json()["id"]

    listing = await client.get("/api/v1/schedules/")
    assert any(s["id"] == sid for s in listing.json())

    patched = await client.patch(f"/api/v1/schedules/{sid}", json={"enabled": False})
    assert patched.status_code == 200
    assert patched.json()["enabled"] is False

    deleted = await client.delete(f"/api/v1/schedules/{sid}")
    assert deleted.status_code == 204


@pytest.mark.asyncio
async def test_integration_crud(client):
    create = await client.post(
        "/api/v1/integrations/",
        json={"kind": "slack", "name": "Ops", "config": {"url": "https://hooks.slack.com/x"}},
    )
    assert create.status_code == 201, create.text
    iid = create.json()["id"]
    listing = await client.get("/api/v1/integrations/")
    assert any(i["id"] == iid for i in listing.json())
    assert (await client.delete(f"/api/v1/integrations/{iid}")).status_code == 204


@pytest.mark.asyncio
async def test_report_persistence(client):
    env = (await client.post(
        "/api/v1/environments/",
        json={"name": "E", "url": "https://x.live.dynatrace.com", "env_type": "managed", "token": "t"},
    )).json()
    prov = (await client.post(
        "/api/v1/ai-providers/",
        json={"name": "P", "provider_type": "openai", "model": "gpt-4o", "api_key": "k"},
    )).json()
    analysis = (await client.post(
        "/api/v1/analyses/",
        json={
            "environment_id": env["id"],
            "ai_provider_id": prov["id"],
            "analysis_type": "performance",
            "time_range_hours": 24,
        },
    )).json()

    gen = await client.post(
        "/api/v1/reports/generate",
        json={"analysis_id": analysis["id"], "format": "markdown"},
    )
    assert gen.status_code == 201, gen.text
    report_id = gen.json()["id"]

    fetched = await client.get(f"/api/v1/reports/{report_id}")
    assert fetched.status_code == 200
    assert fetched.json()["format"] == "markdown"

    history = await client.get("/api/v1/reports/", params={"analysis_id": analysis["id"]})
    assert any(r["id"] == report_id for r in history.json())


@pytest_asyncio.fixture
async def client_with_sessions():
    """Like ``client`` but also exposes the session maker for direct DB seeding."""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    session_maker = async_sessionmaker(engine, expire_on_commit=False)

    async def _override_get_db():
        async with session_maker() as session:
            yield session

    app.dependency_overrides[get_db] = _override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac, session_maker
    app.dependency_overrides.clear()
    await engine.dispose()


def _metric_result(metric_id: str, values: list[float], *, complete: bool = True) -> dict:
    return {
        "raw_data": [
            {
                "tool": "query_metrics",
                "result": {
                    "result": [
                        {"metricId": metric_id, "data": [{"values": values}]},
                    ]
                },
            }
        ],
        "completeness": {
            "complete": complete,
            "required": ["query_metrics", "list_problems"],
            "satisfied": ["query_metrics", "list_problems"] if complete else ["query_metrics"],
        },
    }


@pytest.mark.asyncio
async def test_analyses_health_overview_and_compare_batch(client_with_sessions):
    client, session_maker = client_with_sessions
    from sqlalchemy import update

    from app.db.database import AnalysisDB
    from app.models.analysis import AnalysisStatus

    env1 = (await client.post(
        "/api/v1/environments/",
        json={"name": "E1", "url": "https://a.live.dynatrace.com", "env_type": "managed", "token": "t"},
    )).json()
    env2 = (await client.post(
        "/api/v1/environments/",
        json={"name": "E2", "url": "https://b.live.dynatrace.com", "env_type": "managed", "token": "t"},
    )).json()
    prov = (await client.post(
        "/api/v1/ai-providers/",
        json={"name": "P", "provider_type": "openai", "model": "gpt-4o", "api_key": "k"},
    )).json()
    base = {
        "ai_provider_id": prov["id"],
        "analysis_type": "performance",
        "time_range_hours": 24,
    }
    older = (await client.post(
        "/api/v1/analyses/",
        json={**base, "environment_id": env1["id"]},
    )).json()
    newer = (await client.post(
        "/api/v1/analyses/",
        json={**base, "environment_id": env1["id"]},
    )).json()
    other_env = (await client.post(
        "/api/v1/analyses/",
        json={**base, "environment_id": env2["id"]},
    )).json()

    async with session_maker() as session:
        await session.execute(
            update(AnalysisDB)
            .where(AnalysisDB.id == newer["id"])
            .values(
                status=AnalysisStatus.COMPLETED.value,
                result=_metric_result("builtin:service.response.time", [100.0, 120.0], complete=False),
            )
        )
        await session.execute(
            update(AnalysisDB)
            .where(AnalysisDB.id == other_env["id"])
            .values(
                status=AnalysisStatus.COMPLETED.value,
                result=_metric_result("builtin:service.response.time", [50.0, 60.0]),
            )
        )
        await session.commit()

    health = await client.get("/api/v1/analyses/health-overview")
    assert health.status_code == 200
    env_rows = {row["environment_id"]: row for row in health.json()["environments"]}
    assert len(env_rows) == 2
    assert env_rows[env1["id"]]["last_analysis_id"] == newer["id"]
    assert env_rows[env1["id"]]["completeness_pct"] == 50
    assert env_rows[env2["id"]]["completeness_pct"] == 100

    too_few = await client.post("/api/v1/analyses/compare-batch", json={"ids": [newer["id"]]})
    assert too_few.status_code == 422

    compare = await client.post(
        "/api/v1/analyses/compare-batch",
        json={"ids": [newer["id"], other_env["id"]]},
    )
    assert compare.status_code == 200
    payload = compare.json()
    assert len(payload["analyses"]) == 2
    assert payload["analyses"][0]["id"] == newer["id"]
    metric = next(m for m in payload["metrics"] if m["metric"] == "builtin:service.response.time")
    assert len(metric["values"]) == 2
    by_id = {v["analysis_id"]: v for v in metric["values"]}
    assert by_id[newer["id"]]["avg"] == 110.0
    assert by_id[other_env["id"]]["latest"] == 60.0

    missing = await client.post(
        "/api/v1/analyses/compare-batch",
        json={"ids": [newer["id"], 99999]},
    )
    assert missing.status_code == 404
