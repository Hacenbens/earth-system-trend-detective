"""Layer 1 - DETECT. Only the part Layer 3 reads (contract: POST /detect response)."""
from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.common import Provenance, TrendDirection


class TrendResult(BaseModel):
    region_id: str
    metric: str = Field(examples=["PRCPTOT"])
    label: str
    unit: str
    direction: TrendDirection
    direction_hint: Literal["increasing", "decreasing"]
    sen_slope: float
    slope_unit: str
    slope_ci95: tuple[float, float]
    pct_per_decade: float | None = None
    mk_s: int | None = None
    mk_tau: float | None = None
    p_value: float = Field(ge=0, le=1)
    significant: bool
    alpha: float = 0.05
    n: int
    evidence_id: str = Field(examples=["E-006"])


class StartYearSensitivity(BaseModel):
    start: int
    pct_per_decade: float
    p_value: float = Field(ge=0, le=1)


class UnusualYear(BaseModel):
    year: int
    kind: Literal["dry", "wet"]
    z: float | None = None


class DetectHandoff(BaseModel):
    """Layer 1 -> Layer 2 handoff (contract wording)."""

    region_id: str
    period: tuple[int, int]
    season: list[int]
    unusual_years: list[UnusualYear] = Field(default_factory=list)


class DetectSection(BaseModel):
    status: Literal["pending", "done"]
    results: list[TrendResult]
    start_year_sensitivity: list[StartYearSensitivity] = Field(default_factory=list)
    handoff: DetectHandoff
    provenance: Provenance
