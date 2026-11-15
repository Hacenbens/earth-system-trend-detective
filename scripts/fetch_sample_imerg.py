"""Download ONE GPM IMERG Final V07 monthly file and inspect it (Phase 02, step 3).

Drafted with AI assistance (Claude Code). See docs/submission/si_usage.md.

Usage:  .venv/bin/python scripts/fetch_sample_imerg.py [YYYY-MM]   (default 2024-08, peak Sahel rain)
Needs:  NASA Earthdata credentials in .env (see .env.example) or ~/.netrc.
"""
import sys
import calendar
from pathlib import Path

import earthaccess
import numpy as np
import xarray as xr

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "raw" / "imerg_monthly"
SAHEL = dict(lat=(10.0, 20.0), lon=(-18.0, 20.0))  # provisional box, decision D-003b

month = sys.argv[1] if len(sys.argv) > 1 else "2024-08"
y, m = map(int, month.split("-"))
last = calendar.monthrange(y, m)[1]

sys.path.insert(0, str(ROOT / "src"))
from earth_detective.auth import login  # noqa: E402

login()  # .env (see .env.example) or ~/.netrc
res = earthaccess.search_data(short_name="GPM_3IMERGM", version="07",
                              temporal=(f"{month}-01", f"{month}-{last:02d}"))
print(f"granules found: {len(res)}")
if not res:
    sys.exit("No granule found. Check the date (V07 Final covers 1998-01 to 2025-09).")
OUT.mkdir(parents=True, exist_ok=True)
files = earthaccess.download(res[:1], local_path=str(OUT))
f = Path(files[0])
print(f"file: {f.name}  ({f.stat().st_size / 1e6:.1f} MB)\n")

ds = xr.open_dataset(f, group="Grid", engine="h5netcdf", decode_timedelta=False)
print("=== dimensions:", dict(ds.sizes))
print("=== coordinates:")
for c in ds.coords:
    v = ds[c]
    print(f"  {c:10s} {v.dims} range=[{float(v.min()):.3f}, {float(v.max()):.3f}]" if v.dtype.kind in "fi" else f"  {c} {v.values[:1]}")
print("=== data variables:")
for name, v in ds.data_vars.items():
    a = v.attrs
    print(f"  {name:32s} dims={v.dims} dtype={v.dtype} units={a.get('units', a.get('Units'))!r} "
          f"fill={v.encoding.get('_FillValue', a.get('_FillValue'))!r}")
    desc = a.get("LongName") or a.get("long_name") or a.get("description")
    if desc:
        print(f"      {str(desc)[:140]}")

# Sahel box: area-weighted mean of the precipitation rate
p = ds["precipitation"].squeeze("time", drop=True)
box = p.sel(lat=slice(*SAHEL["lat"]), lon=slice(*SAHEL["lon"]))
w = np.cos(np.deg2rad(box["lat"]))
rate = float(box.weighted(w).mean(skipna=True))  # expected mm/hr (checked against the units printed above)
hours = last * 24
print(f"\n=== Sahel box {SAHEL}: {box.sizes}")
print(f"  valid cells: {int(box.notnull().sum())} / {box.size}")
print(f"  area-weighted mean rate: {rate:.4f} {p.attrs.get('units')}")
print(f"  -> about {rate * hours:.1f} mm for {month} (if units are mm/hr)")
print("  Plausibility: an August Sahel-box mean of roughly 100-250 mm is expected. Far outside -> check units or the axis order.")
