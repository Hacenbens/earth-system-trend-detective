"""Request models (pydantic). Response shapes follow docs/app/api_contract.md.

Drafted with AI assistance (Claude Code). See docs/submission/si_usage.md.
"""
from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator


class InvestigationCreate(BaseModel):
    name: str = Field("Sahel Rainfall Study", min_length=1, max_length=120)
    region_id: str = "sahel"
    start_year: int = Field(1998, ge=1998, le=2025)
    end_year: int = Field(2025, ge=1998, le=2025)
    variable: Literal["precipitation"] = "precipitation"
    season: list[int] = [6, 7, 8, 9]

    @field_validator("season")
    @classmethod
    def jjas_only(cls, v):
        if sorted(v) != [6, 7, 8, 9]:
            raise ValueError("MVP supports the June-September (JJAS) season only")
        return v

    @model_validator(mode="after")
    def period(self):
        if self.end_year - self.start_year + 1 < 15:
            raise ValueError("choose at least 15 seasons: shorter series cannot support a trend test")
        return self


class DetectRequest(BaseModel):
    region_ids: list[str] | None = None            # default: the investigation's region
    metrics: list[str] = ["rain_total"]
    dataset: str = "auto"                           # auto = the trend dataset for that metric/region
    extremes: bool = False                          # add the ETCCDI indices (box only, daily data)
    sensitivity: bool = True                        # start-year sensitivity table


class InvestigateRequest(BaseModel):
    region_ids: list[str] | None = None
    evidence: list[Literal["moisture", "circulation", "dust", "land", "storm_structure", "vegetation"]] = ["moisture", "circulation", "dust", "land"]
    variables: list[str] | None = None              # overrides the evidence categories
    compare_to: Literal["rain_total", "CDD"] = "rain_total"


class ExplainRequest(BaseModel):
    mechanism_id: str
    status_overrides: dict[int, Literal["consistent", "inconsistent", "unclear", "not_tested"]] = {}
    supporting_evidence_ids: list[str] | None = None
    contradicting_evidence_ids: list[str] | None = None
    alternatives: list[str] | None = None
    interpretation: str | None = Field(None, max_length=4000)
    confidence: Literal["low", "low-medium", "medium", "medium-high", "high", "not_assessed"] | None = None
    reviewer: str = Field(..., min_length=1, max_length=80, description="Name or role of the person confirming the assessment")


class Stress(BaseModel):
    type: Literal["linear"] = "linear"
    delta_per_year: float = 0.0


class ProjectRequest(BaseModel):
    region_id: str | None = None
    metric: str = "rain_total"
    baseline_period: tuple[int, int] = (1998, 2025)
    start_year: int = Field(2025, ge=2020, le=2030)
    end_year: int = Field(2035, ge=2026, le=2060)
    scenarios: list[Literal["stabilization", "trend_continuation", "increased_stress"]] = ["stabilization", "trend_continuation", "increased_stress"]
    stress: Stress = Stress(delta_per_year=-2.0)
    assumptions: str = Field("Historical trend continues", max_length=1000)


class SolveRequest(BaseModel):
    interventions: list[str] = ["rainwater_harvesting", "mulching", "agroforestry", "soil_water_conservation"]
    numeric: bool = False
