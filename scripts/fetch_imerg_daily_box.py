"""IMERG V07 Final DAILY precipitation fields over the Sahel box, May-October 1998-2025 (for extreme-rainfall indices).

Drafted with AI assistance (Claude Code). See docs/submission/si_usage.md.

Why fields and not box means: extremes (Rx1day, R95p, SDII, CDD) must be computed per grid cell and averaged afterwards;
a box-mean daily series smooths out the storms.
Output: data/raw/imerg_daily_box/sahel_imerg_final_daily_<year>.nc (one file per year, mm/day, float32, compressed;
git-ignored). Years already on disk are skipped, so the script can be rerun after an interruption.
Usage:  .venv/bin/python -u scripts/fetch_imerg_daily_box.py [first_year last_year]
Needs:  Earthdata credentials in .env (see .env.example) or ~/.netrc.
"""
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import earthaccess
import xarray as xr

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))
from earth_detective.auth import https_session  # noqa: E402
from earth_detective.imerg import box_field  # noqa: E402

OUT = ROOT / "data" / "raw" / "imerg_daily_box"
Y0, Y1 = (int(sys.argv[1]), int(sys.argv[2])) if len(sys.argv) == 3 else (1998, 2025)
OUT.mkdir(parents=True, exist_ok=True)
S = https_session()

for y in range(Y0, Y1 + 1):
    f = OUT / f"sahel_imerg_final_daily_{y}.nc"
    if f.exists():
        print(f"{y}: already on disk, skipped", flush=True)
        continue
    t0 = time.time()
    gr = earthaccess.search_data(short_name="GPM_3IMERGDF", version="07", temporal=(f"{y}-05-01", f"{y}-10-31"))
    with ThreadPoolExecutor(8) as ex:
        res = list(ex.map(lambda g: box_field(S, g, None), gr))
    da = xr.concat([p.expand_dims(time=[d]) for d, p in res], dim="time").sortby("time")
    da = da.astype("float32").rename("precipitation").transpose("time", "lat", "lon")
    da.attrs = {"units": "mm/day", "source": "GPM IMERG V07 Final daily (GPM_3IMERGDF), NASA GES DISC via OPeNDAP",
                "box": "10-20N, 18W-20E (D-003b)", "note": "fill values set to NaN; AI-assisted extraction (Claude Code)"}
    tmp = f.with_suffix(".tmp")
    da.to_netcdf(tmp, engine="h5netcdf", encoding={"precipitation": {"zlib": True, "complevel": 4}})
    tmp.rename(f)  # only complete years get the final name
    n_nan = int(da.isnull().sum())
    print(f"{y}: {da.sizes['time']} days, NaN cells {n_nan}, max {float(da.max()):.0f} mm/day, "
          f"{f.stat().st_size / 1e6:.0f} MB, {time.time() - t0:.0f}s", flush=True)
print("done")
