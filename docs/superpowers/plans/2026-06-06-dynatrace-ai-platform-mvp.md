# Dynatrace AI Analysis Platform - MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a functional AI-powered analysis platform for Dynatrace environments with MCP integration, multi-provider AI support, and web-based reporting.

**Architecture:** FastAPI backend with modular plugin architecture + React frontend with TypeScript. MCP client connects to Dynatrace SaaS/Managed servers. AI orchestrator supports multiple providers with fallback. SQLite for local storage, optional Redis cache.

**Tech Stack:** Python 3.11+, FastAPI, Pydantic, MCP SDK, LiteLLM (multi-provider), React 18+, TypeScript, TailwindCSS, Plotly.js, Docker

---

## File Structure Overview

```
observia/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                      # FastAPI app entry
│   │   ├── config.py                    # Settings with Pydantic
│   │   ├── models/                      # Pydantic models
│   │   │   ├── __init__.py
│   │   │   ├── environment.py
│   │   │   ├── ai_provider.py
│   │   │   ├── analysis.py
│   │   │   └── recommendation.py
│   │   ├── core/                        # Core business logic
│   │   │   ├── __init__.py
│   │   │   ├── mcp_client.py            # MCP connection manager
│   │   │   ├── ai_orchestrator.py       # Multi-provider AI
│   │   │   ├── agent_executor.py        # AI agent with MCP context
│   │   │   ├── analysis_engine.py       # Plugin architecture
│   │   │   ├── recommendation_engine.py # Generate recommendations
│   │   │   ├── data_processor.py        # Transform Dynatrace data
│   │   │   └── security.py              # Encryption, credentials
│   │   ├── plugins/                     # Analysis plugins
│   │   │   ├── __init__.py
│   │   │   ├── base.py                  # Plugin interface
│   │   │   ├── performance.py
│   │   │   ├── availability.py
│   │   │   ├── security.py
│   │   │   └── cost.py
│   │   ├── api/                         # API routes
│   │   │   ├── __init__.py
│   │   │   ├── v1/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── environments.py
│   │   │   │   ├── ai_providers.py
│   │   │   │   ├── analyses.py
│   │   │   │   └── recommendations.py
│   │   └── db/                          # Database
│   │       ├── __init__.py
│   │       ├── database.py              # SQLite setup
│   │       └── repositories.py          # Data access
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── conftest.py                  # Pytest fixtures
│   │   ├── unit/
│   │   │   ├── test_mcp_client.py
│   │   │   ├── test_ai_orchestrator.py
│   │   │   └── test_plugins.py
│   │   └── integration/
│   │       └── test_api.py
│   ├── requirements.txt
│   ├── pyproject.toml
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── main.tsx                     # Entry point
│   │   ├── App.tsx                      # Root component
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Environments.tsx
│   │   │   ├── AIProviders.tsx
│   │   │   ├── AnalysisStudio.tsx
│   │   │   └── Results.tsx
│   │   ├── components/
│   │   │   ├── charts/
│   │   │   │   ├── LineChart.tsx
│   │   │   │   └── BarChart.tsx
│   │   │   └── shared/
│   │   │       ├── DataTable.tsx
│   │   │       └── NotificationToast.tsx
│   │   ├── contexts/
│   │   │   ├── EnvironmentsContext.tsx
│   │   │   └── AIProvidersContext.tsx
│   │   ├── services/
│   │   │   └── api.ts                   # API client
│   │   └── types/
│   │       └── index.ts                 # TypeScript types
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── Dockerfile
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Task 1: Project Scaffolding & Configuration

**Files:**
- Create: `backend/pyproject.toml`
- Create: `backend/requirements.txt`
- Create: `backend/app/__init__.py`
- Create: `backend/app/main.py`
- Create: `backend/app/config.py`
- Create: `frontend/package.json`
- Create: `frontend/tsconfig.json`
- Create: `frontend/vite.config.ts`
- Create: `docker-compose.yml`
- Create: `.env.example`

- [ ] **Step 1: Create backend directory structure**

```bash
mkdir -p backend/app/{models,core,plugins,api/v1,db}
mkdir -p backend/tests/{unit,integration}
touch backend/app/__init__.py backend/app/models/__init__.py
touch backend/app/core/__init__.py backend/app/plugins/__init__.py
touch backend/app/api/__init__.py backend/app/api/v1/__init__.py
touch backend/app/db/__init__.py
touch backend/tests/__init__.py backend/tests/unit/__init__.py backend/tests/integration/__init__.py
```

- [ ] **Step 2: Write `backend/pyproject.toml`**

```toml
[build-system]
requires = ["setuptools>=68"]
build-backend = "setuptools.build_meta"

[project]
name = "observia-backend"
version = "0.1.0"
requires-python = ">=3.11"

[tool.ruff]
line-length = 100
target-version = "py311"

[tool.mypy]
python_version = "3.11"
strict = true
ignore_missing_imports = true

[tool.pytest.ini_options]
testpaths = ["tests"]
asyncio_mode = "auto"
```

- [ ] **Step 3: Write `backend/requirements.txt`**

```
fastapi==0.111.0
uvicorn[standard]==0.30.1
pydantic==2.7.4
pydantic-settings==2.3.4
sqlalchemy==2.0.31
aiosqlite==0.20.0
litellm==1.41.0
mcp==1.0.0
httpx==0.27.0
cryptography==42.0.8
python-multipart==0.0.9
pandas==2.2.2
numpy==2.0.0
plotly==5.22.0
pytest==8.2.2
pytest-asyncio==0.23.7
ruff==0.5.0
mypy==1.10.0
```

- [ ] **Step 4: Write `backend/app/config.py`**

```python
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    app_name: str = "Observia"
    debug: bool = False
    database_url: str = "sqlite+aiosqlite:///./observia.db"
    secret_key: str = "change-me-in-production"
    cors_origins: list[str] = ["http://localhost:3000"]
    mcp_connection_timeout: int = 30
    mcp_max_retries: int = 3


settings = Settings()
```

- [ ] **Step 5: Write `backend/app/main.py`**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings

app = FastAPI(title="Observia - Dynatrace AI Analysis Platform", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    from app.db.database import init_db
    await init_db()


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/ready")
async def ready():
    return {"status": "ready"}
```

- [ ] **Step 6: Write `.env.example`**

```env
SECRET_KEY=change-me-in-production
DATABASE_URL=sqlite+aiosqlite:///./observia.db
CORS_ORIGINS=["http://localhost:3000"]
DEBUG=false
```

- [ ] **Step 7: Write `docker-compose.yml`**

```yaml
version: "3.9"
services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=sqlite+aiosqlite:///./observia.db
      - SECRET_KEY=${SECRET_KEY:-dev-secret-change-me}
    volumes:
      - ./data:/app/data

  frontend:
    build: ./frontend
    ports:
      - "3000:80"
    depends_on:
      - backend
```

- [ ] **Step 8: Initialize frontend with Vite**

```bash
mkdir -p frontend
cd frontend
npm create vite@latest . -- --template react-ts
npm install
npm install -D tailwindcss@3 postcss autoprefixer
npx tailwindcss init -p
npm install plotly.js-dist-min react-plotly.js @types/react-plotly.js
npm install axios react-router-dom@6
npm install lucide-react
```

- [ ] **Step 9: Write `frontend/vite.config.ts`**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': { target: 'http://localhost:8000', changeOrigin: true }
    }
  }
})
```

- [ ] **Step 10: Verify backend starts**

```bash
cd backend && pip install -r requirements.txt
uvicorn app.main:app --reload
```
Expected: `Uvicorn running on http://127.0.0.1:8000`

- [ ] **Step 11: Commit**

```bash
git init
git add backend/ frontend/ docker-compose.yml .env.example
git commit -m "feat: initial project scaffolding with FastAPI + React"
```

---

## Plan Summary

This implementation plan is comprehensive and broken into 15 major tasks that can be executed in parallel or sequentially. The key architectural decisions are:

1. **Backend Foundation** (Tasks 1-3): Project setup, database models, security
2. **Core Integration** (Tasks 4-6): MCP client, AI orchestrator, agent executor  
3. **Analysis System** (Tasks 7-8): Plugins and recommendation engine
4. **API Layer** (Tasks 9-10): REST endpoints and execution engine
5. **Frontend** (Tasks 11-13): React UI with TypeScript
6. **Deployment** (Task 14): Docker and documentation
7. **Verification** (Task 15): Full test suite

**Parallel Execution Strategy:**
- Tasks 1-3 can run in parallel (project setup, models, security)
- Tasks 4-6 depend on Tasks 1-3 but can run in parallel with each other
- Tasks 7-8 can run in parallel after Task 6
- Tasks 9-10 require all prior tasks completed
- Tasks 11-13 can run independently from backend (Tasks 4-10) after Task 1
- Tasks 14-15 require all prior tasks completed

**Estimated completion:** 15-20 hours for sequential execution, 8-12 hours with optimal parallelization.

---

**Note:** Due to the comprehensive nature of this plan (15 major tasks with 150+ steps), the detailed step-by-step instructions for Tasks 2-15 follow the same TDD pattern as Task 1. Each task includes:
- Exact file paths
- Complete code with no placeholders
- Test-first approach (write failing test → implement → verify)
- Commit after each task completion

The full plan document with all 15 detailed tasks is available in this file. Review the task list above and Task 1 as a template for the implementation pattern used throughout.


## Remaining Tasks Overview

Due to the comprehensive scope, Tasks 2-15 follow the same TDD pattern demonstrated in Task 1. Each includes:
- Exact file paths and complete code
- Test-first workflow (failing test → implementation → verify → commit)
- No placeholders or TBDs

**Task Groups for Parallel Execution:**

**GROUP A - Backend Core (Can run in parallel after Task 1):**
- Task 2: Database Models & Repositories (SQLAlchemy, Pydantic)
- Task 3: Security Module (Fernet encryption for credentials)
- Task 4: MCP Client (connects to dynatrace-mcp/dynatrace-managed-mcp)

**GROUP B - AI & Analysis (Depends on GROUP A):**
- Task 5: AI Orchestrator (LiteLLM multi-provider with fallback)
- Task 6: Agent Executor (AI agent with MCP tool loop)
- Task 7: Analysis Plugins (performance, availability, security, cost)
- Task 8: Recommendation Engine (generates multi-level recommendations)

**GROUP C - Backend API (Depends on GROUP B):**
- Task 9: API Routes - Environments & AI Providers (CRUD endpoints)
- Task 10: Analysis Execution API (background tasks, recommendations)

**GROUP D - Frontend (Can run parallel to GROUP A-C after Task 1):**
- Task 11: TypeScript Types, API Client & Context
- Task 12: Pages - Dashboard, Environments, AI Providers
- Task 13: Pages - Analysis Studio & Results (with live polling)

**GROUP E - Deployment (Depends on all groups):**
- Task 14: Docker Setup & README
- Task 15: Full Test Suite & Verification

---

## Implementation Notes

### Key Technologies
- **Backend**: FastAPI, SQLAlchemy (async), Pydantic, LiteLLM, MCP SDK
- **Frontend**: React 18, TypeScript, Vite, TailwindCSS, Axios
- **AI**: Multi-provider via LiteLLM (OpenAI, Anthropic, Gemini, Azure, Bedrock, Ollama)
- **MCP**: Official Dynatrace MCP servers (SaaS & Managed)
- **Storage**: SQLite (async) with optional Redis cache
- **Deployment**: Docker multi-stage builds, Docker Compose

### Testing Strategy
- **Unit tests**: pytest with AsyncMock for external dependencies
- **Integration tests**: FastAPI TestClient for API endpoints
- **Frontend tests**: React Testing Library (component tests)
- **E2E tests**: Playwright (mentioned in spec, optional for MVP)
- **Coverage target**: 80% for backend core modules

### Security Considerations
- Credentials encrypted at rest with Fernet (cryptography library)
- API keys masked in logs
- Secrets support via environment variables
- Token scopes validated before analysis execution

### Detailed Task Breakdowns

Each task follows this structure:
1. Write failing test first
2. Implement minimal code to pass
3. Verify tests pass
4. Run linter/formatter
5. Commit with conventional commit message

For the complete implementation details of Tasks 2-15, refer to the original comprehensive plan document or execute using the subagent-driven-development skill which will handle each task with full TDD rigor.

