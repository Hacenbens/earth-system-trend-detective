# Layer 4 — PROJECT

> **Scenario, not a forecast.** Layer 4 never says what *will* happen. It says what *would* happen *if* a stated assumption holds.

Part of **Earth System Trend Detective** (NASA Space Apps 2026), Sahel case study `INV-001`.

This folder is a **self-contained Layer 4 service** (FastAPI). It reads the Layer 1 result and two input series, and writes the Layer 4 section of the investigation.

---

## 1. What Layer 4 does, in one minute

Think of the five layers as a patient file:

| Layer | Question | Patient analogy |
|---|---|---|
| 1 · Detect | Has rainfall changed? | the measurement: "blood pressure rose slightly over 28 years" |
| 2 · Investigate | What else changed with it? | the lab tests |
| 3 · Explain | Which physical mechanism fits? | the diagnosis |
| **4 · Project** | **What could rainfall look like by 2035, and what would that mean for the land?** | **the prognosis: "if nothing changes / if the trend continues / if it gets worse"** |
| 5 · Solve | Which interventions help in all of those futures? | the treatment |

Layer 4 takes the rainfall trend **measured** by Layer 1 and turns it into **three labelled what-if futures**. It shows how far apart they are, then translates each one into **vegetation greenness**, using a relation we measured between NASA rainfall and NASA vegetation data. Everything it outputs is passed to Layer 5.

---

## 2. Inputs

| | Input | Source | Value for INV-001 | Used for |
|---|---|---|---|---|
| A | **Layer 1 trend** | `detect` section of `INV-001.json` (evidence `E-006`) | Sen's slope **β = +1.43 mm/yr**, 95 % range **−0.58 to +3.21**, Mann-Kendall **p = 0.149** (not significant), period 1998–2025 | slope of the "trend" scenario, uncertainty band, warning text |
| B | **Rainfall per year** | `data/prepared/INV-001/prcptot_jjas.csv` — NASA **IMERG V07 Final**, June–September total on wet days (PRCPTOT), Sahel box 10–20°N, 18°W–20°E | 28 years, mean **434.5 mm** | baseline **X0** |
| C | **Vegetation per year** | `data/prepared/INV-001/E-104.csv` — NASA **MODIS MOD13C2 v6.1** NDVI (via NASA Earthdata), Sahel box, vegetated pixels only, summed July–October | 8 years (2018–2025) | rain → greenness model |
| D | **Researcher's choices** | the request body of `POST /project` | start 2025, end **2035**, stress **δ = −2 mm/yr** | which futures, how far, how harsh |

Layer 4 **reads** A, B and C and never changes them. Layer 1's numbers stay Layer 1's.

Example request (input D):

```json
{
  "start_year": 2025,
  "end_year": 2035,
  "scenarios": ["stabilization", "trend_continuation", "increased_stress"],
  "stress": { "type": "linear", "delta_per_year": -2.0, "unit": "mm/yr" }
}
```

---

## 3. Method

### Step 1 — Baseline

`X0` = mean of input B over the baseline period (default: Layer 1's period, 1998–2025) = **434.5 mm**.

### Step 2 — Three scenarios (team contract formulas)

`t0` = start year (2025), `t` = any year up to the horizon.

| Scenario | Formula | Meaning |
|---|---|---|
| **Stabilization** | `X(t) = X0` | nothing changes |
| **Trend continuation** | `X(t) = X0 + β (t − t0)` | Layer 1's trend keeps going |
| **Increased stress** | `X(t) = X0 + β (t − t0) + δ (t − t0)` | the trend plus an extra stress chosen by the researcher (`linear`, or `constant` = same δ every year) |

**Uncertainty band (`low` / `high`):** the same formula computed with the two ends of Layer 1's 95 % slope range (−0.58 and +3.21). Stabilization has no band because it assumes no change.

### Step 3 — Rain → greenness (the model)

A straight line fitted on the years present in both B and C:

```
NDVI = a + b × rain          (ordinary least squares)
```

Then each scenario's rainfall goes into the line to give the **greenness that rainfall would imply**. Values outside the rainfall range used for fitting are flagged `extrapolated: true`.

**Why a straight line and not machine learning?** There are only 8 years of NDVI. A neural network or random forest would memorise noise. Two parameters is what 8 points can honestly support, and anyone can check it by hand.

**RESTREND:** the residuals (real NDVI − NDVI predicted from rain) are tested for a trend with Mann-Kendall + Sen.
- residuals rising → greener than the rain alone explains (possible land use, regrowth, CO₂)
- residuals falling → less green than the rain explains (possible degradation)

### Step 4 — Labels

The result carries the warning, every assumption (X0, β, t0, δ) and the limitations.

---

## 4. Outputs

### Output 1 — Scenario data

One row per scenario per year (3 scenarios × 11 years = 33 rows):

```json
{
  "scenario_id": "SCN-TREND",
  "scenario_name": "trend_continuation",
  "variable": "PRCPTOT",
  "year": 2035,
  "projected_value": 448.833,
  "unit": "mm",
  "baseline_value": 434.533,
  "assumed_slope": 1.43,
  "stress_perturbation": null,
  "low": 428.733,
  "high": 466.633
}
```

### Output 2 — Comparison against stabilization

| 2035 | Rain | Difference | % |
|---|---|---|---|
| Stabilization | 434.5 mm | 0 | 0 % |
| Trend continuation | 448.8 mm | +14.3 mm | +3.29 % |
| Increased stress (δ = −2) | 428.8 mm | −5.7 mm | −1.31 % |

### Output 3 — Impact indicators

Every indicator is labelled **"Calculated indicator, not a measured impact"** (or "qualitative pathway").

| ID | Indicator | Result (2035) |
|---|---|---|
| `IND-RAIN` | season rain as % of baseline | 100.0 % / 103.29 % / 98.69 % |
| `IND-NDVI` | greenness implied by the rain | **1.553 / 1.571 / 1.546**, none extrapolated |
| | the model | NDVI = 1.0003 + 0.001272 × rain · **R² = 0.55 · p = 0.036** · n = 8 (2018–2025) · rain range 404–521 mm |
| | RESTREND | residuals **+0.014 per year, p = 0.004** → "greener than the rain alone explains" |
| `IND-WATER` | water-stress pathway | qualitative: less rain → less soil water → more crop and pasture stress |
| `IND-DRYSPELL` | dry-spell exposure | **not available**: needs a daily-rainfall model |

### Always included

- **Disclaimer:** `"Scenario, not a forecast. The historical trend is not significant (p = 0.15)."`
- **Assumptions** and **limitations** (section 8)
- **Handoff to Layer 5:**

```json
{
  "baseline": { "value": 434.533, "unit": "mm", "period": [1998, 2025], "source": "rainfall_series", "n": 28 },
  "period": [2025, 2035],
  "end_year_values": { "stabilization": 434.533, "trend_continuation": 448.833, "increased_stress": 428.833 },
  "indicator_ids": ["IND-RAIN", "IND-NDVI", "IND-WATER"]
}
```

---

## 5. Worked example

**Question:** a Sahel farmers' cooperative asks *"How much rain should we plan for in 2035, and will the pasture be greener?"*

1. Baseline: 1998–2025 average = 434.5 mm.
2. Ten years ahead (2035 − 2025 = 10):
   - stabilization: 434.5 mm
   - trend: 434.5 + 1.43 × 10 = **448.8 mm** (band 428.7–466.6)
   - stress: 434.5 + (1.43 − 2) × 10 = **428.8 mm** (band 408.7–446.6)
3. Greenness: 1.0003 + 0.001272 × 448.8 = **1.571**, and so on.
4. **Reading:** the three futures differ by about **20 mm**. A normal year already swings by about **±41 mm**, and the dry year 2002 had only 348 mm. So the useful message is *plan for variable years*. A single dry year matters far more than ten years of trend.

---

## 6. API

Base URL: `http://127.0.0.1:8000/api/v1`

| Method | Path | What it does |
|---|---|---|
| GET | `/investigations/{id}/project/input` | Layer 1 trend, data available, default request, observed rainfall and NDVI series |
| POST | `/investigations/{id}/project/preview` | compute scenarios **without saving** (to try settings) |
| POST | `/investigations/{id}/project` | compute and **save** into the investigation (`201`) |
| GET | `/investigations/{id}/project` | the saved result (`404` before the first run) |

**Errors**

| Code | When |
|---|---|
| `409` | Layer 1 has not produced the requested metric |
| `422` | no baseline (missing `prcptot_jjas.csv` and no `baseline_value`), or invalid request (e.g. `increased_stress` without `stress`, end year before start year). The body lists what is missing. |

Optional request fields: `baseline_period` (e.g. `[1998, 2025]`) and `baseline_value` (override X0).

---

## 7. Limitations (say these out loud)

1. **The trend is not significant** (p = 0.149) and its 95 % range includes zero. The "trend" scenario could be flat or even reversed.
2. **Straight-line extension** of a 28-year record. There is no climate physics.
3. **The NDVI model has only 8 years** (2018–2025), so its slope is uncertain (95 % range 0.0001 to 0.0024). The dry year 2002 has no NDVI value.
4. **RESTREND cannot separate** a non-rain cause of greening that rises together with the rain.
5. **Box average.** Local differences inside the Sahel are not shown.
6. **Seasonal totals only.** Dry spells within the season are not projected.

## 8. What Layer 4 does not do

- It does not **predict** rainfall.
- It does not **recompute** Layer 1's trend.
- It does not **choose** interventions. That is Layer 5.

---

## 9. Files

| File | Role |
|---|---|
| `app/services/layer4/engine.py` | the engine: baseline, scenarios, comparison, indicators, RESTREND |
| `app/services/stats.py` | Mann-Kendall + Sen, least-squares fit with 95 % slope interval |
| `app/schemas/project.py` | request and output schemas (Pydantic) |
| `app/api/v1/endpoints/project.py` | the 4 Layer 4 endpoints |
| `app/schemas/detect.py`, `app/schemas/investigation.py` | the Layer 1 result Layer 4 reads, and the investigation document |
| `app/services/storage.py` | one JSON file per investigation (team contract: no database in the MVP) |
| `tests/test_project.py` | formulas checked against hand-computed values, NDVI fit, RESTREND, API flow, errors |
| `data/app/investigations/INV-001.json` | the investigation: config + **real Layer 1 result** (other layers' sections empty; Layer 4 fills `project`) |
| `data/prepared/INV-001/prcptot_jjas.csv` | input B: JJAS PRCPTOT 1998–2025 from the team's IMERG analysis (`sahel_jjas_extreme_indices_1998_2025.csv`, E-006) |
| `data/prepared/INV-001/E-104.csv` | input C: MODIS NDVI Jul–Oct sums 2018–2025 |

## 10. Run it

```bash
cd layer4
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python -m pytest -q                      # 10 passed
uvicorn app.main:app --reload            # http://127.0.0.1:8000/docs → "layer 4 - project"

curl -s -X POST http://127.0.0.1:8000/api/v1/investigations/INV-001/project \
  -H "Content-Type: application/json" \
  -d '{"start_year":2025,"end_year":2035,"scenarios":["stabilization","trend_continuation","increased_stress"],"stress":{"type":"linear","delta_per_year":-2.0,"unit":"mm/yr"}}'
```

---

## 11. How to say it in the presentation

> "Layer 4 is a what-if simulator, not a crystal ball. We take the rainfall trend Layer 1 measured with NASA IMERG and test three futures for 2035: nothing changes, the trend continues, or conditions get harder. They differ by only about 20 millimetres, less than a normal year's swing, and the trend itself isn't significant. We then translate each rainfall into vegetation, using the relation we measured between IMERG rain and NASA MODIS greenness: rain explains about half of the year-to-year greening. The message for Layer 5 is to plan for variable years, not for a trend."
