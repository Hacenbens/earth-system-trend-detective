"""Business rules (pure functions and policies). Changing a rule happens here, in one place."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol, Sequence

from ..core.constants import ALPHA, ETCCDI_METRICS, SCENARIO_DISCLAIMER
from ..core.enums import DatasetRole, EvidenceStatus, RainfallMetric, ScenarioKind, TrendDirection
from .models import DatasetAvailability, TrendStats

TREND_ROLES = (DatasetRole.TREND, DatasetRole.CHECK, DatasetRole.SUPPORTING)


# ------------------------------------------------------------------ dataset choice (open/closed: swap the policy)
class DatasetRankingPolicy(Protocol):
    def rank(self, candidates: Sequence[DatasetAvailability]) -> list[DatasetAvailability]: ...


class RoleThenCoveragePolicy:
    """Trend datasets first, then independent checks, then supporting data; longer records first. Excludes
    near-real-time and case-study datasets, which must never carry a trend."""
    ORDER = {DatasetRole.TREND: 0, DatasetRole.CHECK: 1, DatasetRole.SUPPORTING: 2}

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
    hint = TrendDirection.INCREASING if stats.sen_slope > 0 else TrendDirection.DECREASING if stats.sen_slope < 0 else TrendDirection.FLAT
    sig = stats.mk_p < alpha
    if hint == TrendDirection.FLAT:
        wording = "No change"
    elif sig:
        wording = f"Significant {hint} trend"
    else:
        wording = f"{hint.capitalize()} tendency, not statistically significant"
    return TrendVerdict(hint if sig else TrendDirection.NO_SIGNIFICANT_TREND, hint, sig, wording)


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
    return EXPECTED_SIGN.get(variable, 0) * (1 if compare_to == RainfallMetric.RAIN_TOTAL else -1)


def evidence_status(statistic: float, p_value: float, expected: int, alpha: float = ALPHA) -> str:
    """supporting = significant with the predicted sign; contrasting = significant, opposite sign; else unclear."""
    if p_value >= alpha or expected == 0:
        return EvidenceStatus.UNCLEAR
    return EvidenceStatus.SUPPORTING if (statistic > 0) == (expected > 0) else EvidenceStatus.CONTRASTING


# ------------------------------------------------------------------ evidence-ledger references shown next to numbers


def evidence_ids_for(region: str, metric: str) -> list[str]:
    if metric == "rain_total":
        return ["E-005"] if region == "sahel" else ["E-007"]
    if region == "east" and metric == "CDD":
        return ["E-007"]
    if region == "sahel" and metric in ETCCDI_METRICS:
        return ["E-006"]
    return []


# ------------------------------------------------------------------ scenarios (Layer 4)
SCENARIO_FORMULAS = {ScenarioKind.STABILIZATION: "X(t) = X0", ScenarioKind.TREND_CONTINUATION: "X(t) = X0 + beta (t - t0)",
                     ScenarioKind.INCREASED_STRESS: "X(t) = X0 + beta (t - t0) + delta (t - t0)"}


def scenario_value(kind: str, x0: float, beta: float, delta: float, t0: int, t: int) -> float:
    if kind == ScenarioKind.STABILIZATION:
        return x0
    v = x0 + beta * (t - t0)
    return v + delta * (t - t0) if kind == ScenarioKind.INCREASED_STRESS else v


def scenario_warnings(trend_significant: bool, p_value: float) -> list[str]:
    w = [SCENARIO_DISCLAIMER]
    if not trend_significant:
        w.append(f"The historical trend is not statistically significant (p = {p_value:.2f}): "
                 "trend continuation is an assumption, not an expectation.")
    return w


NUMERIC_WATER_BALANCE_PARAMETERS = ("initial soil-water storage", "storage capacity", "evapotranspiration (ET)",
                                    "runoff coefficient (Q)", "deep drainage (D)",
                                    "intervention effect on each parameter, with a published source")
