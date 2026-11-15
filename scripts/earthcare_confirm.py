"""T-01b: confirm EarthCARE storm candidates with IMERG HALF-HOURLY rain at the overpass time, and pick dry/dusty
pre-monsoon cases (June 2025) for the dust card.

Drafted with AI assistance (Claude Code). See docs/submission/si_usage.md.
Input : outputs/earthcare/overpass_candidates_2024_2025.csv (scripts/earthcare_candidates.py),
        outputs/earthcare/catalogue_cache/*.json (ground tracks + product titles)
Data  : GPM IMERG V07 Final half-hourly (GPM_3IMERGHH, mm/hr) via NASA OPeNDAP, box only
Output: outputs/earthcare/shortlist.csv, outputs/earthcare/download_list.csv (exact EarthCARE files to request)
"""
import json
import sys
from pathlib import Path

import earthaccess
import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))
from earth_detective.auth import https_session
from earth_detective.imerg import box_field

E = ROOT / "outputs" / "earthcare"
cand = pd.read_csv(E / "overpass_candidates_2024_2025.csv")

# ground tracks and product titles from the cached catalogue searches
feats = {}
for f in (E / "catalogue_cache").glob("*.json"):
    for ft in json.loads(f.read_text()):
        p = ft["properties"]
        feats.setdefault((p["sat:absolute_orbit"], p["title"][-1]), {})[p["product:type"]] = ft
PRODUCTS = ["CPR_CD__2A", "ATL_ALD_2A", "AC__TC__2B"]

S = https_session()


def track_points(ft):
    co = np.array(ft["geometry"]["coordinates"])
    pts = np.concatenate([np.linspace(co[i], co[i + 1], 200, endpoint=False) for i in range(len(co) - 1)])
    return pts[(pts[:, 1] >= 10) & (pts[:, 1] <= 20) & (pts[:, 0] >= -18) & (pts[:, 0] <= 20)]


def halfhour_on_track(row):
    """IMERG mm/hr in the half-hour containing the overpass, sampled along the track."""
    ft = feats[(row.orbit, row.frame)]["CPR_CD__2A"]
    t = pd.Timestamp(f"{row.date}T{row.time_utc}")
    gr = earthaccess.search_data(short_name="GPM_3IMERGHH", version="07",
                                 temporal=((t - pd.Timedelta(minutes=29)).isoformat(), (t + pd.Timedelta(minutes=29)).isoformat()))
    best = None
    for g in gr:  # pick the half-hour that contains the overpass start
        b = pd.Timestamp(g["umm"]["TemporalExtent"]["RangeDateTime"]["BeginningDateTime"]).tz_localize(None)
        if b <= t < b + pd.Timedelta(minutes=30):
            best = g
    if best is None:
        return None
    _, field = box_field(S, best, "Grid")
    pts = track_points(ft)
    import xarray as xr
    v = field.sel(lon=xr.DataArray(pts[:, 0]), lat=xr.DataArray(pts[:, 1]), method="nearest").values
    step = np.mean(np.hypot(np.diff(pts[:, 0]) * 111 * np.cos(np.deg2rad(15)), np.diff(pts[:, 1]) * 111))
    i = int(np.nanargmax(v))
    return {"rain_km_ge1mmh_at_overpass": round(float((v >= 1).sum() * step)),
            "rain_km_ge10mmh_at_overpass": round(float((v >= 10).sum() * step)),
            "max_mmh_at_overpass": round(float(np.nanmax(v)), 1),
            "max_mmh_lat": round(float(pts[i, 1]), 2), "max_mmh_lon": round(float(pts[i, 0]), 2)}


# storm shortlist: strongest daily candidates that have all three products
top = cand[cand.has_atlid_aerosol_layers & cand.has_synergy_classification].head(15)
rows = []
for r in top.itertuples():
    h = halfhour_on_track(r)
    if h:
        rows.append({**r._asdict(), **h, "case_type": "storm"})
        print(r.date, r.time_utc, r.region, h, flush=True)
storm = pd.DataFrame(rows).drop(columns="Index")
storm = storm.sort_values(["rain_km_ge10mmh_at_overpass", "rain_km_ge1mmh_at_overpass"], ascending=False)

# dust / pre-monsoon cases: June 2025 passes with lidar products, no rain on the track that day, northern half of the box
c = cand[(cand.date.str.startswith("2025-06")) & cand.has_atlid_aerosol_layers & (cand.heavy_rain_km_on_track == 0)]
c = c.assign(mean_lat_rain=c.mean_daily_mm_on_track).sort_values("mean_daily_mm_on_track").head(3)
dust = c.assign(case_type="dry pre-monsoon (dust, to confirm with ATLID)")

short = pd.concat([storm.head(5), dust], ignore_index=True)
short.to_csv(E / "shortlist.csv", index=False)

dl = []
for r in short.itertuples():
    for ptype in PRODUCTS:
        ft = feats.get((r.orbit, r.frame), {}).get(ptype)
        if ft:
            dl.append({"case": f"{r.date} {r.time_utc} orbit {r.orbit}{r.frame} ({r.case_type}, {r.region})", "product_type": ptype,
                       "file": ft["properties"]["title"],
                       "catalogue_item": next((a["href"] for k, a in ft.get("assets", {}).items() if k == "metadata_ogc_17_003r2"), ""),
                       "download_h5": next((a["href"] for k, a in ft.get("assets", {}).items() if k == "enclosure_h5"), "")})
pd.DataFrame(dl).to_csv(E / "download_list.csv", index=False)
pd.set_option("display.width", 220)
print("\n=== shortlist ===")
print(short[["case_type", "date", "time_utc", "orbit", "frame", "region", "heavy_rain_km_on_track", "rain_km_ge1mmh_at_overpass",
             "rain_km_ge10mmh_at_overpass", "max_mmh_at_overpass", "max_mmh_lat", "max_mmh_lon"]].to_string(index=False))
print(f"\n{len(dl)} files in outputs/earthcare/download_list.csv")
