# Observia — 360 Review, Plan d'actions & Roadmap Features (Handoff AI)

**Date:** 2026-06-11
**Auteur:** GitLab Duo Chat (review 360 + rework UI + hardening sécurité)
**Objet:** Document de passation permettant à tout agent AI (ou humain) de reprendre le travail.

---

## 1. But de l'application

**Observia** est une plateforme d'analyse d'observabilité augmentée par IA :

- Connexion aux environnements **Dynatrace** (SaaS et Managed) via les serveurs **MCP officiels** (`@dynatrace-oss/dynatrace-mcp`, `dynatrace-managed-mcp`).
- Des **agents IA multi-providers** (Anthropic, OpenAI, Gemini, Azure OpenAI, Bedrock, Ollama — via LiteLLM) interrogent métriques, problèmes, logs et topologie.
- Production : **analyses** par domaine (performance, availability, security, cost) avec raisonnement tracé, **recommandations graduées** (descriptive → prescriptive → script), **rapports**.
- Cible : équipes observabilité. Positionnement : « analyste SRE virtuel ».

Specs de référence : `docs/superpowers/specs/2026-06-06-dynatrace-ai-analysis-platform-design.md` et `docs/superpowers/specs/2026-06-06-observia-improvements-design.md`.

### Architecture

- **Backend** `server/` : FastAPI async + SQLAlchemy (SQLite par défaut), plugins d'analyse (`server/app/plugins/`), orchestration IA (`server/app/core/ai_orchestrator.py`), client MCP (`server/app/core/mcp_client.py`), moteur d'analyse (`server/app/core/analysis_engine.py`, lancé en BackgroundTask).
- **Frontend** `frontend/` : React 18 + TypeScript + Vite + TailwindCSS, composants partagés `frontend/src/components/ui/` (Card, Button, Badge, Field, Skeleton, Toast), contexts manuels (`frontend/src/contexts/`).
- **Déploiement** : docker-compose (frontend nginx :3000, backend :8000), variante Vercel (`api/index.py`).

---

## 2. Review 360 — constats (2026-06-11)

### Sécurité (traité en partie, voir MR !3)
- ✅ Dérivation de clé Fernet faible (`ljust(32)`) → remplacée par PBKDF2-HMAC-SHA256 600k itérations, fallback legacy au déchiffrement.
- ✅ Secret par défaut accepté en prod → refus de démarrage si `ENVIRONMENT=production` + secret par défaut.
- ✅ Aucune authentification API → auth `X-API-Key` optionnelle (activée si `API_KEY` est défini). **Reste à faire : auth JWT + utilisateurs réels** (l'UI a un bouton Logout et un UsersTab mockés).
- ✅ CORS wildcard → restreint.
- ⚠️ Scripts de remédiation IA sans garde-fou → issue #5.

### Backend — dette restante
- `BackgroundTasks` pour `run_analysis` : perdu si le process redémarre, pas de reprise. → vraie queue de jobs (ou a minima APScheduler + table de jobs, voir issue #2).
- `/metrics` maison dans `server/app/main.py` : compteurs en mémoire, perdus au restart → migrer vers `prometheus-client`.
- Pool MCP incohérent : `analysis_engine.py` et `environments.py` créent des `MCPClient` directs au lieu de `MCPClient.get_from_pool()` ; le pool est indexé par URL seule (collision si 2 envs même URL) ; `stdio_cm.__aenter__()` sans `__aexit__` garanti en cas d'exception (fuite de process npx).
- Suppression en cascade manuelle des recommandations dans `analyses.py` → `ondelete="CASCADE"` SQLAlchemy.
- Pas de migrations (pas d'Alembic) : tout changement de schéma casse les DB existantes.
- Tests quasi absents : seulement `server/tests/unit/test_cache.py` et `test_mcp_client.py`. Cible : tests API httpx + analysis_engine mocké.
- **Pas de CI** : aucun `.gitlab-ci.yml`. À créer : ruff + pytest + `tsc --noEmit` + build Docker.
- README mentionne `cd backend` mais le dossier s'appelle `server/`.

### Frontend — état après rework
- ✅ Rework UI complet livré (MR !2) : thème slate/primary unifié, Inter/JetBrains Mono, composants partagés utilisés partout, Dashboard redessiné (stat cards, chart recharts, skeletons), Sidebar avec accent latéral, responsive, empty states.
- ✅ Bugs corrigés : champs inexistants `analysis.name`/`analysis.type` dans Dashboard ; layouts flex de Card cassés par le wrapper interne.
- Dette restante : pas de gestion d'erreur axios centralisée (le composant Toast existe mais est peu branché) ; envisager TanStack Query à la place des 3 contexts ; pas de polling/SSE du statut des analyses (issue #3) ; pages Automation/Integrations/Settings branchées sur des **mocks** (issues #2, #1).

---

## 3. Travail déjà réalisé (MRs)

| MR | Contenu | Statut à la rédaction |
|---|---|---|
| !2 `ui-rework` | Rework UI complet (thème, composants, toutes les pages) | Ouverte — vérifier `npx tsc --noEmit` avant merge |
| !3 `security-hardening` | PBKDF2, refus secret par défaut en prod, API key optionnelle, CORS restreint, lifespan | Ouverte |

⚠️ Si !3 est mergée et qu'un `API_KEY` est configuré, le frontend doit envoyer le header `X-API-Key` (non câblé volontairement — follow-up ou login JWT).

---

## 4. Roadmap features (issues GitLab créées)

Chaque issue contient un plan détaillé **Why / What / How** avec les fichiers à modifier.

| Priorité | Issue | Titre | Dépendances |
|---|---|---|---|
| P1 | #1 | Alerting proactif (Slack/Teams/webhooks) | — |
| P1 | #2 | Scheduler backend pour analyses récurrentes (Automation réelle) | — |
| P2 | #3 | Streaming temps réel du raisonnement de l'agent (SSE) | — |
| P3 | #4 | Analyse comparative temporelle (diff entre deux runs) | — |
| P4 | #5 | Remédiation guidée avec workflow d'approbation des scripts | Alembic recommandé |
| P5 | #6 | Root Cause Correlator (analyse cross-domaine) | — |
| P6 | #7 | Suivi des coûts IA (tokens et budgets par provider) | — |
| P7 | #8 | Health check périodique des environnements | #2 (scheduler) |
| P8 | #9 | Export PDF / HTML des rapports | — |
| P9 | #10 | Bibliothèque de prompts versionnés éditables depuis l'UI | — |

**Logique de priorisation :** #1 + #2 débloquent le mode « pilote automatique » (analyses planifiées + notifications), qui est la promesse implicite du produit. #3 améliore radicalement l'expérience pendant l'analyse. #4 transforme l'outil de snapshot en outil de tendance.

---

## 5. Backlog dette technique (non créé en issues — à faire si besoin)

1. `.gitlab-ci.yml` : lint (ruff), pytest, `tsc --noEmit`, build images.
2. Auth JWT + gestion d'utilisateurs (brancher `UsersTab`, RBAC admin/analyst/viewer prévu en spec).
3. Migrations Alembic.
4. `prometheus-client` pour `/metrics`.
5. Refactor pool MCP (clé par environment_id, cleanup contextmanager garanti).
6. Cascade delete SQLAlchemy.
7. Tests API backend + tests composants frontend (Vitest).
8. Corriger README (`backend/` → `server/`).
9. Interceptor axios global + Toasts d'erreur.

---

## 6. Conventions pour agents AI

- **UI** : utiliser exclusivement les composants `frontend/src/components/ui/` (Card, Button, Badge, Field, Skeleton) et la palette `slate-*` / `primary` / `secondary` / `success` / `warning` / `error` du `tailwind.config.js`. **Jamais de classes `gray-*`.** Headers de page : `h2 text-2xl font-semibold text-white` + sous-titre `text-slate-400 text-sm`.
- **Attention** : `Card` enveloppe ses enfants dans un div interne `p-5` — ne pas passer de classes flex de layout à `Card`, les mettre sur un div enfant.
- **Backend** : pattern repository (`server/app/db/repositories.py`), modèles Pydantic dans `server/app/models/`, routes dans `server/app/api/v1/` montées dans `main.py` avec la dépendance `require_api_key` (après MR !3). Secrets toujours chiffrés via `encrypt_value` de `server/app/core/security.py`.
- **Vérifications avant MR** : `cd frontend && npx tsc --noEmit` ; `cd server && pytest tests/ -v`. Pas de CI : ces checks sont manuels.
- **Branches** : une branche par sujet (`ui-rework`, `security-hardening`...), MR vers `main` avec description Why/What/How to verify.
