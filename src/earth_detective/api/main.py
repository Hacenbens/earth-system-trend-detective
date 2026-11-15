"""Earth System Trend Detective: FastAPI application (contract: docs/app/api_contract.md, data: docs/app/data_model.md).

Drafted with AI assistance (Claude Code). See docs/submission/si_usage.md.
Run: make api   ->  http://127.0.0.1:8000/docs (interactive documentation)
"""
import csv
import io
import json

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse

from . import services as S
from . import store
from .db import one, rows
from .schemas import DetectRequest, ExplainRequest, InvestigateRequest, InvestigationCreate, ProjectRequest, SolveRequest

app = FastAPI(title="Earth System Trend Detective API", version="0.1.0",
              description="Detect -> Investigate -> Explain -> Project -> Solve. NASA Space Apps 2026. "
                          "Every response carries provenance; associations are not causes; scenarios are not forecasts.")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["GET", "POST"], allow_headers=["*"])
V1 = "/api/v1"


def _err(e: Exception, code: int = 404):
    raise HTTPException(status_code=code, detail=str(e))


def _inv(inv_id: str) -> dict:
    try:
        return store.load(inv_id)
    except KeyError:
        raise HTTPException(404, f"investigation '{inv_id}' not found")


def _regions(inv: dict, ids: list[str] | None) -> list[str]:
    codes = ids or [inv["config"]["region_id"]]
    try:
        S.check_regions(codes)
    except S.NotFound as e:
        raise HTTPException(422, str(e))
    return codes


# ------------------------------------------------------------------ meta / catalogue
@app.get("/health")
def health():
    b = one("SELECT built_at, git_commit FROM meta_build ORDER BY built_at DESC LIMIT 1")
    return {"status": "ok", "warehouse_built_at": b and b["built_at"], "warehouse_git_commit": b and b["git_commit"]}


@app.get(f"{V1}/meta/build")
def build_info():
    b = one("SELECT * FROM meta_build ORDER BY built_at DESC LIMIT 1")
    return {**b, "inputs": json.loads(b["inputs"]), "row_counts": json.loads(b["row_counts"])}


@app.get(f"{V1}/regions")
def get_regions():
    feats = [{"type": "Feature", "geometry": json.loads(r.pop("geojson")), "properties": {"id": r["code"], **r}} for r in S.regions()]
    return {"type": "FeatureCollection", "features": feats}


@app.get(f"{V1}/datasets")
def get_datasets():
    return rows("""SELECT d.*, (SELECT COUNT(*) FROM fact_observation o WHERE o.dataset_key = d.dataset_key) AS observations,
                   (SELECT GROUP_CONCAT(DISTINCT v.code) FROM fact_observation o JOIN dim_variable v USING (variable_key)
                    WHERE o.dataset_key = d.dataset_key) AS variables FROM dim_dataset d ORDER BY dataset_key""")


@app.get(f"{V1}/variables")
def get_variables():
    return rows("SELECT code, label, unit, category, aggregation, description FROM dim_variable ORDER BY variable_key")


@app.get(f"{V1}/series")
def get_series(region: str = "sahel", variable: str = "rain_total", dataset: str = "auto", grain: str = Query("season", pattern="^(season|month)$")):
    """Stateless time series for charts."""
    try:
        S.check_regions([region]); S.variable(variable)
        ds = S.pick_dataset(region, variable, dataset) if dataset == "auto" else S.dataset(dataset)
    except S.NotFound as e:
        _err(e, 422)
    data = rows("""SELECT year, month, value, quality_flag, note FROM v_observation
                   WHERE region = ? AND variable = ? AND dataset = ? AND grain = ? ORDER BY year, month""", (region, variable, ds["code"], grain))
    return {"region": region, "variable": variable, "dataset": ds["code"], "grain": grain, "points": data}


@app.get(f"{V1}/trends")
def get_trends(variable: str | None = None, region: str | None = None, dataset: str | None = None):
    """Precomputed 1998-2025 trends (fact_trend), e.g. for the regional comparison."""
    q, p = "SELECT * FROM v_trend WHERE 1=1", []
    for col, val in (("variable", variable), ("region", region), ("dataset", dataset)):
        if val:
            q += f" AND {col} = ?"; p.append(val)
    return rows(q + " ORDER BY variable, region, dataset", tuple(p))


@app.get(f"{V1}/mechanisms")
def get_mechanisms():
    return S.mechanisms()


@app.get(f"{V1}/interventions")
def get_interventions():
    return S.INTERVENTIONS


# ------------------------------------------------------------------ investigations
@app.post(f"{V1}/investigations", status_code=201)
def create_investigation(body: InvestigationCreate):
    try:
        S.check_regions([body.region_id])
    except S.NotFound as e:
        _err(e, 422)
    r = one("SELECT * FROM dim_region WHERE code = ?", (body.region_id,))
    ds = S.pick_dataset(body.region_id, "rain_total")
    ser = S.season_series(body.region_id, "rain_total", ds["code"], body.start_year, body.end_year)
    expected = body.end_year - body.start_year + 1
    prepared = {"region": {k: r[k] for k in ("code", "name", "lat_min", "lat_max", "lon_min", "lon_max", "status")},
                "available_dates": [int(ser.year.min()), int(ser.year.max())] if len(ser) else None,
                "variables": [{"name": "rain_total", "units": "mm"}], "time_resolution": "season (JJAS)",
                "missing": {"seasons_expected": expected, "seasons_present": len(ser), "seasons_missing": expected - len(ser)},
                "qc_status": "passed" if len(ser) == expected else "incomplete",
                "dataset": {"name": ds["name"], "version": ds["version"], "source": ds["agency"]},
                "common_period_with": {d["code"]: True for d in S.available_datasets(body.region_id, "rain_total") if d["code"] != ds["code"]}}
    doc = {"id": store.new_id(), "created_at": store.now(), "config": body.model_dump(), "prepared": prepared, "layers": {}}
    return store.save(doc)


@app.get(f"{V1}/investigations")
def list_investigations():
    return store.list_all()


@app.get(f"{V1}/investigations/{{inv_id}}")
def get_investigation(inv_id: str):
    return _inv(inv_id)


@app.post(f"{V1}/investigations/{{inv_id}}/detect")
def detect(inv_id: str, body: DetectRequest):
    inv = _inv(inv_id); c = inv["config"]
    regs = _regions(inv, body.region_ids)
    ext = ["PRCPTOT", "wet_days", "SDII", "Rx1day", "R95p", "CDD"] if body.extremes else []
    metrics = list(dict.fromkeys(body.metrics + ext))
    results, skipped = [], []
    for reg in regs:
        for m in metrics:
            if m in ext and m not in body.metrics and not S.available_datasets(reg, m):
                continue  # extreme indices that exist only for the whole box are silently left out for sub-regions
            try:
                results.append(S.trend_result(reg, m, c["start_year"], c["end_year"], body.dataset, body.sensitivity))
            except S.NotFound as e:
                skipped.append({"region_id": reg, "metric": m, "reason": str(e)})
    if not results:
        raise HTTPException(422, {"message": "no result could be computed", "skipped": skipped})
    unusual = sorted({(r["region_id"], int(p["date"])) for r in results if r["metric"] == "rain_total"
                      for p in r["series"] if abs(p["anomaly"]) > 1.5 * (sum(q["anomaly"] ** 2 for q in r["series"]) / len(r["series"])) ** 0.5})
    out = {"results": results, "skipped": skipped,
           "recent_conditions": {reg: S.recent_conditions(reg) for reg in regs},
           "handoff": {"regions": regs, "period": [c["start_year"], c["end_year"]], "season": c["season"], "metrics": metrics,
                       "unusual_seasons": [{"region_id": a, "year": b} for a, b in unusual]}}
    inv["layers"]["detect"] = out
    store.save(inv)
    return out


@app.post(f"{V1}/investigations/{{inv_id}}/investigate")
def investigate(inv_id: str, body: InvestigateRequest):
    inv = _inv(inv_id); c = inv["config"]
    regs = _regions(inv, body.region_ids or inv.get("layers", {}).get("detect", {}).get("handoff", {}).get("regions"))
    variables = body.variables or [v for cat in body.evidence for v in S.EVIDENCE_VARS.get(cat, [])]
    comps, skipped = [], []
    for reg in regs:
        for v in variables:
            try:
                comps.append({"region_id": reg, **S.evidence_comparison(reg, v, body.compare_to, c["start_year"], c["end_year"])})
            except S.NotFound as e:
                skipped.append({"region_id": reg, "variable": v, "reason": str(e)})
    notes = []
    if "vegetation" in body.evidence:
        notes.append("Vegetation (MODIS NDVI) is not in the warehouse yet (decision D-011, task T-22).")
    out = {"comparisons": comps, "skipped": skipped,
           "case_studies": [cs for reg in regs for cs in S.case_studies(reg)] if "storm_structure" in body.evidence or not body.variables else [],
           "notes": notes + ["Associations, not causes. Seasonal (JJAS) values: lagged monthly tests are not available in the MVP."],
           "handoff": {"regions": regs, "compare_to": body.compare_to,
                       "supporting": [x["variable"] for x in comps if x["status"] == "supporting"],
                       "contrasting": [x["variable"] for x in comps if x["status"] == "contrasting"]}}
    inv["layers"]["investigate"] = out
    store.save(inv)
    return out


@app.post(f"{V1}/investigations/{{inv_id}}/explain")
def explain(inv_id: str, body: ExplainRequest):
    inv = _inv(inv_id)
    mech = next((m for m in S.mechanisms() if m["mechanism_id"] == body.mechanism_id), None)
    if not mech:
        raise HTTPException(404, f"mechanism '{body.mechanism_id}' not found")
    known = S.evidence_ids()
    for ids in (body.supporting_evidence_ids or [], body.contradicting_evidence_ids or []):
        bad = [i for i in ids if i not in known]
        if bad:
            raise HTTPException(422, f"unknown evidence id(s) {bad}")
    exps = [{**e, "status": body.status_overrides.get(e["expectation_no"], e["status"])} for e in mech["expected_observations"]]
    record = {"mechanism_id": mech["mechanism_id"], "mechanism_name": mech["name"], "scientific_description": mech["description"],
              "expected_observations": exps,
              "supporting_evidence_ids": body.supporting_evidence_ids or mech["supporting_evidence_ids"],
              "contradictory_evidence_ids": body.contradicting_evidence_ids or mech["contradicting_evidence_ids"],
              "alternative_explanations": body.alternatives or [], "researcher_interpretation": body.interpretation or mech["interpretation"],
              "confidence": body.confidence or mech["confidence"], "reviewed_by": body.reviewer, "reviewed_at": store.now(),
              "limitations": [], "references": []}
    inv["layers"].setdefault("explain", {})[mech["mechanism_id"]] = record
    store.save(inv)
    return record


@app.post(f"{V1}/investigations/{{inv_id}}/project")
def project(inv_id: str, body: ProjectRequest):
    inv = _inv(inv_id)
    reg = (body.region_id or inv["config"]["region_id"])
    _regions(inv, [reg])
    try:
        out = S.scenarios(reg, body.metric, tuple(body.baseline_period), body.start_year, body.end_year, body.scenarios, body.stress.delta_per_year)
    except S.NotFound as e:
        _err(e, 422)
    out["assumptions"] = body.assumptions
    inv["layers"]["project"] = out
    store.save(inv)
    return out


@app.post(f"{V1}/investigations/{{inv_id}}/solve")
def solve(inv_id: str, body: SolveRequest):
    inv = _inv(inv_id)
    if body.numeric:
        raise HTTPException(422, {"message": "Numeric water balance not available: every parameter needs a published source.",
                                  "missing_parameters": S.NUMERIC_PARAMETERS})
    known = {i["id"]: i for i in S.INTERVENTIONS}
    bad = [i for i in body.interventions if i not in known]
    if bad:
        raise HTTPException(422, f"unknown intervention(s) {bad}; available: {sorted(known)}")
    out = {"mode": "qualitative", "comparison": [known[i] for i in body.interventions],
           "note": "Qualitative comparison (layer contracts, Layer 5 output 3): no intervention effect is quantified without a published parameter."}
    inv["layers"]["solve"] = out
    store.save(inv)
    return out


# ------------------------------------------------------------------ report
@app.get(f"{V1}/investigations/{{inv_id}}/report.json")
def report_json(inv_id: str):
    inv = _inv(inv_id)
    b = one("SELECT built_at, git_commit FROM meta_build ORDER BY built_at DESC LIMIT 1")
    return {"overview": {"id": inv["id"], "name": inv["config"]["name"], "config": inv["config"], "prepared": inv["prepared"]},
            "trend_detection": inv["layers"].get("detect"), "environmental_investigation": inv["layers"].get("investigate"),
            "physical_explanation": inv["layers"].get("explain"), "future_scenarios": inv["layers"].get("project"),
            "solution_comparison": inv["layers"].get("solve"),
            "limitations": ["28 seasons (1998-2025) is a short record", "Atmospheric variables come from a reanalysis (MERRA-2)",
                            "Daily heavy-rain indices are not homogeneous across the 2014 satellite change (E-006)",
                            "Associations are not causes; scenarios are not forecasts"],
            "references": {"datasets": S.rows("SELECT code, name, version, agency, doi FROM dim_dataset"),
                           "evidence_ledger": "docs/research/evidence_ledger.md", "literature": "docs/research/literature.md (TO-VERIFY until read)"},
            "build": b, "ai_use": "Analysis code and text drafted with AI assistance (Claude Code); see docs/submission/si_usage.md"}


@app.get(f"{V1}/investigations/{{inv_id}}/report.csv", response_class=PlainTextResponse)
def report_csv(inv_id: str):
    inv = _inv(inv_id)
    det = inv["layers"].get("detect")
    if not det:
        raise HTTPException(409, "run /detect first")
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["region", "metric", "dataset", "year", "value", "anomaly", "quality_flag", "trend_pct_per_decade", "trend_p_value"])
    for r in det["results"]:
        for p in r["series"]:
            w.writerow([r["region_id"], r["metric"], r["dataset"], p["date"], p["value"], p["anomaly"], p["quality_flag"], r["pct_per_decade"], r["p_value"]])
    return PlainTextResponse(buf.getvalue(), media_type="text/csv")
