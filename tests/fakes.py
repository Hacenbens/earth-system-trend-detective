"""In-memory adapters implementing the domain ports: the use cases run unchanged against them (Liskov substitution)."""
from __future__ import annotations

from earth_detective.backend.domain.models import (Association, CaseStudy, Dataset, DatasetAvailability, Expectation, Intervention,
                                                   Mechanism, Region, SeasonPoint, Variable)
from earth_detective.backend.infrastructure.adapters import DetrendedSpearmanAnalyzer, MannKendallTrendAnalyzer

GEO = '{"type": "Polygon", "coordinates": [[[0,0],[1,0],[1,1],[0,1],[0,0]]]}'
REGIONS = [Region("sahel", "Sahel", 10, 20, -18, 20, "provisional", GEO), Region("east", "East", 10, 20, 10, 20, "provisional", GEO)]
TREND_DS = Dataset("imerg", "P", "IMERG", "V07", "NASA", "satellite", "trend", is_nasa=True)
CHECK_DS = Dataset("chirps", "C", "CHIRPS", "3", "CHC", "gauge-blended", "check")
NRT_DS = Dataset("late", "L", "IMERG Late", "V07", "NASA", "satellite", "near-real-time", is_nasa=True)
REAN_DS = Dataset("merra2", "M", "MERRA-2", "5", "NASA", "reanalysis", "supporting", is_nasa=True)
VARIABLES = {"rain_total": Variable("rain_total", "Rainfall total", "mm", "rain_amount", "sum", "d"),
             "TQV": Variable("TQV", "Column water vapour", "kg/m²", "moisture", "mean", "d"),
             "DUEXTTAU": Variable("DUEXTTAU", "Dust", "1", "dust", "mean", "d")}
YEARS = range(1998, 2026)


def wiggle(i: int) -> float:
    return [3, -2, 4, -5, 1, -3, 2, 5, -4, 0][i % 10]


class FakeCatalogue:
    def regions(self): return list(REGIONS)
    def region(self, code): return next((r for r in REGIONS if r.code == code), None)
    def datasets(self): return [{"code": d.code, "role": d.role} for d in (TREND_DS, CHECK_DS, NRT_DS, REAN_DS)]
    def dataset(self, code): return next((d for d in (TREND_DS, CHECK_DS, NRT_DS, REAN_DS) if d.code == code), None)
    def variables(self): return list(VARIABLES.values())
    def variable(self, code): return VARIABLES.get(code)


class FakeObservations:
    """rain: +3 mm/yr with small wiggles (clear trend); TQV tracks rain; dust is unrelated noise."""

    def __init__(self):
        rain = {y: 400 + 3 * (y - 1998) + wiggle(i) * 6 for i, y in enumerate(YEARS)}
        self.data = {("sahel", "rain_total", "imerg"): rain, ("east", "rain_total", "imerg"): rain,
                     ("sahel", "rain_total", "chirps"): {y: v * 0.95 for y, v in rain.items()},
                     ("sahel", "rain_total", "late"): {2024: 540.0, 2025: 495.0},
                     ("east", "TQV", "merra2"): {y: 35 + 0.02 * (v - 400) for y, v in rain.items()},
                     ("east", "DUEXTTAU", "merra2"): {y: 0.35 + 0.01 * wiggle(i * 7 + 3) for i, y in enumerate(YEARS)}}
        self._ds = {"imerg": TREND_DS, "chirps": CHECK_DS, "late": NRT_DS, "merra2": REAN_DS}

    def availability(self, region, variable):
        return [DatasetAvailability(self._ds[d], len(v)) for (r, var, d), v in self.data.items() if r == region and var == variable]

    def season_series(self, region, variable, dataset, y0, y1):
        s = self.data.get((region, variable, dataset), {})
        return [SeasonPoint(y, v) for y, v in sorted(s.items()) if y0 <= y <= y1]

    def series(self, region, variable, dataset, grain):
        return [{"year": p.year, "value": p.value} for p in self.season_series(region, variable, dataset, 0, 9999)]

    def recent_seasons(self, region, variable, from_year):
        return []


class FakeMechanisms:
    def mechanisms(self):
        return [Mechanism("M-01", "Monsoon", "desc", "medium", "draft", (Expectation(1, "e", "o", "consistent"),), ("E-008",), ())]

    def evidence_ids(self):
        return {"E-005", "E-008"}


class FakeCases:
    def case_studies(self, region):
        return [CaseStudy("2024-09-02_01495A", "storm", "east", {"updraft_max_ms": 8.3})]


class FakeInterventions:
    def all(self):
        return [Intervention("mulching", "Mulching", "p", "e", "m", "ev", ("x",), ("u",))]


class FakeBuild:
    def latest(self): return {"built_at": "2026-11-15T00:00:00+00:00", "git_commit": "test"}


class FakeReferences:
    def references(self): return [{"code": "imerg"}]


class InMemoryInvestigations:
    def __init__(self):
        self.items, self._n = {}, 0

    def next_id(self):
        self._n += 1
        return f"{self._n:012x}"

    def save(self, inv):
        self.items[inv.id] = inv
        return inv

    def get(self, inv_id):
        return self.items.get(inv_id)

    def list(self):
        return [{"id": i} for i in self.items]

    def count(self):
        return len(self.items)

    def purge_older_than(self, iso_timestamp):
        old = [i for i, inv in self.items.items() if (inv.updated_at or inv.created_at) < iso_timestamp]
        for i in old:
            del self.items[i]
        return len(old)


class FixedClock:
    def now(self): return "2026-11-15T00:00:00+00:00"


def adapters(store=None, clock=None):
    from earth_detective.backend.interfaces.http.container import Adapters
    store = store or InMemoryInvestigations()
    return Adapters(FakeCatalogue(), FakeObservations(), None, FakeMechanisms(), FakeCases(), FakeBuild(), FakeReferences(),
                    FakeInterventions(), store, MannKendallTrendAnalyzer(), DetrendedSpearmanAnalyzer(), clock or FixedClock(),
                    housekeeping=store)
