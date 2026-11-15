"""End-to-end smoke test against a RUNNING backend (standard library only).

Drafted with AI assistance (Claude Code). See docs/submission/si_usage.md.
Usage:  make api            (in another terminal)
        .venv/bin/python scripts/smoke_test_api.py [http://127.0.0.1:8000]
Checks every endpoint, the scientific values against the evidence ledger, the uniform error format, request-id and
CORS headers. Exit code 0 = all checks passed. If the server has TEAM_API_KEY set, export the same value as
SMOKE_API_KEY so the /explain checks can authenticate.
"""
import json
import os
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8000").rstrip("/")
API = BASE + "/api/v1"
results: list[tuple[str, bool, str]] = []


def call(method, url, body=None, headers=None):
    data = json.dumps(body).encode() if body is not None else None
    auth = {"X-API-Key": os.environ["SMOKE_API_KEY"]} if os.environ.get("SMOKE_API_KEY") else {}
    req = urllib.request.Request(url, data=data, method=method, headers={"Content-Type": "application/json", **auth, **(headers or {})})
    t0 = time.perf_counter()
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            raw, status, hdrs = r.read(), r.status, dict(r.headers)
    except urllib.error.HTTPError as e:
        raw, status, hdrs = e.read(), e.code, dict(e.headers)
    ms = (time.perf_counter() - t0) * 1000
    try:
        payload = json.loads(raw)
    except ValueError:
        payload = raw.decode()
    return status, payload, hdrs, ms


def check(name, cond, info=""):
    results.append((name, bool(cond), info))


def near(a, b, tol):
    return a is not None and abs(a - b) <= tol


def is_error(payload, kind):
    e = payload.get("error", {}) if isinstance(payload, dict) else {}
    return e.get("kind") == kind and e.get("message") and "request_id" in e


# ---------------------------------------------------------------- meta / catalogue
s, p, h, ms = call("GET", BASE + "/health")
check("health 200 + warehouse build", s == 200 and p.get("status") == "ok" and p.get("warehouse_built_at"), f"{ms:.0f} ms")
check("X-Request-ID generated", bool(h.get("x-request-id") or h.get("X-Request-ID")))
s, p, h, _ = call("GET", API + "/regions", headers={"X-Request-ID": "smoke-123"})
check("X-Request-ID echoed", (h.get("x-request-id") or h.get("X-Request-ID")) == "smoke-123")
check("regions: GeoJSON with 4 presets", s == 200 and p["type"] == "FeatureCollection" and
      [f["properties"]["id"] for f in p["features"]] == ["sahel", "west", "central", "east"])
s, p, _, _ = call("GET", API + "/datasets")
roles = {d["code"]: d["role"] for d in p} if s == 200 else {}
check("datasets: 7 with roles", s == 200 and len(p) == 7 and roles.get("imerg_late_daily") == "near-real-time" and roles.get("chirps_v3_monthly") == "check")
s, p, _, _ = call("GET", API + "/variables")
check("variables: 29", s == 200 and len(p) == 29)
s, p, _, _ = call("GET", API + "/series?region=east&variable=rain_total")
check("series east: 28 seasons, trend dataset", s == 200 and len(p["points"]) == 28 and p["dataset"] == "imerg_final_daily")
s, p, _, _ = call("GET", API + "/series?region=sahel&variable=TQV&grain=month")
check("series monthly MERRA-2", s == 200 and p["dataset"] == "merra2_monthly" and len(p["points"]) == 336)
s, p, _, _ = call("GET", API + "/trends?variable=rain_total&region=east")
tr = {d["dataset"]: d for d in p} if s == 200 else {}
check("precomputed east CHIRPS +7.9 %/dec p=0.026 (E-007)", near(tr.get("chirps_v3_monthly", {}).get("pct_per_decade"), 7.9, 0.05)
      and near(tr["chirps_v3_monthly"]["mk_p"], 0.026, 0.001))
s, p, _, _ = call("GET", API + "/mechanisms")
check("mechanisms: 5, M-01 = 7 consistent / 0 against", s == 200 and len(p) == 5 and p[0]["counts"]["consistent"] == 7 and p[0]["counts"]["inconsistent"] == 0)
s, p, _, _ = call("GET", API + "/interventions")
check("interventions: 4", s == 200 and len(p) == 4)
s, p, _, _ = call("GET", API + "/meta/build")
check("build provenance with input hashes", s == 200 and len(p.get("inputs", {})) >= 5 and p.get("row_counts", {}).get("fact_observation", 0) > 20000)

# ---------------------------------------------------------------- investigation flow
s, p, _, _ = call("POST", API + "/investigations", {"name": "Smoke test", "region_id": "sahel", "start_year": 1998, "end_year": 2025})
check("create investigation 201 + prepared QC passed", s == 201 and p["prepared"]["qc_status"] == "passed" and p["prepared"]["missing"]["seasons_missing"] == 0)
inv = p.get("id", "000000000000")

s, p, _, ms = call("POST", f"{API}/investigations/{inv}/detect", {"region_ids": ["sahel", "west", "central", "east"], "metrics": ["rain_total", "CDD"], "extremes": True})
R = {(r["region_id"], r["metric"]): r for r in p.get("results", [])} if s == 200 else {}
check("detect 200, 13 results, nothing skipped", s == 200 and len(R) == 13 and p["skipped"] == [], f"{ms:.0f} ms")
sr = R.get(("sahel", "rain_total"), {})
check("Sahel rain +3.1 %/dec p=0.161, 'tendency' wording (E-005)", near(sr.get("pct_per_decade"), 3.09, 0.02) and near(sr.get("p_value"), 0.161, 0.001)
      and sr.get("direction") == "no_significant_trend" and "tendency" in sr.get("wording", ""))
check("Sahel rain independent CHIRPS check agrees in sign", sr.get("independent_check", {}).get("agrees_in_sign") is True)
check("start-year sensitivity: 2000 start significant", any(x["start"] == 2000 and x["p_value"] < 0.05 for x in sr.get("start_year_sensitivity", [])))
ec = R.get(("east", "CDD"), {})
check("East dry spell -9.6 %/dec p=0.001 significant (E-007)", near(ec.get("pct_per_decade"), -9.57, 0.05) and ec.get("significant") is True)
er = R.get(("east", "rain_total"), {})
check("East rain +8.7 %/dec p=0.055 not significant", near(er.get("pct_per_decade"), 8.74, 0.05) and near(er.get("p_value"), 0.055, 0.001) and not er.get("significant"))
check("SDII flagged suspect (2014 tail, E-006)", R.get(("sahel", "SDII"), {}).get("quality", {}).get("suspect_seasons") == 28)
check("provenance on every result", all(r.get("provenance", {}).get("dataset") for r in R.values()))
check("recent conditions show 2026 Late Run apart", any(x["year"] == 2026 and x["dataset"] == "imerg_late_daily" for x in p.get("recent_conditions", {}).get("sahel", [])))

s, p, _, _ = call("POST", f"{API}/investigations/{inv}/investigate", {"region_ids": ["east"], "evidence": ["moisture", "dust", "land", "storm_structure"]})
C = {c["variable"]: c for c in p.get("comparisons", [])} if s == 200 else {}
check("investigate: water vapour supporting rho~0.70 (E-008)", C.get("TQV", {}).get("status") == "supporting" and near(C["TQV"]["statistic"], 0.70, 0.01))
check("investigate: dust unclear (E-010)", C.get("DUEXTTAU", {}).get("status") == "unclear")
check("investigate: 2 EarthCARE cases in the east", len(p.get("case_studies", [])) == 2)

s, p, _, _ = call("POST", f"{API}/investigations/{inv}/explain", {"mechanism_id": "M-01", "reviewer": "smoke test", "status_overrides": {"2": "consistent"}})
check("explain M-01 stored with reviewer and override", s == 200 and p["reviewed_by"] == "smoke test" and p["expected_observations"][1]["status"] == "consistent")
s, p, _, _ = call("POST", f"{API}/investigations/{inv}/project", {"region_id": "east", "start_year": 2025, "end_year": 2035, "stress": {"delta_per_year": -2}})
check("project: 3 scenarios, 'not a forecast' + not-significant warning", s == 200 and len(p["projection"]) == 3 and p["warnings"][0] == "Scenario, not a forecast."
      and len(p["warnings"]) == 2 and near(p["baseline_value"], 292.8, 0.1))
s, p, _, _ = call("POST", f"{API}/investigations/{inv}/solve", {"interventions": ["rainwater_harvesting", "mulching"]})
check("solve: qualitative comparison", s == 200 and p["mode"] == "qualitative" and len(p["comparison"]) == 2)
s, p, _, _ = call("GET", f"{API}/investigations/{inv}")
check("investigation stores all 5 layers", s == 200 and set(p["layers"]) == {"detect", "investigate", "explain", "project", "solve"})
s, p, _, _ = call("GET", f"{API}/investigations/{inv}/report.json")
check("report.json: all sections + AI note", s == 200 and p["trend_detection"] and p["solution_comparison"] and "AI" in p["ai_use"])
s, p, h, _ = call("GET", f"{API}/investigations/{inv}/report.csv")
check("report.csv: header + 13 x 28 rows", s == 200 and isinstance(p, str) and p.startswith("region,metric") and len(p.strip().splitlines()) == 1 + 13 * 28)
s, p, _, _ = call("GET", API + "/investigations")
check("list investigations includes the new one", s == 200 and any(x["id"] == inv for x in p))

# ---------------------------------------------------------------- errors (Result -> HTTP)
s, p, _, _ = call("POST", API + "/investigations", {"region_id": "mars"})
check("unknown region -> 422 validation, lists presets", s == 422 and is_error(p, "validation") and p["error"]["details"]["available"])
s, p, _, _ = call("POST", API + "/investigations", {"start_year": 2020, "end_year": 2025})
check("period < 15 seasons -> 422", s == 422 and is_error(p, "validation"))
s, p, _, _ = call("POST", API + "/investigations", {"start_year": 1990})
check("period outside record -> 422", s == 422 and is_error(p, "validation"))
s, p, _, _ = call("GET", API + "/investigations/zzz")
check("unknown investigation -> 404 not_found", s == 404 and is_error(p, "not_found"))
s, p, _, _ = call("POST", API + "/investigations", {"start_year": "abc"})
check("malformed body -> 422 uniform error", s == 422 and is_error(p, "validation") and p["error"]["details"]["errors"])
s, p, _, _ = call("POST", f"{API}/investigations/{inv}/investigate", {"evidence": ["weather"]})
check("invalid enum value -> 422", s == 422 and is_error(p, "validation"))
s, p, _, _ = call("POST", f"{API}/investigations/{inv}/explain", {"mechanism_id": "M-01"})
check("explain without reviewer -> 422", s == 422 and is_error(p, "validation"))
s, p, _, _ = call("POST", f"{API}/investigations/{inv}/explain", {"mechanism_id": "M-01", "reviewer": "x", "supporting_evidence_ids": ["E-999"]})
check("unknown evidence id -> 422", s == 422 and is_error(p, "validation"))
s, p, _, _ = call("POST", f"{API}/investigations/{inv}/explain", {"mechanism_id": "M-99", "reviewer": "x"})
check("unknown mechanism -> 404", s == 404 and is_error(p, "not_found"))
s, p, _, _ = call("POST", f"{API}/investigations/{inv}/solve", {"numeric": True})
check("numeric water balance -> 422 not_available + missing parameters", s == 422 and is_error(p, "not_available") and p["error"]["details"]["missing_parameters"])
s2, p2, _, _ = call("POST", API + "/investigations", {"name": "no detect"})
s, p, _, _ = call("GET", f"{API}/investigations/{p2.get('id', 'x')}/report.csv")
check("report.csv before detect -> 409 conflict", s == 409 and is_error(p, "conflict"))
s, p, _, _ = call("POST", f"{API}/investigations/{inv}/detect", {"metrics": ["nope"]})
check("detect with only an unknown metric -> 422 not_available with skipped", s == 422 and is_error(p, "not_available") and p["error"]["details"]["skipped"])
s, p, _, _ = call("GET", API + "/does-not-exist")
check("unknown route -> 404", s == 404)

# ---------------------------------------------------------------- CORS + concurrency
ORIGIN = os.environ.get("SMOKE_ORIGIN", "http://localhost:5173")  # set to the deployed front-end URL when CORS_ORIGINS is restricted
req = urllib.request.Request(API + "/regions", method="OPTIONS", headers={"Origin": ORIGIN, "Access-Control-Request-Method": "GET"})
with urllib.request.urlopen(req, timeout=30) as r:
    check("CORS preflight allows the front end", r.status == 200 and r.headers.get("access-control-allow-origin") in ("*", ORIGIN))
with ThreadPoolExecutor(8) as ex:
    out = list(ex.map(lambda _: call("GET", API + "/trends?variable=CDD"), range(24)))
check("24 concurrent requests all 200", all(o[0] == 200 for o in out), f"max {max(o[3] for o in out):.0f} ms")

# ---------------------------------------------------------------- report
w = max(len(n) for n, _, _ in results)
for name, ok, info in results:
    print(f"{'PASS' if ok else 'FAIL'}  {name:{w}s}  {info}")
failed = [n for n, ok, _ in results if not ok]
print(f"\n{len(results) - len(failed)}/{len(results)} checks passed against {BASE}")
sys.exit(1 if failed else 0)
