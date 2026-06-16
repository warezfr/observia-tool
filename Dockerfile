# Stage 1: Build frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ .
ENV VITE_API_URL=
RUN npm run build

# Stage 2: Unified runtime (nginx + backend)
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx \
    supervisor \
    nodejs \
    npm \
    && rm -rf /var/lib/apt/lists/* \
    && rm -f /etc/nginx/sites-enabled/default

COPY server/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY server/app/ ./app/

COPY --from=frontend-builder /app/dist /usr/share/nginx/html

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/supervisord.conf /etc/supervisor/conf.d/observia.conf

RUN mkdir -p /app/data

ENV DATABASE_URL=sqlite+aiosqlite:////app/data/observia.db \
    SECRET_KEY=change-me-in-production \
    CORS_ORIGINS='["*"]' \
    DEBUG=false

VOLUME ["/app/data"]
EXPOSE 80

CMD ["/usr/bin/supervisord", "-n", "-c", "/etc/supervisor/supervisord.conf"]
