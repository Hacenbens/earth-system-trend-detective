"""Domain entities and value objects (immutable where possible)."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from ..core.constants import SEASON_MONTHS


@dataclass(frozen=True)
class Region:
    code: str
    name: str
    lat_min: float
    lat_max: float
    lon_min: float
    lon_max: float
    status: str
    geojson: str


@dataclass(frozen=True)
class Dataset:
    code: str
    product: str
    name: str
    version: str | None
    agency: str
    kind: str          # satellite | gauge-blended | reanalysis | radar-lidar | derived
    role: str          # trend | check | supporting | near-real-time | case-study
    resolution: str | None = None
    coverage_start: str | None = None
    coverage_end: str | None = None
    access: str | None = None
    doi: str | None = None
    is_nasa: bool = False


@dataclass(frozen=True)
class Variable:
    code: str
    label: str
    unit: str
    category: str
    aggregation: str
    description: str


@dataclass(frozen=True)
class SeasonPoint:
    year: int
    value: float
    quality_flag: str = "ok"
    note: str | None = None


@dataclass(frozen=True)
class DatasetAvailability:
    dataset: Dataset
    seasons: int


@dataclass(frozen=True)
class TrendStats:
    n: int
    start: int
    end: int
    mean: float
    sen_slope: float
    slope_ci_low: float
    slope_ci_high: float
    slope_pct_per_decade: float | None
    mk_s: float
    mk_tau: float
    mk_p: float
    mk_hamed_rao_p: float
    mk_yue_wang_p: float
    ols_slope: float | None
    ols_p: float | None
    ar1_slope: float | None
    ar1_p: float | None
    ar1_phi: float | None
    lag1_autocorr: float


@dataclass(frozen=True)
class Association:
    statistic: float
    p_value: float
    n: int
    year_start: int
    year_end: int
    method: str = "spearman_detrended"


@dataclass(frozen=True)
class Expectation:
    no: int
    expectation: str
    observed: str
    status: str


@dataclass(frozen=True)
class Mechanism:
    mechanism_id: str
    name: str
    description: str
    confidence: str
    interpretation: str
    expectations: tuple[Expectation, ...]
    supporting_evidence_ids: tuple[str, ...]
    contradicting_evidence_ids: tuple[str, ...]


@dataclass(frozen=True)
class CaseStudy:
    case_id: str
    case_type: str
    region: str
    metrics: dict[str, float]


@dataclass(frozen=True)
class Intervention:
    id: str
    name: str
    problem: str
    expected_effect: str
    model_representation: str
    evidence: str
    references: tuple[str, ...]
    unknowns: tuple[str, ...]


@dataclass(frozen=True)
class InvestigationConfig:
    name: str
    region_id: str
    start_year: int
    end_year: int
    variable: str = "precipitation"
    season: tuple[int, ...] = SEASON_MONTHS


@dataclass
class Investigation:
    """Aggregate root: one investigation and the results of each layer (detect, investigate, explain, project, solve)."""
    id: str
    created_at: str
    config: InvestigationConfig
    prepared: dict[str, Any]
    layers: dict[str, Any] = field(default_factory=dict)
    updated_at: str | None = None

    def record(self, layer: str, result: Any) -> None:
        self.layers[layer] = result

    def record_assessment(self, mechanism_id: str, assessment: dict) -> None:
        self.layers.setdefault("explain", {})[mechanism_id] = assessment  # key = core.enums.Layer.EXPLAIN
