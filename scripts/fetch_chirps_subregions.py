"""CHIRPS v3.0 monthly JJAS 1998-2025, mean per provisional sub-region (W/C/E), for the independent check of E-007.

Drafted with AI assistance (Claude Code). See docs/submission/si_usage.md.
Same source and box logic as scripts/fetch_chirps_sahel.py (Africa GeoTIFFs, 0.05 deg, top-left 20W/40N).
Output: data/processed/sahel_chirps_v3_jjas_subregions.csv (cached; reruns resume). Serial + back-off (CHC rate limit).
"""
import io
import time
from pathlib import Path

import numpy as np
import pandas as pd
import requests
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "processed" / "sahel_chirps_v3_jjas_subregions.csv"
URL = "https://data.chc.ucsb.edu/products/CHIRPS/v3.0/monthly/africa/tifs/chirps-v3.0.{y}.{m:02d}.tif"
ROWS = slice(400, 600)                                   # 20N .. 10N
COLS = {"west": slice(40, 300), "central": slice(300, 600), "east": slice(600, 800)}  # 18W-5W, 5W-10E, 10E-20E
W = np.cos(np.deg2rad(40 - (np.arange(400, 600) + 0.5) * 0.05))[:, None]


def get(y, m):
    for attempt in range(8):
        try:
            r = requests.get(URL.format(y=y, m=m), timeout=120)
            if r.status_code != 429:
                r.raise_for_status()
                return r.content
        except requests.exceptions.RequestException:
            if attempt == 7:
                raise
        time.sleep(30 * (attempt + 1))
    raise RuntimeError("rate-limited")


done = pd.read_csv(OUT) if OUT.exists() else pd.DataFrame(columns=["date"])
have = set(done["date"])
rows = []
for y in range(1998, 2026):
    for m in (6, 7, 8, 9):
        d = f"{y}-{m:02d}-01"
        if d in have:
            continue
        im = Image.open(io.BytesIO(get(y, m)))
        assert im.tag_v2.get(33922)[3:5] == (-20.0, 40.0)
        a = np.array(im, dtype="float64")[ROWS]
        a[a < 0] = np.nan
        row = {"date": d}
        for reg, cols in COLS.items():
            b = a[:, cols]; ok = ~np.isnan(b)
            row[reg] = float(np.nansum(b * W) / np.sum(W * ok))
        rows.append(row)
        print(d, {k: round(v, 1) for k, v in row.items() if k != "date"}, flush=True)
        pd.concat([done, pd.DataFrame(rows)]).sort_values("date").to_csv(OUT, index=False, float_format="%.3f")
        time.sleep(2)
print("done")
