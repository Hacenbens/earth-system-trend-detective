# Analysis pipeline and methods

Defined by the team lead on 2026-11-14 (decision D-014). This file maps each step to its status, the code that implements it, and the decision behind it.
Status: ✅ done · 🟡 in progress · ⬜ to do · ✖ not adopted (with reason)

---

## 1. Toolchain (six layers)

| Layer | Tools | Use in this project | Installed? |
|---|---|---|---|
| **1. Data acquisition** | Python, earthaccess (Earthdata), CHC/CHIRPS, GPM, EarthCARE | NASA OPeNDAP box subsets (`src/earth_detective/imerg.py`); CHIRPS GeoTIFFs (`scripts/fetch_chirps_sahel.py`); EarthCARE via ESA (D-010) | ✅ earthaccess, requests |
| **2. Scientific data processing** | xarray, netCDF4, h5py, ~~Dask~~, ~~Zarr~~ | Read, subset and aggregate daily/monthly fields | ✅ xarray, netCDF4, h5py. Dask/Zarr not needed: the whole daily cube is ~230 MB |
| **3. Geospatial processing** | GeoPandas, Shapely, ~~Rasterio, rioxarray~~ | Sub-region boxes (west/central/east), optional published Sahel boundary mask | ⬜ GeoPandas/Shapely (only needed for a non-rectangular boundary). Rasterio not needed: CHIRPS GeoTIFFs are read with Pillow |
| **4. Statistics** | SciPy, statsmodels, pymannkendall, ~~scikit-learn~~ | Indices, trends, slopes, significance, relationships | ✅ SciPy, statsmodels, pymannkendall. scikit-learn only if a clustering step (regimes) is added |
| **5. Visualisation** | Matplotlib, Plotly, Cartopy, Seaborn | Time series, trend maps, distributions, vertical profiles; Plotly for the web app | ✅ Matplotlib, Plotly. ⬜ Cartopy (maps with coastlines/borders for slides). Seaborn optional |
| **6. Reproducibility** | Jupyter, Git, Parquet, ~~MLflow~~ | Scripts + notebooks, decision log, evidence ledger, small committed CSVs | ✅ Git. ⬜ JupyterLab/ipykernel (listed in requirements but not installed), pyarrow (Parquet). MLflow not adopted: no model training to track |

Rule: every script writes a provenance note (dataset, version, box, period) in its docstring, figure footer or file attributes.

---

## 2. Methods

### A. Descriptive statistics and climate indicators: *what happened*
| Method | Status | Where |
|---|---|---|
| Mean, median, standard deviation | ✅ | `trend.trend_summary` (mean); JJAS sd = 37 mm (CHIRPS) |
| Anomalies vs a reference climatology | ✅ (CHIRPS 1998–2025) ⬜ (IMERG, in app) | `docs/research/evidence_ledger.md` E-004 |
| Seasonal decomposition (STL, statsmodels) | ⬜ | on the monthly IMERG series 1998–2025 (`data/processed/sahel_imerg_final_monthly_1998_2025.csv`) |
| Rainfall indices (intensity, frequency, duration): PRCPTOT, wet days, SDII, Rx1day, Rx5day, R10mm, R20mm, CDD, R95p, R95pTOT | ✅ computed (E-006); 🟡 daily gauge-based check pending | `src/earth_detective/extremes.py`, `scripts/analyze_extremes.py` |
| Moving averages (e.g. 5-yr) | ⬜ | figures + app |
| **Long record from 1981** | ⬜ as **context only** | CHIRPS v3 (1981–) and GPCP V3.3 (1983–) put 1998–2025 in perspective (drought-recovery cycle). The NASA trend period stays 1998–2025 (D-002, D-006) |

### B. Statistical trend detection: *core of H1/H2*
| Method | Status | Where / note |
|---|---|---|
| Linear regression (OLS slope + CI) | ✅ | `trend_summary` (`ols_*`) |
| **Trend with AR(1) errors** (ARIMA(1,0,0) + time regressor, statsmodels) | ✅ | `trend_summary` (`ar1_*`). Answers "why not ARIMA?". **Slopes agree with Sen and OLS within ~0.1 mm/yr for every series.** Rule: AR(1) confirms the slope, while significance is taken from MK (or OLS when the AR coefficient is not significant). With our negative, non-significant AR coefficients (e.g. −0.41, p = 0.10 for JJAS totals), AR(1) p-values are anti-conservative (0.023 vs MK 0.161) |
| Mann–Kendall | ✅ | `trend.py` |
| **Autocorrelation check + adjusted MK** | ✅ | lag-1 autocorrelation reported; Hamed–Rao (floored at 1) and Yue–Wang TFPW. Negative autocorrelation found (−0.42), so the original MK is the conservative choice |
| Sen's slope + 95 % CI | ✅ | `scipy.stats.theilslopes` |
| Change-point detection | 🟡 | 2014 TRMM→GPM homogeneity check done (no break, E-005). ⬜ add a Pettitt test for regime shifts |
| Confidence intervals | ✅ | Sen CI; start-year sensitivity table (`outputs/jjas_start_year_sensitivity.csv`) |

### C. Spatial analysis: *where it changes*
| Method | Status | Note |
|---|---|---|
| Area-weighted averages | ✅ | cos(lat) weights everywhere |
| West / central / east Sahel sub-regions | 🟡 computed with the provisional borders (E-007); D-003b still open | Needs D-003b. Proposal: W 18°W–5°W, C 5°W–10°E, E 10°E–20°E, all 10–20°N (to confirm against literature, L-12) |
| Pixel-by-pixel trends | ✅ (`scripts/eda_correlation_maps.py`) | possible directly from the daily IMERG cube (JJAS totals and indices per 0.1° cell) |
| Trend-magnitude and significance maps with multiple-testing correction | ✅ BH-FDR; only 0.3 % of cells significant (E-007) | Benjamini–Hochberg FDR across pixels (Wilks 2016, field significance). Show only FDR-significant stippling |
| CHIRPS vs GPM spatial comparison | ⬜ | `fetch_chirps_sahel.py` keeps only box means today, so it must be extended to save the JJAS field (0.05°, regrid to 0.1°) |

### D. Atmospheric relationship analysis: *why* (Layers 2–3, D-010)
| Question | Data | Method |
|---|---|---|
| Does rainfall rise with atmospheric moisture? | MERRA-2 TQV, QV | correlation, regression; Clausius–Clapeyron scaling check (~7 %/K) for extremes |
| Moisture transport? | MERRA-2 IVT / u,v,q | correlation, composites of wet vs dry seasons |
| Vertical motion vs rainfall? | MERRA-2 OMEGA profiles; EarthCARE CPR Doppler (2024–25, case studies only) | composites, profiles. ✅ MERRA-2 OMEGA500 (E-008). ✅ EarthCARE CPR/ATLID case studies (E-012) |
| Different regimes? | MERRA-2 fields | composite analysis (wet/dry terciles); clustering only if time allows |
| Lagged relationships | all of the above | lagged correlation |

All of these show **association, not causation**. Every Layer-3 claim gets an evidence card in the ledger with alternatives and a confidence level.

### C+. Multivariate analysis (added 2026-11-15)
| Method | Status | Where |
|---|---|---|
| Spatial PCA / EOF of per-cell JJAS rainfall and dry spells (standardised, 0.5°, North et al. separability) | ✅ E-015 | `scripts/eof_composites.py` |
| Wet vs dry season composites (detrended tercile selection, Welch tests, maps) | ✅ E-016 | `scripts/eof_composites.py` |
| Coupled rainfall–atmosphere patterns (MCA / CCA) | ⬜ optional | – |
| Multiple regression / partial correlation of drivers (≤ 3–4 predictors, collinearity check, leave-years-out validation) | ⬜ optional | – |
| Variable clustering / rotated PCA for an index without double counting (T-19) | ⬜ optional | – |

### E. Impact add-on: NDVI (D-011)
JJAS rainfall anomaly vs growing-season NDVI anomaly (MODIS MOD13, AppEEARS), with 0–2 month lags. "Associated with" language only.

---

## 3. Pipeline order (what runs after what)
1. ✅ Acquisition and validation (Giovanni, CHIRPS cross-checks)
2. ✅ H1 seasonal totals: trend + sensitivity + 2014 check (E-005)
3. 🟡 H2 extremes: indices + trends done (E-006). Pending: daily cross-check with CHIRPS daily / GHCN gauges because the IMERG daily tail is not homogeneous across 2014
4. 🟡 Spatial: pixel trend maps with FDR and provisional sub-regions done (E-007, robustness checks). Pending: CHIRPS per-region check, D-003b borders, CHIRPS vs GPM maps
5. 🟡 Layers 2–3: MERRA-2 moisture, ascent, convergence, winds, dust done (E-008 to E-011). Layer 3 evidence cards drafted (`data/app/mechanisms.json`, `docs/research/evidence_cards.md`; M-01 monsoon circulation = medium, others low). Next: science-lead review, EarthCARE case studies, wind shear, soil moisture, MODIS AOD check of the dust trend
6. ⬜ NDVI add-on
7. ⬜ App (FastAPI + JS, D-005) reads the processed outputs; slides

## 4. Data-quality notes found so far
- IMERG Late Run is not trend-quality (E-004: 20-point swing vs CHIRPS in 2026).
- Daily IMERG Final single-cell maxima of 561 and 640 mm/day (1999, 2000) are spatially coherent storms (0 isolated pixels), not glitches, and are too few to move box means.
- **But the daily tail is not homogeneous across 2014**: the wet-day 99.9th percentile is 112 mm/day in 1998–2013 vs 103 in 2014–2025, the share of light wet days (< 2 mm) falls steadily, and SDII steps up at 2014. Extreme-index trends from IMERG alone are therefore TO-VERIFY (E-006) until a daily gauge-based check.
- **EDA findings for the index (2026-11-14):** season total, wet days, R10mm and R20mm are near-duplicates (Spearman ρ 0.88–0.98), so the prototype index double-counts one signal. CDD is the most independent indicator (|ρ| ≤ 0.64). PCA: PC1 = 79 % of variance (one overall "wet season" mode); PC2 is mainly CDD. Distributions are close to normal (Shapiro p > 0.05 except R95pTOT), so z-scores are acceptable. Box means are dominated by the wet south-west (10–13°N ≈ 866 mm vs 16–20°N ≈ 120 mm; the west carries 45 % of box rain).

---

## 5. Task tracker

Update the status here when a task moves: ⬜ to do · 🟡 in progress · ✅ done · ⛔ blocked. Owner "Claude" = can be done by the AI assistant in-session (logged in `docs/submission/si_usage.md`); "Team" = needs a person (decision, credentials, review). Last updated: 2026-11-15.

### Layer 2: vertical structure with EarthCARE (ESA–JAXA; CPR by JAXA/NICT, ATLID by ESA). D-010 core, highest risk
| ID | Task | Status | Owner | Depends on | Estimate |
|---|---|---|---|---|---|
| T-01 | Candidate overpass list: heavy-rain days JJAS 2024–2025 in the box (IMERG daily, on disk) matched to EarthCARE ground tracks | ✅ 673 passes, 345 cross ≥ 20 mm/day rain, 26 strong cases with lidar + synergy products (`outputs/earthcare/overpass_candidates_2024_2025.csv`, `scripts/earthcare_candidates.py`) | Claude | – | done |
| T-01b | Confirm the shortlisted cases with IMERG **half-hourly** rain at the overpass time (daily totals can miss timing), and add one dusty pre-monsoon case (June 2025) for the dust card | ✅ 7 of 15 daily candidates had no rain at overpass time (removed). Recommended: 3 storms (east 2024-09-02, central 2024-08-23, west 2025-08-14) + 1 dry case (east 2025-06-11). Exact files: `outputs/earthcare/download_list.csv` (priority 1 = 12 files) | Claude | T-01 | done |
| T-02 | Confirm EarthCARE data access (ESA account the team holds, or JAXA G-Portal) and the exact level-2 product names: CPR reflectivity + Doppler, ATLID aerosol layers/extinction, combined target classification | ✅ MAAP offline token + client secret in `.env` | Team (account holder) | – | 30 min |
| T-03 | Download the 12 priority-1 files in `outputs/earthcare/download_list.csv` (3 products × 4 cases) into `data/raw/earthcare/` | ✅ 12 files, 39 MB (`scripts/fetch_earthcare.py`) | Claude | T-01b, T-02 | 30–60 min |
| T-04 | Height-vs-distance cross-sections (CPR reflectivity, Doppler velocity, ATLID dust layer vs cloud); add results to cards M-03 and M-04. Case studies only, never a trend (D-002) | ✅ 4 cross-sections + metrics (E-012); cards M-03 (now low-medium) and M-04 updated | Claude | T-03 | done |

### Layers 2–3: atmosphere and evidence cards
| ID | Task | Status | Owner | Depends on | Estimate |
|---|---|---|---|---|---|
| T-05 | Wind shear 600–925 hPa from MERRA-2 pressure levels (M2IMNPASM), for card M-03 | ✅ no shear trend (E-013); M-03 expectation marked inconsistent | Claude | – | done |
| T-06 | Soil moisture (MERRA-2 M2TMNXLND GWETTOP), for card M-05 | ✅ wetter, more evaporative land (E-014); M-05 now 'low' (land response yes, feedback unproven) | Claude | – | done |
| T-07 | Check the MERRA-2 dust trend and its 2025 anomaly (−3 σ) against MODIS AOD directly (E-010) | ⬜ | Claude | – | 20–30 min |
| T-08 | Science-lead review of the 5 evidence cards: confirm or edit interpretations and confidence (`data/app/mechanisms.json`) | ⬜ | Team (science lead) | – | 30 min |
| T-09 | Second humidity source (e.g. AIRS) to confirm the MERRA-2 moistening (E-008) | ⬜ optional | Claude | – | 30 min |
| T-10 | Ocean / remote forcing test for card M-02 (SST or global temperature vs Sahel moisture) | ⬜ optional | Claude | – | 30 min |

### Layer 1: checks and spatial
| ID | Task | Status | Owner | Depends on | Estimate |
|---|---|---|---|---|---|
| T-11 | CHIRPS per-sub-region check of the eastern signal (E-007) | ✅ CHIRPS east +7.9 %/decade, p = 0.026; west/central flat (`outputs/chirps_subregion_check.csv`) | Claude | – | done |
| T-12 | Daily rain-gauge check of extremes (CHIRPS daily or GHCN stations), to resolve the 2014 tail issue (E-006) | ⬜ | Claude | – | 1 h |
| T-13 | Pettitt change-point test | ⬜ | Claude | – | 10 min |
| T-14 | Seasonal decomposition (STL) + 5-year moving averages | ⬜ | Claude | – | 15 min |
| T-15 | Long-term context chart from 1981 (CHIRPS / GPCP), context only | ⬜ | Claude | – | 30 min |
| T-16 | CHIRPS vs GPM spatial comparison (maps) | ⬜ | Claude | – | 45 min |
| T-17 | Lake Chad mask applied by default in maps and the app | ⬜ | Claude | – | 10 min |

### Decisions needed
| ID | Task | Status | Owner |
|---|---|---|---|
| T-18 | D-003b: sub-region borders (provisional W 18°W–5°W, C 5°W–10°E, E 10°E–20°E) | ⬜ | Team |
| T-19 | Index design: amount + dry spell, or PCA weights (the prototype double-counts) | ⬜ | Team |
| T-20 | Flagship story: eastern Sahel "more regular rainy season" (pending T-11) | ⬜ | Team |
| T-21 | Use CloudSat/CALIPSO as fallback if EarthCARE access fails | ✖ not needed (EarthCARE worked, T-03) | Team |

### Impact add-on
| ID | Task | Status | Owner | Depends on | Estimate |
|---|---|---|---|---|---|
| T-22 | NDVI add-on (D-011): MODIS NDVI anomaly vs JJAS rainfall anomaly, 0–2 month lags | ⬜ | Claude | – | 45 min |

### Application and submission
| ID | Task | Status | Owner | Depends on | Estimate |
|---|---|---|---|---|---|
| T-23 | Install `fastapi`, `uvicorn[standard]`, `cartopy`, `jupyterlab`, `ipykernel`, `pyarrow` (blocked for the assistant) | ⬜ | Team lead | – | 5 min |
| T-24 | Merge PR #1, then #3; retarget and finish #2 | ⬜ | Team | reviews | – |
| T-25 | Backend: Layer 1 API from `docs/app/api_contract.md` (regions, datasets, investigations, detect) | ⬜ | Claude / Backend A | T-23, T-24 | 2 h |
| T-26 | Front-end against the contract's mock JSON (region picker, Layer 1 result, regional comparison) | ⬜ | Front-end | – | – |
| T-27 | Layers 2–5 endpoints (investigate, mechanisms from `data/app/mechanisms.json`, project, qualitative solve) | ⬜ | Backend B | T-25 | 2–3 h |
| T-28 | Report endpoint (JSON/CSV/HTML) | ⬜ | Integration | T-25 | 1 h |
| T-29 | Slides (≤ 7) or 30-second video | ⬜ | Design lead | results | – |
| T-30 | Confirm the submission cut-off; make the repo public before submitting; final SI-use log check | ⬜ | Team lead | – | – |
| T-31 | Housekeeping: tick the outdated open questions in `DECISIONS.md` (Earthdata login works; D-007 indices chosen) | ⬜ | Claude | – | 5 min |
