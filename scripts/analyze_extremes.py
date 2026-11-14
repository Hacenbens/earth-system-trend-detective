"""H2: trends in Sahel JJAS extreme-precipitation indices, 1998-2025 (IMERG V07 Final daily, per-cell indices).

Drafted with AI assistance (Claude Code). See docs/submission/si_usage.md.
Input : data/raw/imerg_daily_box/sahel_imerg_final_daily_<year>.nc  (scripts/fetch_imerg_daily_box.py)
Output: data/processed/sahel_jjas_extreme_indices_1998_2025.csv (box-mean index per year)
        outputs/jjas_extremes_trends.csv, outputs/figures/jjas_extremes.png
Usage : .venv/bin/python scripts/analyze_extremes.py
"""
import sys
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import pandas as pd
import xarray as xr

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))
from earth_detective.extremes import box_average, season_indices, wet_day_p95
from earth_detective.trend import trend_summary

RAW, O = ROOT / "data" / "raw" / "imerg_daily_box", ROOT / "outputs"
YEARS = range(1998, 2026)
missing = [y for y in YEARS if not (RAW / f"sahel_imerg_final_daily_{y}.nc").exists()]
if missing:
    sys.exit(f"missing years {missing}: run scripts/fetch_imerg_daily_box.py first")


def jjas(y):
    d = xr.open_dataarray(RAW / f"sahel_imerg_final_daily_{y}.nc").load()
    d = d.sel(time=d.time.dt.month.isin([6, 7, 8, 9]))
    assert d.sizes["time"] == 122, (y, d.sizes["time"])
    return d


# reference: per-cell 95th percentile of wet-day amounts over all JJAS days 1998-2025
p95 = wet_day_p95(xr.concat([jjas(y) for y in YEARS], dim="time"))
rows = []
for y in YEARS:
    rows.append({"year": y, **box_average(season_indices(jjas(y), p95))})
    print(y, {k: round(v, 1) for k, v in rows[-1].items() if k != "year"}, flush=True)
idx = pd.DataFrame(rows).set_index("year")
idx.to_csv(ROOT / "data" / "processed" / "sahel_jjas_extreme_indices_1998_2025.csv", float_format="%.4f")

units = {"PRCPTOT": "mm", "wet_days": "days", "SDII": "mm/day", "Rx1day": "mm", "Rx5day": "mm", "R10mm": "days",
         "R20mm": "days", "CDD": "days", "R95p": "mm", "R95pTOT": "%"}
tr = pd.DataFrame({k: trend_summary(idx[k]) for k in units}).T
tr.insert(0, "units", pd.Series(units))
tr.to_csv(O / "jjas_extremes_trends.csv", float_format="%.4f")
pd.set_option("display.width", 200)
print("\n=== JJAS extreme-index trends 1998-2025 (slope per year) ===")
print(tr[["units", "mean", "sen_slope", "slope_ci_low", "slope_ci_high", "slope_pct_per_decade", "mk_p",
          "mk_hamed_rao_p", "mk_yue_wang_p", "lag1_autocorr", "significant_all_tests"]].to_string(float_format=lambda v: f"{v:.3f}"))

# start-year sensitivity for the key extremes (same rule as for totals: never cherry-pick)
print("\n=== start-year sensitivity (MK p / %/decade) ===")
for k in ["Rx1day", "R95p", "SDII", "wet_days"]:
    line = [f"{y0}: {trend_summary(idx[k].loc[y0:])['mk_p']:.3f}/{trend_summary(idx[k].loc[y0:])['slope_pct_per_decade']:+.1f}"
            for y0 in (1998, 2000, 2002, 2005)]
    print(f"{k:8s}", "  ".join(line))

fig, axes = plt.subplots(2, 3, figsize=(12, 6), sharex=True)
for ax, k in zip(axes.flat, ["PRCPTOT", "wet_days", "SDII", "Rx1day", "R95p", "CDD"]):
    t = tr.loc[k]
    ax.plot(idx.index, idx[k], "o-", ms=3, lw=1.2, color="#1f6feb")
    ax.plot(idx.index, t["intercept"] + t["sen_slope"] * idx.index, "--", color="#cf222e", lw=1)
    ax.set_title(f"{k} ({units[k]})  {t['slope_pct_per_decade']:+.1f} %/dec, p={t['mk_p']:.2f}", fontsize=9)
    ax.axvline(2014, color="grey", lw=0.6, ls=":"); ax.grid(alpha=0.3)
fig.suptitle("Sahel JJAS rainfall extremes, 1998–2025 (IMERG V07 Final daily, per-cell indices, box mean)", fontsize=11)
fig.text(0.01, 0.005, "Analysis code drafted with AI assistance (Claude Code). Data: NASA GPM IMERG V07B Final daily.", fontsize=6, color="grey")
fig.tight_layout(rect=(0, 0.02, 1, 0.97)); fig.savefig(O / "figures" / "jjas_extremes.png", dpi=150)
print(f"\nsaved outputs/jjas_extremes_trends.csv, outputs/figures/jjas_extremes.png")
