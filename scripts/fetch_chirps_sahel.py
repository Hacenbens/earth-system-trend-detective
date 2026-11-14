"""CHIRPS v3.0 monthly Sahel-box rainfall, June-September 1998-2026: independent (non-NASA) cross-check (decision D-013).

Drafted with AI assistance (Claude Code). See docs/submission/si_usage.md.

Source: CHC Africa monthly GeoTIFFs (0.05 deg, LZW, top-left corner 20W/40N, nodata -9999), ~5 MB each.
Each file is downloaded, the box is extracted, and the file is deleted (only the box means are kept).
Box = provisional Sahel 10-20N, 18W-20E (D-003b): rows 400..599, cols 40..799. Mean = cos(lat)-weighted over valid cells.
CHIRPS is land-only (ocean = nodata) while IMERG also covers the ocean; the box is almost all land, so the effect is
small, but it is a known difference.

Usage:  .venv/bin/python -u scripts/fetch_chirps_sahel.py
Output: data/processed/sahel_chirps_v3_jjas_monthly.csv (cached, reruns resume)
"""
import io
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import numpy as np
import pandas as pd
import requests
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "processed" / "sahel_chirps_v3_jjas_monthly.csv"
URL = "https://data.chc.ucsb.edu/products/CHIRPS/v3.0/monthly/africa/tifs/chirps-v3.0.{y}.{m:02d}.tif"
WANT = [(y, m) for y in range(1998, 2027) for m in (6, 7, 8, 9)]
ROWS, COLS = slice(400, 600), slice(40, 800)
LAT = 40 - (np.arange(400, 600) + 0.5) * 0.05          # cell-centre latitudes (19.975 .. 10.025)
W = np.cos(np.deg2rad(LAT))[:, None]


def box_mean(ym):
    y, m = ym
    for attempt in range(8):   # the CHC server answers 429 when hit too fast: back off and retry
        try:
            r = requests.get(URL.format(y=y, m=m), timeout=120)
        except requests.exceptions.RequestException:   # read timeouts happen on this server too
            if attempt == 7:
                raise
            time.sleep(30 * (attempt + 1))
            continue
        if r.status_code != 429:
            break
        time.sleep(int(r.headers.get("Retry-After", 0)) or 30 * (attempt + 1))
    r.raise_for_status()
    time.sleep(2)
    im = Image.open(io.BytesIO(r.content))
    t = im.tag_v2
    assert t.get(33922)[3:5] == (-20.0, 40.0) and abs(t.get(33550)[0] - 0.05) < 1e-6, "unexpected grid"
    a = np.array(im, dtype="float64")[ROWS, COLS]
    a[a < 0] = np.nan
    ok = ~np.isnan(a)
    mean = float(np.nansum(a * W) / np.sum(W * ok))
    print(f"{y}-{m:02d}: {mean:7.2f} mm  ({ok.sum()} / {a.size} valid cells)", flush=True)
    return dict(date=f"{y}-{m:02d}-01", chirps_mm=mean, valid_cells=int(ok.sum()), cells=int(a.size))


done = pd.read_csv(OUT) if OUT.exists() else pd.DataFrame(columns=["date"])
have = set(done["date"])
todo = [ym for ym in WANT if f"{ym[0]}-{ym[1]:02d}-01" not in have][::-1]   # newest first
print(f"{len(todo)} files to fetch", flush=True)
rows = []
with ThreadPoolExecutor(1) as ex:
    for res in ex.map(box_mean, todo):
        rows.append(res)
        if len(rows) % 8 == 0 or len(rows) == len(todo):   # checkpoint
            df = pd.concat([done, pd.DataFrame(rows)]).drop_duplicates("date").sort_values("date")
            OUT.parent.mkdir(parents=True, exist_ok=True)
            df.to_csv(OUT, index=False, float_format="%.3f")
print(f"saved -> {OUT}")
