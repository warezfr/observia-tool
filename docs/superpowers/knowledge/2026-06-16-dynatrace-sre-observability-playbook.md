# Dynatrace + SRE Observability Playbook (capitalisation savoir-faire)

> Base de connaissance pour Observia. Sert de référence pour : (1) les prompts des plugins
> d'analyse, (2) les "tool allowlists" par type d'analyse, (3) les templates de rapports.
> Sources : Context7 `/websites/dynatrace`, `/websites/dynatrace_managed` + pratiques SRE (Google SRE).

---

## 1. Concepts SRE de référence

### Golden Signals (Google SRE) — colonne vertébrale de tout rapport
| Signal | Question | Métrique Dynatrace typique |
|--------|----------|----------------------------|
| **Latency** | Combien de temps pour servir une requête ? | `builtin:service.response.time` (avg, p50/p90/p95/p99) |
| **Traffic** | Quelle charge ? | `builtin:service.requestCount.total` |
| **Errors** | Quel taux d'échec ? | `builtin:service.errors.total.rate` / `failure_count` |
| **Saturation** | Niveau de remplissage des ressources ? | `builtin:host.cpu.usage`, `builtin:host.mem.usage`, disk, GC |

### RED (services) & USE (ressources)
- **RED** : Rate, Errors, Duration → orienté requêtes/services.
- **USE** : Utilization, Saturation, Errors → orienté ressources (host/process/disk).

### SLO / SLI / Error budget
- **SLI** = série temporelle normalisée 0–100 % (succès, dispo, latence sous seuil).
- **SLO** = objectif cible sur l'SLI (ex : 99.9 % sur 28 j).
- **Error budget** = `100% - SLO`. Reste de budget = marge d'incident tolérable.
- **Burn rate** = vitesse de consommation du budget. Alerte multi-fenêtres (1h/6h) recommandée.

```
burnRate = (100 - sli) / (100 - target)
```

---

## 2. Catalogue de métriques (Metrics API v2)

> Endpoint : `GET /api/v2/metrics/query?metricSelector=...&from=now-24h&resolution=...`
> Token scope requis : `metrics.read`. URL classique : `*.live.dynatrace.com` (ou `/e/{id}` en Managed).

### 2.1 Services (performance / availability)
| Métrique | Sélecteur | Usage rapport |
|----------|-----------|---------------|
| Temps de réponse moyen | `builtin:service.response.time:avg` | Latence service |
| Percentiles | `builtin:service.response.time:percentile(95)` | p95/p99, SLA latence |
| Débit | `builtin:service.requestCount.total:value` | Traffic |
| Taux d'erreur | `builtin:service.errors.total.rate:avg` | Errors |
| Erreurs serveur | `builtin:service.errors.server.rate` | 5xx |

Tri / top-N : `:splitBy("dt.entity.service"):sort(value(avg,descending)):limit(10)`

### 2.2 Hosts / Infrastructure (cost / saturation)
| Métrique | Sélecteur |
|----------|-----------|
| CPU | `builtin:host.cpu.usage:avg` (tous : `builtin:host.cpu.*`) |
| Mémoire | `builtin:host.mem.usage:avg` |
| Disque | `builtin:host.disk.usedPct` |
| Réseau | `builtin:host.net.nic.trafficIn/Out` |

Top hosts CPU : `builtin:host.cpu.usage:sort(value(max,descending)):limit(10)`
Filtre entité : `builtin:host.cpu.usage:filter(eq("dt.entity.host","HOST-XXXX"))`

### 2.3 DQL / Grail (SaaS, via MCP)
```dql
// SLI succès service
timeseries {
   total = sum(dt.service.request.count),
   failures = sum(dt.service.request.failure_count)
}, by: { dt.entity.service }
| fieldsAdd sli = (((total[] - failures[]) / total[]) * 100)
```
```dql
// Problèmes Davis non dupliqués
fetch dt.davis.problems
| filter not(dt.davis.is_duplicate)
| fields id=display_id, title=event.name, status=event.status
```

---

## 3. APIs par capacité

| Capacité | SaaS (apps.dynatrace.com) | Managed / Classic (live / /e/{id}) |
|----------|---------------------------|------------------------------------|
| Problèmes | `GET /api/v2/problems` ou DQL `fetch dt.davis.problems` | `GET /api/v2/problems` |
| Métriques | DQL `timeseries` (Grail) ou `/api/v2/metrics/query` | `GET /api/v2/metrics/query` |
| Sécurité | `GET /api/v2/securityProblems` + DQL vulnerabilities | `GET /api/v2/securityProblems`, `/{id}/vulnerableFunctions?groupBy=PROCESS_GROUP` |
| Entités | `GET /api/v2/entities?entitySelector=type(SERVICE)` | idem |

Priorisation sécurité : **Davis Security Score (DSS)** + fonction vulnérable réellement `IN_USE`
(`vulnerableFunctions.usage == "IN_USE"`) → réduit le bruit CVE.

---

## 4. Templates de rapports (structure cible Observia)

### 4.1 Performance
1. **Executive summary** — santé globale, top 3 risques.
2. **Golden signals** — latence (p50/p95/p99), traffic, erreurs, saturation (charts).
3. **Top services lents** — table triée p95 desc.
4. **Hotspots ressources** — top hosts CPU/mem.
5. **Recommandations** — descriptive / prescriptive / script.

### 4.2 Availability
1. Disponibilité % + SLO/SLI + error budget restant + burn rate.
2. Incidents (problèmes Davis), MTTR, fréquence.
3. Taux 5xx par service.
4. Recommandations.

### 4.3 Security
1. Posture : nb vulnérabilités par sévérité (DSS), nb `IN_USE`.
2. Top CVE priorisées (CVSS + exposition réelle).
3. Surface d'attaque / process groups affectés.
4. Plan de remédiation priorisé.

### 4.4 Cost
1. Utilisation vs capacité (CPU/mem) par host.
2. Ressources idle / sur-provisionnées (faible utilisation soutenue).
3. ROI scaling / consolidation.
4. Recommandations chiffrées.

---

## 5. Tool allowlists par type d'analyse (à implémenter)

| Type | Tools API directs | Métriques à exiger | DQL (MCP) |
|------|-------------------|--------------------|-----------|
| performance | `query_metrics`, `list_problems`, `list_entities` | service.response.time (p95), errors.rate, requestCount, host.cpu/mem | timeseries response/failure |
| availability | `list_problems`, `get_problem_details`, `query_metrics` | errors.server.rate, dispo % | SLI DQL + davis.problems |
| security | `list_problems`, `list_entities` (+ securityProblems) | securityProblems, DSS | vulnerabilities DQL |
| cost | `query_metrics`, `list_entities` | host.cpu/mem/disk usage | timeseries utilisation |

> Objectif : passer de prompts "génériques" à des **prompts paramétrés par sélecteurs concrets**
> + validation que la donnée minimale a bien été récupérée avant de produire le rapport.
