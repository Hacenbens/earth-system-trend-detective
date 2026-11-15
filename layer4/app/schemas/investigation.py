"""The investigation document: the shared 'patient file' every layer reads and writes.

Each layer writes only its own section. In this Layer 4 package only Layer 1 (detect,
read) and Layer 4 (project, written) are typed; other layers' sections are kept as-is.
"""
from typing import Any

from pydantic import BaseModel

from app.schemas.detect import DetectSection
from app.schemas.project import ProjectSection


class InvestigationConfig(BaseModel):
    name: str
    region_id: str
    start_year: int
    end_year: int
    variable: str
    season: list[int]
    datasets: list[str]


class Investigation(BaseModel):
    id: str
    config: InvestigationConfig
    detect: DetectSection | None = None            # Layer 1 (read by Layer 4)
    investigate: dict[str, Any] | None = None      # Layer 2 (not used by Layer 4)
    explain: dict[str, Any] | None = None          # Layer 3 (not used by Layer 4)
    project: ProjectSection | None = None          # Layer 4 writes
    solve: dict[str, Any] | None = None            # Layer 5
