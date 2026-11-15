"""The five layer use cases: Detect, Investigate, Explain, Project, Solve. One class per layer."""
from __future__ import annotations

import logging
from dataclasses import asdict

from ..core import helpers
from ..core.constants import ASSOCIATION_DISCLAIMER, EXTREME_METRICS, RECENT_FROM_YEAR, UNUSUAL_SEASON_SD
from ..core.enums import (DatasetKind, EvidenceCategory, EvidenceStatus, ExpectationStatus, Layer, RainfallMetric,
                          ScenarioKind)
from ..domain import rules
from ..domain.ports import (AssociationAnalyzer, CaseStudyReader, Clock, InterventionCatalogue, InvestigationRepository,
                            MechanismReader, ObservationReader, TrendAnalyzer)
from ..domain.result import AppError, Err, Ok, Result
from .commands import DetectCommand, ExplainCommand, InvestigateCommand, ProjectCommand, SolveCommand
from .services import InvestigationLoader, RegionValidator, SeriesSelector, TrendAssessor, mechanism_view

log = logging.getLogger(__name__)


def _error_entry(region: str, key: str, value: str, err: AppError) -> dict:
    return {"region_id": region, key: value, "reason": err.message, "kind": err.kind.value}


class DetectTrends:
    """Layer 1: trend of each (region, metric) for the investigation's own period, with checks and sensitivity."""

    def __init__(self, loader: InvestigationLoader, regions: RegionValidator, assessor: TrendAssessor, selector: SeriesSelector,
                 observations: ObservationReader, repo: InvestigationRepository, clock: Clock):
        self._loader, self._regions, self._assessor, self._selector = loader, regions, assessor, selector
        self._obs, self._repo, self._clock = observations, repo, clock

    def execute(self, cmd: DetectCommand) -> Result[dict]:
        inv_r = self._loader.load(cmd.investigation_id)
        if not inv_r.is_ok:
            return inv_r
        inv = inv_r.value
        regions = list(cmd.region_ids or [inv.config.region_id])
        reg_r = self._regions.validate(regions)
        if not reg_r.is_ok:
            return reg_r
        extremes = list(EXTREME_METRICS) if cmd.extremes else []
        metrics = list(dict.fromkeys(list(cmd.metrics) + extremes))
        results, skipped = [], []
        for reg in regions:
            for m in metrics:
                if m in extremes and m not in cmd.metrics and not self._selector.candidates(reg, m):
                    continue  # box-only indices are left out silently for sub-regions
                r = self._assessor.assess(reg, m, inv.config.start_year, inv.config.end_year, cmd.dataset, cmd.sensitivity)
                (results.append(r.value) if r.is_ok else skipped.append(_error_entry(reg, "metric", m, r.error)))
        if not results:
            return Err(AppError.not_available("no trend could be computed for this request", skipped=skipped))
        out = {"results": results, "skipped": skipped,
               "recent_conditions": {reg: self._obs.recent_seasons(reg, RainfallMetric.RAIN_TOTAL, RECENT_FROM_YEAR) for reg in regions},
               "handoff": {"regions": regions, "period": [inv.config.start_year, inv.config.end_year], "season": list(inv.config.season),
                           "metrics": metrics, "unusual_seasons": self._unusual(results)}}
        inv.record(Layer.DETECT, out)
        inv.updated_at = self._clock.now()
        self._repo.save(inv)
        log.info("detect completed", extra={"event": "layer.detect", "investigation_id": inv.id, "results": len(results), "skipped": len(skipped)})
        return Ok(out)

    @staticmethod
    def _unusual(results: list[dict]) -> list[dict]:
        out = set()
        for r in (x for x in results if x["metric"] == RainfallMetric.RAIN_TOTAL):
            sd = helpers.rms([p["anomaly"] for p in r["series"]])
            out |= {(r["region_id"], int(p["date"])) for p in r["series"] if abs(p["anomaly"]) > UNUSUAL_SEASON_SD * sd}
        return [{"region_id": a, "year": b} for a, b in sorted(out)]


class InvestigateEvidence:
    """Layer 2: year-to-year association of supporting variables with rainfall, plus EarthCARE case studies."""

    def __init__(self, loader: InvestigationLoader, regions: RegionValidator, selector: SeriesSelector, trend: TrendAnalyzer,
                 association: AssociationAnalyzer, cases: CaseStudyReader, repo: InvestigationRepository, clock: Clock):
        self._loader, self._regions, self._selector, self._trend = loader, regions, selector, trend
        self._assoc, self._cases, self._repo, self._clock = association, cases, repo, clock

    def execute(self, cmd: InvestigateCommand) -> Result[dict]:
        inv_r = self._loader.load(cmd.investigation_id)
        if not inv_r.is_ok:
            return inv_r
        inv = inv_r.value
        regions = list(cmd.region_ids or inv.layers.get("detect", {}).get("handoff", {}).get("regions") or [inv.config.region_id])
        reg_r = self._regions.validate(regions)
        if not reg_r.is_ok:
            return reg_r
        variables = list(cmd.variables or [v for cat in cmd.evidence for v in rules.EVIDENCE_VARIABLES.get(cat, ())])
        comps, skipped = [], []
        for reg in regions:
            for v in variables:
                r = self._compare(reg, v, cmd.compare_to, inv.config.start_year, inv.config.end_year)
                (comps.append(r.value) if r.is_ok else skipped.append(_error_entry(reg, "variable", v, r.error)))
        notes = [f"{ASSOCIATION_DISCLAIMER} Seasonal (JJAS) values: lagged monthly tests are not available in the MVP."]
        if EvidenceCategory.VEGETATION in cmd.evidence:
            notes.insert(0, "Vegetation (MODIS NDVI) is not in the warehouse yet (decision D-011, task T-22).")
        want_cases = EvidenceCategory.STORM_STRUCTURE in cmd.evidence or not cmd.variables
        out = {"comparisons": comps, "skipped": skipped,
               "case_studies": [self._case_view(c) for reg in regions for c in self._cases.case_studies(reg)] if want_cases else [],
               "notes": notes,
               "handoff": {"regions": regions, "compare_to": cmd.compare_to,
                           "supporting": [c["variable"] for c in comps if c["status"] == EvidenceStatus.SUPPORTING],
                           "contrasting": [c["variable"] for c in comps if c["status"] == EvidenceStatus.CONTRASTING]}}
        inv.record(Layer.INVESTIGATE, out)
        inv.updated_at = self._clock.now()
        self._repo.save(inv)
        log.info("investigate completed", extra={"event": "layer.investigate", "investigation_id": inv.id, "comparisons": len(comps)})
        return Ok(out)

    def _compare(self, region: str, variable: str, compare_to: str, y0: int, y1: int) -> Result[dict]:
        x_r = self._selector.select(region, variable, "auto", y0, y1)
        if not x_r.is_ok:
            return x_r
        y_r = self._selector.select(region, compare_to, "auto", y0, y1)
        if not y_r.is_ok:
            return y_r
        x, y = x_r.value, y_r.value
        a = self._assoc.detrended(x.as_dict(), y.as_dict())
        exp = rules.expected_sign(variable, compare_to)
        t = self._trend.analyze(x.as_dict(), full=False)
        mean = t.mean
        return Ok({"region_id": region, "variable": variable, "label": x.variable.label, "unit": x.variable.unit, "dataset": x.dataset.code,
                   "rainfall_metric": compare_to, "comparison_period": [a.year_start, a.year_end], "relationship": a.method,
                   "statistic": a.statistic, "p_value": a.p_value, "expected_sign": exp,
                   "status": rules.evidence_status(a.statistic, a.p_value, exp),
                   "mechanism_id": rules.MECHANISM_FOR_VARIABLE.get(variable),
                   "variable_trend": {"per_decade": 10 * t.sen_slope, "pct_per_decade": t.slope_pct_per_decade, "p_value": t.mk_p},
                   "records": [{"year": p.year, "value": p.value, "anomaly": p.value - mean} for p in x.points],
                   "quality": "reanalysis" if x.dataset.kind == DatasetKind.REANALYSIS else "observation"})

    @staticmethod
    def _case_view(c) -> dict:
        date, orbit = c.case_id.split("_")
        return {"case_id": c.case_id, "type": c.case_type, "region": c.region, "metrics": c.metrics,
                "figure": f"outputs/earthcare/cross_section_{date}_{orbit.lstrip('0')}.png",
                "note": "EarthCARE (ESA-JAXA) case study: present-day process illustration, never a trend"}


class ExplainMechanism:
    """Layer 3: store a researcher-confirmed mechanism assessment (AI drafts are never stored without a reviewer)."""

    STATUSES = set(ExpectationStatus)

    def __init__(self, loader: InvestigationLoader, mechanisms: MechanismReader, repo: InvestigationRepository, clock: Clock):
        self._loader, self._mech, self._repo, self._clock = loader, mechanisms, repo, clock

    def execute(self, cmd: ExplainCommand) -> Result[dict]:
        inv_r = self._loader.load(cmd.investigation_id)
        if not inv_r.is_ok:
            return inv_r
        inv = inv_r.value
        if not cmd.reviewer.strip():
            return Err(AppError.validation("a reviewer is required to confirm an assessment"))
        mech = next((m for m in self._mech.mechanisms() if m.mechanism_id == cmd.mechanism_id), None)
        if mech is None:
            return Err(AppError.not_found(f"mechanism '{cmd.mechanism_id}' not found"))
        known = self._mech.evidence_ids()
        bad = [i for ids in (cmd.supporting_evidence_ids or (), cmd.contradicting_evidence_ids or ()) for i in ids if i not in known]
        if bad:
            return Err(AppError.validation(f"unknown evidence id(s) {bad}", unknown=bad))
        bad_status = {k: v for k, v in cmd.status_overrides.items() if v not in self.STATUSES}
        if bad_status:
            return Err(AppError.validation(f"invalid status override(s) {bad_status}"))
        view = mechanism_view(mech)
        exps = [{**e, "status": cmd.status_overrides.get(e["expectation_no"], e["status"])} for e in view["expected_observations"]]
        record = {"mechanism_id": mech.mechanism_id, "mechanism_name": mech.name, "scientific_description": mech.description,
                  "expected_observations": exps,
                  "supporting_evidence_ids": list(cmd.supporting_evidence_ids or mech.supporting_evidence_ids),
                  "contradictory_evidence_ids": list(cmd.contradicting_evidence_ids or mech.contradicting_evidence_ids),
                  "alternative_explanations": list(cmd.alternatives or ()),
                  "researcher_interpretation": cmd.interpretation or mech.interpretation,
                  "confidence": cmd.confidence or mech.confidence, "reviewed_by": cmd.reviewer, "reviewed_at": self._clock.now(),
                  "limitations": [], "references": []}
        inv.record_assessment(mech.mechanism_id, record)
        inv.updated_at = self._clock.now()
        self._repo.save(inv)
        log.info("mechanism assessed", extra={"event": "layer.explain", "investigation_id": inv.id, "mechanism_id": mech.mechanism_id,
                                              "confidence": record["confidence"]})
        return Ok(record)


class ProjectScenarios:
    """Layer 4: trend-continuation scenarios (never forecasts)."""

    KINDS = set(ScenarioKind)

    def __init__(self, loader: InvestigationLoader, regions: RegionValidator, assessor: TrendAssessor, repo: InvestigationRepository,
                 clock: Clock):
        self._loader, self._regions, self._assessor, self._repo, self._clock = loader, regions, assessor, repo, clock

    def execute(self, cmd: ProjectCommand) -> Result[dict]:
        inv_r = self._loader.load(cmd.investigation_id)
        if not inv_r.is_ok:
            return inv_r
        inv = inv_r.value
        region = cmd.region_id or inv.config.region_id
        reg_r = self._regions.validate([region])
        if not reg_r.is_ok:
            return reg_r
        bad = [k for k in cmd.scenarios if k not in self.KINDS]
        if bad or cmd.end_year <= cmd.start_year:
            return Err(AppError.validation(f"invalid scenario request (unknown {bad} or end_year <= start_year)"))
        tr = self._assessor.assess(region, cmd.metric, cmd.baseline_period[0], cmd.baseline_period[1], sensitivity=False)
        if not tr.is_ok:
            return tr
        t = tr.value
        x0 = helpers.mean([p["value"] for p in t["series"]])
        beta = t["sen_slope"]
        years = range(cmd.start_year, cmd.end_year + 1)
        proj = {k: [{"year": y, "value": rules.scenario_value(k, x0, beta, cmd.stress_per_year, cmd.start_year, y)} for y in years]
                for k in cmd.scenarios}
        end = {k: v[-1]["value"] for k, v in proj.items()}
        ref = end.get(ScenarioKind.STABILIZATION, x0)
        out = {"region_id": region, "metric": cmd.metric, "unit": t["unit"], "baseline_period": list(cmd.baseline_period),
               "baseline_value": x0, "assumed_slope": beta, "slope_unit": t["slope_unit"], "stress_per_year": cmd.stress_per_year,
               "projection": proj, "difference_at_end": {k: v - ref for k, v in end.items()},
               "pct_difference_at_end": {k: 100 * (v / ref - 1) for k, v in end.items()}, "trend_p_value": t["p_value"],
               "warnings": rules.scenario_warnings(t["significant"], t["p_value"]),
               "formulas": {k: rules.SCENARIO_FORMULAS[k] for k in cmd.scenarios}, "assumptions": cmd.assumptions}
        inv.record(Layer.PROJECT, out)
        inv.updated_at = self._clock.now()
        self._repo.save(inv)
        log.info("scenarios projected", extra={"event": "layer.project", "investigation_id": inv.id, "region": region, "metric": cmd.metric})
        return Ok(out)


class CompareInterventions:
    """Layer 5 (MVP): qualitative comparison; numeric water balance refused without sourced parameters."""

    def __init__(self, loader: InvestigationLoader, interventions: InterventionCatalogue, repo: InvestigationRepository, clock: Clock):
        self._loader, self._catalogue, self._repo, self._clock = loader, interventions, repo, clock

    def execute(self, cmd: SolveCommand) -> Result[dict]:
        inv_r = self._loader.load(cmd.investigation_id)
        if not inv_r.is_ok:
            return inv_r
        inv = inv_r.value
        if cmd.numeric:
            return Err(AppError.not_available("Numeric water balance not available: every parameter needs a published source.",
                                              missing_parameters=list(rules.NUMERIC_WATER_BALANCE_PARAMETERS)))
        known = {i.id: i for i in self._catalogue.all()}
        bad = [i for i in cmd.interventions if i not in known]
        if bad:
            return Err(AppError.validation(f"unknown intervention(s) {bad}", available=sorted(known)))
        out = {"mode": "qualitative", "comparison": [asdict(known[i]) for i in cmd.interventions],
               "note": "Qualitative comparison (layer contracts, Layer 5 output 3): no intervention effect is quantified without a published parameter."}
        inv.record(Layer.SOLVE, out)
        inv.updated_at = self._clock.now()
        self._repo.save(inv)
        log.info("interventions compared", extra={"event": "layer.solve", "investigation_id": inv.id, "count": len(cmd.interventions)})
        return Ok(out)
