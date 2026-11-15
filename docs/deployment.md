# Deployment

Drafted with AI assistance (Claude Code). See docs/submission/si_usage.md.

Two parts, two hosts:

| Part | Where | What is deployed |
|---|---|---|
| Front end (Next.js, `frontend/`) | **Vercel** | built from GitHub on every push |
| API (FastAPI + SQLite warehouse) | **Octanium** (any host that runs a Docker image or a Dockerfile) | `Dockerfile` at the repository root |

The judges get the Vercel URL. It must work without login: the API needs no login for reading and analysing; only
`/explain` needs the team key.

## 1. API (Docker)

The image installs `requirements-api.txt` (8 packages), builds the warehouse from the committed CSVs and runs uvicorn
as a non-root user. Image size about 500 MB. Tested locally: 47/47 smoke checks, health check `healthy`.

```bash
docker build --build-arg GIT_COMMIT=$(git rev-parse --short HEAD) -t earthsignal-api .
docker run -p 8000:8000 --env-file api.env earthsignal-api      # api.env = the variables below, never committed
```

Host settings:
- **Port:** the container listens on `$PORT` (default 8000). If the host sets `PORT`, it is used.
- **Health check path:** `/health` (returns the warehouse build time and git commit).
- **Disk:** none needed. Investigations are stored in the container and are lost on restart; the front end recreates
  them automatically (expired ones are deleted after 7 days anyway).
- **Instances:** one. The rate limiter and the AI-narrative cache live in memory; several instances would each have
  their own limits.

Environment variables (set them in the host's secret/env settings, never in the repository):

| Variable | Value | Why |
|---|---|---|
| `CORS_ORIGINS` | `https://<your-app>.vercel.app` (comma-separate several; add the custom domain if any) | only the front end may call the API from a browser |
| `TRUST_PROXY_HEADERS` | `true` **only if** the host puts a proxy/load balancer in front (it almost always does) | otherwise every visitor shares the proxy's IP and one rate limit |
| `TEAM_API_KEY` | a new random value: `python -c "import secrets; print(secrets.token_urlsafe(24))"` | protects `/explain` |
| `DEEPSEEK_API_KEY` | your DeepSeek key | AI narrative; leave unset to disable it |
| `LLM_MAX_CALLS_PER_DAY` | `200` (lower it to cap cost) | daily cost cap |
| `LOG_FORMAT` | `json` (image default) | structured logs in the host's log viewer |
| optional | `RATE_LIMIT_PER_MINUTE`, `RATE_LIMIT_HEAVY_PER_MINUTE`, `LLM_RATE_LIMIT_PER_HOUR`, `MAX_INVESTIGATIONS` | see `src/earth_detective/backend/core/settings.py` |

The API must be reachable over **HTTPS** (the Vercel site is HTTPS; browsers block calls to plain HTTP).

## 2. Front end (Vercel)

1. Vercel → Add New → Project → import `Hacenbens/earth-system-trend-detective`.
2. **Root Directory:** `frontend`. Framework preset: Next.js (detected). Build and output settings: defaults.
3. **Environment variable:** `NEXT_PUBLIC_API_URL` = `https://<your-api-host>` (no trailing slash, no `/api/v1`).
   It is built into the browser code, so it is public by design. Never put `TEAM_API_KEY` or `DEEPSEEK_API_KEY` here.
4. Deploy. Then copy the production URL into the API's `CORS_ORIGINS` and restart the API.

Changing `NEXT_PUBLIC_API_URL` needs a new Vercel deployment (it is read at build time).

## 3. Check after deploying

```bash
curl https://<api>/health                                         # status ok + git commit
SMOKE_ORIGIN=https://<your-app>.vercel.app .venv/bin/python scripts/smoke_test_api.py https://<api>   # 47 checks
```
(Running the smoke test creates a few investigations and uses the rate limits for a minute.)

In the browser, on the Vercel URL: landing page video plays; Investigations → "Sahel Rainfall Study" → Detect shows
"Live · …" with real numbers; Report → Generate narrative works; Export → Print gives the PDF.

## 4. Before the judges' link goes out

- [ ] `CORS_ORIGINS` is the exact Vercel URL (not `*`).
- [ ] `TRUST_PROXY_HEADERS=true` (behind the host's proxy) and a burst of requests ends in 429 for one client only.
- [ ] New `TEAM_API_KEY` set on the API host (not the local one).
- [ ] DeepSeek: key set, daily cap chosen, provider spending limit set in the DeepSeek console.
- [ ] Repository public, README links the live app, AI use logged (`docs/submission/si_usage.md`).
