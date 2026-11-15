"""Multivariate EDA: (1) spatial PCA (EOF) of JJAS rainfall and longest dry spell, (2) wet-vs-dry season composites
of the atmosphere and land surface.

Drafted with AI assistance (Claude Code). See docs/submission/si_usage.md.
Inputs : data/raw/imerg_jjas_percell_1998_2025.nc (IMERG V07 Final, per-cell JJAS total and CDD)
         data/raw/merra2_box/M2TMNX{SLV,INT,AER,LND}_1998_2025.nc (MERRA-2 reanalysis box fields, monthly)
Outputs: outputs/eda/eof_*.csv, outputs/eda/composites_wet_dry.csv,
         outputs/figures/eof_rainfall.png, outputs/figures/composites_wet_dry.png
Method notes
- EOF: IMERG cells averaged to 0.5 deg (5x5 blocks) to reduce pixel noise; each cell standardised (z-scores over
  1998-2025) so dry and wet areas count equally; sqrt(cos lat) area weights; SVD of the (28 years x cells) matrix.
  Maps show the correlation between each cell and the principal-component time series (homogeneous correlation map).
  North et al. (1982) rule of thumb: neighbouring EOFs are separable if their eigenvalue error bars do not overlap.
- Composites: terciles chosen on the DETRENDED box JJAS rainfall, so recent (wetter) years do not dominate and slow
  trends (e.g. dust decline) are not mistaken for wet-year effects. Differences tested with Welch t-tests.
  Associations, not causes.
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

O, E = ROOT / "outputs", ROOT / "outputs" / "eda"
E.mkdir(exist_ok=True)
FOOT = "Code drafted with AI assistance (Claude Code). Data: NASA GPM IMERG V07B Final; NASA GMAO MERRA-2 (reanalysis)."
ds = xr.open_dataset(ROOT / "data" / "raw" / "imerg_jjas_percell_1998_2025.nc").load()
YEARS = ds.year.values


# ------------------------------------------------------------------ 1. EOF analysis
def eof(field, n=3):
    f = field.coarsen(lat=5, lon=5, boundary="trim").mean()            # 0.5 deg
    z = (f - f.mean("year")) / f.std("year", ddof=1)
    w = np.sqrt(np.cos(np.deg2rad(f.lat)))
    X = (z * w).values.reshape(len(YEARS), -1)
    ok = np.isfinite(X).all(0)
    U, S, Vt = np.linalg.svd(X[:, ok], full_matrices=False)
    lam = S**2 / (len(YEARS) - 1)
    frac = lam / lam.sum()
    err = frac * np.sqrt(2 / len(YEARS))                                # North et al. (1982)
    out = []
    for k in range(n):
        pc = U[:, k] * S[k]
        pc = (pc - pc.mean()) / pc.std(ddof=1)
        # homogeneous correlation map (sign: PC1 positive = wetter / longer on average)
        zz = z.values.reshape(len(YEARS), -1)
        corr = np.full(zz.shape[1], np.nan)
        corr[ok] = [np.corrcoef(pc, zz[:, j])[0, 1] for j in np.where(ok)[0]]
        if np.nanmean(corr) < 0:
            pc, corr = -pc, -corr
        out.append({"k": k + 1, "frac": frac[k], "err": err[k], "pc": pd.Series(pc, index=YEARS),
                    "map": xr.DataArray(corr.reshape(f.sizes["lat"], f.sizes["lon"]), coords={"lat": f.lat, "lon": f.lon})})
    return out


res = {"total": eof(ds["total"]), "cdd": eof(ds["cdd"])}
rows = []
lonw = np.cos(np.deg2rad(ds.lat))
reg_rain = {r: ds.total.sel(lon=slice(*b)).weighted(lonw).mean(("lat", "lon")).to_series()
            for r, b in {"sahel": (-18, 20), "west": (-18, -5), "central": (-5, 10), "east": (10, 20)}.items()}
for var, modes in res.items():
    for m in modes:
        t = trend_summary(m["pc"])
        mp = m["map"]
        row = {"variable": var, "mode": m["k"], "explained_pct": round(100 * m["frac"], 1), "north_err_pct": round(100 * m["err"], 1),
               "pc_trend_sd_per_decade": round(10 * t["sen_slope"], 2), "pc_trend_mk_p": round(t["mk_p"], 4),
               "map_mean_corr_west": round(float(mp.sel(lon=slice(-18, -5)).mean()), 2),
               "map_mean_corr_central": round(float(mp.sel(lon=slice(-5, 10)).mean()), 2),
               "map_mean_corr_east": round(float(mp.sel(lon=slice(10, 20)).mean()), 2),
               "map_mean_corr_south_10_15N": round(float(mp.sel(lat=slice(10, 15)).mean()), 2),
               "map_mean_corr_north_15_20N": round(float(mp.sel(lat=slice(15, 20)).mean()), 2)}
        for r, s in reg_rain.items():
            row[f"pc_corr_rain_{r}"] = round(float(np.corrcoef(m["pc"], s)[0, 1]), 2)
        rows.append(row)
        m["pc"].rename(f"{var}_PC{m['k']}").to_csv(E / f"eof_{var}_pc{m['k']}.csv")
eoft = pd.DataFrame(rows)
eoft.to_csv(E / "eof_summary.csv", index=False)
pd.set_option("display.width", 250)
print("=== EOF summary (standardised JJAS fields, 0.5 deg) ===")
print(eoft.to_string(index=False))
for var in res:
    f = [m["frac"] for m in res[var]]; e = [m["err"] for m in res[var]]
    print(f"{var}: EOF1/EOF2 separable: {f[0] - e[0] > f[1] + e[1]}, EOF2/EOF3 separable: {f[1] - e[1] > f[2] + e[2]}")

fig, axes = plt.subplots(3, 3, figsize=(16, 10.5), gridspec_kw={"width_ratios": [1, 1, 1.05]})
for i, (var, title) in enumerate([("total", "JJAS rainfall")]):
    pass
for k in range(3):
    for j, (var, title) in enumerate([("total", "JJAS rainfall"), ("cdd", "Longest dry spell")]):
        m = res[var][k]; ax = axes[k, j]
        im = ax.pcolormesh(m["map"].lon, m["map"].lat, m["map"], cmap="RdBu_r" if var == "cdd" else "BrBG", vmin=-1, vmax=1, shading="nearest")
        for x in (-5, 10):
            ax.axvline(x, color="grey", lw=0.6, ls="--")
        ax.set_title(f"{title} EOF{k + 1}: {100 * m['frac']:.0f} % of variance (±{100 * m['err']:.0f})", fontsize=9.5)
        ax.tick_params(labelsize=7)
    fig.colorbar(im, ax=axes[k, 1], shrink=0.85, label="correlation with PC")
    ax = axes[k, 2]
    for var, c in (("total", "#01665e"), ("cdd", "#b2182b")):
        pc = res[var][k]["pc"]; t = trend_summary(pc)
        ax.plot(pc.index, pc, "-o", ms=2.5, lw=1.2, color=c, label=f"{'rain' if var == 'total' else 'dry spell'} PC{k + 1}: {10 * t['sen_slope']:+.2f} sd/dec (p={t['mk_p']:.3f})")
    ax.axhline(0, color="grey", lw=0.6); ax.axvline(2014, color="grey", lw=0.6, ls=":"); ax.legend(fontsize=7, frameon=False); ax.grid(alpha=0.3)
    ax.set_title(f"Principal-component time series, mode {k + 1}", fontsize=9.5); ax.tick_params(labelsize=7)
fig.suptitle("Spatial PCA (EOF) of Sahel JJAS rainfall and longest dry spell, 1998–2025 (standardised, 0.5°; dashed: provisional W/C/E borders)", fontsize=11)
fig.text(0.01, 0.005, FOOT, fontsize=6, color="grey")
fig.tight_layout(rect=(0, 0.015, 1, 0.97)); fig.savefig(O / "figures" / "eof_rainfall.png", dpi=130); plt.close(fig)

# ------------------------------------------------------------------ 2. wet vs dry composites
box = reg_rain["sahel"]
det = box - np.polyval(np.polyfit(box.index, box.values, 1), box.index)
order = det.sort_values()
dry_years, wet_years = sorted(order.index[:9].tolist()), sorted(order.index[-9:].tolist())
print(f"\nwet years (detrended): {wet_years}\ndry years (detrended): {dry_years}")

R = ROOT / "data" / "raw" / "merra2_box"
mer = xr.merge([xr.open_dataset(R / f"{p}_1998_2025.nc")[v] for p, v in
                [("M2TMNXSLV", ["TQV", "T2M", "OMEGA500", "U850", "V850"]), ("M2TMNXINT", ["UFLXQV", "VFLXQV", "DQVDT_DYN"]),
                 ("M2TMNXAER", ["DUEXTTAU"]), ("M2TMNXLND", ["GWETTOP"])]]).load()
mer = mer.sel(time=mer.time.dt.month.isin([6, 7, 8, 9])).groupby("time.year").mean()
mer["ascent"] = -mer["OMEGA500"] * 100
mer["mfc"] = mer["DQVDT_DYN"] * 86400
mer["T2M"] = mer["T2M"] - 273.15
LAB = {"TQV": ("Column water vapour", "kg/m²"), "mfc": ("Moisture convergence", "mm/day"), "ascent": ("Rising motion 500 hPa (−ω×100)", "cPa/s"),
       "U850": ("Westerly wind 850 hPa", "m/s"), "V850": ("Southerly wind 850 hPa", "m/s"), "DUEXTTAU": ("Dust optical depth", "–"),
       "GWETTOP": ("Topsoil wetness", "0–1"), "T2M": ("Near-surface temperature", "°C")}
wet, dry = mer.sel(year=wet_years), mer.sel(year=dry_years)
crow = []
for v, (lab, unit) in LAB.items():
    for reg, b in {"sahel": (-18, 20), "west": (-18, -5), "central": (-5, 10), "east": (10, 20)}.items():
        sub = mer[v].sel(lon=slice(*b))
        s = sub.weighted(np.cos(np.deg2rad(sub.lat))).mean(("lat", "lon")).to_series()
        a, b_ = s.loc[wet_years], s.loc[dry_years]
        crow.append({"variable": v, "label": lab, "unit": unit, "region": reg, "wet_mean": a.mean(), "dry_mean": b_.mean(),
                     "difference": a.mean() - b_.mean(), "difference_pct": 100 * (a.mean() - b_.mean()) / abs(b_.mean()) if b_.mean() else np.nan,
                     "welch_p": stats.ttest_ind(a, b_, equal_var=False).pvalue})
rr = {"wet_mean": box.loc[wet_years].mean(), "dry_mean": box.loc[dry_years].mean()}
crow.append({"variable": "rain_total", "label": "IMERG JJAS rainfall", "unit": "mm", "region": "sahel", **rr,
             "difference": rr["wet_mean"] - rr["dry_mean"], "difference_pct": 100 * (rr["wet_mean"] / rr["dry_mean"] - 1),
             "welch_p": stats.ttest_ind(box.loc[wet_years], box.loc[dry_years], equal_var=False).pvalue})
comp = pd.DataFrame(crow)
comp.to_csv(E / "composites_wet_dry.csv", index=False, float_format="%.5g")
print("\n=== wet minus dry seasons (box and sub-regions) ===")
print(comp.assign(txt=comp.difference.round(4).astype(str) + " (" + comp.difference_pct.round(1).astype(str) + "%, p=" + comp.welch_p.round(3).astype(str) + ")")
      .pivot_table(index="variable", columns="region", values="txt", aggfunc="first").to_string())

rain_diff = 100 * (ds.total.sel(year=wet_years).mean("year") / ds.total.sel(year=dry_years).mean("year") - 1)
rain_diff = rain_diff.coarsen(lat=5, lon=5, boundary="trim").mean()
d = wet.mean("year") - dry.mean("year")
tt = {v: stats.ttest_ind(wet[v].values, dry[v].values, axis=0, equal_var=False).pvalue for v in LAB}
fig, axes = plt.subplots(3, 3, figsize=(16, 10))
panels = [("rain", "IMERG rainfall, wet − dry (%)", "BrBG", 60)] + [(v, f"{LAB[v][0]}, wet − dry ({LAB[v][1]})", c, None) for v, c in
          [("TQV", "BrBG"), ("mfc", "BrBG"), ("ascent", "PuOr_r"), ("V850", "RdBu_r"), ("U850", "RdBu_r"), ("DUEXTTAU", "BrBG_r"), ("GWETTOP", "BrBG"), ("T2M", "RdBu_r")]]
for ax, (v, title, cmap, lim) in zip(axes.flat, panels):
    if v == "rain":
        im = ax.pcolormesh(rain_diff.lon, rain_diff.lat, np.clip(rain_diff, -lim, lim), cmap=cmap, vmin=-lim, vmax=lim, shading="nearest")
    else:
        a = d[v]; L = float(np.nanpercentile(np.abs(a), 98)) or 1
        im = ax.pcolormesh(a.lon, a.lat, a, cmap=cmap, vmin=-L, vmax=L, shading="nearest")
        sig = tt[v] < 0.05
        yy, xx = np.nonzero(sig)
        ax.scatter(a.lon.values[xx], a.lat.values[yy], s=1.2, c="k", alpha=0.5, linewidths=0)
        if v == "TQV":  # moisture-transport difference arrows
            q = (d["UFLXQV"], d["VFLXQV"])
            ax.quiver(a.lon[::4], a.lat[::3], q[0][::3, ::4], q[1][::3, ::4], scale=None, width=0.003, color="k", alpha=0.7)
    for x in (-5, 10):
        ax.axvline(x, color="grey", lw=0.6, ls="--")
    ax.set_title(title, fontsize=9); ax.tick_params(labelsize=7)
    fig.colorbar(im, ax=ax, shrink=0.85)
fig.suptitle(f"Wet minus dry Sahel seasons (9 vs 9, detrended selection). Wet: {wet_years}  Dry: {dry_years}\n"
             "Dots: difference significant (Welch p < 0.05). Arrows on water vapour: difference in vertically integrated moisture transport", fontsize=10)
fig.text(0.01, 0.005, FOOT + " Associations, not causes.", fontsize=6, color="grey")
fig.tight_layout(rect=(0, 0.015, 1, 0.94)); fig.savefig(O / "figures" / "composites_wet_dry.png", dpi=130)
print("\nsaved outputs/eda/eof_*.csv, outputs/eda/composites_wet_dry.csv, outputs/figures/eof_rainfall.png, outputs/figures/composites_wet_dry.png")
