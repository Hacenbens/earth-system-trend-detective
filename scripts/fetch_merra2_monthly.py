"""Layer 2 data: MERRA-2 monthly moisture, circulation and dust over the Sahel box, 1998-01 .. 2025-12.

Drafted with AI assistance (Claude Code). See docs/submission/si_usage.md.
Output: data/raw/merra2_box/<product>_1998_2025.nc (box fields, git-ignored; skipped if present)
        data/processed/sahel_merra2_monthly_1998_2025.csv (box + W/C/E sub-region means per month)
Usage : .venv/bin/python -u scripts/fetch_merra2_monthly.py      (needs Earthdata login: .env or ~/.netrc)
"""
import sys
import time
from pathlib import Path

import pandas as pd
import xarray as xr

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))
from earth_detective.merra2 import PRODUCTS, area_mean, fetch_product

RAW = ROOT / "data" / "raw" / "merra2_box"
RAW.mkdir(parents=True, exist_ok=True)
REGIONS = {"sahel": None, "west": (-18, -5), "central": (-5, 10), "east": (10, 20)}  # provisional (D-003b)

fields = {}
for p in PRODUCTS:
    f = RAW / f"{p}_1998_2025.nc"
    if not f.exists():
        t0 = time.time()
        ds = fetch_product(p, "1998-01-01", "2025-12-31")
        ds.attrs.update(source=f"NASA GMAO MERRA-2 {p} (reanalysis) via GES DISC OPeNDAP", box="10-20N, 18W-20E",
                        note="AI-assisted extraction (Claude Code)")
        ds.to_netcdf(f, engine="h5netcdf")
        print(f"{p}: {ds.sizes['time']} months, {list(ds.data_vars)}, {time.time() - t0:.0f}s", flush=True)
    fields[p] = xr.open_dataset(f).load()

rows = []
for reg, lon in REGIONS.items():
    parts = [area_mean(ds[[v.split('@')[0] for v in PRODUCTS[p]]], lon_range=lon) for p, ds in fields.items() if p != 'M2IMNPASM']
    df = pd.concat(parts, axis=1)
    df.insert(0, "region", reg)
    rows.append(df)
out = pd.concat(rows).reset_index().rename(columns={"time": "date"})
out = out.loc[:, ~out.columns.duplicated()]
units = {v.split("@")[0]: str(fields[p][v.split("@")[0]].attrs.get("units", "")) for p in fields for v in PRODUCTS[p]}
out.to_csv(ROOT / "data" / "processed" / "sahel_merra2_monthly_1998_2025.csv", index=False, float_format="%.6g")
print("units:", units)
print(out.groupby("region").size().to_string())
print("saved data/processed/sahel_merra2_monthly_1998_2025.csv")
