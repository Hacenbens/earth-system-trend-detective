"""Request DTOs (pydantic): syntactic validation only. Business rules live in the domain/application layers.
Each DTO converts itself into an application command, so use cases never depend on FastAPI or pydantic."""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

from ...core.constants import FIRST_YEAR, LAST_YEAR, SEASON_MONTHS
from ...core.enums import Confidence, EvidenceCategory, ExpectationStatus, RainfallMetric, ScenarioKind
from ...application.commands import (CreateInvestigationCommand, DetectCommand, ExplainCommand, InvestigateCommand, ProjectCommand,
                                     SolveCommand)


class InvestigationCreateDTO(BaseModel):
    name: str = Field("Sahel Rainfall Study", min_length=1, max_length=120)
    region_id: str = "sahel"
    start_year: int = FIRST_YEAR
    end_year: int = LAST_YEAR
    variable: Literal["precipitation"] = "precipitation"
    season: list[int] = list(SEASON_MONTHS)

    def to_command(self) -> CreateInvestigationCommand:
        return CreateInvestigationCommand(self.name, self.region_id, self.start_year, self.end_year, self.variable, tuple(self.season))


class DetectDTO(BaseModel):
    region_ids: list[str] | None = None
    metrics: list[str] = ["rain_total"]
    dataset: str = "auto"
    extremes: bool = False
    sensitivity: bool = True

    def to_command(self, inv_id: str) -> DetectCommand:
        return DetectCommand(inv_id, tuple(self.region_ids) if self.region_ids else None, tuple(self.metrics), self.dataset,
                             self.extremes, self.sensitivity)


class InvestigateDTO(BaseModel):
    region_ids: list[str] | None = None
    evidence: list[EvidenceCategory] = [EvidenceCategory.MOISTURE, EvidenceCategory.CIRCULATION, EvidenceCategory.DUST, EvidenceCategory.LAND]
    variables: list[str] | None = None
    compare_to: RainfallMetric = RainfallMetric.RAIN_TOTAL

    def to_command(self, inv_id: str) -> InvestigateCommand:
        return InvestigateCommand(inv_id, tuple(self.region_ids) if self.region_ids else None, tuple(self.evidence),
                                  tuple(self.variables) if self.variables else None, self.compare_to)


class ExplainDTO(BaseModel):
    mechanism_id: str
    reviewer: str = Field(..., min_length=1, max_length=80, description="Who confirms the assessment")
    status_overrides: dict[int, ExpectationStatus] = {}
    supporting_evidence_ids: list[str] | None = None
    contradicting_evidence_ids: list[str] | None = None
    alternatives: list[str] | None = None
    interpretation: str | None = Field(None, max_length=4000)
    confidence: Confidence | None = None

    def to_command(self, inv_id: str) -> ExplainCommand:
        t = lambda v: tuple(v) if v else None  # noqa: E731
        return ExplainCommand(inv_id, self.mechanism_id, self.reviewer, dict(self.status_overrides), t(self.supporting_evidence_ids),
                              t(self.contradicting_evidence_ids), t(self.alternatives), self.interpretation, self.confidence)


class StressDTO(BaseModel):
    type: Literal["linear"] = "linear"
    delta_per_year: float = 0.0


class ProjectDTO(BaseModel):
    region_id: str | None = None
    metric: str = "rain_total"
    baseline_period: tuple[int, int] = (FIRST_YEAR, LAST_YEAR)
    start_year: int = Field(2025, ge=2020, le=2030)
    end_year: int = Field(2035, ge=2026, le=2060)
    scenarios: list[ScenarioKind] = list(ScenarioKind)
    stress: StressDTO = StressDTO(delta_per_year=-2.0)
    assumptions: str = Field("Historical trend continues", max_length=1000)

    def to_command(self, inv_id: str) -> ProjectCommand:
        return ProjectCommand(inv_id, self.region_id, self.metric, tuple(self.baseline_period), self.start_year, self.end_year,
                              tuple(self.scenarios), self.stress.delta_per_year, self.assumptions)


class SolveDTO(BaseModel):
    interventions: list[str] = ["rainwater_harvesting", "mulching", "agroforestry", "soil_water_conservation"]
    numeric: bool = False

    def to_command(self, inv_id: str) -> SolveCommand:
        return SolveCommand(inv_id, tuple(self.interventions), self.numeric)
