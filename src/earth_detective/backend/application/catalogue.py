"""Read-only catalogue queries (one class per query)."""
from __future__ import annotations

import json
from dataclasses import asdict

from ..domain.ports import (BuildInfoReader, CatalogueReader, InterventionCatalogue, MechanismReader, ObservationReader,
                            PrecomputedTrendReader)
from ..domain.result import AppError, Err, Ok, Result
from .commands import SeriesQuery
from .services import RegionValidator, SeriesSelector, mechanism_view


class ListRegions:
    def __init__(self, catalogue: CatalogueReader):
        self._c = catalogue

    def execute(self) -> Result[dict]:
        feats = []
        for r in self._c.regions():
            props = {k: v for k, v in asdict(r).items() if k != "geojson"}
            feats.append({"type": "Feature", "geometry": json.loads(r.geojson), "properties": {"id": r.code, **props}})
        return Ok({"type": "FeatureCollection", "features": feats})


class ListDatasets:
    def __init__(self, catalogue: CatalogueReader):
        self._c = catalogue

    def execute(self) -> Result[list[dict]]:
        return Ok(self._c.datasets())


class ListVariables:
    def __init__(self, catalogue: CatalogueReader):
        self._c = catalogue

    def execute(self) -> Result[list[dict]]:
        return Ok([asdict(v) for v in self._c.variables()])


class GetSeries:
    def __init__(self, catalogue: CatalogueReader, observations: ObservationReader, regions: RegionValidator, selector: SeriesSelector):
        self._c, self._obs, self._regions, self._selector = catalogue, observations, regions, selector

    def execute(self, q: SeriesQuery) -> Result[dict]:
        if q.grain not in ("season", "month"):
            return Err(AppError.validation("grain must be 'season' or 'month'"))
        reg = self._regions.validate([q.region])
        if not reg.is_ok:
            return reg
        if self._c.variable(q.variable) is None:
            return Err(AppError.not_found(f"unknown variable '{q.variable}'"))
        if q.dataset == "auto":
            ranked = self._selector.candidates(q.region, q.variable)
            if not ranked:
                return Err(AppError.not_available(f"no dataset with {q.variable} for {q.region}"))
            ds = ranked[0].dataset.code
        elif self._c.dataset(q.dataset) is None:
            return Err(AppError.not_found(f"unknown dataset '{q.dataset}'"))
        else:
            ds = q.dataset
        return Ok({"region": q.region, "variable": q.variable, "dataset": ds, "grain": q.grain,
                   "points": self._obs.series(q.region, q.variable, ds, q.grain)})


class ListPrecomputedTrends:
    def __init__(self, trends: PrecomputedTrendReader):
        self._t = trends

    def execute(self, variable: str | None, region: str | None, dataset: str | None) -> Result[list[dict]]:
        return Ok(self._t.trends(variable, region, dataset))


class ListMechanisms:
    def __init__(self, mechanisms: MechanismReader):
        self._m = mechanisms

    def execute(self) -> Result[list[dict]]:
        return Ok([mechanism_view(m) for m in self._m.mechanisms()])


class ListInterventions:
    def __init__(self, interventions: InterventionCatalogue):
        self._i = interventions

    def execute(self) -> Result[list[dict]]:
        return Ok([asdict(i) for i in self._i.all()])


class GetBuildInfo:
    def __init__(self, build: BuildInfoReader):
        self._b = build

    def execute(self) -> Result[dict]:
        b = self._b.latest()
        return Ok(b) if b else Err(AppError.not_available("warehouse has no build record: run `make warehouse`"))
