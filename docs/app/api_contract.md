# Application API contract (v0.1)

> **Status 2026-11-15: implemented** in `src/earth_detective/backend/` (clean architecture, see `docs/app/backend_architecture.md`) (FastAPI, reads the star-schema warehouse). Run `make api`, open `/docs`.
> Added beyond this contract: `GET /api/v1/variables`, `GET /api/v1/series` (stateless chart data), `GET /api/v1/trends` (precomputed 1998–2025 trends),
> `GET /api/v1/meta/build`, `GET /api/v1/investigations` (list), `GET /health`. Not yet: `GET …/detect/map` (gridded maps) and custom (non-preset) regions.
> Investigate statuses: `supporting` = significant (p < 0.05) with the sign the mechanism predicts, `contrasting` = significant with the opposite sign, `unclear` otherwise.
> Explain requires a `reviewer` (who confirmed the assessment).

Built from the team's layer contracts (`docs/team/contribution/layers_contracts.md`) and checked against the decision log and the code that already exists. Stack: FastAPI backend + light JS front-end (D-005).
Drafted with AI assistance (Claude Code). See `docs/submission/si_usage.md`.

---

## 1. Review of the layer contracts

The five-layer design, the handoffs and the "interpretation never replaces numbers" rule are adopted as written. Five adjustments keep it consistent with decisions already taken and with the time left:

| # | Contract says | Adjust to | Why |
|---|---|---|---|
| 1 | Start year **2001**, baseline 2001–2025 | **1998**–2025 (default), user-editable | D-006: IMERG V07 Final starts Jan 1998. Show the start-year sensitivity instead of fixing one start (E-005) |
| 2 | Sub-region "Western Sahel" as a pick | W 18°W–5°W, C 5°W–10°E, E 10°E–20°E, all 10–20°N: **provisional** until D-003b is decided | Already computed (E-007). The east is where the signal is |
| 3 | Layer 3 example "Decreasing rainfall" | Use the real result: wetting **tendency**, not significant (E-005) | Examples end up in the demo; they must match the data |
| 4 | 10 database entities, PDF/CSV/JSON/PNG export | **MVP: no database.** Each investigation is one JSON document (the same shape as the entities below) kept in memory and in `data/app/investigations/<id>.json`. Export JSON + CSV first; PDF last | 48-hour scope (D-005 defers PostGIS). The entity list stays the target schema |
| 5 | Layer 5 numeric water balance | MVP = the contract's own **Output 3, qualitative comparison**. Numeric model only with literature-backed parameters | The contract itself forbids invented intervention effects; we have no defensible parameters yet |

Also note:
- **"Quality flag" (Layer 1 dataset inputs):** IMERG has no per-cell flag in what we extract. We expose `valid_cells` (all 38,000 present), `randomError` where fetched, and the evidence-ledger caveats (Late Run, 2014 tail) as the quality status.
- **Monthly vs daily:** the contract's rule (extremes only from daily data) is already enforced in `src/earth_detective/extremes.py`.
- **EarthCARE** is ESA/JAXA and is shown as case studies only, never as a trend (D-002, D-010). The contract says the same.
- Remove the stray `nasa(4).pdf` lines in the contracts file (copy-paste citation marks).

## 2. What already exists for each layer

| Layer | Already built | Still to build |
|---|---|---|
| Global inputs / data preparation | `imerg.series()` (any box, any product, cached CSVs), `imerg.box_field()` (daily fields); local daily cube 1998–2025 May–Oct for the Sahel box (`data/raw/imerg_daily_box/`) | Dataset catalogue endpoint; MERRA-2 / MODIS fetchers |
| 1 DETECT | `trend.trend_summary()` (MK, Hamed–Rao, Yue–Wang, Sen + CI, OLS, AR(1), autocorrelation); `extremes.season_indices()` (10 ETCCDI indices per cell); start-year sensitivity; per-cell maps with FDR | Wrap as API; add trend direction label and MK S statistic |
| 2 INVESTIGATE | — | MERRA-2 moisture / OMEGA / dust series; correlation + lag; EarthCARE case files |
| 3 EXPLAIN | Evidence ledger format (`docs/research/evidence_ledger.md`, E-001…E-007) | Mechanism catalogue (5 mechanisms × expected observations); ledger records as JSON |
| 4 PROJECT | Sen's slope and baseline from Layer 1 | Three scenario formulas (simple) |
| 5 SOLVE | — | Qualitative intervention matrix with references |
| Report | Figures + CSVs in `outputs/` | Assemble JSON → HTML/PDF |

**Speed rule for the app:** anything inside the Sahel box 1998–2025 (JJAS) is computed **from the local daily cube in seconds**. A region or period outside it calls NASA OPeNDAP (minutes), so the API returns `202 Accepted` + a job id, and the result is cached.

---

## 3. Endpoints

Base path `/api/v1`. All requests and responses are JSON. Every response carries a `provenance` block (dataset, version, agency, variable, units, box, period, method, limitations), as the pipeline rule requires.

### Shared types

```json
// Region
{ "id": "sahel-east", "name": "Eastern Sahel (provisional)", "bbox": { "lat": [10, 20], "lon": [10, 20] } }

// Provenance
{ "dataset": "GPM IMERG Final", "version": "V07B", "agency": "NASA GES DISC", "product": "GPM_3IMERGDF",
  "variable": "precipitation", "units": "mm/day", "box": {"lat": [10, 20], "lon": [-18, 20]},
  "period": ["1998-06-01", "2025-09-30"], "season": [6, 7, 8, 9],
  "method": "per-cell index, cos(lat)-weighted box mean; Mann–Kendall + Sen",
  "limitations": ["Daily tail not homogeneous across 2014 (E-006)"] }
```

### Global

| Method | Path | Returns |
|---|---|---|
| GET | `/regions` | Sahel box + W/C/E sub-regions (GeoJSON `FeatureCollection`, each feature's `properties` = Region) |
| GET | `/datasets` | Catalogue: id, name, agency, version, variables (name, units, resolution), coverage dates, role (`trend` / `supporting` / `case-study` / `check`) |
| POST | `/investigations` | Create from the global inputs. Body below. Returns `{ id, config, prepared: {...} }` |
| GET | `/investigations/{id}` | Full investigation document (all layers so far) |

```json
// POST /investigations — body (contract section 1A)
{ "name": "Sahel Rainfall Study", "region_id": "sahel", "start_year": 1998, "end_year": 2025,
  "variable": "precipitation", "season": [6, 7, 8, 9], "datasets": ["imerg_final"] }

// response.prepared (contract section 1C)
{ "region": {...}, "available_dates": ["1998-01-01", "2025-09-30"], "variables": [{"name": "precipitation", "units": "mm/day"}],
  "time_resolution": "daily", "missing": {"cells_total": 38000, "cells_missing": 0, "days_missing": 0},
  "qc_status": "passed", "dataset": {"name": "GPM IMERG Final", "version": "V07B", "source": "NASA GES DISC OPeNDAP"},
  "common_period_with": {"chirps_v3": ["1998", "2025"]} }
```

### Layer 1 — DETECT

`POST /investigations/{id}/detect`

```json
// request
{ "region_ids": ["sahel", "sahel-west", "sahel-central", "sahel-east"],
  "metrics": ["PRCPTOT", "CDD", "SDII"], "resolution": "seasonal",
  "trend_method": "mann_kendall", "slope_method": "sen", "extremes": true }

// response: one TrendResult per region × metric (contract Output 1)
{ "results": [
  { "region_id": "sahel", "metric": "PRCPTOT", "label": "Season total on wet days", "unit": "mm",
    "direction": "no_significant_trend", "direction_hint": "increasing",
    "sen_slope": 1.43, "slope_unit": "mm/yr", "slope_ci95": [-0.58, 3.21], "pct_per_decade": 3.3,
    "mk_s": 74, "mk_tau": 0.196, "p_value": 0.149, "significant": false, "alpha": 0.05,
    "autocorrelation": { "lag1": -0.42, "method": "MK original kept (negative r1); Hamed–Rao floored; Yue–Wang TFPW p=0.055" },
    "cross_checks": { "ols_slope": 1.31, "ols_p": 0.172, "ar1_slope": 1.39, "ar1_p": 0.018, "ar1_note": "anti-conservative with negative AR" },
    "n": 28, "evidence_id": "E-006",
    "series": [ { "date": "1998", "value": 445.5, "anomaly": 11.0, "missing": false } ] } ],
  "start_year_sensitivity": [ { "start": 2000, "pct_per_decade": 4.9, "p_value": 0.022 } ],
  "provenance": {...} }
```

- `direction`: `increasing` / `decreasing` / `no_significant_trend` (from MK p < α). `direction_hint` is the sign of Sen's slope, shown as "tendency".
- `GET /investigations/{id}/detect/map?metric=PRCPTOT` → per-cell trend grid as JSON `{lat:[], lon:[], values:[[]], significant_fdr:[[]], unit}` for the regional trend map.

**Handoff L1 → L2** (stored in the investigation, contract wording): region, direction + magnitude, period + season, anomalies + unusual years (`|z| > 1.5`, e.g. 2002, 2024), metrics, significance + uncertainty.

### Layer 2 — INVESTIGATE

`POST /investigations/{id}/investigate`

```json
// request (region/period inherited from Layer 1 unless overridden)
{ "evidence": ["moisture", "circulation", "dust", "storm_structure", "vegetation"],
  "variables": ["merra2:TQV", "merra2:OMEGA500", "merra2:DUEXTTAU", "modis:NDVI"],
  "compare_to": "PRCPTOT", "mode": "time_series", "lags_months": [0, 1, 2] }

// response
{ "records": [ { "variable": "TQV", "dataset": "MERRA-2", "date": "1998", "region_id": "sahel",
                 "value": 0.0, "unit": "kg m-2", "anomaly": 0.0, "quality": "reanalysis" } ],
  "comparisons": [ { "rainfall_metric": "PRCPTOT", "supporting_variable": "TQV", "period": ["1998", "2025"],
                     "relationship": "spearman", "statistic": 0.0, "p_value": 0.0, "lag_months": 0,
                     "overlap": ["1998", "2025"], "status": "supporting|contrasting|unclear" } ],
  "case_studies": [ { "dataset": "EarthCARE CPR", "date": "2024-08-..", "profile_url": "/api/v1/files/..", "note": "process illustration only" } ],
  "provenance": {...} }
```
(Values shown as 0.0 are placeholders: no MERRA-2 data is fetched yet.)

### Layer 3 — EXPLAIN

| Method | Path | Returns |
|---|---|---|
| GET | `/mechanisms` | Catalogue: id, name, description, expected observations, references (5 mechanisms from the contract) |
| POST | `/investigations/{id}/explain` | Body: `{mechanism_id, supporting_evidence_ids, contradicting_evidence_ids, alternatives, interpretation, confidence}` → stores one MechanismAssessment (contract fields exactly) |

The API **suggests** a status per expected observation from Layer 2 results; the researcher confirms or edits it (contract: "must be able to review and edit"). Numbers always come from Layer 1/2 records by ID.

### Layer 4 — PROJECT

`POST /investigations/{id}/project`

```json
{ "metric": "PRCPTOT", "baseline_period": [1998, 2025], "start_year": 2025, "end_year": 2035,
  "scenarios": ["stabilization", "trend_continuation", "increased_stress"],
  "stress": { "type": "linear", "delta_per_year": -2.0, "unit": "mm/yr" },
  "assumptions": "Historical trend continues" }
```
Returns Scenario records (contract Output 1) per year and scenario: `X0` = baseline mean, `β` = Sen's slope from Layer 1, `δ(t)` = user stress. Every response repeats: **"Scenario, not a forecast. The historical trend is not significant (p = 0.15)."** when Layer 1 says so.

### Layer 5 — SOLVE (MVP: qualitative)

`GET /interventions` → the contract's 4 interventions with problem addressed, expected physical effect, reference, unknowns.
`POST /investigations/{id}/solve` → stores the selected comparison. Numeric water balance (`ΔS = P − ET − Q − D`) only when each parameter has a source; otherwise the endpoint answers `422` with the list of missing parameters.

### Report

| Method | Path | Returns |
|---|---|---|
| GET | `/investigations/{id}/report.json` | All layer records + references (contract section 7) |
| GET | `/investigations/{id}/report.csv` | Time series and comparison tables |
| GET | `/investigations/{id}/report.html` | Printable report (PDF from the browser later) |

---

## 4. Suggested split (5 people)

| Owner | Work | Depends on |
|---|---|---|
| Backend A | FastAPI app, `/regions`, `/datasets`, `/investigations`, Layer 1 endpoints on top of `trend.py` / `extremes.py` | nothing (code exists) |
| Backend B / science | MERRA-2 fetch (monthly TQV, OMEGA, dust) → Layer 2 endpoint; mechanism catalogue for Layer 3 | MERRA-2 download |
| Front-end | Region picker + Layer 1 chart/trend panel/map first, then layer tabs. Develop against the JSON examples above (mock files) | none: start now with mocks |
| Science lead | Layer 3 mechanism cards, evidence statuses, Layer 5 qualitative matrix with references | Layer 2 results |
| Integration / design | Report page, provenance footer on every chart, slides | all |

Front-end and Backend A can start immediately in parallel: the response shapes above are the contract between them.

## 5. To install (team lead)
```bash
uv pip install --python .venv/bin/python fastapi "uvicorn[standard]"
```
