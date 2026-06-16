# Plan d'amélioration & nouvelles fonctionnalités — Observia

> Date : 2026-06-16. Basé sur : inventaire complet de l'app + playbook
> `docs/superpowers/knowledge/2026-06-16-dynatrace-sre-observability-playbook.md`.
> Objectif : faire passer Observia d'un MVP fonctionnel à une plateforme d'observabilité
> AI fiable, avec rapports SRE pertinents et fonctionnalités productives (vs mocks).

## 0. État des lieux (synthèse)

**Solide (REAL)** : CRUD environnements/providers (tokens chiffrés Fernet), test connexion API v2,
détection de modèles, moteur d'analyse async (agent tool-calling, max 15 itérations), MCP Dynatrace
(SaaS + platform token) + fallback API v2 direct (4 tools), orchestration LiteLLM multi-provider,
4 plugins (perf/dispo/sécu/coût), recommandations LLM structurées, rapports JSON/MD/HTML, analytics
dashboard, thème clair/sombre.

**Faible / Mock / Gaps** :
- Plugins = prompts génériques, pas de sélecteurs métriques concrets ni d'allowlist d'outils.
- Pages **Automation**, **Integrations**, **Users/Permissions/API keys/Security** = mocks.
- **Aucune authentification** backend.
- Rapports **non persistés** (`GET /reports/{id}` renvoie toujours 404), pas de PDF.
- `cache.py` implémenté mais **non câblé**.
- Bug enum provider : `azure_openai`/`aws_bedrock` (DB) vs `azure`/`bedrock` (orchestrator).
- Pas d'endpoint update env/provider ; pas de SSE (polling 3s) ; Toast non intégré.
- Managed n'utilise pas de MCP (API v2 direct uniquement).

---

## Phase 1 — Fiabilité & correctifs (quick wins, 1 sprint)

1. **Fix enum providers Azure/Bedrock** : mapper `azure_openai→azure`, `aws_bedrock→bedrock`
   dans `ai_orchestrator.py` (sinon crash à l'instanciation). *(server/app/core/ai_orchestrator.py)*
2. **Endpoints update** : `PATCH /environments/{id}` et `PATCH /ai-providers/{id}` (le modèle
   `EnvironmentUpdate` existe déjà, non exposé).
3. **Câbler le cache Dynatrace** : utiliser `cache.py` (TTL SQLite) autour des appels
   `query_metrics`/`list_problems` pour réduire la latence et la conso API.
4. **Intégrer le composant Toast** + intercepteur axios centralisé (erreurs visibles UI).
5. **Tests d'intégration backend** : TestClient httpx sur environments/analyses + run_analysis
   avec MCP/LLM mockés ; couvrir `agent_executor`, `recommendation_engine`.

## Phase 2 — Rapports SRE pertinents (cœur de la demande)

6. **Allowlists d'outils + presets métriques par type d'analyse** : enrichir
   `server/app/plugins/*` avec les sélecteurs du playbook (§2, §5). Prompts paramétrés avec
   sélecteurs concrets (p95, errors.rate, host.cpu.usage…) plutôt que "use MCP tools".
7. **Validation de complétude** : avant génération du rapport, vérifier que la donnée minimale
   par type a été récupérée ; sinon relancer l'agent ou marquer le rapport "partiel".
8. **Section Golden Signals normalisée** dans chaque rapport (latence p50/p95/p99, traffic,
   erreurs, saturation) + RED/USE selon le type.
9. **SLO/SLI & error budget** : nouveau type d'analyse `reliability` calculant SLI succès/latence,
   error budget restant, burn rate (DQL §2.3 pour SaaS, calcul dérivé via API v2 pour Managed).
10. **Persistance des rapports** : table `reports` (id, analysis_id, format, content, created_at),
    implémenter réellement `GET /reports/{id}`, historique + re-téléchargement.
11. **Export PDF** : générer PDF à partir du HTML self-contained existant (weasyprint ou
    rendu headless), bouton dans `AnalysisDetail.tsx`.
12. **Comparaison temporelle** : comparer une analyse à la précédente du même env/type
    (régression latence/erreurs, tendances).

## Phase 3 — Automatisation & intégrations réelles (remplacer les mocks)

13. **Scheduler backend** : table `schedules` + APScheduler ; exécution récurrente d'analyses
    (cron). Câbler la page `Automation.tsx` aux vraies données (env via API, pas hardcodé).
14. **Notifications** : webhook générique + Slack à la fin d'analyse / dépassement SLO ;
    remplacer les cartes mock de `Integrations.tsx` par une config persistée.
15. **MCP Managed** : évaluer/wirer un provider MCP pour Managed (sinon documenter le fallback
    API v2 comme choix assumé).

## Phase 4 — Sécurité & multi-utilisateurs

16. **Auth backend** : JWT ou API-key middleware, login simple ; protéger toutes les routes.
17. **Users/RBAC réels** : remplacer `UsersTab` mock par CRUD utilisateurs + rôles
    (admin/viewer). Onglets Permissions/API keys → réels.
18. **Audit log** des analyses et changements de config.

## Phase 5 — Temps réel & polish

19. **SSE/WebSocket** pour la progression d'analyse (remplacer le polling 3s).
20. **FK & cascades** SQLAlchemy (intégrité) + migration Alembic.
21. **Persistance métriques** Prometheus (actuellement in-memory, reset au restart).

---

## Priorisation recommandée
- **Now** : 1, 2, 6, 7, 8 (impact direct sur la qualité des rapports — demande principale).
- **Next** : 9, 10, 11, 3, 5.
- **Later** : 13, 14, 16, 17, 19.

## Critères d'acceptation (rapports)
- Chaque rapport perf/dispo contient une section Golden Signals avec valeurs réelles (p95, error rate).
- Type `reliability` produit SLI + error budget + burn rate exploitables.
- Rapports persistés et re-téléchargeables (JSON/MD/HTML/PDF).
- Plugins échouent proprement (rapport "partiel") si la donnée Dynatrace est absente.
