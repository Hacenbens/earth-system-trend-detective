"""Small statistics helpers shared by the layers (no I/O)."""
import math

import numpy as np


def mann_kendall_sen(years, values) -> dict:
    """Mann-Kendall trend test (two-sided, tie-corrected) + Sen's slope."""
    x = np.asarray(years, float)
    y = np.asarray(values, float)
    n = len(y)
    if n < 3:
        raise ValueError("need at least 3 values")
    s = sum(int(np.sign(y[i + 1:] - y[i]).sum()) for i in range(n - 1))
    _, counts = np.unique(y, return_counts=True)
    var = (n * (n - 1) * (2 * n + 5) - sum(c * (c - 1) * (2 * c + 5) for c in counts)) / 18
    z = 0.0 if s == 0 or var == 0 else (s - np.sign(s)) / math.sqrt(var)
    p = math.erfc(abs(z) / math.sqrt(2))
    slopes = [(y[j] - y[i]) / (x[j] - x[i]) for i in range(n) for j in range(i + 1, n) if x[j] != x[i]]
    return {"s": s, "z": float(z), "p_value": float(p), "sen_slope": float(np.median(slopes)), "n": n}


def linear_fit(x, y) -> dict:
    """Ordinary least squares y = a + b x, with the 95% interval of b."""
    from scipy import stats

    x = np.asarray(x, float)
    y = np.asarray(y, float)
    r = stats.linregress(x, y)
    t = stats.t.ppf(0.975, len(x) - 2)
    return {
        "slope": float(r.slope),
        "intercept": float(r.intercept),
        "r2": float(r.rvalue ** 2),
        "p_value": float(r.pvalue),
        "slope_ci95": (float(r.slope - t * r.stderr), float(r.slope + t * r.stderr)),
    }
