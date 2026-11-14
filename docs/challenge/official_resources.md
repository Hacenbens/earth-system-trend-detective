# Official challenge resources and how we use them

Source: challenge page "NASA Data & Resources" and "Space Agency Partner Resources" (pasted 2026-11-13).
Using the organisers' own resources visibly strengthens **Relevance**. Cross-checking our results against them strengthens **Validity**.

## Priority map

| Resource | What it offers | Our use | Layer | Priority |
|---|---|---|---|---|
| **Giovanni** (NASA GES DISC) | Menus of variables (IMERG, MERRA-2, MODIS…), area-averaged time series, CSV download | **Independent validation:** the Sahel series computed by our own pipeline must match Giovanni's area-averaged series for the same product, box and period. Also the quickest way to get first series for the team. | 1 | **HIGH** |
| **Hydrology Time Series** (Data Rods, GES DISC) | Long *point* time series (IMERG half-hourly, GLDAS, NLDAS) via a web service | **Point mode** in the app ("click a town → rain history"). GLDAS soil moisture could link rainfall to farming impact. | 1 / impact | MEDIUM |
| **AppEEARS** (NASA LP DAAC) | Area/point extraction of land products (MODIS NDVI, LST…) with time series | **Impact link:** does Sahel vegetation (NDVI) follow the rainfall trend ("re-greening")? | impact | MEDIUM (stretch) |
| **Climate Data Online** (NOAA NCEI) | Station records (e.g. GHCN-Daily) and station history | **Ground truth:** compare IMERG with rain-gauge stations in the Sahel. Station coverage there may be sparse or gappy, so check it first. | validation | MEDIUM-HIGH |
| **SeaWiFS chlorophyll time-series article** (Acker et al., 2009, *EARSeL eProceedings* 8(2):114–139) | Worked example of building a time series and testing its significance with NASA data | **Method template** from the organisers. Read it, mirror its workflow and cite it (L-08). | methods | **HIGH** (read first) |
| **KNMI Climate Explorer** | Web tool for climate series, indices, trends and correlations over many datasets | **Second independent cross-check** of the trend (e.g. GPCP / CRU over the same box), plus field-correlation ideas (e.g. SST vs Sahel rain). | validation | MEDIUM |
| **Statistical test methods to detect trends** (article) | Trend-test overview | Cite in the methods section and in the app's "how we test" panel. | methods | HIGH (read) |
| **A Comprehensive Guide to Statistical Significance** | Significance explainer | Plain-language explanations in the app and the glossary. | presentation | MEDIUM |
| SWOT mission (NASA/CNES/CSA/UKSA) | Water surface elevation of lakes and rivers since 2023 | Record too short for trends. Possible future work: Lake Chad / Niger River response to rainfall. | — | LOW / future |
| RADARSAT Constellation, Geo.ca, ecosystem monitoring, SAR tutorial (CSA) | Canadian SAR and geospatial data | Not relevant to an atmospheric Sahel study. **Out of scope** (said explicitly so judges see the choice). | — | none |

## Consequences for our design

1. **Giovanni is a validation step, not the app's backend.** According to a GES DISC expert on the Earthdata forum, the Giovanni time-series API only serves *single points*. Area-averaged series are only downloadable as CSV from the web UI (this needs re-checking against the current Giovanni documentation). So the app computes area averages from the granules itself. We keep Giovanni CSVs as reference series and show "matches NASA Giovanni within X%" as a validity badge.
2. **Point mode can use Data Rods** if the service covers our variables, so a user gets a point time series without downloading anything.
3. **There are three independent checks for the flagship trend:** Giovanni (same product, different code), KNMI (different datasets) and CDO stations (ground truth).
4. **The literature list gains L-08 to L-10** (the organisers' articles). We need the exact titles/URLs of the two statistics articles from the challenge page.

## Sources
- Earthdata Forum, "Unable to run API call to Giovanni": https://forum.earthdata.nasa.gov/viewtopic.php?p=25258
- Giovanni User Guide 2024.1: https://giovanni.gsfc.nasa.gov/giovanni/doc/UsersManualworkingdocument.docx.html
- Earthdata, "Data Rods for Hydrology": https://www.earthdata.nasa.gov/learn/articles/data-rods-for-hydrology
- Acker et al. (2009), EARSeL eProceedings: https://eproceedings.uni-oldenburg.de/website/vol08_2/08_2_acker1.html (NTRS copy: https://ntrs.nasa.gov/api/citations/20090042747/downloads/20090042747.pdf)
