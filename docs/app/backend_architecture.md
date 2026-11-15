# Backend architecture

Clean architecture + SOLID + Result pattern + structured logging. Code: `src/earth_detective/backend/`. Run `make api`, test `make test`.
Drafted with AI assistance (Claude Code). See `docs/submission/si_usage.md`.

## 1. Layers and the dependency rule

```mermaid
flowchart TB
  subgraph I["interfaces/http (FastAPI)"]
    R[routers] --> DTO[DTOs] ; R --> RESP[Result → HTTP] ; MW[middleware: request id, access log, errors] ; C[container: composition root]
  end
  subgraph A["application (use cases)"]
    UC[DetectTrends · InvestigateEvidence · ExplainMechanism · ProjectScenarios · CompareInterventions · reports · catalogue queries]
    SV[services: RegionValidator · SeriesSelector · TrendAssessor · InvestigationLoader]
  end
  subgraph D["domain (pure Python)"]
    M[models] ; RU[rules / policies] ; RES[Result] ; P[ports = Protocols]
  end
  subgraph INF["infrastructure (adapters)"]
    SQL[SQLite warehouse repositories] ; JS[JSON investigation store] ; ST[statistics: Mann–Kendall, Spearman] ; LOG[logging config]
  end
  I --> A --> D
  INF -. implements .-> P
  C -. wires .-> INF
```

| Layer | Knows about | Never imports |
|---|---|---|
| `core/` (shared kernel) | the standard library only | any other backend package, any framework |
| `domain/` | `core` + the standard library | FastAPI, pydantic, SQLite, application, infrastructure |
| `application/` | `core`, `domain` | FastAPI, pydantic, SQLite, infrastructure |
| `infrastructure/` | `core`, `domain` (+ scipy/sqlite) | application, interfaces |
| `interfaces/http/` | everything (it is the outermost ring) | — |

Checked with a grep on every change (`docs/app/backend_architecture.md` §6).

### The shared kernel: `core/`
Everything that several layers need and that is not business logic lives in `src/earth_detective/backend/core/`:

| Module | Content |
|---|---|
| `settings.py` | `Settings`, one immutable object read once from the environment (`get_settings()`); the **only** place that reads `os.environ` |
| `constants.py` | fixed method and API values: `ALPHA`, `MIN_SEASONS`, `FIRST_YEAR`/`LAST_YEAR`, `SEASON_MONTHS`, `SENSITIVITY_SPAN`, `EXTREME_METRICS`, `API_PREFIX`, `REQUEST_ID_HEADER`, log-file limits, shared disclaimers |
| `enums.py` | `ErrorKind`, `DatasetRole`, `DatasetKind`, `QualityFlag`, `Grain`, `TrendDirection`, `EvidenceCategory`, `EvidenceStatus`, `ExpectationStatus`, `Confidence`, `ScenarioKind`, `RainfallMetric`, `Layer`, `LogFormat` (all `StrEnum`: they serialise as plain strings) |
| `helpers.py` | pure functions: `utc_now_iso`, `new_investigation_id`, `is_valid_investigation_id`, `new_request_id`, `json_safe`, `linear_detrend`, `mean`, `rms` |

Settings (environment variables):

| Variable | Default | Meaning |
|---|---|---|
| `TREND_DETECTIVE_DB` | `data/warehouse/trend_detective.sqlite` | warehouse built by `make warehouse` |
| `TREND_DETECTIVE_STORE` | `data/app/investigations` | investigation JSON documents |
| `LOG_LEVEL` | `INFO` | DEBUG, INFO, WARNING, ERROR |
| `LOG_FORMAT` | `json` | json or text |
| `LOG_FILE` | none | optional rotating log file |
| `CORS_ORIGINS` | `*` | comma-separated allowed origins (set the front-end URL in production) |

Invalid values fail at start-up with a clear message. Constants are not settings: changing one changes the science or the API contract, so it goes through the decision log.

## 2. SOLID, concretely
| Principle | Where |
|---|---|
| **S**ingle responsibility | One use case per action (`DetectTrends`, `ExplainMechanism`, …). Services split by job: `RegionValidator`, `SeriesSelector`, `TrendAssessor`. Repositories split by concern (catalogue, observations, mechanisms, cases, build info). `SqliteWarehouse` only owns the connection. |
| **O**pen/closed | Dataset choice is a `DatasetRankingPolicy` (default `RoleThenCoveragePolicy`): a new policy is a new class. The evidence status rule, scenario formulas and expected signs live in `domain/rules.py`. A new layer = a new use case + router, nothing else edited. New interventions are data in `StaticInterventionCatalogue`. |
| **L**iskov substitution | Every adapter can replace another: the tests run all use cases on in-memory fakes (`tests/fakes.py`) with no SQLite and no FastAPI. |
| **I**nterface segregation | Small ports in `domain/ports.py`: `CatalogueReader`, `ObservationReader`, `MechanismReader`, `CaseStudyReader`, `InvestigationRepository`, `TrendAnalyzer`, `AssociationAnalyzer`, `Clock`, … Each use case receives only the ports it uses. |
| **D**ependency inversion | Use cases depend on `Protocol` ports; `interfaces/http/container.py` is the only place that names concrete classes. Moving to PostgreSQL means writing new repositories and changing the container. |

## 3. Result pattern
`domain/result.py`: `Ok(value)` / `Err(AppError(kind, message, details))`, with `map`, `and_then`, `unwrap_or`, `collect`, `partition`.
- Use cases **return** expected failures instead of raising them (unknown region, too few seasons, missing reviewer, numeric water balance without sources, CSV before detect).
- Batch steps keep partial results: `/detect` returns the trends it could compute and lists the rest in `skipped` with the error kind.
- `interfaces/http/responses.py` is the **single** place mapping errors to HTTP:

| ErrorKind | HTTP | Example |
|---|---|---|
| `not_found` | 404 | unknown investigation |
| `validation` | 422 | unknown region, period < 15 seasons, missing reviewer, malformed body |
| `conflict` | 409 | CSV report before `/detect` |
| `not_available` | 422 | numeric water balance without published parameters |
| `unexpected` | 500 | any unhandled exception (logged with traceback) |

Every error body has the same shape: `{"error": {"kind", "message", "details", "request_id"}}`.

## 4. Logging
`infrastructure/logging_config.py`, configured at app start.
- **JSON lines** by default (`LOG_FORMAT=json`), readable lines with `LOG_FORMAT=text`; level with `LOG_LEVEL`; optional rotating file with `LOG_FILE`.
- **Request ID** on every record: taken from the `X-Request-ID` header or generated, stored in a context variable, returned in the response header and in error bodies.
- **Access log** (`earth_detective.backend.access`): method, path, query, status, duration in ms (replaces uvicorn's access log).
- **Domain events** from use cases: `investigation.created`, `layer.detect`, `layer.investigate`, `layer.explain`, `layer.project`, `layer.solve`, with the investigation ID.
- **Errors**: every `Err` returned to a client is logged (`request.error`, level INFO for 4xx, ERROR for 5xx); unhandled exceptions are logged with the full traceback (`http.unhandled`).

Example (`LOG_FORMAT=text`):
```
02:20:40 INFO    [4ea0ad6942ea] earth_detective.backend.application.layers: detect completed | event=layer.detect investigation_id=02b05f5c2ec4 results=9 skipped=0
02:20:40 INFO    [89ca8fa736fa] earth_detective.backend.interfaces.http.responses: request failed | event=request.error kind=validation status=422 ...
02:20:40 INFO    [demo-123] earth_detective.backend.access: request | event=http.access method=GET path=/api/v1/regions status=200 duration_ms=0.8
```

## 5. Request flow (detect)
`POST /api/v1/investigations/{id}/detect` → router → `DetectDTO.to_command()` → `DetectTrends.execute(cmd)` → `InvestigationLoader` (Result) → `RegionValidator` (Result) → `TrendAssessor` per region × metric (`SeriesSelector` + `TrendAnalyzer` port) → save through `InvestigationRepository` → `Ok(result)` → `to_response()` → JSON.

## 6. Tests and checks
- `make test`: 14 unit tests (domain rules, Result, every use case) on in-memory adapters.
- End-to-end check (2026-11-15): every endpoint returned the same numbers as the previous implementation (e.g. Sahel +3.1 %/decade p = 0.161; east CHIRPS +7.9 % p = 0.026; east dry spell −9.6 % p = 0.001).
- Dependency rule (also: `core/` imports no other backend package and no framework; `os.environ` appears only in `core/settings.py`): `grep -rnE "from \.\.(application|infrastructure|interfaces)|import (fastapi|sqlite3|pydantic)" src/earth_detective/backend/domain` returns nothing (same for `application/` against infrastructure and frameworks).
- Not yet: HTTP-level tests (need `httpx` for FastAPI's TestClient).
