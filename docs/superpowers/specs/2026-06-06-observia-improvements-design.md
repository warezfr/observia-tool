# Design: Observia Platform Improvements

**Date:** 2026-06-06  
**Status:** Approved  
**Project:** Observia - Dynatrace AI Analysis Platform

---

## Contexte

Le projet MVP est fonctionnel mais incomplet. Cette spec décrit les améliorations pour atteindre un niveau production.

## Objectifs

1. **Frontend complet** : Dashboard enrichi, page Analyses, visualisations
2. **Backend robuste** : MCP client amélioré, caching, fallback
3. **Infrastructure résiliente** : Monitoring, tests, circuit breaker

---

## Phase 1: Frontend/UX

### 1.1 Dashboard Enrichi

**Features:**
- Cartes statistiques (environments, providers, analyses totales)
- Liste des analyses récentes avec statut (running/completed/failed)
- Alertes recommandations prioritaires (severity=critical/high)
- Boutons d'action rapide

**API endpoints utilisés:**
- `GET /api/v1/environments/`
- `GET /api/v1/ai-providers/`
- `GET /api/v1/analyses/?limit=10`
- `GET /api/v1/recommendations/?severity=critical`

### 1.2 Page Analyses

**Features:**
- Liste paginée de toutes les analyses
- Filtres: statut, type (performance/availability/security/cost), date
- Détail analyse: résultat complet, reasoning steps, recommandations
- Re-lancer une analyse existante
- Supprimer une analyse

**API endpoints:**
- `GET /api/v1/analyses/` (avec pagination et filtres)
- `GET /api/v1/analyses/{id}`
- `POST /api/v1/analyses/`
- `DELETE /api/v1/analyses/{id}`

### 1.3 Visualisations (Future)

**Note:** Reporté à après Phase 2 (besoin de plus de données structurées)

---

## Phase 2: Backend/Capacités

### 2.1 MCP Client Amélioré

**Problèmes actuels:**
- Utilise `npx` qui n'est pas robuste en production
- Pas de connexion persistente
- Pas de pooling

**Solution:**
- Pré-installer les packages MCP via npm/yarn plutôt que npx
- Ajouter connection pool (1 connexion par environment, réutilisée)
- Ajouter reconnect automatique sur failure
- Timeout configurable par type d'appel

**Fichiers modifiés:** `backend/app/core/mcp_client.py`

```python
class MCPClient:
    url: str
    token: str
    env_type: str
    timeout: int = 30
    max_retries: int = 3
    _session: ClientSession | None = None
    _connection_pool: dict[str, ClientSession] = {}
    
    @classmethod
    def get_from_pool(cls, url: str, token: str, env_type: str) -> "MCPClient":
        # Return existing or create new
```

### 2.2 Caching des Données Dynatrace

**Stratégie:**
- Cache SQLite local (par défaut)
- Cache Redis (optionnel, configurable)
-TTL par type de données:
  - Métriques: 5 min
  - Entities: 10 min
  - Problems: 2 min
  - Logs: 1 min

**Implementation:**
```python
# backend/app/core/cache.py
class CacheManager:
    async def get(self, key: str) -> Any | None
    async def set(self, key: str, value: Any, ttl: int) -> None
    async def invalidate_pattern(self, pattern: str) -> None
```

### 2.3 Fallback Entre Environnements

**Features:**
- Définition d'un environnement primaire + secondaire par analyse
- Siprimaire echoue, automatique fallback vers secondaire
- Logging du failover

### 2.4 Endpoints Rapports

**API:**
- `POST /api/v1/reports/generate` - Génère un rapport
- `GET /api/v1/reports/{id}/download` - Télécharge le rapport

**Formats supportés:** JSON, Markdown (PDF/HTML reporté)

---

## Phase 3: Infrastructure/Résilience

### 3.1 Métriques et Monitoring

**Endpoints:**
- `GET /metrics` - Prometheus format (latence, erreurs, usage)

**Métriques collectées:**
- `analysis_duration_seconds`
- `analysis_success_total`
- `analysis_failed_total`
- `mcp_connection_duration_seconds`
- `ai_provider_tokens_used`

### 3.2 Health Checks Étendus

```python
@app.get("/ready")
async def ready():
    # Check: DB, MCP connections, AI providers
    return {
        "status": "ready",
        "db": "ok",
        "mcp": "ok",
        "ai_providers": "ok"
    }
```

### 3.3 Circuit Breaker

**Implementation:** Python `pybreaker` ou custom

**Config:**
- Failure threshold: 5 erreurs consécutives
- Timeout: 30 secondes
- Half-open: 1 requête test toutes les 30s

### 3.4 Tests

**Backend (pytest):**
- Tests unitaires: core modules (mcp_client, ai_orchestrator)
- Tests integration: API endpoints
- Coverage target: 80%

**Frontend:**
- Tests composants React (Vitest)
- E2E basics: navigation, forms

---

## Ordre d'Implémentation

1. **Page Analyses** (Frontend) - Plus visible, rapide
2. **Dashboard enrichi** (Frontend) - Utilise Analyses
3. **MCP client improve** (Backend) - Critique pour stabilité
4. **Caching** (Backend) - Performance
5. **Fallback** (Backend) - Résilience
6. **Monitoring** (Backend) - Observabilité

---

## Décisions Techniques

1. **Pas d'authentification JWT** - Usage interne seul, reporté
2. **Cache SQLite par défaut** - Redis optional
3. **Pas de PDF/HTML maintenant** - JSON/Markdown seulement
4. **Pas de multi-tenancy** - Usage single-tenant

---

**Fin du design.**
