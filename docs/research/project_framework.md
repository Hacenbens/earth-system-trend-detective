# Project framework (v0 — from initial research, 2026-11-13)

Working title: **Earth System Trend Detective**
Mission: detect significant atmospheric changes, investigate their vertical structure, and identify physical processes that could explain them.

## Three layers
| Layer | Question | Main sources |
|---|---|---|
| 01 Trend detection | What is changing? | NASA: GPM IMERG, MERRA-2, MODIS, OMI, AIRS |
| 02 Atmospheric structure | What is happening inside the atmosphere? | EarthCARE (ESA/JAXA): CPR, ATLID, MSI, BBR |
| 03 Physical interpretation | Why might it be happening? | NASA + EarthCARE + literature |

Reasoning chain: long-term dataset detects a significant trend → EarthCARE characterises the relevant structures during its (short) record → test whether those structures are *consistent with* mechanisms → compare with reanalysis and literature. **Evidence-based interpretation, not proof of causation.**

## Statistical protocol
Linear regression (direction/rate) · Mann-Kendall (+ seasonal / autocorrelation-corrected variants) · Sen's slope · confidence intervals · seasonal decomposition. Account for seasonality, autocorrelation, spatial sampling, and EarthCARE swath sampling bias.

## Scientific rigor rules (non-negotiable)
1. No invented observations — every result traceable to a dataset.
2. Correlation ≠ causation.
3. Every trend reports significance, uncertainty, limitations.
4. Never mix incompatible measurements (resolution, coverage, units, definitions checked).
5. Never extrapolate EarthCARE backwards in time.
6. MERRA-2 is a reanalysis (model + assimilation), not a direct observation.

All claims go in `evidence_ledger.md`.

## Pipeline
1 Define investigation → 2 Acquire data → 3 Harmonise → 4 Detect trends → 5 Vertical structure → 6 Mechanisms → 7 Report.

## Roadmap
01 Scientific framing · 02 Data acquisition · 03 Trend analysis · 04 Data fusion · 05 Application.
Each phase must produce something independently testable. Jupyter prototype before the app.

## Architecture (proposed in v0 — see DECISIONS.md D-005 for scope review)
UI → FastAPI → NASA connector (Earthdata/Giovanni) + EarthCARE connector (ESA MAAP/OADS) → processing engine (xarray, pandas, SciPy, pymannkendall) → evidence engine → report.
