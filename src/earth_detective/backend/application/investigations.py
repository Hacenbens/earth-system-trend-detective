"""Investigation lifecycle use cases."""
from __future__ import annotations

import logging
from dataclasses import asdict

from ..domain import rules
from ..domain.models import Investigation, InvestigationConfig
from ..domain.ports import Clock, InvestigationRepository
from ..domain.result import AppError, Err, Ok, Result
from .commands import CreateInvestigationCommand
from .services import InvestigationLoader, RegionValidator, SeriesSelector

log = logging.getLogger(__name__)


def investigation_view(inv: Investigation) -> dict:
    return {"id": inv.id, "created_at": inv.created_at, "updated_at": inv.updated_at, "config": asdict(inv.config),
            "prepared": inv.prepared, "layers": inv.layers}


class CreateInvestigation:
    def __init__(self, repo: InvestigationRepository, regions: RegionValidator, selector: SeriesSelector, clock: Clock):
        self._repo, self._regions, self._selector, self._clock = repo, regions, selector, clock

    def execute(self, cmd: CreateInvestigationCommand) -> Result[dict]:
        if sorted(cmd.season) != [6, 7, 8, 9]:
            return Err(AppError.validation("the MVP supports the June-September (JJAS) season only"))
        if not (rules.FIRST_YEAR <= cmd.start_year <= cmd.end_year <= rules.LAST_YEAR):
            return Err(AppError.validation(f"period must lie within {rules.FIRST_YEAR}-{rules.LAST_YEAR}"))
        if cmd.end_year - cmd.start_year + 1 < rules.MIN_SEASONS:
            return Err(AppError.validation(f"choose at least {rules.MIN_SEASONS} seasons: shorter series cannot support a trend test"))
        reg = self._regions.validate([cmd.region_id])
        if not reg.is_ok:
            return reg
        region = reg.value[0]
        sel = self._selector.select(cmd.region_id, "rain_total", "auto", cmd.start_year, cmd.end_year, min_seasons=0)
        if not sel.is_ok:
            return sel
        s = sel.value
        expected = cmd.end_year - cmd.start_year + 1
        years = [p.year for p in s.points]
        prepared = {
            "region": {k: v for k, v in asdict(region).items() if k != "geojson"},
            "available_dates": [min(years), max(years)] if years else None,
            "variables": [{"name": "rain_total", "units": s.variable.unit}], "time_resolution": "season (JJAS)",
            "missing": {"seasons_expected": expected, "seasons_present": len(years), "seasons_missing": expected - len(years)},
            "qc_status": "passed" if len(years) == expected else "incomplete",
            "dataset": {"name": s.dataset.name, "version": s.dataset.version, "source": s.dataset.agency},
            "common_period_with": {c.dataset.code: True for c in self._selector.candidates(cmd.region_id, "rain_total")
                                   if c.dataset.code != s.dataset.code},
        }
        inv = Investigation(id=self._repo.next_id(), created_at=self._clock.now(), prepared=prepared,
                            config=InvestigationConfig(cmd.name, cmd.region_id, cmd.start_year, cmd.end_year, cmd.variable, tuple(cmd.season)))
        self._repo.save(inv)
        log.info("investigation created", extra={"event": "investigation.created", "investigation_id": inv.id,
                                                   "region": cmd.region_id, "period": f"{cmd.start_year}-{cmd.end_year}"})
        return Ok(investigation_view(inv))


class GetInvestigation:
    def __init__(self, loader: InvestigationLoader):
        self._loader = loader

    def execute(self, investigation_id: str) -> Result[dict]:
        return self._loader.load(investigation_id).map(investigation_view)


class ListInvestigations:
    def __init__(self, repo: InvestigationRepository):
        self._repo = repo

    def execute(self) -> Result[list[dict]]:
        return Ok(self._repo.list())
