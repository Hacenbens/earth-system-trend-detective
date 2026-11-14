"""Exact Sahel-box IMERG V07 series for 2024-01 .. 2026-11, fetched as OPeNDAP subsets (box only, ~40 kB per file).

Drafted with AI assistance (Claude Code). See docs/submission/si_usage.md.

Two products, kept SEPARATE (never spliced into one series):
  * Final Run monthly (GPM_3IMERGM v07, gauge-calibrated): 2024-01 .. 2025-09 (end of the V07 Final record).
  * Late Run daily  (GPM_3IMERGDL v07, near-real-time, NO monthly gauge calibration): 2024-01-01 .. latest.
    The 2024-01..2025-09 overlap gives a measured Late-vs-Final bias, so 2026 Late values can be read with a known error.

Box = provisional Sahel, 10-20N, 18W-20E (decision D-003b): lon index 1620..1999, lat index 1000..1099 (0.1 deg grid,
cell centres -179.95.. / -89.95..). Mean = cos(lat)-weighted over valid cells (same method as fetch_sample_imerg.py).

Usage:  .venv/bin/python scripts/fetch_sahel_series.py
Needs:  Earthdata credentials in ~/.netrc. Outputs go to data/processed/ (daily results cached so reruns resume).
"""
import calendar
import io
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import earthaccess
import numpy as np
import pandas as pd
import xarray as xr

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "processed"
LON_I, LAT_I = (1620, 1999), (1000, 1099)
START, END_FINAL = "2024-01-01", "2025-09-30"
END_LATE = pd.Timestamp.today().strftime("%Y-%m-%d")

earthaccess.login(strategy="netrc")
S = earthaccess.get_requests_https_session()


def opendap_url(granule):
    return next(u["URL"] for u in granule["umm"]["RelatedUrls"] if u.get("Subtype") == "OPENDAP DATA")


def box_mean(granule, group):
    """Fetch the box subset of `precipitation` and return (date, cos-lat weighted mean, valid cells)."""
    pre = f"/{group}" if group else ""
    ce = (f"{pre}/precipitation[0:1:0][{LON_I[0]}:1:{LON_I[1]}][{LAT_I[0]}:1:{LAT_I[1]}];"
          f"{pre}/lon[{LON_I[0]}:1:{LON_I[1]}];{pre}/lat[{LAT_I[0]}:1:{LAT_I[1]}];{pre}/time")
    for attempt in range(4):
        try:
            r = S.get(opendap_url(granule) + ".dap.nc4", params={"dap4.ce": ce}, timeout=180)
            r.raise_for_status()
            break
        except Exception:
            if attempt == 3:
                raise
    ds = xr.open_dataset(io.BytesIO(r.content), engine="h5netcdf", group=group, decode_timedelta=False)
    p = ds["precipitation"].isel(time=0)
    assert abs(float(p.lon.min()) + 17.95) < 1e-3 and abs(float(p.lat.max()) - 19.95) < 1e-3, "box indices off"
    p = p.where(p >= 0)  # fill value -9999.9
    w = np.cos(np.deg2rad(p["lat"]))
    date = pd.Timestamp(str(ds["time"].values[0])[:10])
    return date, float(p.weighted(w).mean(skipna=True)), int(p.notnull().sum())


def run(short_name, start, end, group, workers=8):
    gr = earthaccess.search_data(short_name=short_name, version="07", temporal=(start, end))
    print(f"{short_name}: {len(gr)} granules {start}..{end}")
    with ThreadPoolExecutor(workers) as ex:
        rows = list(ex.map(lambda g: box_mean(g, group), gr))
    return pd.DataFrame(rows, columns=["date", "rate", "valid_cells"]).sort_values("date").reset_index(drop=True)


OUT.mkdir(parents=True, exist_ok=True)

# --- Final monthly (mm/hr) ---
fin = run("GPM_3IMERGM", START, END_FINAL, "Grid")
fin["hours"] = [calendar.monthrange(d.year, d.month)[1] * 24 for d in fin.date]
fin["final_mm"] = fin.rate * fin.hours
fin = fin.rename(columns={"rate": "final_mm_per_hr"})
fin.to_csv(OUT / "sahel_imerg_final_monthly_2024_2025.csv", index=False, float_format="%.5f")

# --- Late daily (mm/day), cached ---
cache = OUT / "sahel_imerg_late_daily.csv"
old = pd.read_csv(cache, parse_dates=["date"]) if cache.exists() else pd.DataFrame(columns=["date", "rate", "valid_cells"])
start_late = (old.date.max() + pd.Timedelta(days=1)).strftime("%Y-%m-%d") if len(old) else START
new = run("GPM_3IMERGDL", start_late, END_LATE, None) if start_late <= END_LATE else old.iloc[:0]
late = pd.concat([old, new]).astype({"rate": float, "valid_cells": int})
late["date"] = pd.to_datetime(late.date)
late = late.drop_duplicates("date").sort_values("date").reset_index(drop=True)
late.to_csv(cache, index=False, float_format="%.5f")

late["month"] = late.date.dt.to_period("M")
lm = late.groupby("month").agg(late_mm=("rate", "sum"), days=("rate", "size")).reset_index()
lm["days_in_month"] = [p.days_in_month for p in lm.month]
lm["complete"] = lm.days == lm.days_in_month

fin["month"] = fin.date.dt.to_period("M")
tab = lm.merge(fin[["month", "final_mm_per_hr", "final_mm"]], on="month", how="left")
tab["late_minus_final_pct"] = 100 * (tab.late_mm - tab.final_mm) / tab.final_mm
tab.to_csv(OUT / "sahel_imerg_monthly_2024_2026.csv", index=False, float_format="%.3f")

pd.set_option("display.width", 140)
print(tab.to_string(index=False, float_format=lambda x: f"{x:.3f}"))
ov = tab.dropna(subset=["final_mm"])
wet = ov[ov.month.dt.month.isin([6, 7, 8, 9])]
print(f"\nOverlap months: {len(ov)}. Late vs Final, Jun-Sep months: mean diff {wet.late_minus_final_pct.mean():+.1f} %, "
      f"range {wet.late_minus_final_pct.min():+.1f} .. {wet.late_minus_final_pct.max():+.1f} %")
for y in sorted(set(tab.month.dt.year)):
    j = tab[(tab.month.dt.year == y) & tab.month.dt.month.isin([6, 7, 8, 9])]
    f = j.final_mm.sum() if j.final_mm.notna().all() and len(j) == 4 else np.nan
    print(f"JJAS {y}: Late {j.late_mm.sum():.1f} mm ({len(j)} months)   Final {f:.1f} mm")
