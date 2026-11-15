"""Application services shared by several use cases (each with one responsibility)."""
from __future__ import annotations

import logging
from dataclasses import asdict, dataclass

from ..core.constants import ALPHA, MIN_SEASONS, SEASON_MONTHS, SENSITIVITY_SPAN
from ..core.enums import DatasetKind, ExpectationStatus, QualityFlag
from ..domain import rules
from ..domain.models import Dataset, DatasetAvailability, Investigation, Mechanism, Region, SeasonPoint, Variable
from ..domain.ports import CatalogueReader, InvestigationRepository, ObservationReader, TrendAnalyzer
from ..domain.result import AppError, Err, Ok, Result

log = logging.getLogger(__name__)


class RegionValidator:
    """Checks that requested regions are among the presets (the MVP has no live custom boxes)."""

    def __init__(self, catalogue: CatalogueReader):
        self._catalogue = catalogue

    def validate(self, codes: list[str]) -> Result[list[Region]]:
        found = {r.code: r for r in self._catalogue.regions()}
        bad = [c for c in codes if c not in found]
        if bad:
            return Err(AppError.validation(
                f"unknown region(s) {bad}. Available presets: {sorted(found)}; a custom box needs a live NASA fetch (not available yet).",
                unknown=bad, available=sorted(found)))
        return Ok([found[c] for c in codes])


class InvestigationLoader:
    def __init__(self, repo: InvestigationRepository):
        self._repo = repo

    def load(self, investigation_id: str) -> Result[Investigation]:
        inv = self._repo.get(investigation_id)
        return Ok(inv) if inv else Err(AppError.not_found(f"investigation '{investigation_id}' not found", id=investigation_id))


@dataclass(frozen=True)
class SelectedSeries:
    dataset: Dataset
    variable: Variable
    points: list[SeasonPoint]

    def as_dict(self) -> dict[int, float]:
        return {p.year: p.value for p in self.points}


class SeriesSelector:
    """Chooses the dataset for (region, variable) with a ranking policy (open/closed) and loads its seasons."""

    def __init__(self, catalogue: CatalogueReader, observations: ObservationReader,
                 policy: rules.DatasetRankingPolicy = rules.RoleThenCoveragePolicy()):
        self._catalogue, self._obs, self._policy = catalogue, observations, policy

    def candidates(self, region: str, variable: str) -> list[DatasetAvailability]:
        return self._policy.rank(self._obs.availability(region, variable))

    def select(self, region: str, variable: str, requested: str, year_start: int, year_end: int,
               min_seasons: int = MIN_SEASONS) -> Result[SelectedSeries]:
        var = self._catalogue.variable(variable)
        if var is None:
            return Err(AppError.not_found(f"unknown variable '{variable}'", variable=variable))
        available = self._obs.availability(region, variable)
        if requested != "auto":
            chosen = next((a for a in available if a.dataset.code == requested), None)
            if chosen is None:
                return Err(AppError.not_available(f"dataset '{requested}' has no season values for {variable} in {region}",
                                                  available=[a.dataset.code for a in available]))
        else:
            ranked = self._policy.rank(available)
            if not ranked:
                return Err(AppError.not_available(f"no trend-quality dataset for {variable} in {region}", region=region, variable=variable))
            chosen = ranked[0]
        points = self._obs.season_series(region, variable, chosen.dataset.code, year_start, year_end)
        if len(points) < min_seasons:
            return Err(AppError.validation(f"only {len(points)} seasons of {variable} in {region} for {year_start}-{year_end}: "
                                           f"at least {min_seasons} are needed", seasons=len(points)))
        return Ok(SelectedSeries(chosen.dataset, var, points))


class TrendAssessor:
    """Turns one seasonal series into a Layer 1 trend result (statistics + verdict + provenance)."""

    def __init__(self, catalogue: CatalogueReader, selector: SeriesSelector, analyzer: TrendAnalyzer):
        self._catalogue, self._selector, self._analyzer = catalogue, selector, analyzer

    def assess(self, region: str, metric: str, year_start: int, year_end: int, dataset: str = "auto",
               sensitivity: bool = True) -> Result[dict]:
        sel = self._selector.select(region, metric, dataset, year_start, year_end)
        if not sel.is_ok:
            return sel
        s: SelectedSeries = sel.value
        series = s.as_dict()
        st = self._analyzer.analyze(series)
        verdict = rules.judge_trend(st)
        notes = sorted({p.note for p in s.points if p.note})
        if s.dataset.kind == DatasetKind.REANALYSIS:
            notes.append("Reanalysis (model constrained by observations), not a direct measurement")
        out = {
            "region_id": region, "metric": metric, "label": s.variable.label, "unit": s.variable.unit, "dataset": s.dataset.code,
            "direction": verdict.direction, "direction_hint": verdict.hint, "wording": verdict.wording,
            "sen_slope": st.sen_slope, "slope_unit": f"{s.variable.unit}/yr", "slope_ci95": [st.slope_ci_low, st.slope_ci_high],
            "pct_per_decade": st.slope_pct_per_decade, "mk_s": st.mk_s, "mk_tau": st.mk_tau, "p_value": st.mk_p,
            "significant": verdict.significant, "alpha": ALPHA,
            "autocorrelation": {"lag1": st.lag1_autocorr, "mk_hamed_rao_p": st.mk_hamed_rao_p, "mk_yue_wang_p": st.mk_yue_wang_p,
                                "method": "Original Mann-Kendall reported; Hamed-Rao (variance floored at 1) and Yue-Wang pre-whitening as checks"},
            "cross_checks": {"ols_slope": st.ols_slope, "ols_p": st.ols_p, "ar1_slope": st.ar1_slope, "ar1_p": st.ar1_p,
                             "ar1_note": "AR(1) p is anti-conservative when the AR coefficient is negative and not significant"
                             if (st.ar1_phi or 0) < 0 else None},
            "n": st.n, "period": [st.start, st.end], "evidence_ids": rules.evidence_ids_for(region, metric),
            "quality": {"suspect_seasons": sum(p.quality_flag == QualityFlag.SUSPECT for p in s.points), "notes": notes},
            "series": [{"date": str(p.year), "value": p.value, "anomaly": p.value - st.mean, "missing": False, "quality_flag": p.quality_flag}
                       for p in s.points],
            "provenance": self._provenance(region, s, st, notes),
        }
        check = self._independent_check(region, metric, s, year_start, year_end, st)
        if check:
            out["independent_check"] = check
        if sensitivity:
            out["start_year_sensitivity"] = self._sensitivity(series, st)
        return Ok(out)

    def _provenance(self, region: str, s: SelectedSeries, st, notes) -> dict:
        r = self._catalogue.region(region)
        return {"dataset": s.dataset.name, "dataset_code": s.dataset.code, "version": s.dataset.version, "agency": s.dataset.agency,
                "kind": s.dataset.kind, "variable": s.variable.code, "units": s.variable.unit,
                "box": {"lat": [r.lat_min, r.lat_max], "lon": [r.lon_min, r.lon_max]}, "period": [st.start, st.end],
                "season": list(SEASON_MONTHS), "method": "Mann-Kendall + Sen's slope (src/earth_detective/trend.py)", "limitations": notes}

    def _independent_check(self, region, metric, s: SelectedSeries, y0, y1, st) -> dict | None:
        others = [c for c in self._selector.candidates(region, metric) if c.dataset.code != s.dataset.code]
        if not others:
            return None
        alt = self._selector.select(region, metric, others[0].dataset.code, y0, y1)
        if not alt.is_ok:
            return None
        ta = self._analyzer.analyze(alt.value.as_dict())
        return {"dataset": others[0].dataset.code, "pct_per_decade": ta.slope_pct_per_decade, "p_value": ta.mk_p,
                "agrees_in_sign": (ta.sen_slope > 0) == (st.sen_slope > 0)}

    def _sensitivity(self, series: dict[int, float], st) -> list[dict]:
        out = []
        for start in range(st.start, st.start + SENSITIVITY_SPAN + 1):
            sub = {y: v for y, v in series.items() if y >= start}
            if len(sub) < MIN_SEASONS:
                break
            t = self._analyzer.analyze(sub)
            out.append({"start": start, "pct_per_decade": t.slope_pct_per_decade, "p_value": t.mk_p})
        return out


def mechanism_view(m: Mechanism) -> dict:
    """Presentation of a mechanism card (shared by the catalogue query and the explain use case)."""
    exps = [asdict(e) for e in m.expectations]
    for e in exps:
        e["expectation_no"] = e.pop("no")
    counts = {s.value: sum(e["status"] == s for e in exps) for s in ExpectationStatus}
    return {"mechanism_id": m.mechanism_id, "name": m.name, "description": m.description, "confidence": m.confidence,
            "interpretation": m.interpretation, "interpretation_status": "DRAFT, to be confirmed by the science lead",
            "counts": counts, "expected_observations": exps,
            "supporting_evidence_ids": list(m.supporting_evidence_ids), "contradicting_evidence_ids": list(m.contradicting_evidence_ids)}
