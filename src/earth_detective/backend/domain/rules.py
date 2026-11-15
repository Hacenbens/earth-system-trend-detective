"""Business rules (pure functions and policies). Changing a rule happens here, in one place."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol, Sequence

from .models import DatasetAvailability, TrendStats

ALPHA = 0.05
MIN_SEASONS = 15                      # shortest series that may carry a trend test
FIRST_YEAR, LAST_YEAR = 1998, 2025    # IMERG V07 Final record used for trends (D-006)
TREND_ROLES = ("trend", "check", "supporting")
SENSITIVITY_SPAN = 12                 # start-year sensitivity: first year .. first year + 12


# ------------------------------------------------------------------ dataset choice (open/closed: swap the policy)
class DatasetRankingPolicy(Protocol):
    def rank(self, candidates: Sequence[DatasetAvailability]) -> list[DatasetAvailability]: ...


class RoleThenCoveragePolicy:
    """Trend datasets first, then independent checks, then supporting data; longer records first. Excludes
    near-real-time and case-study datasets, which must never carry a trend."""
    ORDER = {"trend": 0, "check": 1, "supporting": 2}

    def rank(self, candidates):
        allowed = [c for c in candidates if c.dataset.role in TREND_ROLES]
        return sorted(allowed, key=lambda c: (self.ORDER.get(c.dataset.role, 9), -c.seasons))


# ------------------------------------------------------------------ trend wording
@dataclass(frozen=True)
class TrendVerdict:
    direction: str        # increasing | decreasing | no_significant_trend
    hint: str             # sign of Sen's slope
    significant: bool
    wording: str


def judge_trend(stats: TrendStats, alpha: float = ALPHA) -> TrendVerdict:
    hint = "increasing" if stats.sen_slope > 0 else "decreasing" if stats.sen_slope < 0 else "flat"
    sig = stats.mk_p < alpha
    if hint == "flat":
        wording = "No change"
    elif sig:
        wording = f"Significant {hint} trend"
    else:
        wording = f"{hint.capitalize()} tendency, not statistically significant"
    return TrendVerdict(hint if sig else "no_significant_trend", hint, sig, wording)


# ------------------------------------------------------------------ evidence (Layer 2)
EXPECTED_SIGN = {  # sign of the association with RAINFALL if the physical mechanism holds (dry spells: opposite)
    "TQV": 1, "QV2M": 1, "mfc_mm_day": 1, "U850": 1, "V850": 1, "OMEGA500": -1, "shear_925_600": 1, "AEJ_U600": 1,
    "DUEXTTAU": -1, "TOTEXTTAU": -1, "GWETTOP": 1, "GWETROOT": 1, "EF": 1, "T2M_C": -1, "UFLXQV": 1, "VFLXQV": 1}
EVIDENCE_VARIABLES = {"moisture": ("TQV", "mfc_mm_day", "QV2M"),
                      "circulation": ("U850", "V850", "OMEGA500", "shear_925_600", "AEJ_U600"),
                      "dust": ("DUEXTTAU",), "land": ("GWETTOP", "EF", "T2M_C")}
MECHANISM_FOR_VARIABLE = {"TQV": "M-01", "mfc_mm_day": "M-01", "QV2M": "M-02", "U850": "M-01", "V850": "M-01", "OMEGA500": "M-03",
                          "shear_925_600": "M-03", "AEJ_U600": "M-03", "DUEXTTAU": "M-04", "GWETTOP": "M-05", "EF": "M-05", "T2M_C": "M-05"}


def expected_sign(variable: str, compare_to: str) -> int:
    return EXPECTED_SIGN.get(variable, 0) * (1 if compare_to == "rain_total" else -1)


def evidence_status(statistic: float, p_value: float, expected: int, alpha: float = ALPHA) -> str:
    """supporting = significant with the predicted sign; contrasting = significant, opposite sign; else unclear."""
    if p_value >= alpha or expected == 0:
        return "unclear"
    return "supporting" if (statistic > 0) == (expected > 0) else "contrasting"


# ------------------------------------------------------------------ evidence-ledger references shown next to numbers
_EXTREMES = ("PRCPTOT", "wet_days", "SDII", "Rx1day", "Rx5day", "R10mm", "R20mm", "R95p", "R95pTOT", "CDD")
EXTREME_METRICS = ("PRCPTOT", "wet_days", "SDII", "Rx1day", "R95p", "CDD")


def evidence_ids_for(region: str, metric: str) -> list[str]:
    if metric == "rain_total":
        return ["E-005"] if region == "sahel" else ["E-007"]
    if region == "east" and metric == "CDD":
        return ["E-007"]
    if region == "sahel" and metric in _EXTREMES:
        return ["E-006"]
    return []


# ------------------------------------------------------------------ scenarios (Layer 4)
SCENARIO_FORMULAS = {"stabilization": "X(t) = X0", "trend_continuation": "X(t) = X0 + beta (t - t0)",
                     "increased_stress": "X(t) = X0 + beta (t - t0) + delta (t - t0)"}


def scenario_value(kind: str, x0: float, beta: float, delta: float, t0: int, t: int) -> float:
    if kind == "stabilization":
        return x0
    v = x0 + beta * (t - t0)
    return v + delta * (t - t0) if kind == "increased_stress" else v


def scenario_warnings(trend_significant: bool, p_value: float) -> list[str]:
    w = ["Scenario, not a forecast."]
    if not trend_significant:
        w.append(f"The historical trend is not statistically significant (p = {p_value:.2f}): "
                 "trend continuation is an assumption, not an expectation.")
    return w


NUMERIC_WATER_BALANCE_PARAMETERS = ("initial soil-water storage", "storage capacity", "evapotranspiration (ET)",
                                    "runoff coefficient (Q)", "deep drainage (D)",
                                    "intervention effect on each parameter, with a published source")
