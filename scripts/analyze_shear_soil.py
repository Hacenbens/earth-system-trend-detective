"""T-05 wind shear and T-06 soil moisture / surface energy balance, MERRA-2 (reanalysis), JJAS 1998-2025.

Drafted with AI assistance (Claude Code). See docs/submission/si_usage.md.
Inputs : data/raw/merra2_box/M2IMNPASM_1998_2025.nc (U, V at 925-600 hPa), data/processed/sahel_merra2_monthly_1998_2025.csv
         (land variables, T2M), data/raw/imerg_jjas_percell_1998_2025.nc, data/processed/sahel_jjas_extreme_indices_1998_2025.csv
Outputs: outputs/layer2_shear_soil_trends.csv, outputs/layer2_shear_soil_correlations.csv, outputs/figures/layer2_shear_soil.png
CAVEAT: MERRA-2 forces its land model with observation-corrected precipitation, so soil wetness and evaporation are
partly rainfall by construction. Soil-moisture / rainfall correlations cannot prove a land feedback.
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
JJAS = [6, 7, 8, 9]


def detrend(s):
    return s - np.polyval(np.polyfit(s.index, s.values, 1), s.index)


def rho(a, b):
    r, p = stats.spearmanr(detrend(a), detrend(b))
    return r, p


# ---- wind shear from pressure-level winds ----
w = xr.open_dataset(ROOT / "data" / "raw" / "merra2_box" / "M2IMNPASM_1998_2025.nc").load()
w = w.sel(time=w.time.dt.month.isin(JJAS))
u925, u600 = w.U.sel(lev=925), w.U.sel(lev=600)
v925, v600 = w.V.sel(lev=925), w.V.sel(lev=600)
fields = {"zonal_shear_925_600": u925 - u600,                                     # >0: westerly monsoon below easterly jet
          "shear_magnitude_925_600": np.hypot(u600 - u925, v600 - v925),
          "AEJ_U600": u600}                                                    # African Easterly Jet (negative = easterly)


def region_series(da, lon):
    sub = da.sel(lon=slice(*lon))
    return sub.weighted(np.cos(np.deg2rad(sub.lat))).mean(("lat", "lon")).groupby("time.year").mean().to_series()


season = {}
for reg, lon in LON.items():
    season[reg] = pd.DataFrame({k: region_series(v, lon) for k, v in fields.items()})

# ---- land surface from the processed monthly CSV ----
m = pd.read_csv(ROOT / "data" / "processed" / "sahel_merra2_monthly_1998_2025.csv", parse_dates=["date"])
m["EF"] = m.LHLAND / (m.LHLAND + m.SHLAND)            # evaporative fraction: share of turbulent energy used to evaporate
m["year"] = m.date.dt.year
for reg in LON:
    mr = m[m.region == reg]
    js = mr[mr.date.dt.month.isin(JJAS)].groupby("year")[["GWETTOP", "GWETROOT", "EF", "LAI", "T2M"]].mean()
    june = mr[mr.date.dt.month == 6].set_index("year")[["GWETROOT"]].rename(columns={"GWETROOT": "GWETROOT_June"})
    season[reg] = season[reg].join(js).join(june)

# ---- rainfall per region (IMERG per-cell JJAS fields) + box extremes ----
ds = xr.open_dataset(ROOT / "data" / "raw" / "imerg_jjas_percell_1998_2025.nc").load()
idx = pd.read_csv(ROOT / "data" / "processed" / "sahel_jjas_extreme_indices_1998_2025.csv", index_col="year")
im = pd.read_csv(ROOT / "data" / "processed" / "sahel_imerg_final_monthly_1998_2025.csv", parse_dates=["date"])
rain = {}
for reg, lon in LON.items():
    f = ds.sel(lon=slice(*lon)); wt = np.cos(np.deg2rad(f.lat))
    rain[reg] = pd.DataFrame({"rain_total": f.total.weighted(wt).mean(("lat", "lon")).to_series(),
                              "dry_spell": f.cdd.weighted(wt).mean(("lat", "lon")).to_series()})
jas_box = im[im.date.dt.month.isin([7, 8, 9])].groupby(im.date.dt.year)["mm"].sum()

VARS = {"zonal_shear_925_600": "m/s", "shear_magnitude_925_600": "m/s", "AEJ_U600": "m/s", "GWETTOP": "0-1", "GWETROOT": "0-1",
        "EF": "fraction", "LAI": "m²/m²"}
trows, crows = [], []
for reg in LON:
    s = season[reg]
    for v, unit in VARS.items():
        t = trend_summary(s[v])
        trows.append({"region": reg, "variable": v, "unit": unit, "mean": t["mean"], "sen_per_decade": 10 * t["sen_slope"], "mk_p": t["mk_p"]})
        for rv in ("rain_total", "dry_spell"):
            r_, p_ = rho(s[v], rain[reg][rv])
            crows.append({"region": reg, "variable": v, "against": rv, "rho_detrended": r_, "p": p_})
    r_, p_ = rho(s["EF"], s["T2M"]); crows.append({"region": reg, "variable": "EF", "against": "T2M", "rho_detrended": r_, "p": p_})
# box extremes vs shear (convective organisation)
for v in ("zonal_shear_925_600", "shear_magnitude_925_600", "AEJ_U600"):
    for e in ("Rx1day", "R95p", "SDII", "wet_days"):
        r_, p_ = rho(season["sahel"][v], idx[e]); crows.append({"region": "sahel", "variable": v, "against": e, "rho_detrended": r_, "p": p_})
# June root-zone soil moisture vs following July-September rain (soil memory; persistence-contaminated)
r_, p_ = rho(season["sahel"]["GWETROOT_June"], jas_box.loc[1998:2025])
crows.append({"region": "sahel", "variable": "GWETROOT_June", "against": "JAS_rain", "rho_detrended": r_, "p": p_})

tr, cr = pd.DataFrame(trows), pd.DataFrame(crows)
tr.to_csv(O / "layer2_shear_soil_trends.csv", index=False, float_format="%.4g")
cr.to_csv(O / "layer2_shear_soil_correlations.csv", index=False, float_format="%.4f")
pd.set_option("display.width", 220)
print("=== JJAS trends per decade (MK p) ===")
print((tr.pivot(index="variable", columns="region", values="sen_per_decade").round(3).astype(str) + " (p=" +
       tr.pivot(index="variable", columns="region", values="mk_p").round(3).astype(str) + ")").to_string())
print("\nmeans:"); print(tr.pivot(index="variable", columns="region", values="mean").round(3).to_string())
print("\n=== detrended Spearman rho ===")
print(cr.assign(txt=cr.rho_detrended.round(2).astype(str) + " (p=" + cr.p.round(3).astype(str) + ")")
        .pivot_table(index=["variable", "against"], columns="region", values="txt", aggfunc="first").to_string())

fig, axes = plt.subplots(1, 3, figsize=(15, 4.2))
for ax, (v, lab) in zip(axes, [("zonal_shear_925_600", "Zonal wind shear 925–600 hPa (m/s)"), ("GWETROOT", "Root-zone soil wetness (0–1)"),
                                ("EF", "Evaporative fraction LH/(LH+SH)")]):
    for reg, c in (("sahel", "k"), ("west", "#1b9e77"), ("central", "#7570b3"), ("east", "#d95f02")):
        ax.plot(season[reg].index, season[reg][v], "-o", ms=2.5, lw=1.2, color=c, label=reg)
    ax.set_title(lab, fontsize=9.5); ax.grid(alpha=0.3); ax.axvline(2014, color="grey", lw=0.6, ls=":")
axes[0].legend(fontsize=7, frameon=False)
fig.suptitle("MERRA-2 (reanalysis), JJAS 1998–2025: wind shear and land surface", fontsize=11)
fig.text(0.01, 0.01, "Soil wetness/evaporation are driven by MERRA-2's observation-corrected rainfall (partly circular with rainfall). "
         "Code drafted with AI assistance (Claude Code). Data: NASA GMAO MERRA-2.", fontsize=6, color="grey")
fig.tight_layout(rect=(0, 0.03, 1, 0.94)); fig.savefig(O / "figures" / "layer2_shear_soil.png", dpi=140)
print("\nsaved outputs/layer2_shear_soil_*.csv, outputs/figures/layer2_shear_soil.png")
