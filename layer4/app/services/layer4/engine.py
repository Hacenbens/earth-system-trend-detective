"""Layer 4 - PROJECT engine. Pure functions: investigation + series in, ProjectSection out.

Rules (pipeline doc, section 5, and the API contract):
  * beta and the baseline period come from Layer 1. Layer 4 never recomputes the trend.
  * Every output repeats "Scenario, not a forecast." and, when Layer 1 found no
    significant trend, says so with its p-value.
  * Impact indicators are calculated indicators or qualitative pathways, never
    measured impacts. Missing data -> the indicator says "not_available" and why.

Data files (written by the data scripts, git-ignored):
  data/prepared/<INV>/prcptot_jjas.csv   year,prcptot   Layer 1's JJAS rainfall per year
  data/prepared/<INV>/E-104.csv          year,ndvi_sum_jul_oct   from scripts/fetch_ndvi.py

How to say it: "We don't predict the future. We take the rainfall trend Layer 1 measured
and ask: if nothing changes, if the trend continues, or if things get harder, what would
the rain be in 2035, and how green would the Sahel be with that rain?"
"""
from __future__ import annotations

import csv
from pathlib import Path

from app.schemas.common import Provenance
from app.schemas.investigation import Investigation
from app.schemas.project import (
    INDICATOR_LABEL,
    SCENARIO_IDS,
    Baseline,
    ComparisonRow,
    ImpactIndicator,
    IndicatorValue,
    Layer4Input,
    Layer5Handoff,
    ProjectRequest,
    ProjectSection,
    RegressionFit,
    Restrend,
    ScenarioPoint,
    SeriesPoint,
    TrendUsed,
)
from app.services.stats import linear_fit, mann_kendall_sen

RAIN_FILE = "prcptot_jjas.csv"
NDVI_FILE = "E-104.csv"
MIN_FIT_YEARS = 8


class Layer4InputMissing(Exception):
    """Layer 1 has not produced what Layer 4 needs (-> 409)."""


class Layer4Unprocessable(Exception):
    """The request cannot be computed with the data available (-> 422)."""

    def __init__(self, missing: list[str]):
        super().__init__("; ".join(missing))
        self.missing = missing


# ------------------------------------------------------------------ inputs

def read_series(path: Path, columns: tuple[str, ...]) -> dict[int, float]:
    """year -> value from a CSV; the first column name found in `columns` is used."""
    if not path.exists():
        return {}
    out: dict[int, float] = {}
    with path.open(newline="") as fh:
        for row in csv.DictReader(fh):
            keys = {k.lower().strip(): (v or "").strip() for k, v in row.items() if k}
            val = next((keys[c] for c in columns if keys.get(c)), None)
            if keys.get("year") and val is not None:
                out[int(keys["year"])] = float(val)
    return dict(sorted(out.items()))


def load_rain(prepared: Path) -> dict[int, float]:
    return read_series(prepared / RAIN_FILE, ("prcptot", "value", "rain"))


def load_ndvi(prepared: Path) -> dict[int, float]:
    return read_series(prepared / NDVI_FILE, ("ndvi_sum_jul_oct", "ndvi", "value"))


def layer1_trend(inv: Investigation, metric: str):
    if inv.detect is None or inv.detect.status != "done":
        raise Layer4InputMissing("Layer 1 (detect) has not finished for this investigation")
    result = next((r for r in inv.detect.results if r.metric == metric), None)
    if result is None:
        raise Layer4InputMissing(f"Layer 1 has no result for metric {metric}")
    trend = TrendUsed(
        metric=result.metric,
        evidence_id=result.evidence_id,
        sen_slope=result.sen_slope,
        slope_ci95=tuple(result.slope_ci95) if result.slope_ci95 else None,
        slope_unit=result.slope_unit,
        p_value=result.p_value,
        significant=result.significant,
    )
    period = tuple(inv.detect.handoff.period) if inv.detect.handoff else (inv.config.start_year, inv.config.end_year)
    return trend, period, result.unit


def disclaimer(trend: TrendUsed) -> str:
    text = "Scenario, not a forecast."
    if not trend.significant:
        text += f" The historical trend is not significant (p = {trend.p_value:.2f})."
    return text


def make_baseline(req: ProjectRequest, rain: dict[int, float], period, unit: str) -> Baseline:
    bp = tuple(req.baseline_period or period)
    if req.baseline_value is not None:
        return Baseline(value=req.baseline_value, unit=unit, period=bp, source="request")
    vals = [v for y, v in rain.items() if bp[0] <= y <= bp[1]]
    if not vals:
        raise Layer4Unprocessable([
            f"baseline: no rainfall series for {bp[0]}-{bp[1]}. Add {RAIN_FILE} "
            "(columns year,prcptot) from Layer 1, or send baseline_value in the request"
        ])
    return Baseline(value=round(sum(vals) / len(vals), 3), unit=unit, period=bp,
                    source="rainfall_series", n=len(vals))


# ------------------------------------------------------------------ Output 1 + 2

def stress_at(req: ProjectRequest, t: int) -> float:
    s = req.stress
    if s is None:
        return 0.0
    return s.delta_per_year * (t - req.start_year) if s.type == "linear" else s.delta


def scenario_points(req: ProjectRequest, base: Baseline, trend: TrendUsed, unit: str) -> list[ScenarioPoint]:
    x0, beta, t0 = base.value, trend.sen_slope, req.start_year
    ci = trend.slope_ci95
    pts = []
    for name in req.scenarios:
        for t in range(req.start_year, req.end_year + 1):
            if name == "stabilization":
                slope, delta, value, lo, hi = 0.0, None, x0, None, None
            else:
                slope = beta
                delta = stress_at(req, t) if name == "increased_stress" else None
                d = delta or 0.0
                value = x0 + beta * (t - t0) + d
                lo = x0 + ci[0] * (t - t0) + d if ci else None
                hi = x0 + ci[1] * (t - t0) + d if ci else None
            pts.append(ScenarioPoint(
                scenario_id=SCENARIO_IDS[name], scenario_name=name, variable=trend.metric, year=t,
                projected_value=round(value, 3), unit=unit, baseline_value=x0, assumed_slope=slope,
                stress_perturbation=None if delta is None else round(delta, 3),
                low=None if lo is None else round(lo, 3), high=None if hi is None else round(hi, 3),
            ))
    return pts


def comparison(points: list[ScenarioPoint]) -> list[ComparisonRow]:
    by_year: dict[int, dict[str, float]] = {}
    for p in points:
        by_year.setdefault(p.year, {})[p.scenario_name] = p.projected_value
    rows = []
    for year, values in sorted(by_year.items()):
        ref = values.get("stabilization")
        diff = {k: round(v - ref, 3) for k, v in values.items()} if ref is not None else {}
        pct = {k: (round(100 * d / ref, 2) if ref else None) for k, d in diff.items()}
        rows.append(ComparisonRow(year=year, values=values, diff_vs_stabilization=diff, pct_vs_stabilization=pct))
    return rows


# ------------------------------------------------------------------ Output 3

def rainfall_indicator(points: list[ScenarioPoint], base: Baseline) -> ImpactIndicator:
    vals = [IndicatorValue(scenario_name=p.scenario_name, year=p.year,
                           value=round(100 * p.projected_value / base.value, 2))
            for p in points] if base.value else []
    return ImpactIndicator(
        indicator_id="IND-RAIN", name="Season rainfall relative to the baseline", kind="calculated",
        status="available" if vals else "not_available", unit="% of baseline",
        method="100 x scenario value / X0", values=vals,
        reason=None if vals else "baseline is zero",
    )


def ndvi_indicator(points: list[ScenarioPoint], rain: dict[int, float], ndvi: dict[int, float]) -> ImpactIndicator:
    common = sorted(set(rain) & set(ndvi))
    base = dict(indicator_id="IND-NDVI", name="Vegetation greenness implied by the rainfall (Jul-Oct NDVI)",
                kind="calculated", unit="NDVI-months",
                method="Linear regression of NDVI (E-104) on JJAS rainfall over the years in both series, "
                       "then NDVI = intercept + slope x scenario rainfall; RESTREND on the residuals "
                       "(it cannot separate a non-rain driver that rises or falls together with the rain)")
    if len(common) < MIN_FIT_YEARS:
        need = []
        if not rain:
            need.append(f"rainfall series ({RAIN_FILE})")
        if not ndvi:
            need.append(f"NDVI series ({NDVI_FILE}, from scripts/fetch_ndvi.py)")
        why = (f"needs {' and '.join(need)}" if need
               else f"only {len(common)} years in both series; {MIN_FIT_YEARS} needed")
        return ImpactIndicator(**base, status="not_available", reason=why)

    xs = [rain[y] for y in common]
    ys = [ndvi[y] for y in common]
    f = linear_fit(xs, ys)
    fit = RegressionFit(
        slope=round(f["slope"], 6), slope_ci95=(round(f["slope_ci95"][0], 6), round(f["slope_ci95"][1], 6)),
        intercept=round(f["intercept"], 5), r2=round(f["r2"], 3), p_value=round(f["p_value"], 4),
        significant=f["p_value"] < 0.05, n=len(common), years=(common[0], common[-1]),
        rain_range=(min(xs), max(xs)),
    )
    lo, hi = fit.rain_range
    values = [IndicatorValue(scenario_name=p.scenario_name, year=p.year,
                             value=round(f["intercept"] + f["slope"] * p.projected_value, 4),
                             extrapolated=not lo <= p.projected_value <= hi)
              for p in points]

    resid = [ys[i] - (f["intercept"] + f["slope"] * xs[i]) for i in range(len(common))]
    mk = mann_kendall_sen(common, resid)
    sig = mk["p_value"] < 0.05
    if sig and mk["sen_slope"] > 0:
        reading = "Greener than the rain alone explains: possible non-rain drivers (land use, regrowth, CO2)"
    elif sig:
        reading = "Less green than the rain alone explains: possible land degradation"
    else:
        reading = "No change beyond what the rain explains"
    notes = []
    if not fit.significant:
        notes.append(f"The rain-greenness relation is not significant (p = {fit.p_value:.2f}): "
                     "treat these values as illustrative")
    if any(v.extrapolated for v in values):
        notes.append(f"Some scenario rainfall is outside the fitted range ({lo:g}-{hi:g}): those values are "
                     "extrapolated (extrapolated = true)")
    gaps = [y for y in range(common[0], common[-1] + 1) if y not in common]
    if gaps:
        notes.append(f"Fitted on {len(common)} years with gaps ({len(gaps)} missing years)")
    return ImpactIndicator(**base, status="available", values=values, fit=fit,
                           restrend=Restrend(sen_slope=round(mk["sen_slope"], 6), p_value=round(mk["p_value"], 4),
                                             significant=sig, reading=reading),
                           reason="; ".join(notes) or None)


def water_pathway(points: list[ScenarioPoint], base: Baseline, end_year: int) -> ImpactIndicator:
    end = {p.scenario_name: p.projected_value for p in points if p.year == end_year}
    parts = [f"{n.replace('_', ' ')}: {100 * v / base.value:.0f}% of baseline rain in {end_year}"
             for n, v in end.items()] if base.value else []
    return ImpactIndicator(
        indicator_id="IND-WATER", name="Potential water-stress pathway", kind="qualitative", status="available",
        label="Qualitative pathway, not a measured impact",
        method="Rainfall -> soil water -> water available to crops and pasture (direction only)",
        text=("Less season rain means less water stored in the soil and a higher risk of crop and pasture "
              "stress; more rain lowers that risk. " + "; ".join(parts) + ". Quantified in Layer 5 "
              "(soil-water balance) only when its parameters have a source."),
    )


def dry_spell_indicator() -> ImpactIndicator:
    return ImpactIndicator(
        indicator_id="IND-DRYSPELL", name="Dry-spell exposure", kind="calculated", status="not_available",
        method="Needs a daily rainfall model", reason="The contract allows it only with a suitable "
        "daily-data model; scenarios here are seasonal totals",
    )


# ------------------------------------------------------------------ assembly

def build_section(inv: Investigation, req: ProjectRequest, rain: dict[int, float],
                  ndvi: dict[int, float]) -> ProjectSection:
    trend, period, unit = layer1_trend(inv, req.metric)
    base = make_baseline(req, rain, period, unit)
    points = scenario_points(req, base, trend, unit)
    indicators = [rainfall_indicator(points, base), ndvi_indicator(points, rain, ndvi),
                  water_pathway(points, base, req.end_year), dry_spell_indicator()]

    assumptions = [req.assumptions,
                   f"X0 = {base.value:g} {unit}: mean of {base.period[0]}-{base.period[1]}"
                   + (" (given by the researcher)" if base.source == "request" else f" ({base.n} years)"),
                   f"beta = {trend.sen_slope:g} {trend.slope_unit}: Sen's slope from Layer 1"
                   + (f" ({trend.evidence_id})" if trend.evidence_id else ""),
                   f"t0 = {req.start_year}: the scenarios start from X0 in that year"]
    if req.stress:
        s = req.stress
        assumptions.append(f"delta(t) = {s.delta_per_year:g} {s.unit} x (t - t0)" if s.type == "linear"
                           else f"delta(t) = {s.delta:g} {s.unit} every year")

    limitations = ["Straight-line extension of a historical trend; no climate-model physics"]
    if trend.slope_ci95 and trend.slope_ci95[0] < 0 < trend.slope_ci95[1]:
        limitations.append(f"Layer 1's 95% slope interval ({trend.slope_ci95[0]:g} to {trend.slope_ci95[1]:g} "
                           f"{trend.slope_unit}) includes zero: the trend could be flat or reversed "
                           "(see low/high)")
    if base.source == "request":
        limitations.append("Baseline value given by the researcher, not computed from data")
    prov = inv.detect.provenance if inv.detect else None
    if prov:
        limitations += prov.limitations

    end_vals = {p.scenario_name: p.projected_value for p in points if p.year == req.end_year}
    return ProjectSection(
        request=req, disclaimer=disclaimer(trend), baseline=base, trend=trend, scenarios=points,
        comparison=comparison(points), indicators=indicators, assumptions=assumptions,
        limitations=limitations,
        handoff=Layer5Handoff(baseline=base, period=(req.start_year, req.end_year), end_year_values=end_vals,
                              assumptions=assumptions, indicator_ids=[i.indicator_id for i in indicators
                                                                      if i.status == "available"]),
        provenance=Provenance(
            dataset=prov.dataset if prov else "Layer 1 result", version=prov.version if prov else None,
            agency=prov.agency if prov else None, product=prov.product if prov else None,
            variable=trend.metric, units=unit, box=prov.box if prov else None,
            period=[str(req.start_year), str(req.end_year)], season=prov.season if prov else None,
            method="Contract scenario formulas X0, X0 + beta(t - t0), X0 + beta(t - t0) + delta(t); "
                   "beta from Layer 1",
            limitations=limitations[:2],
        ),
    )


def layer4_input(inv: Investigation, rain: dict[int, float], ndvi: dict[int, float]) -> Layer4Input:
    trend, period, unit = layer1_trend(inv, "PRCPTOT")
    vals = [v for y, v in rain.items() if period[0] <= y <= period[1]]
    return Layer4Input(
        trend=trend, layer1_period=period,
        rainfall_series_available=bool(rain),
        rainfall_series_years=(min(rain), max(rain)) if rain else None,
        baseline_from_series=round(sum(vals) / len(vals), 3) if vals else None,
        ndvi_available=bool(ndvi), ndvi_years=(min(ndvi), max(ndvi)) if ndvi else None,
        ndvi_n=len(ndvi) or None,
        default_request=ProjectRequest(
            stress={"type": "linear", "delta_per_year": -2.0, "unit": trend.slope_unit},
        ),
        rainfall_series=[SeriesPoint(year=y, value=round(v, 3)) for y, v in rain.items()],
        ndvi_series=[SeriesPoint(year=y, value=round(v, 4)) for y, v in ndvi.items()],
    )
