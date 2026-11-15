"""Metadata for the warehouse dimensions (regions, datasets, variables, methods). Single source of truth, imported by
scripts/build_warehouse.py and, later, by the API.

Drafted with AI assistance (Claude Code). See docs/submission/si_usage.md.
DOIs marked TO-VERIFY have not been confirmed against the provider's landing page.
"""
import json

REGIONS = [  # code, name, lat_min, lat_max, lon_min, lon_max
    ("sahel", "Sahel (study box)", 10, 20, -18, 20),
    ("west", "Western Sahel", 10, 20, -18, -5),
    ("central", "Central Sahel", 10, 20, -5, 10),
    ("east", "Eastern Sahel", 10, 20, 10, 20),
]
REGION_STATUS = "provisional (decision D-003b)"


def region_geojson(lat0, lat1, lon0, lon1):
    ring = [[lon0, lat0], [lon1, lat0], [lon1, lat1], [lon0, lat1], [lon0, lat0]]
    return json.dumps({"type": "Polygon", "coordinates": [ring]})


DATASETS = [  # code, product, name, version, agency, kind, role, resolution, start, end, access, doi, is_nasa
    ("imerg_final_monthly", "GPM_3IMERGM", "GPM IMERG Final Run monthly precipitation", "V07B", "NASA GES DISC", "satellite", "trend",
     "0.1°, monthly", "1998-01", "2025-09", "NASA OPeNDAP (earthaccess)", "10.5067/GPM/IMERG/3B-MONTH/07 (TO-VERIFY)", 1),
    ("imerg_final_daily", "GPM_3IMERGDF", "GPM IMERG Final Run daily precipitation", "V07B", "NASA GES DISC", "satellite", "trend",
     "0.1°, daily", "1998-01", "2025-09", "NASA OPeNDAP (earthaccess)", "10.5067/GPM/IMERGDF/DAY/07 (TO-VERIFY)", 1),
    ("imerg_late_daily", "GPM_3IMERGDL", "GPM IMERG Late Run daily precipitation (near-real-time)", "V07B", "NASA GES DISC", "satellite",
     "near-real-time", "0.1°, daily", "1998-01", "2026-11", "NASA OPeNDAP (earthaccess)", "10.5067/GPM/IMERGDL/DAY/07", 1),
    ("chirps_v3_monthly", "CHIRPS v3.0", "Climate Hazards Center InfraRed Precipitation with Stations", "3.0", "UCSB Climate Hazards Center",
     "gauge-blended", "check", "0.05°, monthly", "1981-01", "2026-10", "data.chc.ucsb.edu GeoTIFF", "TO-VERIFY", 0),
    ("merra2_monthly", "M2TMNXSLV/INT/AER/LND", "MERRA-2 monthly single-level, integrated, aerosol and land diagnostics", "5.12.4",
     "NASA GMAO / GES DISC", "reanalysis", "supporting", "0.5° × 0.625°, monthly", "1980-01", "2026", "NASA OPeNDAP (earthaccess)", "TO-VERIFY", 1),
    ("merra2_plevel_monthly", "M2IMNPASM", "MERRA-2 monthly pressure-level winds", "5.12.4", "NASA GMAO / GES DISC", "reanalysis", "supporting",
     "0.5° × 0.625°, 42 levels, monthly", "1980-01", "2026", "NASA OPeNDAP (earthaccess)", "TO-VERIFY", 1),
    ("earthcare_l2", "AC__TC__2B / CPR_CD__2A / ATL_ALD_2A", "EarthCARE Level 2 radar + lidar products", "BA/AC baselines", "ESA–JAXA",
     "radar-lidar", "case-study", "~1 km along track, ~100 m vertical", "2024-07", "2025-09", "ESA MAAP (EO Sign In token)", "10.57780/eca-7ba3052 (AC__TC__2B)", 0),
]

VARIABLES = [  # code, label, unit, category, aggregation, description
    ("rain_total", "Rainfall total", "mm", "rain_amount", "sum", "Precipitation accumulated over the period, cos(lat)-weighted area mean"),
    ("PRCPTOT", "Rain on wet days", "mm", "rain_amount", "index", "ETCCDI: total on days >= 1 mm, per cell then area mean"),
    ("wet_days", "Wet days", "days", "rain_frequency", "index", "Days with >= 1 mm, per cell then area mean"),
    ("SDII", "Rain per wet day", "mm/day", "rain_intensity", "index", "PRCPTOT / wet days"),
    ("Rx1day", "Wettest day", "mm", "rain_intensity", "index", "Maximum 1-day rainfall in the season"),
    ("Rx5day", "Wettest 5 days", "mm", "rain_intensity", "index", "Maximum 5-day running total"),
    ("R10mm", "Days >= 10 mm", "days", "rain_frequency", "index", "Days with >= 10 mm"),
    ("R20mm", "Days >= 20 mm", "days", "rain_frequency", "index", "Days with >= 20 mm"),
    ("R95p", "Rain on very wet days", "mm", "rain_intensity", "index", "Rain on days above each cell's 95th percentile of wet days (1998-2025 reference)"),
    ("R95pTOT", "Share of rain from very wet days", "%", "rain_intensity", "index", "100 x R95p / PRCPTOT"),
    ("CDD", "Longest dry spell", "days", "rain_regularity", "index", "Longest run of days < 1 mm in the season"),
    ("TQV", "Column water vapour", "kg/m²", "moisture", "mean", "Total precipitable water vapour"),
    ("QV2M", "Near-surface specific humidity", "kg/kg", "moisture", "mean", "2 m specific humidity"),
    ("T2M_C", "Near-surface temperature", "°C", "temperature", "mean", "2 m air temperature"),
    ("OMEGA500", "Vertical velocity 500 hPa", "Pa/s", "circulation", "mean", "Pressure velocity; negative = rising air"),
    ("U850", "Westerly wind 850 hPa", "m/s", "circulation", "mean", "Zonal wind; positive = westerly (monsoon inflow)"),
    ("V850", "Southerly wind 850 hPa", "m/s", "circulation", "mean", "Meridional wind; positive = southerly"),
    ("UFLXQV", "Eastward moisture transport", "kg/m/s", "moisture", "mean", "Vertically integrated eastward water-vapour flux"),
    ("VFLXQV", "Northward moisture transport", "kg/m/s", "moisture", "mean", "Vertically integrated northward water-vapour flux"),
    ("mfc_mm_day", "Moisture convergence", "mm/day", "moisture", "mean", "Dynamical tendency of water vapour (DQVDT_DYN x 86400)"),
    ("DUEXTTAU", "Dust optical depth", "1", "dust", "mean", "Dust extinction aerosol optical thickness at 550 nm"),
    ("TOTEXTTAU", "Total aerosol optical depth", "1", "dust", "mean", "Total aerosol extinction optical thickness at 550 nm"),
    ("GWETTOP", "Topsoil wetness", "0-1", "land", "mean", "Surface soil wetness (land cells)"),
    ("GWETROOT", "Root-zone soil wetness", "0-1", "land", "mean", "Root-zone soil wetness (land cells)"),
    ("LHLAND", "Latent heat flux (land)", "W/m²", "land", "mean", "Evaporative energy flux over land"),
    ("SHLAND", "Sensible heat flux (land)", "W/m²", "land", "mean", "Heating energy flux over land"),
    ("EF", "Evaporative fraction", "0-1", "land", "mean", "LHLAND / (LHLAND + SHLAND)"),
    ("shear_925_600", "Zonal wind shear 925-600 hPa", "m/s", "circulation", "mean", "U925 - U600 (westerly monsoon below the easterly jet)"),
    ("AEJ_U600", "African Easterly Jet (U at 600 hPa)", "m/s", "circulation", "mean", "Zonal wind at 600 hPa; negative = easterly"),
]

METHODS = [  # code, name, description, reference
    ("mann_kendall_sen", "Mann-Kendall + Sen's slope", "Original MK (significance), Hamed-Rao (variance floored at 1) and Yue-Wang TFPW variants; "
     "Sen's slope with 95 % CI; OLS and trend-with-AR(1)-errors cross-checks (src/earth_detective/trend.py)", "Mann 1945; Kendall 1975; Sen 1968; Hamed & Rao 1998 (L-07)"),
    ("spearman_detrended", "Detrended Spearman correlation", "Rank correlation of two seasonal series after removing each one's linear trend", "standard"),
    ("area_mean_coslat", "cos(lat)-weighted area mean", "Area mean of valid cells weighted by cos(latitude)", "standard"),
    ("etccdi_percell", "ETCCDI indices per cell", "Indices computed in each 0.1° cell from daily data, then area-averaged (src/earth_detective/extremes.py)", "Zhang et al. 2011"),
    ("earthcare_case", "EarthCARE case metrics", "Metrics along the track inside the box (scripts/earthcare_cross_sections.py)", "E-012"),
]
