"""Investigation lifecycle use cases."""
from __future__ import annotations

import logging
from dataclasses import asdict, dataclass

from ..core import helpers
from ..core.constants import FIRST_YEAR, LAST_YEAR, MIN_SEASONS, SEASON_MONTHS
from ..domain.models import Investigation, InvestigationConfig
from ..domain.ports import Clock, InvestigationHousekeeping, InvestigationRepository
from ..domain.result import AppError, Err, Ok, Result
from .commands import CreateInvestigationCommand
from .services import InvestigationLoader, RegionValidator, SeriesSelector

log = logging.getLogger(__name__)


def investigation_view(inv: Investigation) -> dict:
    return {"id": inv.id, "created_at": inv.created_at, "updated_at": inv.updated_at, "config": asdict(inv.config),
            "prepared": inv.prepared, "layers": inv.layers}


@dataclass(frozen=True)
class StorageLimits:
    max_investigations: int = 500
    ttl_days: int = 7


class CreateInvestigation:
    def __init__(self, repo: InvestigationRepository, regions: RegionValidator, selector: SeriesSelector, clock: Clock,
                 housekeeping: InvestigationHousekeeping | None = None, limits: StorageLimits = StorageLimits()):
        self._repo, self._regions, self._selector, self._clock = repo, regions, selector, clock
        self._housekeeping, self._limits = housekeeping, limits

    def _make_room(self) -> Result[None]:
        """Delete expired investigations, then refuse new ones if the store is still full (public demo protection)."""
        if self._housekeeping is None:
            return Ok(None)
        cutoff = helpers.iso_days_before(self._clock.now(), self._limits.ttl_days)
        removed = self._housekeeping.purge_older_than(cutoff)
        if removed:
            log.info("expired investigations deleted", extra={"event": "investigation.purged", "removed": removed, "before": cutoff})
        n = self._housekeeping.count()
        if n >= self._limits.max_investigations:
            log.warning("investigation store full", extra={"event": "investigation.capacity", "count": n})
            return Err(AppError.capacity("the investigation store is full; try again later",
                                         max_investigations=self._limits.max_investigations, ttl_days=self._limits.ttl_days))
        return Ok(None)

    def execute(self, cmd: CreateInvestigationCommand) -> Result[dict]:
        if tuple(sorted(cmd.season)) != SEASON_MONTHS:
            return Err(AppError.validation("the MVP supports the June-September (JJAS) season only"))
        if not (FIRST_YEAR <= cmd.start_year <= cmd.end_year <= LAST_YEAR):
            return Err(AppError.validation(f"period must lie within {FIRST_YEAR}-{LAST_YEAR}"))
        if cmd.end_year - cmd.start_year + 1 < MIN_SEASONS:
            return Err(AppError.validation(f"choose at least {MIN_SEASONS} seasons: shorter series cannot support a trend test"))
        reg = self._regions.validate([cmd.region_id])
        if not reg.is_ok:
            return reg
        region = reg.value[0]
        sel = self._selector.select(cmd.region_id, "rain_total", "auto", cmd.start_year, cmd.end_year, min_seasons=0)
        if not sel.is_ok:
            return sel
        s = sel.value
        room = self._make_room()
        if not room.is_ok:
            return room
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
