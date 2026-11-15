"""EDA: (1) how the JJAS rainfall indicators relate to each other, (2) where rain falls and where it changes.

Drafted with AI assistance (Claude Code). See docs/submission/si_usage.md.

Inputs : data/processed/sahel_jjas_extreme_indices_1998_2025.csv (box means)
         data/raw/imerg_daily_box/sahel_imerg_final_daily_<year>.nc (per-cell daily fields, JJAS used)
Outputs: outputs/eda/indicator_correlation_spearman.csv, outputs/eda/indicator_pca.csv,
         outputs/eda/subregion_trends.csv, outputs/figures/eda_correlation.png, outputs/figures/eda_maps.png
Memory : one year of daily data at a time (the machine has ~1 GB free).
Per-cell trends use a vectorised Mann-Kendall (no tie correction; daily-sum totals have no ties) and Sen's slope,
with Benjamini-Hochberg FDR at 5 % across cells (field significance, Wilks 2016).
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
from earth_detective.extremes import _cdd
from earth_detective.trend import trend_summary

RAW, O = ROOT / "data" / "raw" / "imerg_daily_box", ROOT / "outputs"
(O / "eda").mkdir(parents=True, exist_ok=True)
YEARS = np.arange(1998, 2026)
FOOT = "EDA code drafted with AI assistance (Claude Code). Data: NASA GPM IMERG V07B Final daily, JJAS, box 10–20°N 18°W–20°E."

# ---------------------------------------------------------------- 1. correlation between indicators
idx = pd.read_csv(ROOT / "data" / "processed" / "sahel_jjas_extreme_indices_1998_2025.csv", index_col="year")
order = ["PRCPTOT", "wet_days", "SDII", "R10mm", "R20mm", "R95p", "R95pTOT", "Rx1day", "Rx5day", "CDD"]
idx = idx[order]
rho = idx.corr(method="spearman")
rho.to_csv(O / "eda" / "indicator_correlation_spearman.csv", float_format="%.3f")
# detrended (year-to-year) correlation: does the link hold beyond shared trends?
det = idx.apply(lambda s: s - np.polyval(np.polyfit(idx.index, s, 1), idx.index))
rho_det = det.corr(method="spearman")

# PCA on standardised indicators (how many independent signals?)
Z = (idx - idx.mean()) / idx.std(ddof=1)
U, S, Vt = np.linalg.svd(Z.values, full_matrices=False)
expl = S**2 / np.sum(S**2)
pca = pd.DataFrame(Vt[:3].T, index=order, columns=["PC1", "PC2", "PC3"])
pca.loc["explained_variance"] = expl[:3]
pca.to_csv(O / "eda" / "indicator_pca.csv", float_format="%.3f")
pc1 = pd.Series(Z.values @ Vt[0], index=idx.index)
if np.corrcoef(pc1, idx["PRCPTOT"])[0, 1] < 0:
    pc1 = -pc1  # orient PC1 so that "wetter" is positive

# normality of each indicator (justifies the non-parametric tests / z-scores)
shapiro = {k: stats.shapiro(idx[k]).pvalue for k in order}
skew = idx.skew()

pd.set_option("display.width", 200)
print("=== Spearman correlation between JJAS indicators (1998-2025, box means) ===")
print(rho.round(2).to_string())
print("\n=== same, after removing each indicator's linear trend ===")
print(rho_det.loc[["PRCPTOT", "wet_days", "CDD"], order].round(2).to_string())
print("\n=== PCA ===")
print(pca.round(2).to_string())
print(f"PC1 trend: {trend_summary(pc1)['sen_slope'] * 10:+.2f} sd/decade, MK p={trend_summary(pc1)['mk_p']:.3f}")
print("\n=== distribution shape: skewness / Shapiro-Wilk p (p<0.05 = not normal) ===")
print(pd.DataFrame({"skew": skew, "shapiro_p": pd.Series(shapiro)}).round(3).T.to_string())

# ---------------------------------------------------------------- 2. per-cell fields, one year at a time
tot, cdd = [], []
for y in YEARS:
    d = xr.open_dataarray(RAW / f"sahel_imerg_final_daily_{y}.nc")
    d = d.sel(time=d.time.dt.month.isin([6, 7, 8, 9])).load()
    tot.append(d.sum("time").values.astype("float32"))
    cdd.append(_cdd(d).values.astype("float32"))
    lat, lon = d.lat.values, d.lon.values
    d.close()
tot, cdd = np.stack(tot), np.stack(cdd)          # (year, lat, lon)
n = len(YEARS)


def mk_sen(a):
    """Vectorised Mann-Kendall (two-sided p) and Sen's slope along axis 0."""
    s = np.zeros(a.shape[1:], dtype="float64")
    slopes = []
    for i in range(n - 1):
        diff = a[i + 1:] - a[i]
        s += np.sign(diff).sum(0)
        slopes.append(diff / (YEARS[i + 1:] - YEARS[i])[:, None, None])
    var = n * (n - 1) * (2 * n + 5) / 18
    z = np.where(s > 0, (s - 1) / np.sqrt(var), np.where(s < 0, (s + 1) / np.sqrt(var), 0))
    p = 2 * stats.norm.sf(np.abs(z))
    sen = np.median(np.concatenate(slopes, 0), axis=0)
    return sen, p


def fdr(p, q=0.05):
    """Benjamini-Hochberg: boolean mask of discoveries."""
    flat = p.ravel(); m = flat.size
    order_ = np.argsort(flat)
    thresh = q * np.arange(1, m + 1) / m
    ok = flat[order_] <= thresh
    k = np.max(np.nonzero(ok)[0]) + 1 if ok.any() else 0
    mask = np.zeros(m, bool); mask[order_[:k]] = True
    return mask.reshape(p.shape)


mean_tot = tot.mean(0)
cv_tot = tot.std(0, ddof=1) / mean_tot
sen_tot, p_tot = mk_sen(tot)
sen_cdd, p_cdd = mk_sen(cdd)
pct_tot = 1000 * sen_tot / mean_tot                     # % per decade
sig_tot, sig_cdd = fdr(p_tot), fdr(p_cdd)
print(f"\n=== per-cell trends ({mean_tot.size} cells) ===")
print(f"JJAS total: cells p<0.05 {100 * (p_tot < 0.05).mean():.1f} % | FDR-significant {100 * sig_tot.mean():.1f} % "
      f"| increasing {100 * (sen_tot > 0).mean():.0f} % of cells")
print(f"CDD       : cells p<0.05 {100 * (p_cdd < 0.05).mean():.1f} % | FDR-significant {100 * sig_cdd.mean():.1f} % "
      f"| decreasing {100 * (sen_cdd < 0).mean():.0f} % of cells")
print(f"north-south: mean JJAS total 10-13N {mean_tot[lat < 13].mean():.0f} mm, 13-16N {mean_tot[(lat >= 13) & (lat < 16)].mean():.0f}, 16-20N {mean_tot[lat >= 16].mean():.0f}")

# sub-regions (proposal D-003b): W 18W-5W, C 5W-10E, E 10E-20E
w = np.cos(np.deg2rad(lat))[:, None] * np.ones((1, lon.size))
regions = {"West (18°W–5°W)": lon < -5, "Central (5°W–10°E)": (lon >= -5) & (lon < 10), "East (10°E–20°E)": lon >= 10}
rows = []
for name, colmask in regions.items():
    ww = w[:, colmask]
    s_tot = pd.Series([(t[:, colmask] * ww).sum() / ww.sum() for t in tot], index=YEARS)
    s_cdd = pd.Series([(c[:, colmask] * ww).sum() / ww.sum() for c in cdd], index=YEARS)
    a, b = trend_summary(s_tot), trend_summary(s_cdd)
    rows.append({"region": name, "mean_jjas_mm": a["mean"], "total_pct_per_decade": a["slope_pct_per_decade"], "total_mk_p": a["mk_p"],
                 "cdd_mean_days": b["mean"], "cdd_pct_per_decade": b["slope_pct_per_decade"], "cdd_mk_p": b["mk_p"],
                 "share_of_box_rain_pct": 100 * (mean_tot[:, colmask] * ww).sum() / (mean_tot * w).sum()})
sub = pd.DataFrame(rows).set_index("region")
sub.to_csv(O / "eda" / "subregion_trends.csv", float_format="%.3f")
print("\n=== sub-regions ===")
print(sub.round(3).to_string())

# notable years: anomaly vs 1998-2025 mean
anom = {y: 100 * (tot[YEARS == y][0] / mean_tot - 1) for y in (2002, 2024)}

# ---------------------------------------------------------------- figures
fig, axes = plt.subplots(1, 2, figsize=(13, 5.4))
for ax, m, t in [(axes[0], rho, "Spearman correlation (raw)"), (axes[1], rho_det, "After removing linear trends")]:
    im = ax.imshow(m.values, cmap="RdBu_r", vmin=-1, vmax=1)
    ax.set_xticks(range(len(order)), order, rotation=45, ha="right", fontsize=8); ax.set_yticks(range(len(order)), order, fontsize=8)
    for i in range(len(order)):
        for j in range(len(order)):
            ax.text(j, i, f"{m.values[i, j]:.2f}", ha="center", va="center", fontsize=6.5, color="white" if abs(m.values[i, j]) > 0.6 else "black")
    ax.set_title(t, fontsize=10)
fig.colorbar(im, ax=axes, shrink=0.8, label="ρ")
fig.suptitle("Sahel JJAS rainfall indicators, 1998–2025: how they move together", fontsize=11)
fig.text(0.01, 0.01, FOOT, fontsize=6, color="grey")
fig.savefig(O / "figures" / "eda_correlation.png", dpi=150, bbox_inches="tight")

ext = [lon.min() - 0.05, lon.max() + 0.05, lat.min() - 0.05, lat.max() + 0.05]
panels = [
    (mean_tot, "Mean JJAS rainfall (mm)", "YlGnBu", (0, np.nanpercentile(mean_tot, 99)), None),
    (100 * cv_tot, "Year-to-year variability (CV, %)", "magma_r", (0, 60), None),
    (np.clip(pct_tot, -40, 40), "JJAS total trend (% / decade)", "BrBG", (-30, 30), sig_tot),
    (10 * sen_cdd, "Longest dry spell trend (days / decade)", "PuOr", (-6, 6), sig_cdd),
    (np.clip(anom[2002], -60, 60), "2002 anomaly (%; driest season)", "BrBG", (-60, 60), None),
    (np.clip(anom[2024], -60, 60), "2024 anomaly (%; wettest season)", "BrBG", (-60, 60), None),
]
fig, axes = plt.subplots(3, 2, figsize=(13, 10.5))
for ax, (arr, title, cmap, (vmin, vmax), sig) in zip(axes.flat, panels):
    im = ax.imshow(arr, origin="lower", extent=ext, cmap=cmap, vmin=vmin, vmax=vmax, aspect="auto")
    if sig is not None and sig.any():
        yy, xx = np.nonzero(sig[::4, ::4])
        ax.scatter(lon[::4][xx], lat[::4][yy], s=0.6, c="k", alpha=0.6, linewidths=0)
    for x in (-5, 10):
        ax.axvline(x, color="grey", lw=0.7, ls="--")
    ax.set_title(title, fontsize=10); ax.tick_params(labelsize=8)
    fig.colorbar(im, ax=ax, shrink=0.85)
axes[1, 0].text(0.01, 0.02, "dots = FDR-significant (5 %)", transform=axes[1, 0].transAxes, fontsize=7)
fig.suptitle("Sahel JJAS rainfall, 1998–2025, per 0.1° cell (dashed: proposed W / C / E sub-regions)", fontsize=11)
fig.text(0.01, 0.005, FOOT + " No coastlines drawn (Cartopy not installed).", fontsize=6, color="grey")
fig.tight_layout(rect=(0, 0.015, 1, 0.97))
fig.savefig(O / "figures" / "eda_maps.png", dpi=130)
print("\nsaved outputs/eda/*.csv, outputs/figures/eda_correlation.png, outputs/figures/eda_maps.png")
