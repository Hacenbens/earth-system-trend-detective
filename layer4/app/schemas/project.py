"""Layer 4 - PROJECT: scenarios, not forecasts.

Contract formulas (pipeline doc, section 5):
    stabilization        X(t) = X0
    trend_continuation   X(t) = X0 + beta * (t - t0)
    increased_stress     X(t) = X0 + beta * (t - t0) + delta(t)

X0   baseline value (mean of the rainfall series over the baseline period, or given)
beta Sen's slope from Layer 1 (never recomputed here)
t0   projection start year
delta(t) the researcher's stress perturbation

Impact indicators are labelled "calculated indicator, not a measured impact".
"""
from typing import Literal

from pydantic import BaseModel, Field, model_validator

from app.schemas.common import Provenance

ScenarioName = Literal["stabilization", "trend_continuation", "increased_stress"]
ALL_SCENARIOS: list[ScenarioName] = ["stabilization", "trend_continuation", "increased_stress"]
SCENARIO_IDS = {"stabilization": "SCN-STAB", "trend_continuation": "SCN-TREND", "increased_stress": "SCN-STRESS"}
INDICATOR_LABEL = "Calculated indicator, not a measured impact"


class Stress(BaseModel):
    """delta(t). linear: delta_per_year * (t - t0). constant: delta every year."""

    type: Literal["linear", "constant"] = "linear"
    delta_per_year: float | None = None
    delta: float | None = None
    unit: str = "mm/yr"

    @model_validator(mode="after")
    def _has_value(self) -> "Stress":
        if self.type == "linear" and self.delta_per_year is None:
            raise ValueError("linear stress needs delta_per_year")
        if self.type == "constant" and self.delta is None:
            raise ValueError("constant stress needs delta")
        return self


class ProjectRequest(BaseModel):
    metric: str = "PRCPTOT"
    baseline_period: tuple[int, int] | None = None   # default: Layer 1 period
    baseline_value: float | None = None              # default: mean of the rainfall series
    start_year: int = 2025
    end_year: int = 2035
    scenarios: list[ScenarioName] = Field(default_factory=lambda: list(ALL_SCENARIOS))
    stress: Stress | None = None
    assumptions: str = "Historical trend continues"

    @model_validator(mode="after")
    def _check(self) -> "ProjectRequest":
        if not 0 < self.end_year - self.start_year <= 50:
            raise ValueError("end_year must be after start_year, at most 50 years later")
        if self.baseline_period and self.baseline_period[0] > self.baseline_period[1]:
            raise ValueError("baseline_period must be (first_year, last_year)")
        if not self.scenarios:
            raise ValueError("choose at least one scenario")
        if "increased_stress" in self.scenarios and self.stress is None:
            raise ValueError("increased_stress needs a stress perturbation")
        return self


# ------------------------------------------------------------- Output 1: scenario data

class ScenarioPoint(BaseModel):
    scenario_id: str
    scenario_name: ScenarioName
    variable: str
    year: int
    projected_value: float
    unit: str
    baseline_value: float
    assumed_slope: float
    stress_perturbation: float | None = None
    # same formula with the ends of Layer 1's 95% slope interval (None for stabilization)
    low: float | None = None
    high: float | None = None


# ------------------------------------------------------------- Output 2: comparison

class ComparisonRow(BaseModel):
    year: int
    values: dict[str, float]
    diff_vs_stabilization: dict[str, float]
    pct_vs_stabilization: dict[str, float | None]


# ------------------------------------------------------------- Output 3: impact indicators

class IndicatorValue(BaseModel):
    scenario_name: ScenarioName
    year: int
    value: float
    extrapolated: bool = False   # rainfall outside the range used to fit the relation


class RegressionFit(BaseModel):
    """ndvi = intercept + slope * rain, fitted on years present in both series."""

    slope: float
    slope_ci95: tuple[float, float]
    intercept: float
    r2: float
    p_value: float
    significant: bool
    n: int
    years: tuple[int, int]
    rain_range: tuple[float, float]


class Restrend(BaseModel):
    """Trend of the residuals (observed NDVI - NDVI predicted from rain)."""

    sen_slope: float
    p_value: float
    significant: bool
    reading: str


class ImpactIndicator(BaseModel):
    indicator_id: str
    name: str
    kind: Literal["calculated", "qualitative"]
    status: Literal["available", "not_available"]
    label: str = INDICATOR_LABEL
    unit: str | None = None
    method: str
    values: list[IndicatorValue] = Field(default_factory=list)
    fit: RegressionFit | None = None
    restrend: Restrend | None = None
    text: str | None = None
    reason: str | None = None   # why not available, or how to read it


# ------------------------------------------------------------- section stored in the investigation

class Baseline(BaseModel):
    value: float
    unit: str
    period: tuple[int, int]
    source: Literal["rainfall_series", "request"]
    n: int | None = None


class TrendUsed(BaseModel):
    metric: str
    evidence_id: str | None
    sen_slope: float
    slope_ci95: tuple[float, float] | None
    slope_unit: str
    p_value: float
    significant: bool


class Layer5Handoff(BaseModel):
    baseline: Baseline
    period: tuple[int, int]
    end_year_values: dict[str, float]
    assumptions: list[str]
    indicator_ids: list[str]


class ProjectSection(BaseModel):
    status: Literal["done"] = "done"
    request: ProjectRequest
    disclaimer: str
    baseline: Baseline
    trend: TrendUsed
    scenarios: list[ScenarioPoint]
    comparison: list[ComparisonRow]
    indicators: list[ImpactIndicator]
    assumptions: list[str]
    limitations: list[str]
    handoff: Layer5Handoff
    provenance: Provenance
    created_at: str | None = None


class SeriesPoint(BaseModel):
    year: int
    value: float


class Layer4Input(BaseModel):
    """What Layer 4 can see before it runs: used to pre-fill the form and draw the history."""

    trend: TrendUsed
    layer1_period: tuple[int, int]
    rainfall_series_available: bool
    rainfall_series_years: tuple[int, int] | None = None
    baseline_from_series: float | None = None
    ndvi_available: bool
    ndvi_years: tuple[int, int] | None = None
    ndvi_n: int | None = None
    default_request: ProjectRequest
    rainfall_series: list[SeriesPoint] = Field(default_factory=list)   # observed, for the chart
    ndvi_series: list[SeriesPoint] = Field(default_factory=list)
