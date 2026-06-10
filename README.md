# Observia - Dynatrace AI Analysis Platform

Plateforme d'analyse intelligente exploitant les MCP Dynatrace (SaaS et Managed) pour effectuer des analyses approfondies via agents AI multi-providers.

## Quick Start avec Docker

```bash
# 1. Configurer les variables d'environnement
cp .env.example .env
# Éditer .env et définir SECRET_KEY

# 2. Lancer les services
docker-compose up -d

# 3. Ouvrir l'application
http://localhost:3000
```

## Quick Start Local

**Backend:**
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## Configuration

### Environnements Dynatrace
Ajouter via l'interface à `/environments`:
- **URL**: `https://your-tenant.live.dynatrace.com` (SaaS) ou votre URL Managed
- **Token scopes requis**: `metrics.read`, `entities.read`, `problems.read`, `logs.read`, `events.read`, `security.read`

### AI Providers
Configurer via l'interface à `/ai-providers`. Supportés:
- **Anthropic**: `claude-opus-4-8`, `claude-sonnet-4-6` (recommandé)
- **OpenAI**: `gpt-4o`, `gpt-4-turbo`
- **Google**: `gemini-1.5-pro`
- **Azure OpenAI**: nécessite endpoint URL
- **AWS Bedrock**: basé IAM, définir endpoint
- **Ollama**: modèles locaux, pas d'API key nécessaire

## Sources MCP
- **SaaS**: https://github.com/dynatrace-oss/dynatrace-mcp
- **Managed**: https://github.com/dynatrace-oss/dynatrace-managed-mcp

## Architecture

- **Backend**: FastAPI + SQLAlchemy (async) + LiteLLM (multi-provider AI)
- **Frontend**: React 18 + TypeScript + TailwindCSS
- **MCP**: Client Python pour connexion aux serveurs MCP Dynatrace
- **Storage**: SQLite (local) ou PostgreSQL (production)

## Développement

```bash
# Backend tests
cd backend && pytest tests/ -v

# Frontend type check
cd frontend && npx tsc --noEmit

# Format code
cd backend && ruff format .
cd frontend && npm run format
```

## License

MIT
