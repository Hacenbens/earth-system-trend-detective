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
  * parametric cross-checks (statsmodels):
      - OLS linear trend (slope, 95 % CI, p), assumes independent normal errors
      - linear trend with AR(1) errors, i.e. ARIMA(1,0,0) with a time regressor, fitted by maximum likelihood.
        This is the 'why not ARIMA?' check: it models year-to-year dependence explicitly instead of correcting the
        MK variance. If it agrees with MK + Sen, the result does not depend on the method family.
        Caution (same logic as the Hamed-Rao floor): with a NEGATIVE, non-significant AR coefficient the AR(1) model
        shrinks the slope uncertainty and its p-value is smaller than MK/OLS. Use it to confirm the slope, and take
        significance from MK (or OLS when phi is not significant). Project rule: methods_pipeline.md, section B.
"""
import warnings

import numpy as np
import pandas as pd
import pymannkendall as mk
from scipy import stats
from statsmodels.tsa.arima.model import ARIMA


def _parametric(x, y, alpha):
    """OLS trend and trend-with-AR(1)-errors. Time is centred so slope and intercept are not collinear."""
    xc = x - x.mean()
    ols = stats.linregress(xc, y)
    tq = stats.t.ppf(1 - alpha / 2, len(y) - 2)
    out = {"ols_slope": float(ols.slope), "ols_slope_ci_low": float(ols.slope - tq * ols.stderr),
           "ols_slope_ci_high": float(ols.slope + tq * ols.stderr), "ols_p": float(ols.pvalue)}
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            fit = ARIMA(y, exog=xc, order=(1, 0, 0), trend="c").fit()
        names = list(fit.model.param_names)            # ['const', 'x1', 'ar.L1', 'sigma2']
        i_b, i_phi = names.index("x1"), names.index("ar.L1")
        ci = np.asarray(fit.conf_int(alpha=alpha))[i_b]
        out.update({"ar1_slope": float(fit.params[i_b]), "ar1_slope_ci_low": float(ci[0]),
                    "ar1_slope_ci_high": float(ci[1]), "ar1_p": float(fit.pvalues[i_b]),
                    "ar1_phi": float(fit.params[i_phi]), "ar1_phi_p": float(fit.pvalues[i_phi])})
    except Exception:  # noqa: BLE001 - report as missing rather than crash the whole table
        out.update(dict.fromkeys(["ar1_slope", "ar1_slope_ci_low", "ar1_slope_ci_high", "ar1_p", "ar1_phi", "ar1_phi_p"], np.nan))
    return out


def trend_summary(s: pd.Series, alpha: float = 0.05, parametric: bool = True) -> dict:
    """s: values indexed by year (int). Returns a flat dict of statistics (slope in units per year).
    parametric=False skips the OLS / AR(1) cross-checks (~80 % of the run time); MK and Sen results are identical."""
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
        **(_parametric(x, y, alpha) if parametric else dict.fromkeys(
            ["ols_slope", "ols_slope_ci_low", "ols_slope_ci_high", "ols_p", "ar1_slope", "ar1_slope_ci_low", "ar1_slope_ci_high", "ar1_p", "ar1_phi", "ar1_phi_p"])),
    }
