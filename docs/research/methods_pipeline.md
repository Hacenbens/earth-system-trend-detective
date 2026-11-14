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
| Linear regression (OLS slope + CI) | ⬜ | add to `trend_summary` as a reference alongside Sen |
| Mann–Kendall | ✅ | `trend.py` |
| **Autocorrelation check + adjusted MK** | ✅ | lag-1 autocorrelation reported; Hamed–Rao (floored at 1) and Yue–Wang TFPW. Negative autocorrelation found (−0.42), so the original MK is the conservative choice |
| Sen's slope + 95 % CI | ✅ | `scipy.stats.theilslopes` |
| Change-point detection | 🟡 | 2014 TRMM→GPM homogeneity check done (no break, E-005). ⬜ add a Pettitt test for regime shifts |
| Confidence intervals | ✅ | Sen CI; start-year sensitivity table (`outputs/jjas_start_year_sensitivity.csv`) |

### C. Spatial analysis: *where it changes*
| Method | Status | Note |
|---|---|---|
| Area-weighted averages | ✅ | cos(lat) weights everywhere |
| West / central / east Sahel sub-regions | ⬜ | Needs D-003b. Proposal: W 18°W–5°W, C 5°W–10°E, E 10°E–20°E, all 10–20°N (to confirm against literature, L-12) |
| Pixel-by-pixel trends | ⬜ | possible directly from the daily IMERG cube (JJAS totals and indices per 0.1° cell) |
| Trend-magnitude and significance maps with multiple-testing correction | ⬜ | Benjamini–Hochberg FDR across pixels (Wilks 2016, field significance). Show only FDR-significant stippling |
| CHIRPS vs GPM spatial comparison | ⬜ | `fetch_chirps_sahel.py` keeps only box means today, so it must be extended to save the JJAS field (0.05°, regrid to 0.1°) |

### D. Atmospheric relationship analysis: *why* (Layers 2–3, D-010)
| Question | Data | Method |
|---|---|---|
| Does rainfall rise with atmospheric moisture? | MERRA-2 TQV, QV | correlation, regression; Clausius–Clapeyron scaling check (~7 %/K) for extremes |
| Moisture transport? | MERRA-2 IVT / u,v,q | correlation, composites of wet vs dry seasons |
| Vertical motion vs rainfall? | MERRA-2 OMEGA profiles; EarthCARE CPR Doppler (2024–25, case studies only) | composites, profiles |
| Different regimes? | MERRA-2 fields | composite analysis (wet/dry terciles); clustering only if time allows |
| Lagged relationships | all of the above | lagged correlation |

All of these show **association, not causation**. Every Layer-3 claim gets an evidence card in the ledger with alternatives and a confidence level.

### E. Impact add-on: NDVI (D-011)
JJAS rainfall anomaly vs growing-season NDVI anomaly (MODIS MOD13, AppEEARS), with 0–2 month lags. "Associated with" language only.

---

## 3. Pipeline order (what runs after what)
1. ✅ Acquisition and validation (Giovanni, CHIRPS cross-checks)
2. ✅ H1 seasonal totals: trend + sensitivity + 2014 check (E-005)
3. 🟡 H2 extremes: indices + trends done (E-006). Pending: daily cross-check with CHIRPS daily / GHCN gauges because the IMERG daily tail is not homogeneous across 2014
4. ⬜ Spatial: sub-regions + pixel trend maps with FDR
5. ⬜ Layers 2–3: MERRA-2 moisture / OMEGA, EarthCARE case studies, evidence cards
6. ⬜ NDVI add-on
7. ⬜ App (FastAPI + JS, D-005) reads the processed outputs; slides

## 4. Data-quality notes found so far
- IMERG Late Run is not trend-quality (E-004: 20-point swing vs CHIRPS in 2026).
- Daily IMERG Final single-cell maxima of 561 and 640 mm/day (1999, 2000) are spatially coherent storms (0 isolated pixels), not glitches, and are too few to move box means.
- **But the daily tail is not homogeneous across 2014**: the wet-day 99.9th percentile is 112 mm/day in 1998–2013 vs 103 in 2014–2025, the share of light wet days (< 2 mm) falls steadily, and SDII steps up at 2014. Extreme-index trends from IMERG alone are therefore TO-VERIFY (E-006) until a daily gauge-based check.
