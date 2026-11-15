"""Types shared by every layer."""
from typing import Literal

from pydantic import BaseModel, Field

# Layer 1 decides significance with Mann-Kendall p < alpha.
TrendDirection = Literal["increasing", "decreasing", "no_significant_trend"]
# Sign of Sen's slope, shown as a "tendency" when the trend is not significant.
TendencyDirection = Literal["increasing", "decreasing", "none"]


class Provenance(BaseModel):
    """Every result says where it comes from (pipeline rule)."""

    dataset: str
    version: str | None = None
    agency: str | None = None
    product: str | None = None
    variable: str
    units: str
    box: dict[str, list[float]] | None = None
    period: list[str]
    season: list[int] | None = None
    method: str | None = None
    limitations: list[str] = Field(default_factory=list)
