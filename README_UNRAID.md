# Déploiement Observia Tool sur Unraid

Ce guide décrit comment déployer Observia Tool sur un NAS Unraid avec un **conteneur unique** (nginx + API FastAPI gérés par Supervisor).

## Architecture

```
Navigateur → nginx (:80) → /api/* → uvicorn (:8000)
                         → /*     → fichiers statiques React
                         → /app/data → volume AppData Unraid (SQLite)
```

## Prérequis

- Unraid 6.9+ avec Docker activé
- Accès SSH au NAS (pour construire l'image) ou machine locale avec Docker

## 1. Récupérer le code

```bash
cd /mnt/user/appdata
git clone https://gitlab.com/warezfr/observia-tool.git
cd observia-tool
```

## 2. Construire l'image Docker

Sur le NAS (via SSH) ou en local puis export de l'image :

```bash
docker build -t observia-tool:latest .
```

Vérification rapide :

```bash
docker run --rm -p 8080:80 \
  -v /tmp/observia-data:/app/data \
  -e SECRET_KEY="ma-cle-secrete" \
  observia-tool:latest
```

Ouvrez `http://<IP>:8080` puis testez `http://<IP>:8080/health`.

## 3. Installation via template Unraid

### Option A — Template XML (recommandé)

1. Copiez `observia-tool.xml` sur le NAS, par exemple :
   `/boot/config/plugins/dockerMan/templates-user/observia-tool.xml`
2. Dans l'interface Unraid : **Docker** → **Add Container**
3. Sélectionnez le template **Observia Tool**
4. Vérifiez les paramètres :
   - **WebUI Port** : `8080` (ou le port de votre choix)
   - **AppData** : `/mnt/user/appdata/observia-tool`
   - **SECRET_KEY** : générez une clé aléatoire longue
5. Démarrez le conteneur

### Option B — Ligne de commande

```bash
docker run -d \
  --name=observia-tool \
  --restart=unless-stopped \
  -p 8080:80 \
  -v /mnt/user/appdata/observia-tool:/app/data \
  -e SECRET_KEY="changez-moi" \
  -e DATABASE_URL="sqlite+aiosqlite:////app/data/observia.db" \
  observia-tool:latest
```

## 4. Variables d'environnement

| Variable | Défaut | Description |
|----------|--------|-------------|
| `SECRET_KEY` | *(obligatoire)* | Clé de chiffrement des tokens Dynatrace / IA |
| `DATABASE_URL` | `sqlite+aiosqlite:////app/data/observia.db` | Chemin base SQLite |
| `CORS_ORIGINS` | `["*"]` | Origines CORS (JSON) |
| `DEBUG` | `false` | Logs SQL détaillés |

## 5. Persistance des données

Toutes les données applicatives sont stockées dans le volume monté sur `/app/data` :

- Base principale : `observia.db`
- Cache Dynatrace : `.cache/` (dans `/app` du conteneur, non persisté par défaut)

Pour une persistance complète incluant le cache, montez également un volume sur `/app/.cache` si nécessaire.

## 6. Mise à jour

```bash
cd /mnt/user/appdata/observia-tool
git pull
docker build -t observia-tool:latest .
```

Puis redémarrez le conteneur depuis l'interface Unraid.

## Dépannage

| Problème | Solution |
|----------|----------|
| Page blanche | Vérifiez les logs : `docker logs observia-tool` |
| Erreur API | Testez `http://<IP>:<port>/health` |
| Permissions AppData | `chown -R nobody:users /mnt/user/appdata/observia-tool` |
| Image introuvable | Reconstruisez avec `docker build -t observia-tool:latest .` |

## Fichiers ajoutés pour Unraid

- [`Dockerfile`](Dockerfile) — image unifiée multi-stage
- [`docker/nginx.conf`](docker/nginx.conf) — reverse proxy vers l'API locale
- [`docker/supervisord.conf`](docker/supervisord.conf) — gestion nginx + uvicorn
- [`observia-tool.xml`](observia-tool.xml) — template Unraid

Le `docker-compose.yml` d'origine (2 conteneurs) reste disponible pour le développement local.
