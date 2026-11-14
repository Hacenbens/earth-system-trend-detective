"""Trend statistics for annual (one value per year) series: Mann-Kendall family + Sen's slope.

Drafted with AI assistance (Claude Code). See docs/submission/si_usage.md.

Reported together, because they answer different questions:
  * original Mann-Kendall (assumes independent years)
  * Hamed & Rao (1998) variance-corrected MK (literature L-07): robust to serial correlation.
    The correction is only allowed to INFLATE the variance (factor floored at 1): with negative autocorrelation the
    raw correction shrinks the variance and gives over-confident (or NaN) p-values, while the original MK is already
    conservative there. In practice: p_HR = max(p_original, p_HamedRao), NaN -> p_original.
  * Yue & Wang (2002) trend-free pre-whitening MK
  * Sen's slope with a 95 % confidence interval (scipy.stats.theilslopes)
  * lag-1 autocorrelation of the detrended series
"""
import numpy as np
import pandas as pd
import pymannkendall as mk
from scipy import stats


def trend_summary(s: pd.Series, alpha: float = 0.05) -> dict:
    """s: values indexed by year (int). Returns a flat dict of statistics (slope in units per year)."""
    s = s.dropna().sort_index()
    x, y = s.index.to_numpy(dtype=float), s.to_numpy(dtype=float)
    orig = mk.original_test(y, alpha=alpha)
    with np.errstate(invalid="ignore"):
        hr = mk.hamed_rao_modification_test(y, alpha=alpha)
    p_hr = float(orig.p) if np.isnan(hr.p) else max(float(orig.p), float(hr.p))
    yw = mk.trend_free_pre_whitening_modification_test(y, alpha=alpha)
    slope, intercept, lo, hi = stats.theilslopes(y, x, alpha=1 - alpha)
    resid = y - (intercept + slope * x)
    r1 = float(np.corrcoef(resid[:-1], resid[1:])[0, 1])
    mean = float(y.mean())
    return {
        "n": len(y), "start": int(x[0]), "end": int(x[-1]), "mean": mean,
        "sen_slope": float(slope), "slope_ci_low": float(lo), "slope_ci_high": float(hi),
        "slope_pct_per_decade": 100 * 10 * float(slope) / mean,
        "change_over_period": float(slope) * (x[-1] - x[0]),
        "mk_tau": float(orig.Tau), "mk_p": float(orig.p),
        "mk_hamed_rao_p": p_hr, "mk_yue_wang_p": float(yw.p),
        "lag1_autocorr": r1,
        "significant_all_tests": bool(max(orig.p, p_hr, yw.p) < alpha),
        "intercept": float(intercept),
    }
