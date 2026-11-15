"""Layer 2 (INVESTIGATE): do moisture, vertical motion, moisture convergence and dust change with Sahel JJAS rainfall?

Drafted with AI assistance (Claude Code). See docs/submission/si_usage.md.
Inputs : data/processed/sahel_merra2_monthly_1998_2025.csv (MERRA-2 REANALYSIS, box + W/C/E means)
         data/raw/imerg_jjas_percell_1998_2025.nc (IMERG V07 Final, per-cell JJAS total and CDD; scripts/robustness_east.py)
Outputs: outputs/layer2_trends.csv, outputs/layer2_correlations.csv, outputs/layer2_years.csv, outputs/figures/layer2_merra2.png
All relationships are ASSOCIATIONS, not causes. Correlations on detrended series test year-to-year coupling; raw ones
can be inflated by shared trends.
"""
import sys
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import xarray as xr
from scipy import stats

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))
from earth_detective.trend import trend_summary

O = ROOT / "outputs"
LON = {"sahel": (-18, 20), "west": (-18, -5), "central": (-5, 10), "east": (10, 20)}

m = pd.read_csv(ROOT / "data" / "processed" / "sahel_merra2_monthly_1998_2025.csv", parse_dates=["date"])
m = m[m.date.dt.month.isin([6, 7, 8, 9])]
m["year"] = m.date.dt.year
# derived, readable units
m["ascent_500"] = -m["OMEGA500"] * 100           # hPa... as -Pa/s x100 = upward motion index (cPa/s); >0 = rising air
m["mfc_mm_day"] = m["DQVDT_DYN"] * 86400          # moisture flux convergence (dynamics tendency of water vapour), mm/day
m["T2M_C"] = m["T2M"] - 273.15
VARS = {"TQV": ("Column water vapour", "kg/m²"), "QV2M": ("Near-surface humidity", "kg/kg"), "T2M_C": ("Near-surface temperature", "°C"),
        "ascent_500": ("Rising motion at 500 hPa (−ω×100)", "cPa/s"), "mfc_mm_day": ("Moisture convergence", "mm/day"),
        "U850": ("Westerly monsoon wind 850 hPa", "m/s"), "V850": ("Southerly wind 850 hPa", "m/s"),
        "DUEXTTAU": ("Dust optical depth", "–"), "TOTEXTTAU": ("Total aerosol optical depth", "–")}
season = m.groupby(["region", "year"])[list(VARS)].mean()

ds = xr.open_dataset(ROOT / "data" / "raw" / "imerg_jjas_percell_1998_2025.nc").load()
rain = {}
for reg, lon in LON.items():
    f = ds.sel(lon=slice(*lon))
    w = np.cos(np.deg2rad(f.lat))
    rain[reg] = pd.DataFrame({"rain_total": f["total"].weighted(w).mean(("lat", "lon")).to_series(),
                              "dry_spell": f["cdd"].weighted(w).mean(("lat", "lon")).to_series()})


def detrend(s):
    return s - np.polyval(np.polyfit(s.index, s.values, 1), s.index)


trows, crows, yrows = [], [], []
for reg in LON:
    s_reg = season.loc[reg]
    for v, (label, unit) in VARS.items():
        t = trend_summary(s_reg[v])
        trows.append({"region": reg, "variable": v, "label": label, "unit": unit, "mean": t["mean"],
                      "sen_per_decade": 10 * t["sen_slope"], "pct_per_decade": t["slope_pct_per_decade"] if abs(t["mean"]) > 1e-9 else np.nan,
                      "mk_p": t["mk_p"], "significant": t["mk_p"] < 0.05})
        for rv in ("rain_total", "dry_spell"):
            a, b = s_reg[v], rain[reg][rv]
            r_raw, p_raw = stats.spearmanr(a, b)
            r_det, p_det = stats.spearmanr(detrend(a), detrend(b))
            crows.append({"region": reg, "rain_metric": rv, "variable": v, "label": label,
                          "rho_raw": r_raw, "p_raw": p_raw, "rho_detrended": r_det, "p_detrended": p_det,
                          "status": ("supporting" if p_det < 0.05 else "unclear")})
    z = (s_reg - s_reg.mean()) / s_reg.std(ddof=1)
    zr = (rain[reg] - rain[reg].mean()) / rain[reg].std(ddof=1)
    for y in (2002, 2024):
        yrows.append({"region": reg, "year": y, **{f"z_{k}": round(z.loc[y, k], 2) for k in VARS},
                      **{f"z_{k}": round(zr.loc[y, k], 2) for k in zr.columns}})

tr, cr, yr = pd.DataFrame(trows), pd.DataFrame(crows), pd.DataFrame(yrows)
tr.to_csv(O / "layer2_trends.csv", index=False, float_format="%.5g")
cr.to_csv(O / "layer2_correlations.csv", index=False, float_format="%.4f")
yr.to_csv(O / "layer2_years.csv", index=False)

# Clausius-Clapeyron: % change of column water vapour per K of near-surface temperature (year-to-year, JJAS)
cc = {}
for reg in LON:
    s_reg = season.loc[reg]
    sl = stats.linregress(s_reg["T2M_C"], np.log(s_reg["TQV"]))
    cc[reg] = (100 * sl.slope, sl.pvalue, sl.rvalue)

pd.set_option("display.width", 220)
print("=== JJAS trends 1998-2025 (per decade) ===")
print(tr.pivot(index="variable", columns="region", values="sen_per_decade").round(4).to_string())
print("\nMK p:"); print(tr.pivot(index="variable", columns="region", values="mk_p").round(3).to_string())
print("\n=== Spearman rho with JJAS rainfall total, detrended (year-to-year) / raw ===")
for rv in ("rain_total", "dry_spell"):
    sub = cr[cr.rain_metric == rv]
    print(f"\n-- {rv} --")
    print((sub.pivot(index="variable", columns="region", values="rho_detrended").round(2).astype(str) + " (p=" +
           sub.pivot(index="variable", columns="region", values="p_detrended").round(3).astype(str) + ")").to_string())
print("\n=== Clausius-Clapeyron check: d ln(TQV)/dT2M, % per K (expected ~ +7 %/K if humidity rises with warming) ===")
for reg, (sl, p, r) in cc.items():
    print(f"{reg:8s} {sl:+.1f} %/K (p={p:.3f}, r={r:+.2f})")
print("\n=== 2002 (dry) vs 2024 (wet): z-scores vs 1998-2025 ===")
print(yr.set_index(["region", "year"])[["z_rain_total", "z_dry_spell", "z_TQV", "z_ascent_500", "z_mfc_mm_day", "z_U850", "z_DUEXTTAU", "z_T2M_C"]].to_string())

# figure: rainfall vs key drivers, whole box and east
fig, axes = plt.subplots(2, 4, figsize=(15, 6.5), sharex=True)
for i, reg in enumerate(["sahel", "east"]):
    zr = (rain[reg]["rain_total"] - rain[reg]["rain_total"].mean()) / rain[reg]["rain_total"].std()
    for j, v in enumerate(["TQV", "ascent_500", "mfc_mm_day", "DUEXTTAU"]):
        ax = axes[i, j]; s = season.loc[reg][v]; zs = (s - s.mean()) / s.std()
        c = cr[(cr.region == reg) & (cr.variable == v) & (cr.rain_metric == "rain_total")].iloc[0]
        ax.plot(zr.index, zr, "o-", ms=3, lw=1.3, color="#1f6feb", label="IMERG rainfall (z)")
        ax.plot(zs.index, zs, "s-", ms=3, lw=1.1, color="#9a6700", label=f"MERRA-2 {v} (z)")
        ax.axhline(0, color="grey", lw=0.6); ax.axvline(2014, color="grey", lw=0.6, ls=":")
        ax.set_title(f"{reg}: {VARS[v][0]}\nρ detrended {c.rho_detrended:+.2f} (p={c.p_detrended:.3f})", fontsize=8.5)
        ax.grid(alpha=0.3); ax.tick_params(labelsize=7)
axes[0, 0].legend(fontsize=7, frameon=False)
fig.suptitle("Layer 2 – JJAS rainfall (IMERG) vs atmosphere (MERRA-2 reanalysis), standardised, 1998–2025", fontsize=11)
fig.text(0.01, 0.005, "Associations, not causes. Code drafted with AI assistance (Claude Code). Data: NASA GPM IMERG V07B Final; NASA GMAO MERRA-2.", fontsize=6, color="grey")
fig.tight_layout(rect=(0, 0.02, 1, 0.96)); fig.savefig(O / "figures" / "layer2_merra2.png", dpi=140)
print("\nsaved outputs/layer2_*.csv, outputs/figures/layer2_merra2.png")
