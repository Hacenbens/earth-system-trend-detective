"""H1: Sahel JJAS rainfall trend 1998-2025 (IMERG V07 Final), with CHIRPS v3 check, start-year sensitivity and 2014 break check.

Drafted with AI assistance (Claude Code). See docs/submission/si_usage.md.
Inputs : data/processed/sahel_imerg_final_monthly_1998_2025.csv, data/processed/sahel_chirps_v3_jjas_monthly.csv
Outputs: outputs/jjas_trend_results.csv, outputs/jjas_start_year_sensitivity.csv, outputs/figures/jjas_trend.png
Usage  : .venv/bin/python scripts/analyze_jjas_trend.py
"""
import sys
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import pandas as pd  # noqa: E402
from scipy import stats  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))
from earth_detective.trend import trend_summary  # noqa: E402

P, O = ROOT / "data" / "processed", ROOT / "outputs"
JJAS = [6, 7, 8, 9]

im = pd.read_csv(P / "sahel_imerg_final_monthly_1998_2025.csv", parse_dates=["date"])
ch = pd.read_csv(P / "sahel_chirps_v3_jjas_monthly.csv", parse_dates=["date"])


def jjas(df, col):
    d = df[df.date.dt.month.isin(JJAS)]
    g = d.groupby(d.date.dt.year)[col].agg(["sum", "count"])
    return g.loc[g["count"] == 4, "sum"]


imerg = jjas(im, "mm").loc[1998:2025]
chirps = jjas(ch, "chirps_mm").loc[1998:2025]
assert len(imerg) == 28 and len(chirps) == 28

# 1) main result + independent check
res = pd.DataFrame({"IMERG V07 Final": trend_summary(imerg), "CHIRPS v3.0": trend_summary(chirps)}).T
# monthly breakdown (IMERG)
for m in JJAS:
    s = im[im.date.dt.month == m].set_index(im[im.date.dt.month == m].date.dt.year)["mm"].loc[1998:2025]
    res.loc[f"IMERG month {m:02d}"] = pd.Series(trend_summary(s))

# 2) start-year sensitivity (D-006 caveat: never cherry-pick the start)
sens = pd.DataFrame([{**{"product": n}, **trend_summary(s.loc[y0:2025])}
                     for n, s in [("IMERG", imerg), ("CHIRPS", chirps)] for y0 in range(1998, 2011)])

# 3) TRMM -> GPM era (2014) homogeneity: does IMERG drift relative to the gauge-blended CHIRPS?
diff = (imerg - chirps)
pre, post = diff.loc[1998:2013], diff.loc[2014:2025]
welch = stats.ttest_ind(pre, post, equal_var=False)
mw = stats.mannwhitneyu(pre, post)
ratio_trend = trend_summary(100 * (imerg / chirps - 1))

O.mkdir(exist_ok=True); (O / "figures").mkdir(exist_ok=True)
res.to_csv(O / "jjas_trend_results.csv", float_format="%.4f")
sens.to_csv(O / "jjas_start_year_sensitivity.csv", index=False, float_format="%.4f")

pd.set_option("display.width", 200)
cols = ["n", "mean", "sen_slope", "slope_ci_low", "slope_ci_high", "slope_pct_per_decade", "change_over_period",
        "mk_tau", "mk_p", "mk_hamed_rao_p", "mk_yue_wang_p", "lag1_autocorr", "significant_all_tests"]
print("=== JJAS trend 1998-2025 (mm per season; slope mm/yr) ===")
print(res[cols].to_string(float_format=lambda v: f"{v:.3f}"))
# method comparison: non-parametric (MK + Sen) vs parametric (OLS, trend with AR(1) errors = ARIMA(1,0,0) + time)
print("\n=== method comparison (slope per year; p) ===")
print(res[["sen_slope", "mk_p", "ols_slope", "ols_p", "ar1_slope", "ar1_slope_ci_low", "ar1_slope_ci_high", "ar1_p",
          "ar1_phi", "ar1_phi_p"]].to_string(float_format=lambda v: f"{v:.3f}"))
print("\n=== start-year sensitivity (end 2025) ===")
print(sens.pivot(index="start", columns="product", values=["sen_slope", "slope_pct_per_decade", "mk_p", "mk_yue_wang_p"]).round(3).to_string())
print("\n=== 2014 TRMM->GPM era check: IMERG minus CHIRPS (mm) ===")
print(f"1998-2013 mean {pre.mean():+.1f}  |  2014-2025 mean {post.mean():+.1f}  |  Welch p={welch.pvalue:.3f}  Mann-Whitney p={mw.pvalue:.3f}")
print(f"trend of IMERG/CHIRPS-1 (%): {ratio_trend['sen_slope']:+.2f} %/yr, MK p={ratio_trend['mk_p']:.3f}")
print(f"IMERG vs CHIRPS JJAS correlation r={imerg.corr(chirps):.3f}")

# figure
fig, ax = plt.subplots(figsize=(9, 4.5))
for s, lab, c in [(imerg, "IMERG V07 Final (NASA)", "#1f6feb"), (chirps, "CHIRPS v3.0 (check)", "#9a6700")]:
    t = res.loc[[k for k in res.index if k.startswith(lab.split(" (")[0].split(" V")[0].split(" v")[0])][0]]
    ax.plot(s.index, s.values, "o-", color=c, lw=1.5, ms=4, label=lab)
    ax.plot(s.index, t["intercept"] + t["sen_slope"] * s.index, "--", color=c, lw=1.2,
            label=f"Sen slope {t['sen_slope']:+.1f} mm/yr (MK-HR p={t['mk_hamed_rao_p']:.3f})")
ax.axvline(2014, color="grey", lw=0.8, ls=":"); ax.text(2014.2, ax.get_ylim()[1] * 0.98, "GPM era", va="top", fontsize=8, color="grey")
ax.set(title="Sahel (10–20°N, 18°W–20°E) June–September rainfall, 1998–2025", xlabel="Year", ylabel="mm per season")
ax.legend(fontsize=8, frameon=False); ax.grid(alpha=0.3)
fig.text(0.01, 0.01, "Analysis code drafted with AI assistance (Claude Code). Data: NASA GPM IMERG V07B Final; CHC CHIRPS v3.0.", fontsize=6, color="grey")
fig.tight_layout(); fig.savefig(O / "figures" / "jjas_trend.png", dpi=150)
print(f"\nsaved {O/'jjas_trend_results.csv'}, {O/'jjas_start_year_sensitivity.csv'}, {O/'figures'/'jjas_trend.png'}")
