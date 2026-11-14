# Dataset inventory

Status: `CANDIDATE` → `VERIFIED` (official metadata checked) → `ACQUIRED` (sample file opened, variables/units/flags confirmed).
Verification source: NASA CMR (Common Metadata Repository), queried on 2026-11-13. CMR lists the official short name, version, data centre and actual first/last granule.

## Layer 1: NASA long-term records

| Dataset | Short name / version | CMR concept ID | Variables we need | Grid | Time step | Actual coverage (granules) | Format / access | Status |
|---|---|---|---|---|---|---|---|---|
| GPM IMERG Final, monthly | `GPM_3IMERGM` **V07 (V07B files)** | C2723754851-GES_DISC | `precipitation` (mm/hr), `randomError`, `gaugeRelativeWeighting`, `precipitationQualityIndex`, `probabilityLiquidPrecipitation` | 0.1° | monthly | **1998-01 → 2025-09** (333 files) | HDF5 (group `Grid`), GES DISC HTTPS / S3 / OPeNDAP, Giovanni | **ACQUIRED** (2026-11-13) |
| GPM IMERG Final, daily | `GPM_3IMERGDF` **V07 (V07B)** | C2723754864-GES_DISC | daily mean precipitation (mm/day), for extremes | 0.1° | daily | **1998-01-01 → 2025-09-30** (10,135 files) | netCDF4, GES DISC | VERIFIED |
| GPM IMERG Final, half-hourly | `GPM_3IMERGHH` V07 | C2723754847-GES_DISC | only if sub-daily intensity is needed | 0.1° | 30 min | 1998-01 → 2025-09 | HDF5 | VERIFIED (not planned) |
| GPCP monthly | `GPCPMON` **V3.3** | C3405935516-GES_DISC | precipitation (independent long context) | 0.5° | monthly | **1983-01 → 2025-12** (516 files) | netCDF4, GES DISC | VERIFIED |
| GPCP daily | `GPCPDAY` V3.3 | — (found in keyword search) | daily precipitation (cross-check of extremes) | 0.5° | daily | to confirm | netCDF4, GES DISC | VERIFIED (exists) |
| MERRA-2 single-level | `M2TMNXSLV` 5.12.4 | C1276812859-GES_DISC | T2M, TQV (column water vapour), winds | 0.5° × 0.625° | monthly | **1980-01 → 2026-09** | netCDF4, GES DISC | VERIFIED |
| MERRA-2 surface fluxes | `M2TMNXFLX` 5.12.4 | C1276812868-GES_DISC | model precipitation (PRECTOT…), for comparison only | 0.5° × 0.625° | monthly | 1980-01 → ongoing | netCDF4 | VERIFIED |
| MERRA-2 pressure levels | `M2IMNPASM` 5.12.4 | C1276812904-GES_DISC | OMEGA (vertical motion), QV, T on 42 levels | 0.5° × 0.625° | monthly (instantaneous) | 1980-01 → ongoing | netCDF4 | VERIFIED |
| MERRA-2 aerosol | `M2TMNXAER` 5.12.4 | C1276812866-GES_DISC | dust AOD, total AOD | 0.5° × 0.625° | monthly | 1980-01 → ongoing | netCDF4 | VERIFIED |
| MODIS Terra L3 | `MOD08_M3` C6.1 | C1443766359-LAADS | AOD (Deep Blue), cloud fraction | 1° | monthly | 2000-02 → ongoing | HDF4, LAADS DAAC | VERIFIED |
| MODIS Aqua L3 | `MYD08_M3` C6.1 | C1443775657-LAADS | same as Terra | 1° | monthly | 2002-07 → ongoing | HDF4, LAADS DAAC | VERIFIED |
| AIRS L3 | `AIRS3STM` **V7.0** | C1701805662-GES_DISC | T and q profiles | 1° | monthly | 2002-09 → ongoing | HDF, GES DISC | VERIFIED (optional) |

## Layer 2: vertical structure

| Dataset | Agency | Variables | Coverage | Access | Status |
|---|---|---|---|---|---|
| EarthCARE CPR / ATLID L1 + L2a, two-sensor L2b synergy | ESA / JAXA | reflectivity, Doppler velocity, backscatter, extinction, target classification | 2024 → | ESA MAAP / OADS, JAXA G-Portal | VERIFIED (exists). Single-instrument L2a and two-sensor L2b were publicly released in March 2025. Full-mission reprocessing and a baseline update to "BC" are reported for late 2025, so **the current baseline is still to confirm**. |
| EarthCARE three- and four-sensor L2b (e.g. ACM-CAP, ACM-RT) | ESA / JAXA | combined cloud/aerosol properties, radiative fluxes | 2024 → | ESA MAAP | VERIFIED (exists). Reported released in December 2025; confirm access with our account. |
| CloudSat (option) | NASA | cloud radar profiles | 2006-06 → 2023-12 (science operations ended Dec 2023) | CloudSat DPC | VERIFIED (dates). Daylight-only operations after a 2011 battery anomaly (to confirm); this affects the diurnal sampling of storms. |
| CALIPSO (option) | NASA / CNES | aerosol and thin-cloud lidar profiles | 2006-06 → 2023-08 (science operations ended 1 Aug 2023) | NASA ASDC | VERIFIED (dates) |

## Sample check: GPM_3IMERGM V07B, August 2024 (scripts/fetch_sample_imerg.py)

File `3B-MO.MS.MRG.3IMERG.20240801-S000000-E235959.08.V07B.HDF5`, 19 MB, global.
- Open with `xarray.open_dataset(f, group="Grid", engine="h5netcdf")`.
- **Dimension order is (time, lon, lat): lon comes before lat.** Always select by name, never by position. Grid is 3600 × 1800 at 0.1°, with cell centres from -179.95 to 179.95 (lon) and -89.95 to 89.95 (lat), both ascending.
- `precipitation` is a **mean rate in mm/hr** (fill -9999.9). Monthly total = rate × hours in the month.
- Time is stored as seconds since 1980-01-06 UTC (GPS epoch); xarray decodes it as a cftime Julian date.
- Quality-related fields: `randomError` (RMS error, mm/hr), `gaugeRelativeWeighting` (% weight given to gauges), `precipitationQualityIndex` (scale to be read in the IMERG V07 documentation), `probabilityLiquidPrecipitation` (%).

Provisional Sahel box (10–20°N, 18°W–20°E):
| Check | Result |
|---|---|
| Valid cells | 38,000 / 38,000 (no gaps) |
| Area-weighted mean | 0.240 mm/hr, about **179 mm** for August 2024 (plausible) |
| North–south gradient | 10–13°N: 309 mm · 13–16°N: 192 mm · 16–20°N: 68 mm (physically consistent) |
| Gauge weighting | mean 36 %, max 78 %; 95 % of cells have some gauge input |
| Random error | box mean 0.040 mm/hr, about 17 % of the mean rate |
| Giovanni cross-check (2026-11-14) | Time Series, Area-Averaged, `GPM_3IMERGM_07_precipitation`, box 18W,10N,20E,20N, 2024-01..2025-09. Plot agrees with our series (Aug 2024 on the 0.24 mm/hr line). |
| Exact series (2026-11-14, `scripts/fetch_sahel_series.py`, OPeNDAP box subsets) | Final Aug 2024 = 0.240 mm/hr = 178.8 mm (matches the sample file). JJAS totals, Final: 2024 528.8 mm, 2025 459.1 mm. Late Run JJAS: 2024 541.5, 2025 494.6, **2026 335.7 mm**. Late vs Final in Jun–Sep: +6.6 % mean (−0.6 to +20.6 %). Outputs in `data/processed/sahel_imerg_*.csv` |
| CHIRPS v3 cross-check (2026-11-14, `scripts/fetch_chirps_sahel.py`) | JJAS 1998–2025 mean 426 mm (sd 37). 2024: 510.7 mm (wettest of 29); 2025: 433.4; 2026: 381.9 (−10.4 %, 4th driest). IMERG Final vs CHIRPS: +3.5 % (2024), +5.9 % (2025). See evidence ledger E-004 |

Implications: gauges contribute a real but variable share. Changes in gauge availability over time could affect the trend, so we track `gaugeRelativeWeighting` as a homogeneity indicator alongside the 2014 break test. Next step: compare this value with Giovanni's area average for the same box and month (validation, D-009).

## Consequences for our decisions (see DECISIONS.md D-006, revised)

1. **IMERG V07 Final starts in 1998, not 2000.** V07 was reprocessed back into the TRMM era, so a Sahel rainy-season record of **28 complete seasons, 1998–2025**, is available.
2. **IMERG V07 Final ends in Sept 2025, and V08 is not released yet.** The GPM V08 transition notice says the V07 Final record stopped on 30 Sept 2025 and that V08 Final was expected in autumn 2026. The Sahel rainy season (June–Sept) of **2025 is complete**, so V07 is enough for us. We must pin "V07B" in the app and the write-up, and switch only if V08 appears and we have time to re-validate.
3. **Homogeneity caveat.** The satellites feeding IMERG changed over time: the TRMM era (1998–2014) was followed by the GPM Core era (2014 onwards). An artificial jump around 2014 is possible, so we test for a break and compare with GPCP, which is built independently.
4. **GPCP V3.3 starts in 1983, not 1979.** The 1979 start belongs to GPCP V2.3. V3.3 still covers the late drought years and the recovery.
5. **MERRA-2 runs to Sept 2026**, which covers the full study period with room to spare.
6. **CloudSat and CALIPSO cover 2006–2023, overlapping IMERG for 17 years**, but not EarthCARE (2024 onwards). They could provide a NASA record of storm structure across the trend period (D-008).

## Sources
- NASA CMR collection and granule queries (cmr.earthdata.nasa.gov), 2026-11-13.
- GPM, "IMERG V08 Transition Schedule": https://gpm.nasa.gov/data/news/imerg-v08-transition-schedule
- GPM, "Update to the IMERG V08 Transition Schedule, Aug. 2026": https://gpm.nasa.gov/data/news/update-imerg-v08-transition-schedule-aug-2026
- ESA EO Gateway, EarthCARE first data products: https://dragon3.esa.int/eogateway/news/earthcare-s-first-data-products
- JAXA G-Portal EarthCARE notice: https://gportal.jaxa.jp/gpr/notice/notice/view/1417?lang=en
- NASA, "First Long-Duration Lidar Satellite Mission CALIPSO Ends": https://www.nasa.gov/missions/calipso/first-long-duration-lidar-satellite-mission-calipso-ends
- eoPortal, CloudSat: https://www.eoportal.org/satellite-missions/cloudsat
