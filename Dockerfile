# Backend API image: FastAPI + the star-schema warehouse, built from the committed CSVs at image build time.
# Drafted with AI assistance (Claude Code). See docs/submission/si_usage.md and docs/deployment.md.
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1 PIP_DISABLE_PIP_VERSION_CHECK=1
WORKDIR /app

COPY requirements-api.txt .
RUN pip install -r requirements-api.txt

# only what the API and the warehouse build need (see .dockerignore)
COPY src ./src
COPY sql ./sql
COPY scripts/build_warehouse.py ./scripts/build_warehouse.py
COPY data/processed ./data/processed
COPY data/app/mechanisms.json ./data/app/mechanisms.json
COPY outputs/earthcare/case_metrics.csv ./outputs/earthcare/case_metrics.csv
COPY docs/research/evidence_ledger.md ./docs/research/evidence_ledger.md

ARG GIT_COMMIT=unknown
RUN WAREHOUSE_GIT_COMMIT=$GIT_COMMIT PYTHONPATH=src python scripts/build_warehouse.py \
    && useradd --create-home --uid 10001 app \
    && mkdir -p /app/data/app/investigations \
    && chown -R app /app/data/app/investigations

USER app
# Production defaults; secrets (TEAM_API_KEY, DEEPSEEK_API_KEY) and CORS_ORIGINS come from the host's environment.
ENV TREND_DETECTIVE_ENV_FILE="" LOG_FORMAT=json PORT=8000
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD python -c "import urllib.request,os; urllib.request.urlopen('http://127.0.0.1:%s/health' % os.environ.get('PORT','8000'), timeout=4)"
CMD ["sh", "-c", "exec uvicorn earth_detective.backend.interfaces.http.app:app --app-dir src --host 0.0.0.0 --port ${PORT} --proxy-headers --forwarded-allow-ips='*' --no-access-log"]
