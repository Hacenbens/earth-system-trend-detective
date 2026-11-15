"""T-01: candidate EarthCARE overpasses over Sahel storms, JJAS 2024-2025.

Drafted with AI assistance (Claude Code). See docs/submission/si_usage.md.

1. Lists every EarthCARE CPR Doppler frame (ESA L2 validated product CPR_CD__2A) crossing the box, from ESA's public
   MAAP STAC catalogue (search only, no login, no download).
2. Samples IMERG V07 Final DAILY rain along each ground track inside the box (data already on disk).
3. Ranks overpasses by how much heavy rain the track crosses, and checks that the lidar aerosol-layer product
   (ATL_ALD_2A) and the combined radar-lidar classification (AC__TC__2B) exist for the same frame.
Caveat: daily rain is a 24 h total; EarthCARE passes at ~14:30 UTC. Shortlisted cases should be confirmed with
IMERG half-hourly data at the overpass time before downloading.
Output: outputs/earthcare/overpass_candidates_2024_2025.csv
"""
import json
import time
from pathlib import Path

import numpy as np
import pandas as pd
import requests
import xarray as xr

ROOT = Path(__file__).resolve().parents[1]
CAT = "https://catalog.maap.eo.esa.int/catalogue/collections/EarthCAREL2Validated_MAAP/items"
BOX = (-18, 10, 20, 20)
OUT = ROOT / "outputs" / "earthcare"
OUT.mkdir(parents=True, exist_ok=True)


def search(ptype, start, end):
    cache = OUT / "catalogue_cache" / f"{ptype}_{start}.json"
    if cache.exists():
        return json.loads(cache.read_text())
    url = CAT
    params = {"bbox": ",".join(map(str, BOX)), "datetime": f"{start}T00:00:00Z/{end}T23:59:59Z", "limit": 200,
              "filter": f"product:type='{ptype}'", "filter-lang": "cql2-text"}
    feats = []
    while url:
        for attempt in range(6):   # DNS / network hiccups happen: retry with back-off
            try:
                r = requests.get(url, params=params, headers={"Accept": "application/geo+json"}, timeout=120)
                r.raise_for_status()
                break
            except requests.exceptions.RequestException:
                if attempt == 5:
                    raise
                time.sleep(15 * (attempt + 1))
        d = r.json()
        feats += d.get("features", [])
        nxt = [lk["href"] for lk in d.get("links", []) if lk.get("rel") == "next"]
        url, params = (nxt[0], None) if nxt and len(d.get("features", [])) else (None, None)
    cache.parent.mkdir(exist_ok=True)
    cache.write_text(json.dumps(feats))
    return feats


def key(f):  # orbit + frame letter identifies one pass segment across products
    p = f["properties"]
    return p["sat:absolute_orbit"], p["title"][-1]


rows = []
for y, months in ((2024, range(6, 10)), (2025, range(6, 10))):
    for m in months:
        start, end = f"{y}-{m:02d}-01", (pd.Timestamp(f"{y}-{m:02d}-01") + pd.offsets.MonthEnd()).strftime("%Y-%m-%d")
        cpr = search("CPR_CD__2A", start, end)
        ald = {key(f) for f in search("ATL_ALD_2A", start, end)}
        actc = {key(f) for f in search("AC__TC__2B", start, end)}
        print(f"{y}-{m:02d}: {len(cpr)} CPR Doppler frames, {len(ald)} ATLID aerosol-layer, {len(actc)} synergy", flush=True)
        for f in cpr:
            p = f["properties"]
            co = np.array(f["geometry"]["coordinates"])
            rows.append({"date": p["datetime"][:10], "time_utc": p["start_datetime"][11:19], "orbit": p["sat:absolute_orbit"],
                         "frame": p["title"][-1], "orbit_state": p["sat:orbit_state"], "cpr_doppler_product": p["title"],
                         "has_atlid_aerosol_layers": key(f) in ald, "has_synergy_classification": key(f) in actc,
                         "track": co.tolist()})
ov = pd.DataFrame(rows)
# one row per pass segment: keep the latest processing version of each orbit/frame
ov = ov.sort_values("cpr_doppler_product").drop_duplicates(["orbit", "frame"], keep="last")

# sample IMERG daily rain along each track inside the box
cache = {}
res = []
for _, r in ov.iterrows():
    y = int(r.date[:4])
    if y not in cache:
        cache[y] = xr.open_dataarray(ROOT / "data" / "raw" / "imerg_daily_box" / f"sahel_imerg_final_daily_{y}.nc").load()
    da = cache[y]
    if np.datetime64(r.date) not in da.time.values:
        continue
    field = da.sel(time=r.date)
    co = np.array(r.track)
    # densify the line (vertices are ~5 deg apart) to ~0.05 deg steps
    pts = np.concatenate([np.linspace(co[i], co[i + 1], 120, endpoint=False) for i in range(len(co) - 1)])
    inside = (pts[:, 1] >= 10) & (pts[:, 1] <= 20) & (pts[:, 0] >= -18) & (pts[:, 0] <= 20)
    pts = pts[inside]
    if len(pts) < 5:
        continue
    vals = field.sel(lon=xr.DataArray(pts[:, 0]), lat=xr.DataArray(pts[:, 1]), method="nearest").values
    step_km = np.mean(np.hypot(np.diff(pts[:, 0]) * 111 * np.cos(np.deg2rad(15)), np.diff(pts[:, 1]) * 111))
    heavy = vals >= 20
    i_max = int(np.nanargmax(vals))
    lon_c = float(pts[:, 0].mean())
    res.append({**{k: r[k] for k in ("date", "time_utc", "orbit", "frame", "orbit_state", "cpr_doppler_product",
                                     "has_atlid_aerosol_layers", "has_synergy_classification")},
                "track_lon_in_box": round(lon_c, 2),
                "region": "east" if lon_c >= 10 else "central" if lon_c >= -5 else "west",
                "heavy_rain_km_on_track": round(float(heavy.sum() * step_km), 0),
                "max_daily_mm_on_track": round(float(np.nanmax(vals)), 1),
                "max_at_lat": round(float(pts[i_max, 1]), 2), "max_at_lon": round(float(pts[i_max, 0]), 2),
                "mean_daily_mm_on_track": round(float(np.nanmean(vals)), 1)})
cand = pd.DataFrame(res).sort_values(["heavy_rain_km_on_track", "max_daily_mm_on_track"], ascending=False)
cand.to_csv(OUT / "overpass_candidates_2024_2025.csv", index=False)
pd.set_option("display.width", 220)
print(f"\n{len(cand)} overpasses with IMERG data; {int((cand.heavy_rain_km_on_track > 0).sum())} cross >= 20 mm/day rain")
show = ["date", "time_utc", "orbit", "frame", "region", "track_lon_in_box", "heavy_rain_km_on_track", "max_daily_mm_on_track",
        "max_at_lat", "max_at_lon", "has_atlid_aerosol_layers", "has_synergy_classification"]
print(cand[show].head(20).to_string(index=False))
print("\nbest per region:")
print(cand.groupby("region").head(3)[show].to_string(index=False))
