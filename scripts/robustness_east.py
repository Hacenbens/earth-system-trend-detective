"""Robustness of the eastern-Sahel signal (E-007): leave-one-year-out, without 2024, border shifts, Lake Chad mask,
equal-weight % anomalies. IMERG V07 Final daily, JJAS 1998-2025.

Drafted with AI assistance (Claude Code). See docs/submission/si_usage.md.
Also saves the per-cell JJAS fields (total, CDD) to data/raw/imerg_jjas_percell_1998_2025.nc for reuse (app, maps).
Output: outputs/robustness_east.csv
"""
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import xarray as xr

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))
from earth_detective.extremes import _cdd
from earth_detective.trend import trend_summary

RAW = ROOT / "data" / "raw"
YEARS = np.arange(1998, 2026)
cache = RAW / "imerg_jjas_percell_1998_2025.nc"
if not cache.exists():
    tot, cdd = [], []
    for y in YEARS:
        d = xr.open_dataarray(RAW / "imerg_daily_box" / f"sahel_imerg_final_daily_{y}.nc")
        d = d.sel(time=d.time.dt.month.isin([6, 7, 8, 9])).load()
        tot.append(d.sum("time")); cdd.append(_cdd(d)); d.close()
    ds = xr.Dataset({"total": xr.concat(tot, "year"), "cdd": xr.concat(cdd, "year")}).assign_coords(year=YEARS)
    ds["total"].attrs["units"] = "mm"; ds["cdd"].attrs["units"] = "days"
    ds.attrs = {"source": "GPM IMERG V07 Final daily (GPM_3IMERGDF)", "season": "JJAS", "note": "AI-assisted (Claude Code)"}
    ds.astype("float32").to_netcdf(cache, engine="h5netcdf")
ds = xr.open_dataset(cache).load()

LAKE_CHAD = {"lat": (12.3, 14.6), "lon": (13.0, 15.5)}   # approximate open-water / wetland extent


def series(var, lon, lat=(10, 20), mask_lake=False, pct=False, drop=()):
    f = ds[var].sel(lon=slice(*lon), lat=slice(*lat))
    if mask_lake:
        lake = (f.lat >= LAKE_CHAD["lat"][0]) & (f.lat <= LAKE_CHAD["lat"][1]) & (f.lon >= LAKE_CHAD["lon"][0]) & (f.lon <= LAKE_CHAD["lon"][1])
        f = f.where(~lake)
    if pct:  # each cell as % anomaly from its own mean: dry and wet cells count equally
        f = 100 * (f / f.mean("year") - 1)
    s = f.weighted(np.cos(np.deg2rad(f.lat))).mean(("lat", "lon")).to_series()
    return s.drop(list(drop), errors="ignore")


def row(test, var, s):
    t = trend_summary(s)
    pct = t["slope_pct_per_decade"] if not test.startswith("% anomaly") else 10 * t["sen_slope"]
    return {"test": test, "variable": var, "n": t["n"], "pct_per_decade": round(pct, 2), "mk_p": round(t["mk_p"], 4),
            "sen_ci": f"{t['slope_ci_low']:.3f}..{t['slope_ci_high']:.3f}"}


rows = []
E = (10, 20)
for var in ("total", "cdd"):
    rows.append(row("East baseline (10-20E)", var, series(var, E)))
    rows.append(row("East without 2024", var, series(var, E, drop=[2024])))
    rows.append(row("East without 2024 and 2020", var, series(var, E, drop=[2024, 2020])))
    rows.append(row("East ending 2023", var, series(var, E).loc[:2023]))
    loo = [trend_summary(series(var, E, drop=[y])) for y in YEARS]
    worst = max(loo, key=lambda t: t["mk_p"])
    rows.append({"test": "East leave-one-year-out (range)", "variable": var, "n": 27,
                 "pct_per_decade": f"{min(t['slope_pct_per_decade'] for t in loo):.2f}..{max(t['slope_pct_per_decade'] for t in loo):.2f}",
                 "mk_p": f"{min(t['mk_p'] for t in loo):.4f}..{worst['mk_p']:.4f}",
                 "sen_ci": f"worst p when dropping {int(YEARS[[t['mk_p'] for t in loo].index(worst['mk_p'])])}"})
    for w0 in (8, 9, 11, 12):
        rows.append(row(f"East border at {w0}E ({w0}-20E)", var, series(var, (w0, 20))))
    rows.append(row("East, south part 10-15N", var, series(var, E, lat=(10, 15))))
    rows.append(row("East, north part 15-20N", var, series(var, E, lat=(15, 20))))
    rows.append(row("East, Lake Chad masked", var, series(var, E, mask_lake=True)))
    rows.append(row("% anomaly, equal cell weight, East", var, series(var, E, pct=True)))
    rows.append(row("Whole box baseline", var, series(var, (-18, 20))))
    rows.append(row("% anomaly, equal cell weight, whole box", var, series(var, (-18, 20), pct=True)))

out = pd.DataFrame(rows)
out.to_csv(ROOT / "outputs" / "robustness_east.csv", index=False)
pd.set_option("display.width", 200); pd.set_option("display.max_colwidth", 60)
print(out.to_string(index=False))
print("\n% anomaly rows: pct_per_decade = percentage points of anomaly per decade")
