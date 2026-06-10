# Observia Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Phase 1 + Phase 2 improvements: Page Analyses frontend, Dashboard enrichi, MCP client amélioré, Caching.

**Architecture:**  
- Frontend: React with existing contexts pattern
- Backend: FastAPI with async SQLAlchemy  
- Caching: SQLite-based cache layer (Redis optional)

**Tech Stack:** React 18, TypeScript, FastAPI, LiteLLM, MCP

---

## File Structure

```
frontend/src/
├── pages/Analyses.tsx          NOUVEAU - Liste analyses
├── pages/AnalysisDetail.tsx    NOUVEAU - Détail analyse
├── contexts/AnalysesContext.tsx NOUVEAU - État analyses
├── services/api.ts             MODIFIÉ - ajouter endpoints

backend/app/
├── core/mcp_client.py          MODIFIÉ - pooling, reconnect
├── core/cache.py               NOUVEAU - cache manager
├── api/v1/reports.py           NOUVEAU - endpoints rapports
├── db/repositories.py          MODIFIÉ - ajout méthodes
└── main.py                     MODIFIÉ - metrics endpoint

backend/tests/
├── unit/test_mcp_client.py     NOUVEAU
├── unit/test_cache.py          NOUVEAU
└── integration/test_api.py     NOUVEAU
```

---

## Task 1: Page Analyses (Frontend)

**Files:**
- Create: `frontend/src/pages/Analyses.tsx`
- Create: `frontend/src/contexts/AnalysesContext.tsx`
- Modify: `frontend/src/services/api.ts`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Write failing test for AnalysesContext**

```typescript
// frontend/src/__tests__/AnalysesContext.test.tsx
import { renderHook, waitFor } from '@testing-library/react';
import { AnalysesProvider, useAnalyses } from '../contexts/AnalysesContext';

describe('AnalysesContext', () => {
  it('should fetch analyses on mount', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([
        { id: 1, status: 'completed', analysis_type: 'performance', created_at: '2026-06-06' }
      ])
    });
    
    const { result } = renderHook(() => useAnalyses(), {
      wrapper: AnalysesProvider
    });
    
    await waitFor(() => expect(result.current.analyses).toHaveLength(1));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npm test -- --run src/__tests__/AnalysesContext.test.tsx`
Expected: FAIL - file doesn't exist yet

- [ ] **Step 3: Add analyses API methods**

```typescript
// frontend/src/services/api.ts - ADD these methods
export const analysesApi = {
  list: (params?: { limit?: number; status?: string; type?: string }) =>
    client.get<Analysis[]>('/analyses/', { params }).then(r => r.data),
  get: (id: number) => client.get<Analysis>(`/analyses/${id}`).then(r => r.data),
  create: (data: AnalysisCreate) => client.post<Analysis>('/analyses/', data).then(r => r.data),
  delete: (id: number) => client.delete(`/analyses/${id}`),
};
```

- [ ] **Step 4: Create AnalysesContext**

```typescript
// frontend/src/contexts/AnalysesContext.tsx
import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { analysesApi } from '../services/api';
import type { Analysis } from '../types';

interface AnalysesState {
  analyses: Analysis[];
  loading: boolean;
  error: string | null;
}

interface AnalysesContextValue extends AnalysesState {
  fetchAnalyses: (params?: { limit?: number; status?: string; type?: string }) => Promise<void>;
  getAnalysis: (id: number) => Promise<Analysis>;
  deleteAnalysis: (id: number) => Promise<void>;
}

const AnalysesContext = createContext<AnalysesContextValue | null>(null);

export function AnalysesProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AnalysesState>({
    analyses: [],
    loading: false,
    error: null,
  });

  const fetchAnalyses = useCallback(async (params?: { limit?: number; status?: string; type?: string }) => {
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      const analyses = await analysesApi.list(params);
      setState({ analyses, loading: false, error: null });
    } catch (e) {
      setState(s => ({ ...s, loading: false, error: String(e) }));
    }
  }, []);

  const getAnalysis = useCallback(async (id: number) => {
    return analysesApi.get(id);
  }, []);

  const deleteAnalysis = useCallback(async (id: number) => {
    await analysesApi.delete(id);
    setState(s => ({
      ...s,
      analyses: s.analyses.filter(a => a.id !== id)
    }));
  }, []);

  return (
    <AnalysesContext.Provider value={{ ...state, fetchAnalyses, getAnalysis, deleteAnalysis }}>
      {children}
    </AnalysesContext.Provider>
  );
}

export function useAnalyses() {
  const ctx = useContext(AnalysesContext);
  if (!ctx) throw new Error('useAnalyses must be used within AnalysesProvider');
  return ctx;
}
```

- [ ] **Step 5: Create Analyses page component**

```typescript
// frontend/src/pages/Analyses.tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAnalyses } from '../contexts/AnalysesContext';
import type { Analysis } from '../types';

export default function Analyses() {
  const { analyses, loading, error, fetchAnalyses } = useAnalyses();
  const [filter, setFilter] = useState<{ status?: string; type?: string }>({});

  useEffect(() => {
    fetchAnalyses({ limit: 50, ...filter });
  }, [filter.status, filter.type]);

  const statusColors: Record<string, string> = {
    completed: 'bg-green-900 text-green-300',
    running: 'bg-blue-900 text-blue-300',
    failed: 'bg-red-900 text-red-300',
    pending: 'bg-yellow-900 text-yellow-300',
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Analyses</h2>
        <Link to="/dashboard" className="text-gray-400 hover:text-white">← Back</Link>
      </div>

      <div className="flex gap-4 p-4 bg-gray-900 rounded-lg">
        <select
          value={filter.status || ''}
          onChange={e => setFilter(f => ({ ...f, status: e.target.value || undefined }))}
          className="bg-gray-800 text-white px-3 py-2 rounded"
        >
          <option value="">All Statuses</option>
          <option value="completed">Completed</option>
          <option value="running">Running</option>
          <option value="failed">Failed</option>
          <option value="pending">Pending</option>
        </select>

        <select
          value={filter.type || ''}
          onChange={e => setFilter(f => ({ ...f, type: e.target.value || undefined }))}
          className="bg-gray-800 text-white px-3 py-2 rounded"
        >
          <option value="">All Types</option>
          <option value="performance">Performance</option>
          <option value="availability">Availability</option>
          <option value="security">Security</option>
          <option value="cost">Cost</option>
        </select>
      </div>

      {loading && <p className="text-gray-400">Loading analyses...</p>}
      {error && <p className="text-red-400">Error: {error}</p>}

      <div className="space-y-2">
        {analyses.map((analysis: Analysis) => (
          <div key={analysis.id} className="bg-gray-900 p-4 rounded-lg border border-gray-800 flex justify-between items-center">
            <div>
              <Link to={`/analyses/${analysis.id}`} className="text-lg font-medium text-blue-400 hover:underline">
                Analysis #{analysis.id}
              </Link>
              <div className="text-sm text-gray-400 mt-1">
                Type: {analysis.analysis_type} | Created: {new Date(analysis.created_at).toLocaleString()}
              </div>
            </div>
            <span className={`px-3 py-1 rounded text-sm ${statusColors[analysis.status] || 'bg-gray-700'}`}>
              {analysis.status}
            </span>
          </div>
        ))}
      </div>

      {!loading && analyses.length === 0 && (
        <p className="text-gray-500 text-center py-8">No analyses found. Create one to get started.</p>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Create AnalysisDetail page**

```typescript
// frontend/src/pages/AnalysisDetail.tsx
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAnalyses } from '../contexts/AnalysesContext';
import type { Analysis, Recommendation } from '../types';
import { recommendationsApi } from '../services/api';

export default function AnalysisDetail() {
  const { id } = useParams<{ id: string }>();
  const { getAnalysis } = useAnalyses();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!id) return;
      const a = await getAnalysis(parseInt(id));
      setAnalysis(a);
      const recs = await recommendationsApi.list({ analysis_id: parseInt(id) });
      setRecommendations(recs);
      setLoading(false);
    }
    load();
  }, [id, getAnalysis]);

  if (loading) return <div className="text-gray-400">Loading...</div>;
  if (!analysis) return <div className="text-red-400">Analysis not found</div>;

  const statusColors: Record<string, string> = {
    completed: 'bg-green-900 text-green-300',
    running: 'bg-blue-900 text-blue-300',
    failed: 'bg-red-900 text-red-300',
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Analysis #{analysis.id}</h2>
        <Link to="/analyses" className="text-gray-400 hover:text-white">← Back to Analyses</Link>
      </div>

      <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
        <div className="flex gap-4 mb-4">
          <div>
            <span className="text-gray-400">Type:</span> {analysis.analysis_type}
          </div>
          <div>
            <span className="text-gray-400">Status:</span>
            <span className={`ml-2 px-2 py-0.5 rounded ${statusColors[analysis.status]}`}>
              {analysis.status}
            </span>
          </div>
          <div>
            <span className="text-gray-400">Created:</span> {new Date(analysis.created_at).toLocaleString()}
          </div>
        </div>

        {analysis.result?.summary && (
          <div className="mt-4">
            <h3 className="text-lg font-medium mb-2">Summary</h3>
            <pre className="bg-gray-950 p-4 rounded overflow-auto text-sm whitespace-pre-wrap">
              {analysis.result.summary}
            </pre>
          </div>
        )}

        {analysis.error_message && (
          <div className="mt-4 p-4 bg-red-900/20 border border-red-800 rounded">
            <h3 className="text-red-400 font-medium">Error</h3>
            <pre className="text-red-300 mt-2">{analysis.error_message}</pre>
          </div>
        )}
      </div>

      {recommendations.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold mb-4">Recommendations ({recommendations.length})</h3>
          <div className="space-y-3">
            {recommendations.map(rec => (
              <div key={rec.id} className="bg-gray-900 p-4 rounded-lg border border-gray-800">
                <div className="flex justify-between items-start">
                  <h4 className="font-medium text-blue-400">{rec.title}</h4>
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    rec.severity === 'critical' ? 'bg-red-900 text-red-300' :
                    rec.severity === 'high' ? 'bg-orange-900 text-orange-300' :
                    rec.severity === 'medium' ? 'bg-yellow-900 text-yellow-300' :
                    'bg-gray-700 text-gray-300'
                  }`}>
                    {rec.severity}
                  </span>
                </div>
                <p className="text-gray-400 mt-2">{rec.description}</p>
                <p className="text-gray-500 mt-2 text-sm">Impact: {rec.impact}</p>
                {rec.action && (
                  <p className="text-gray-300 mt-2 text-sm">Action: {rec.action}</p>
                )}
                {rec.script && (
                  <pre className="mt-2 bg-gray-950 p-2 rounded text-xs overflow-auto">
                    {rec.script}
                  </pre>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 7: Update App.tsx with routes**

```typescript
// frontend/src/App.tsx - ADD routes
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { EnvironmentsProvider } from './contexts/EnvironmentsContext';
import { AIProvidersProvider } from './contexts/AIProvidersContext';
import { AnalysesProvider } from './contexts/AnalysesContext';
import Dashboard from './pages/Dashboard';
import Environments from './pages/Environments';
import AIProviders from './pages/AIProviders';
import Analyses from './pages/Analyses';
import AnalysisDetail from './pages/AnalysisDetail';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-950 text-white">
        <nav className="p-4 border-b border-gray-800">
          <div className="flex gap-6">
            <Link to="/" className="text-xl font-bold">Observia</Link>
            <Link to="/dashboard" className="hover:text-blue-400">Dashboard</Link>
            <Link to="/environments" className="hover:text-blue-400">Environments</Link>
            <Link to="/ai-providers" className="hover:text-blue-400">AI Providers</Link>
            <Link to="/analyses" className="hover:text-blue-400">Analyses</Link>
          </div>
        </nav>
        <main className="p-6 max-w-6xl mx-auto">
          <EnvironmentsProvider>
            <AIProvidersProvider>
              <AnalysesProvider>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/environments" element={<Environments />} />
                  <Route path="/ai-providers" element={<AIProviders />} />
                  <Route path="/analyses" element={<Analyses />} />
                  <Route path="/analyses/:id" element={<AnalysisDetail />} />
                </Routes>
              </AnalysesProvider>
            </AIProvidersProvider>
          </EnvironmentsProvider>
        </main>
      </div>
    </BrowserRouter>
  );
}
```

- [ ] **Step 8: Add types for new API responses**

```typescript
// frontend/src/types/index.ts - ADD
export interface Analysis {
  id: number;
  environment_id: number;
  ai_provider_id: number;
  analysis_type: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  time_range_hours: number;
  parameters: Record<string, unknown> | null;
  result: { summary: string; raw_data?: unknown[] } | null;
  reasoning_steps: unknown[] | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface AnalysisCreate {
  environment_id: number;
  ai_provider_id: number;
  analysis_type: string;
  time_range_hours?: number;
  parameters?: Record<string, unknown>;
}
```

- [ ] **Step 9: Run test to verify it works**

Run: `cd frontend && npm run build`
Expected: BUILD SUCCESS

- [ ] **Step 10: Commit**

```bash
git add frontend/src/pages/Analyses.tsx frontend/src/pages/AnalysisDetail.tsx frontend/src/contexts/AnalysesContext.tsx frontend/src/services/api.ts frontend/src/App.tsx frontend/src/types/index.ts
git commit -m "feat(frontend): add Analyses page with list and detail views"
```

---

## Task 2: Dashboard Enrichi (Frontend)

**Files:**
- Modify: `frontend/src/pages/Dashboard.tsx`

- [ ] **Step 1: Write failing test**

```typescript
// frontend/src/__tests__/Dashboard.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import Dashboard from '../pages/Dashboard';

describe('Dashboard', () => {
  it('should show recent analyses section', async () => {
    // Mock API calls
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/environments')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      if (url.includes('/ai-providers')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      if (url.includes('/analyses')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([
          { id: 1, status: 'completed', analysis_type: 'performance', created_at: '2026-06-06' }
        ]) });
      }
      return Promise.reject(new Error('Not found'));
    });
    
    render(<Dashboard />);
    await waitFor(() => expect(screen.getByText(/Recent Analyses/i)).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npm test -- --run src/__tests__/Dashboard.test.tsx`
Expected: FAIL - test doesn't exist

- [ ] **Step 3: Update Dashboard with recent analyses**

```typescript
// frontend/src/pages/Dashboard.tsx - UPDATED
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useEnvironments } from '../contexts/EnvironmentsContext';
import { useAIProviders } from '../contexts/AIProvidersContext';
import { analysesApi } from '../services/api';
import type { Analysis, Recommendation } from '../types';

export default function Dashboard() {
  const { environments, fetchEnvironments, loading: envLoading } = useEnvironments();
  const { providers, fetchProviders } = useAIProviders();
  const [recentAnalyses, setRecentAnalyses] = useState<Analysis[]>([]);
  const [criticalRecs, setCriticalRecs] = useState<Recommendation[]>([]);
  const [loadingAnalyses, setLoadingAnalyses] = useState(true);

  useEffect(() => {
    fetchEnvironments();
    fetchProviders();
    
    async function loadAnalyses() {
      try {
        const [analyses, recs] = await Promise.all([
          analysesApi.list({ limit: 5 }),
          // Would need endpoint for critical recommendations
          Promise.resolve([])
        ]);
        setRecentAnalyses(analyses);
        setCriticalRecs(recs);
      } finally {
        setLoadingAnalyses(false);
      }
    }
    loadAnalyses();
  }, [fetchEnvironments, fetchProviders]);

  const completedCount = recentAnalyses.filter(a => a.status === 'completed').length;
  const failedCount = recentAnalyses.filter(a => a.status === 'failed').length;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Dashboard</h2>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
          <div className="text-gray-400 text-sm mb-1">Environments</div>
          <div className="text-3xl font-bold text-purple-400">{environments.length}</div>
        </div>
        <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
          <div className="text-gray-400 text-sm mb-1">AI Providers</div>
          <div className="text-3xl font-bold text-blue-400">{providers.length}</div>
        </div>
        <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
          <div className="text-gray-400 text-sm mb-1">Completed</div>
          <div className="text-3xl font-bold text-green-400">{completedCount}</div>
        </div>
        <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
          <div className="text-gray-400 text-sm mb-1">Failed</div>
          <div className="text-3xl font-bold text-red-400">{failedCount}</div>
        </div>
      </div>

      <div className="flex gap-3">
        <Link to="/environments" className="bg-purple-700 hover:bg-purple-600 px-4 py-2 rounded text-sm transition-colors">
          Manage Environments
        </Link>
        <Link to="/ai-providers" className="bg-blue-700 hover:bg-blue-600 px-4 py-2 rounded text-sm transition-colors">
          Configure AI Providers
        </Link>
        <Link to="/analyses" className="bg-green-700 hover:bg-green-600 px-4 py-2 rounded text-sm transition-colors">
          View Analyses
        </Link>
      </div>

      {loadingAnalyses && <p className="text-gray-400 text-sm">Loading...</p>}

      {!loadingAnalyses && recentAnalyses.length > 0 && (
        <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
          <h3 className="text-lg font-semibold mb-4">Recent Analyses</h3>
          <div className="space-y-2">
            {recentAnalyses.map(analysis => (
              <Link
                key={analysis.id}
                to={`/analyses/${analysis.id}`}
                className="flex justify-between items-center p-2 rounded hover:bg-gray-800"
              >
                <div>
                  <span className="text-blue-400">#{analysis.id}</span>
                  <span className="text-gray-400 ml-2">{analysis.analysis_type}</span>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${
                  analysis.status === 'completed' ? 'bg-green-900 text-green-300' :
                  analysis.status === 'failed' ? 'bg-red-900 text-red-300' :
                  analysis.status === 'running' ? 'bg-blue-900 text-blue-300' :
                  'bg-gray-700'
                }`}>
                  {analysis.status}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {envLoading && <p className="text-gray-400 text-sm">Loading...</p>}

      {!envLoading && (environments.length === 0 || providers.length === 0) && (
        <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-4 text-yellow-300 text-sm">
          <strong>Get Started:</strong> Configure at least one Dynatrace environment and one AI provider to begin analyzing.
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Verify build passes**

Run: `cd frontend && npm run build`
Expected: BUILD SUCCESS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/Dashboard.tsx
git commit -m "feat(frontend): enrich dashboard with recent analyses stats"
```

---

## Task 3: MCP Client Amélioré (Backend)

**Files:**
- Modify: `backend/app/core/mcp_client.py`
- Create: `backend/tests/unit/test_mcp_client.py`

- [ ] **Step 1: Write failing test**

```python
# backend/tests/unit/test_mcp_client.py
import pytest
from app.core.mcp_client import MCPClient, MCPConnectionError


class TestMCPClient:
    def test_new_client_not_connected(self):
        client = MCPClient(url="https://test.dynatrace.com", token="test", env_type="saas")
        assert not client.is_connected()
    
    def test_connection_pool_exists(self):
        client = MCPClient(url="https://test.dynatrace.com", token="test", env_type="saas")
        assert hasattr(client, '_connection_pool')
    
    def test_get_from_pool_returns_client(self):
        client = MCPClient.get_from_pool(
            url="https://test.dynatrace.com",
            token="test",
            env_type="saas"
        )
        assert client is not None
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/unit/test_mcp_client.py -v`
Expected: FAIL - methods don't exist

- [ ] **Step 3: Implement improved MCP client**

```python
# backend/app/core/mcp_client.py
import asyncio
import logging
from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger(__name__)


class MCPConnectionError(Exception):
    """Raised when MCP connection fails."""
    pass


@dataclass
class MCPClient:
    """Client for connecting to Dynatrace MCP servers (SaaS or Managed)."""
    url: str
    token: str
    env_type: str  # "saas" or "managed"
    timeout: int = 30
    max_retries: int = 3
    _session: Any = field(default=None, init=False, repr=False)
    _connection_pool: dict[str, Any] = field(default_factory=dict, init=False, repr=False)
    _lock: asyncio.Lock = field(default_factory=asyncio.Lock, init=False, repr=False)

    def is_connected(self) -> bool:
        """Check if client has an active session."""
        return self._session is not None

    @classmethod
    def get_from_pool(cls, url: str, token: str, env_type: str) -> "MCPClient":
        """Get or create a client from the connection pool."""
        pool_key = f"{env_type}:{url}"
        if pool_key not in cls._connection_pool:
            cls._connection_pool[pool_key] = cls(url=url, token=token, env_type=env_type)
        return cls._connection_pool[pool_key]

    async def connect(self) -> bool:
        """Establish connection to MCP server with retry logic."""
        async with self._lock:
            if self._session is not None:
                logger.info(f"MCP already connected to {self.url}")
                return True

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
        """Internal method to connect to MCP server via stdio."""
        from mcp import ClientSession, StdioServerParameters
        from mcp.client.stdio import stdio_client

        # Use pre-installed package instead of npx for production
        package = "dynatrace-mcp" if self.env_type == "saas" else "dynatrace-managed-mcp"
        server_params = StdioServerParameters(
            command="node",
            args=["-e", f"require('{package}')"],  # Would use actual entry point
            env={"DT_URL": self.url, "DT_TOKEN": self.token},
        )

        read, write = await stdio_client(server_params).__aenter__()
        session = ClientSession(read, write)
        await session.initialize()
        self._session = session
        return {"status": "connected"}

    async def call_tool(self, tool_name: str, arguments: dict) -> Any:
        """Call an MCP tool and return its result."""
        if not self._session:
            raise MCPConnectionError("Not connected. Call connect() first.")
        
        # Add timeout
        try:
            result = await asyncio.wait_for(
                self._session.call_tool(tool_name, arguments),
                timeout=self.timeout
            )
            return result.content
        except asyncio.TimeoutError:
            raise MCPConnectionError(f"Tool call {tool_name} timed out after {self.timeout}s")

    async def list_tools(self) -> list[dict]:
        """List all available tools from the MCP server."""
        if not self._session:
            raise MCPConnectionError("Not connected")
        result = await self._session.list_tools()
        return [{"name": t.name, "description": t.description} for t in result.tools]

    async def reconnect(self) -> bool:
        """Attempt to reconnect after a failed call."""
        await self.disconnect()
        return await self.connect()

    async def disconnect(self) -> None:
        """Close the MCP connection."""
        self._session = None
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/unit/test_mcp_client.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/core/mcp_client.py backend/tests/unit/test_mcp_client.py
git commit -m "feat(backend): improve MCP client with connection pooling"
```

---

## Task 4: Cache Manager (Backend)

**Files:**
- Create: `backend/app/core/cache.py`
- Create: `backend/tests/unit/test_cache.py`

- [ ] **Step 1: Write failing test**

```python
# backend/tests/unit/test_cache.py
import pytest
import asyncio
from app.core.cache import CacheManager, CacheBackend


class TestCacheManager:
    @pytest.mark.asyncio
    async def test_set_and_get(self):
        cache = CacheManager(backend=CacheBackend.LOCAL)
        await cache.set("test_key", "test_value", ttl=60)
        result = await cache.get("test_key")
        assert result == "test_value"
    
    @pytest.mark.asyncio
    async def test_expired_key_returns_none(self):
        cache = CacheManager(backend=CacheBackend.LOCAL)
        await cache.set("expire_key", "value", ttl=1)
        await asyncio.sleep(1.1)
        result = await cache.get("expire_key")
        assert result is None
    
    @pytest.mark.asyncio
    async def test_invalidate_pattern(self):
        cache = CacheManager(backend=CacheBackend.LOCAL)
        await cache.set("metrics:env1:cpu", 100, ttl=3600)
        await cache.set("metrics:env1:memory", 50, ttl=3600)
        await cache.set("metrics:env2:cpu", 75, ttl=3600)
        
        await cache.invalidate_pattern("metrics:env1:*")
        
        assert await cache.get("metrics:env1:cpu") is None
        assert await cache.get("metrics:env1:memory") is None
        assert await cache.get("metrics:env2:cpu") == 75
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/unit/test_cache.py -v`
Expected: FAIL - module doesn't exist

- [ ] **Step 3: Implement Cache Manager**

```python
# backend/app/core/cache.py
import asyncio
import hashlib
import json
import logging
import time
import sqlite3
from dataclasses import dataclass
from enum import Enum
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)


class CacheBackend(str, Enum):
    LOCAL = "local"  # SQLite
    REDIS = "redis"  # Optional Redis


@dataclass
class CacheConfig:
    """Cache configuration."""
    backend: CacheBackend = CacheBackend.LOCAL
    db_path: str = ".cache/observia.db"
    default_ttl: int = 300  # 5 minutes


class CacheManager:
    """Cache manager with local (SQLite) and Redis backends."""
    
    def __init__(self, config: CacheConfig | None = None):
        self.config = config or CacheConfig()
        self._local_conn: sqlite3.Connection | None = None
        
        if self.config.backend == CacheBackend.LOCAL:
            self._init_local_db()

    def _init_local_db(self) -> None:
        """Initialize local SQLite cache database."""
        db_path = Path(self.config.db_path)
        db_path.parent.mkdir(parents=True, exist_ok=True)
        
        self._local_conn = sqlite3.connect(str(db_path))
        self._local_conn.execute("""
            CREATE TABLE IF NOT EXISTS cache (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                expires_at REAL NOT NULL
            )
        """)
        self._local_conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_expires ON cache(expires_at)
        """)
        self._local_conn.commit()

    def _hash_key(self, key: str) -> str:
        """Hash key to avoid issues with special characters."""
        return hashlib.sha256(key.encode()).hexdigest()[:32]

    async def get(self, key: str) -> Any | None:
        """Get value from cache."""
        hashed = self._hash_key(key)
        
        if self.config.backend == CacheBackend.LOCAL:
            return self._get_local(hashed)
        elif self.config.backend == CacheBackend.REDIS:
            return await self._get_redis(key)
        return None

    def _get_local(self, hashed: str) -> Any | None:
        """Get from local SQLite cache."""
        if not self._local_conn:
            return None
            
        cursor = self._local_conn.execute(
            "SELECT value, expires_at FROM cache WHERE key = ?",
            (hashed,)
        )
        row = cursor.fetchone()
        
        if not row:
            return None
            
        value, expires_at = row
        if time.time() > expires_at:
            self._local_conn.execute("DELETE FROM cache WHERE key = ?", (hashed,))
            self._local_conn.commit()
            return None
            
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return value

    async def _get_redis(self, key: str) -> Any | None:
        """Get from Redis cache (placeholder for future)."""
        # Future implementation
        raise NotImplementedError("Redis backend not yet implemented")

    async def set(self, key: str, value: Any, ttl: int | None = None) -> None:
        """Set value in cache with TTL."""
        hashed = self._hash_key(key)
        ttl = ttl or self.config.default_ttl
        expires_at = time.time() + ttl
        
        if self.config.backend == CacheBackend.LOCAL:
            self._set_local(hashed, value, expires_at)
        elif self.config.backend == CacheBackend.REDIS:
            await self._set_redis(key, value, ttl)

    def _set_local(self, hashed: str, value: Any, expires_at: float) -> None:
        """Set in local SQLite cache."""
        if not self._local_conn:
            return
            
        try:
            serialized = json.dumps(value) if not isinstance(value, str) else value
        except (TypeError, ValueError):
            serialized = str(value)
            
        self._local_conn.execute(
            "INSERT OR REPLACE INTO cache (key, value, expires_at) VALUES (?, ?, ?)",
            (hashed, serialized, expires_at)
        )
        self._local_conn.commit()

    async def _set_redis(self, key: str, value: Any, ttl: int) -> None:
        """Set in Redis cache (placeholder)."""
        raise NotImplementedError("Redis backend not yet implemented")

    async def invalidate_pattern(self, pattern: str) -> None:
        """Invalidate all keys matching pattern."""
        if self.config.backend == CacheBackend.LOCAL:
            self._invalidate_local_pattern(pattern)

    def _invalidate_local_pattern(self, pattern: str) -> None:
        """Invalidate keys matching pattern in local cache."""
        if not self._local_conn:
            return
            
        # Convert glob pattern to SQL LIKE
        sql_pattern = pattern.replace("*", "%").replace("?", "_")
        self._local_conn.execute(
            "DELETE FROM cache WHERE key LIKE ?",
            (sql_pattern,)
        )
        self._local_conn.commit()
        logger.info(f"Invalidated cache keys matching: {pattern}")

    async def cleanup_expired(self) -> None:
        """Remove all expired entries."""
        if self.config.backend == CacheBackend.LOCAL:
            self._local_conn.execute(
                "DELETE FROM cache WHERE expires_at < ?",
                (time.time(),)
            )
            self._local_conn.commit()


# Global cache instance
cache_manager = CacheManager()
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/unit/test_cache.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/core/cache.py backend/tests/unit/test_cache.py
git commit -m "feat(backend): add cache manager with SQLite backend"
```

---

## Task 5: Reports Endpoints (Backend)

**Files:**
- Create: `backend/app/api/v1/reports.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1: Write failing test**

```python
# backend/tests/integration/test_reports.py
import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture
def client():
    return TestClient(app)


def test_generate_report_endpoint_exists(client):
    response = client.post("/api/v1/reports/generate", json={
        "analysis_id": 1,
        "format": "markdown"
    })
    # Should not be 404
    assert response.status_code != 404
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/integration/test_reports.py::test_generate_report_endpoint_exists -v`
Expected: FAIL - 404

- [ ] **Step 3: Create reports endpoint**

```python
# backend/app/api/v1/reports.py
import json
from datetime import datetime
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.db.repositories import AnalysisRepository, RecommendationRepository

router = APIRouter()

ReportFormat = Literal["json", "markdown"]


class ReportGenerateRequest(BaseModel):
    analysis_id: int
    format: ReportFormat = "json"
    include_raw_data: bool = False


class ReportGenerateResponse(BaseModel):
    id: int
    analysis_id: int
    format: ReportFormat
    content: str
    created_at: str


@router.post("/generate", response_model=ReportGenerateResponse)
async def generate_report(
    request: ReportGenerateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Generate a report from an analysis."""
    analysis_repo = AnalysisRepository(db)
    recommendation_repo = RecommendationRepository(db)
    
    analysis = await analysis_repo.get_by_id(request.analysis_id)
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    
    recommendations = await recommendation_repo.get_by_analysis(request.analysis_id)
    
    if request.format == "json":
        content = json.dumps({
            "analysis": {
                "id": analysis.id,
                "type": analysis.analysis_type,
                "status": analysis.status,
                "created_at": analysis.created_at.isoformat() if analysis.created_at else None,
                "result": analysis.result,
            },
            "recommendations": [
                {
                    "title": r.title,
                    "description": r.description,
                    "impact": r.impact,
                    "severity": r.severity,
                    "level": r.level,
                    "action": r.action,
                    "script": r.script,
                }
                for r in recommendations
            ]
        }, indent=2)
    else:  # markdown
        lines = [
            f"# Analysis Report #{analysis.id}",
            "",
            f"**Type:** {analysis.analysis_type}",
            f"**Status:** {analysis.status}",
            f"**Date:** {analysis.created_at.isoformat() if analysis.created_at else 'N/A'}",
            "",
        ]
        
        if analysis.result and analysis.result.get("summary"):
            lines.append("## Summary")
            lines.append("")
            lines.append(analysis.result["summary"])
            lines.append("")
        
        if recommendations:
            lines.append("## Recommendations")
            lines.append("")
            for rec in recommendations:
                lines.append(f"### {rec.title} ({rec.severity})")
                lines.append("")
                lines.append(f"**Impact:** {rec.impact}")
                lines.append("")
                lines.append(rec.description)
                lines.append("")
                if rec.action:
                    lines.append(f"**Action:** {rec.action}")
                    lines.append("")
                if rec.script:
                    lines.append("```")
                    lines.append(rec.script)
                    lines.append("```")
                    lines.append("")
        
        content = "\n".join(lines)
    
    # Create report record (would save to DB in full impl)
    report_id = int(datetime.now().timestamp())
    
    return ReportGenerateResponse(
        id=report_id,
        analysis_id=request.analysis_id,
        format=request.format,
        content=content,
        created_at=datetime.now().isoformat(),
    )


@router.get("/{report_id}")
async def get_report(report_id: int, db: AsyncSession = Depends(get_db)):
    """Get a generated report."""
    # Would fetch from DB in full implementation
    raise HTTPException(status_code=404, detail="Report not found")
```

- [ ] **Step 4: Register router in main.py**

```python
# backend/app/main.py - ADD import and router
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.api.v1 import environments, ai_providers, analyses, recommendations, reports  # ADD reports

app = FastAPI(title="Observia - Dynatrace AI Analysis Platform", version="0.1.0")

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
app.include_router(reports.router, prefix="/api/v1/reports", tags=["reports"])  # ADD


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

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/integration/test_reports.py::test_generate_report_endpoint_exists -v`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/app/api/v1/reports.py backend/app/main.py
git commit -m "feat(backend): add reports generation endpoints"
```

---

## Task 6: Metrics Endpoint (Backend)

**Files:**
- Modify: `backend/app/main.py`

- [ ] **Step 1: Write failing test**

```python
# backend/tests/integration/test_metrics.py
import pytest
from fastapi.testclient import TestClient
from app.main import app


def test_metrics_endpoint_exists(client):
    response = client.get("/metrics")
    assert response.status_code == 200


def test_metrics_format_prometheus(client):
    response = client.get("/metrics")
    assert "text/plain" in response.headers.get("content-type", "")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/integration/test_metrics.py::test_metrics_endpoint_exists -v`
Expected: FAIL - 404

- [ ] **Step 3: Add metrics endpoint**

```python
# backend/app/main.py - ADD metrics
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
import time
import logging

from app.config import settings
from app.api.v1 import environments, ai_providers, analyses, recommendations, reports

logger = logging.getLogger(__name__)

# Simple in-memory metrics
_metrics = {
    "analysis_total": 0,
    "analysis_success": 0,
    "analysis_failed": 0,
    "mcp_calls_total": 0,
    "mcp_calls_failed": 0,
    "start_time": time.time(),
}


def increment_metric(name: str, value: int = 1) -> None:
    """Increment a metric counter."""
    if name in _metrics:
        _metrics[name] += value


app = FastAPI(title="Observia - Dynatrace AI Analysis Platform", version="0.1.0")

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


@app.get("/metrics", response_class=PlainTextResponse)
async def metrics():
    """Prometheus metrics endpoint."""
    uptime = time.time() - _metrics["start_time"]
    
    lines = [
        "# HELP observia_analysis_total Total number of analyses",
        "# TYPE observia_analysis_total counter",
        f"observia_analysis_total {_metrics['analysis_total']}",
        "",
        "# HELP observia_analysis_success Total number of successful analyses",
        "# TYPE observia_analysis_success counter",
        f"observia_analysis_success {_metrics['analysis_success']}",
        "",
        "# HELP observia_analysis_failed Total number of failed analyses",
        "# TYPE observia_analysis_failed counter",
        f"observia_analysis_failed {_metrics['analysis_failed']}",
        "",
        "# HELP observia_mcp_calls_total Total number of MCP calls",
        "# TYPE observia_mcp_calls_total counter",
        f"observia_mcp_calls_total {_metrics['mcp_calls_total']}",
        "",
        "# HELP observia_mcp_calls_failed Total number of failed MCP calls",
        "# TYPE observia_mcp_calls_failed counter",
        f"observia_mcp_calls_failed {_metrics['mcp_calls_failed']}",
        "",
        "# HELP observia_uptime_seconds Application uptime in seconds",
        "# TYPE observia_uptime_seconds gauge",
        f"observia_uptime_seconds {uptime}",
    ]
    
    return "\n".join(lines)


# Export increment function for use in other modules
def get_metrics() -> dict:
    return _metrics.copy()
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/integration/test_metrics.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/main.py
git commit -m "feat(backend): add Prometheus metrics endpoint"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Page Analyses (Frontend) | Analyses.tsx, AnalysisDetail.tsx, AnalysesContext.tsx, api.ts, App.tsx |
| 2 | Dashboard Enrichi | Dashboard.tsx |
| 3 | MCP Client Amélioré | mcp_client.py |
| 4 | Cache Manager | cache.py |
| 5 | Reports Endpoints | reports.py, main.py |
| 6 | Metrics Endpoint | main.py |

**Plan complete and saved to `docs/superpowers/plans/2026-06-06-observia-improvements-plan.md`.**

Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
