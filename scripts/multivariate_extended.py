"""Optional multivariate methods (methods_pipeline.md section C+):
  1. Maximum covariance analysis (MCA) between the JJAS rainfall field and atmospheric fields
  2. Multiple regression + partial correlation of rainfall on its drivers (few predictors, VIF, leave-one-year-out CV)
  3. Variable clustering + varimax-rotated PCA of the 10 rainfall indicators -> index v2 without double counting (T-19)

Drafted with AI assistance (Claude Code). See docs/submission/si_usage.md.
Guard rails for n = 28 seasons: detrended fields for coupling (year-to-year physics, not shared trends); Monte Carlo
significance by shuffling years; at most 3 predictors per regression; out-of-sample (LOYO) skill reported.
Associations, not causes.
Outputs: outputs/eda/mca_summary.csv, outputs/eda/regression_*.csv, outputs/eda/partial_correlations.csv,
         outputs/eda/indicator_clusters.csv, outputs/eda/index_v2.csv, outputs/figures/mca_modes.png, outputs/figures/index_v2.png
"""
import sys
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import statsmodels.api as sm
import xarray as xr
from scipy import stats
from scipy.cluster.hierarchy import fcluster, linkage
from scipy.spatial.distance import squareform
from statsmodels.stats.outliers_influence import variance_inflation_factor

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))
from earth_detective.trend import trend_summary

O, E = ROOT / "outputs", ROOT / "outputs" / "eda"
RNG = np.random.default_rng(42)
FOOT = "Code drafted with AI assistance (Claude Code). Data: NASA GPM IMERG V07B Final; NASA GMAO MERRA-2 (reanalysis). Associations, not causes."
YEARS = np.arange(1998, 2026)


def detrend_years(a):
    """Remove a linear trend along axis 0 (years)."""
    t = (YEARS - YEARS.mean())[:, None]
    flat = a.reshape(len(YEARS), -1)
    ok = np.isfinite(flat).all(0)
    out = np.full_like(flat, np.nan, dtype=float)
    b = (t * (flat[:, ok] - flat[:, ok].mean(0))).sum(0) / (t**2).sum()
    out[:, ok] = flat[:, ok] - flat[:, ok].mean(0) - t * b
    return out.reshape(a.shape)


def zscore_field(f, coarsen=None):
    if coarsen:
        f = f.coarsen(lat=coarsen, lon=coarsen, boundary="trim").mean()
    a = detrend_years(f.values.astype(float))
    a = a / np.nanstd(a, axis=0, ddof=1)
    w = np.sqrt(np.cos(np.deg2rad(f.lat.values)))[None, :, None]
    return f, (a * w).reshape(len(YEARS), -1)


# ---------------------------------------------------------------- 1. MCA
ds = xr.open_dataset(ROOT / "data" / "raw" / "imerg_jjas_percell_1998_2025.nc").load()
rain_f, X = zscore_field(ds["total"], coarsen=5)
R = ROOT / "data" / "raw" / "merra2_box"
mer = xr.merge([xr.open_dataset(R / f"{p}_1998_2025.nc")[v] for p, v in
                [("M2TMNXSLV", ["TQV", "U850", "T2M", "OMEGA500"]), ("M2TMNXAER", ["DUEXTTAU"])]]).load()
mer = mer.sel(time=mer.time.dt.month.isin([6, 7, 8, 9])).groupby("time.year").mean().sel(year=YEARS)


def mca(X, Y, nperm=500):
    okx, oky = np.isfinite(X).all(0), np.isfinite(Y).all(0)
    Xo, Yo = X[:, okx], Y[:, oky]
    C = Xo.T @ Yo / (len(YEARS) - 1)
    U, S, Vt = np.linalg.svd(C, full_matrices=False)
    scf = S**2 / np.sum(S**2)
    a, b = Xo @ U[:, 0], Yo @ Vt[0]
    r = np.corrcoef(a, b)[0, 1]
    # Monte Carlo: shuffle the years of Y. With only 28 years, the singular values of Xo^T Yp equal those of the
    # 28x28 matrix (Sx Ux^T)(P Uy Sy), so each permutation costs a tiny SVD instead of a (cells x cells) one.
    Ux, Sx, _ = np.linalg.svd(Xo, full_matrices=False)
    Uy, Sy, _ = np.linalg.svd(Yo, full_matrices=False)
    A, B = (Ux * Sx).T, Uy * Sy
    null_s1 = []
    for _ in range(nperm):
        Sp = np.linalg.svd(A @ B[RNG.permutation(len(YEARS))] / (len(YEARS) - 1), compute_uv=False)
        null_s1.append(Sp[0])
    p_s = (np.sum(np.array(null_s1) >= S[0]) + 1) / (nperm + 1)
    # heterogeneous maps: correlation of each field with the OTHER field's expansion coefficient
    mx = np.full(X.shape[1], np.nan); my = np.full(Y.shape[1], np.nan)
    mx[okx] = [np.corrcoef(b, Xo[:, j])[0, 1] for j in range(Xo.shape[1])]
    my[oky] = [np.corrcoef(a, Yo[:, j])[0, 1] for j in range(Yo.shape[1])]
    sign = np.sign(np.nanmean(mx)) or 1
    return {"scf1": scf[0], "scf2": scf[1], "r": r, "p_sv1": p_s, "a": sign * a, "b": sign * b, "mx": sign * mx, "my": sign * my}


mrows, maps = [], {}
for v, label in [("TQV", "column water vapour"), ("U850", "westerly wind 850 hPa"), ("DUEXTTAU", "dust optical depth"), ("T2M", "near-surface temperature")]:
    yf, Y = zscore_field(mer[v])
    res = mca(X, Y)
    maps[v] = (res, yf)
    mrows.append({"field": v, "label": label, "mode1_squared_cov_fraction_pct": round(100 * res["scf1"], 1), "mode2_pct": round(100 * res["scf2"], 1),
                  "expansion_coef_correlation_r": round(res["r"], 2), "monte_carlo_p_sv1": round(res["p_sv1"], 3),
                  "rain_map_mean_corr": round(float(np.nanmean(res["mx"])), 2), "field_map_mean_corr": round(float(np.nanmean(res["my"])), 2)})
mca_t = pd.DataFrame(mrows); mca_t.to_csv(E / "mca_summary.csv", index=False)
pd.set_option("display.width", 220)
print("=== 1. MCA rainfall (detrended, standardised, 0.5 deg) vs atmospheric fields (detrended, standardised) ===")
print(mca_t.to_string(index=False))

fig, axes = plt.subplots(len(maps), 2, figsize=(13, 3.3 * len(maps)))
for i, (v, (res, yf)) in enumerate(maps.items()):
    mx = res["mx"].reshape(rain_f.sizes["lat"], rain_f.sizes["lon"]); my = res["my"].reshape(yf.sizes["lat"], yf.sizes["lon"])
    axes[i, 0].pcolormesh(rain_f.lon, rain_f.lat, mx, cmap="BrBG", vmin=-1, vmax=1, shading="nearest")
    im = axes[i, 1].pcolormesh(yf.lon, yf.lat, my, cmap="RdBu_r", vmin=-1, vmax=1, shading="nearest")
    row = mca_t[mca_t.field == v].iloc[0]
    axes[i, 0].set_title(f"Rainfall pattern coupled with {row.label}", fontsize=9)
    axes[i, 1].set_title(f"{row.label}: SCF {row.mode1_squared_cov_fraction_pct}%, r = {row.expansion_coef_correlation_r}, p = {row.monte_carlo_p_sv1}", fontsize=9)
    fig.colorbar(im, ax=axes[i, 1], shrink=0.8, label="correlation")
    for ax in axes[i]:
        ax.tick_params(labelsize=7)
fig.suptitle("Maximum covariance analysis, mode 1: detrended JJAS rainfall vs MERRA-2 fields, 1998–2025 (heterogeneous correlation maps)", fontsize=10)
fig.text(0.01, 0.005, FOOT, fontsize=6, color="grey")
fig.tight_layout(rect=(0, 0.015, 1, 0.97)); fig.savefig(O / "figures" / "mca_modes.png", dpi=125); plt.close(fig)

# ---------------------------------------------------------------- 2. regression + partial correlation
m = pd.read_csv(ROOT / "data" / "processed" / "sahel_merra2_monthly_1998_2025.csv", parse_dates=["date"])
m = m[m.date.dt.month.isin([6, 7, 8, 9])]; m["year"] = m.date.dt.year
w = xr.open_dataset(R / "M2IMNPASM_1998_2025.nc").load(); w = w.sel(time=w.time.dt.month.isin([6, 7, 8, 9]))
shear_f = (w.U.sel(lev=925) - w.U.sel(lev=600))
LON = {"sahel": (-18, 20), "east": (10, 20), "west": (-18, -5)}


def detrend(s):
    return pd.Series(s.values - np.polyval(np.polyfit(s.index, s.values, 1), s.index), index=s.index)


def partial_spearman(x, y, controls):
    """Spearman partial correlation: rank-transform, regress out controls, correlate residuals."""
    rk = lambda s: pd.Series(stats.rankdata(s), index=s.index)
    Z = sm.add_constant(pd.concat([rk(c) for c in controls], axis=1)) if controls else None
    rx, ry = rk(x), rk(y)
    if Z is not None:
        rx, ry = sm.OLS(rx, Z).fit().resid, sm.OLS(ry, Z).fit().resid
    r, p = stats.pearsonr(rx, ry)
    return r, p


reg_rows, part_rows = [], []
for reg, lon in LON.items():
    g = m[m.region == reg].groupby("year")[["TQV", "OMEGA500", "U850", "DUEXTTAU", "T2M"]].mean()
    g["ascent"] = -g.pop("OMEGA500")
    sh = shear_f.sel(lon=slice(*lon)); g["shear"] = sh.weighted(np.cos(np.deg2rad(sh.lat))).mean(("lat", "lon")).groupby("time.year").mean().to_series()
    f = ds.sel(lon=slice(*lon)); wt = np.cos(np.deg2rad(f.lat))
    rain = f.total.weighted(wt).mean(("lat", "lon")).to_series(); cdd = f.cdd.weighted(wt).mean(("lat", "lon")).to_series()
    Dz = g.apply(detrend).apply(lambda s: (s - s.mean()) / s.std(ddof=1))
    for yname, y in (("rain_total", rain), ("dry_spell", cdd)):
        yz = detrend(y); yz = (yz - yz.mean()) / yz.std(ddof=1)
        # partial correlations: each driver vs y, controlling for column water vapour
        for v in ["ascent", "U850", "DUEXTTAU", "T2M", "shear"]:
            r0, p0 = stats.spearmanr(Dz[v], yz)
            r1, p1 = partial_spearman(Dz[v], yz, [Dz["TQV"]])
            part_rows.append({"region": reg, "response": yname, "driver": v, "rho": r0, "p": p0, "partial_rho_given_TQV": r1, "partial_p": p1})
        # a-priori models with <= 3 predictors
        for name, preds in {"moisture only": ["TQV"], "moisture + inflow + dust": ["TQV", "U850", "DUEXTTAU"],
                            "ascent + shear + dust": ["ascent", "shear", "DUEXTTAU"]}.items():
            Xr = sm.add_constant(Dz[preds]); fit = sm.OLS(yz, Xr).fit()
            vif = {p: variance_inflation_factor(Xr.values, i + 1) for i, p in enumerate(preds)} if len(preds) > 1 else {preds[0]: 1.0}
            pred = np.array([sm.OLS(yz.drop(yr), Xr.drop(yr)).fit().predict(Xr.loc[[yr]]).iloc[0] for yr in yz.index])
            cv_r2 = 1 - np.sum((yz.values - pred) ** 2) / np.sum((yz.values - yz.mean()) ** 2)
            reg_rows.append({"region": reg, "response": yname, "model": name, "r2": round(fit.rsquared, 2), "loyo_cv_r2": round(cv_r2, 2),
                             **{f"beta_{p}": round(fit.params[p], 2) for p in preds}, **{f"p_{p}": round(fit.pvalues[p], 3) for p in preds},
                             "max_vif": round(max(vif.values()), 2)})
regt, partt = pd.DataFrame(reg_rows), pd.DataFrame(part_rows)
regt.to_csv(E / "regression_models.csv", index=False); partt.to_csv(E / "partial_correlations.csv", index=False, float_format="%.3f")
print("\n=== 2a. Regression on detrended, standardised series (beta = sd change of response per sd of driver) ===")
print(regt.to_string(index=False))
print("\n=== 2b. Partial Spearman correlation, controlling for column water vapour (detrended) ===")
print(partt.assign(txt=partt.rho.round(2).astype(str) + " -> " + partt.partial_rho_given_TQV.round(2).astype(str) + " (p=" + partt.partial_p.round(3).astype(str) + ")")
      .pivot_table(index=["response", "driver"], columns="region", values="txt", aggfunc="first").to_string())

# ---------------------------------------------------------------- 3. indicator clusters + rotated PCA -> index v2
idx = pd.read_csv(ROOT / "data" / "processed" / "sahel_jjas_extreme_indices_1998_2025.csv", index_col="year")
order = ["PRCPTOT", "wet_days", "SDII", "R10mm", "R20mm", "R95p", "R95pTOT", "Rx1day", "Rx5day", "CDD"]
idx = idx[order]
rho = idx.corr(method="spearman").abs()
Lk = linkage(squareform(1 - rho.values, checks=False), method="average")
cl = fcluster(Lk, t=0.35, criterion="distance")         # clusters whose members correlate |rho| > ~0.65 on average


def varimax(Phi, gamma=1.0, q=50, tol=1e-6):
    p, k = Phi.shape; Rm = np.eye(k); d = 0
    for _ in range(q):
        d_old = d; Lam = Phi @ Rm
        u, s, vh = np.linalg.svd(Phi.T @ (Lam**3 - (gamma / p) * Lam @ np.diag(np.diag(Lam.T @ Lam))))
        Rm = u @ vh; d = np.sum(s)
        if d_old != 0 and d / d_old < 1 + tol:
            break
    return Phi @ Rm


Z = (idx - idx.mean()) / idx.std(ddof=1)
U_, S_, Vt_ = np.linalg.svd(Z.values, full_matrices=False)
k = 3
load = Vt_[:k].T * S_[:k] / np.sqrt(len(Z) - 1)
rot = pd.DataFrame(varimax(load), index=order, columns=[f"RC{i + 1}" for i in range(k)])
clusters = pd.DataFrame({"cluster": cl}, index=order).join(rot.round(2))
# representative of each cluster: highest mean |rho| with the other members
reps = {}
for c in sorted(set(cl)):
    mem = [v for v, cc in zip(order, cl) if cc == c]
    reps[c] = max(mem, key=lambda v: rho.loc[v, mem].mean())
clusters["representative"] = [reps[c] == v for v, c in zip(order, cl)]
clusters.to_csv(E / "indicator_clusters.csv")
print("\n=== 3. Indicator clusters (average linkage on 1 - |rho|) and varimax-rotated loadings ===")
print(clusters.to_string())

# index v2: mean of z-scores of one representative per cluster, sign-aligned so that "wetter / more regular" is positive
sign = {v: (-1 if v == "CDD" else 1) for v in order}
rep_vars = [reps[c] for c in sorted(reps)]
v2 = sum(sign[v] * Z[v] for v in rep_vars) / len(rep_vars)
proto = (Z["PRCPTOT"] + Z["wet_days"] - Z["CDD"]) / 3
t2, tp = trend_summary(v2), trend_summary(proto)
out = pd.DataFrame({"index_v2": v2.round(3), "prototype_v1": proto.round(3)})
out.to_csv(E / "index_v2.csv")
print(f"\nindex v2 components (one per cluster): {rep_vars}")
print(f"index v2 trend {10 * t2['sen_slope']:+.2f} sd/decade (MK p={t2['mk_p']:.3f}); prototype v1 {10 * tp['sen_slope']:+.2f} (p={tp['mk_p']:.3f}); "
      f"corr(v1, v2) = {np.corrcoef(v2, proto)[0, 1]:.2f}")
fig, ax = plt.subplots(figsize=(10, 3.6))
ax.bar(out.index, out.index_v2, color=np.where(out.index_v2 >= 0, "#1f6feb", "#bbbbbb"), label=f"index v2 ({', '.join(rep_vars)})")
ax.plot(out.index, out.prototype_v1, "k.-", lw=1, ms=4, label="prototype v1 (PRCPTOT, wet days, −CDD)")
ax.axhline(0, color="grey", lw=0.6); ax.axvline(2014, color="grey", lw=0.6, ls=":"); ax.legend(fontsize=7, frameon=False); ax.grid(alpha=0.3)
ax.set_title(f"Sahel rainy-season index v2 (one indicator per cluster): {10 * t2['sen_slope']:+.2f} sd/decade, p = {t2['mk_p']:.3f}", fontsize=10)
fig.text(0.01, 0.01, FOOT, fontsize=6, color="grey"); fig.tight_layout(rect=(0, 0.03, 1, 1)); fig.savefig(O / "figures" / "index_v2.png", dpi=130)
print("\nsaved outputs/eda/{mca_summary,regression_models,partial_correlations,indicator_clusters,index_v2}.csv, outputs/figures/{mca_modes,index_v2}.png")
