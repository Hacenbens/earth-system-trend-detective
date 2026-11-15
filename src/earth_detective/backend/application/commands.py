"""Use-case inputs (plain dataclasses). The HTTP layer converts its DTOs into these, so use cases never see FastAPI."""
from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class CreateInvestigationCommand:
    name: str
    region_id: str
    start_year: int
    end_year: int
    variable: str = "precipitation"
    season: tuple[int, ...] = (6, 7, 8, 9)


@dataclass(frozen=True)
class DetectCommand:
    investigation_id: str
    region_ids: tuple[str, ...] | None = None
    metrics: tuple[str, ...] = ("rain_total",)
    dataset: str = "auto"
    extremes: bool = False
    sensitivity: bool = True


@dataclass(frozen=True)
class InvestigateCommand:
    investigation_id: str
    region_ids: tuple[str, ...] | None = None
    evidence: tuple[str, ...] = ("moisture", "circulation", "dust", "land")
    variables: tuple[str, ...] | None = None
    compare_to: str = "rain_total"


@dataclass(frozen=True)
class ExplainCommand:
    investigation_id: str
    mechanism_id: str
    reviewer: str
    status_overrides: dict[int, str] = field(default_factory=dict)
    supporting_evidence_ids: tuple[str, ...] | None = None
    contradicting_evidence_ids: tuple[str, ...] | None = None
    alternatives: tuple[str, ...] | None = None
    interpretation: str | None = None
    confidence: str | None = None


@dataclass(frozen=True)
class ProjectCommand:
    investigation_id: str
    region_id: str | None = None
    metric: str = "rain_total"
    baseline_period: tuple[int, int] = (1998, 2025)
    start_year: int = 2025
    end_year: int = 2035
    scenarios: tuple[str, ...] = ("stabilization", "trend_continuation", "increased_stress")
    stress_per_year: float = -2.0
    assumptions: str = "Historical trend continues"


@dataclass(frozen=True)
class SolveCommand:
    investigation_id: str
    interventions: tuple[str, ...] = ("rainwater_harvesting", "mulching", "agroforestry", "soil_water_conservation")
    numeric: bool = False


@dataclass(frozen=True)
class SeriesQuery:
    region: str = "sahel"
    variable: str = "rain_total"
    dataset: str = "auto"
    grain: str = "season"
