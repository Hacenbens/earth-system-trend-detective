"""Layer 4 - PROJECT. Rainfall and NDVI series here are SYNTHETIC (made up to check the maths).

INV-001's Layer 1 result (real): PRCPTOT Sen slope 1.43 mm/yr, 95% CI [-0.58, 3.21], p = 0.149.
"""
import pytest

from app.schemas.project import ProjectRequest
from app.services.layer4 import engine
from app.services.storage import InvestigationStore

RAIN = {y: 400.0 + 2 * (y - 1998) + (5 if y % 2 else -5) for y in range(1998, 2026)}   # mean 427
X0 = 427.0
# rain that goes up and down with no trend (for RESTREND: a year effect can then be separated)
RAIN_FLAT = {y: 420.0 + 40 * ((y * 7) % 5 - 2) for y in range(1998, 2026)}
NDVI_YEARS = [2000, 2001, 2002, 2003, 2020, 2021, 2022, 2023, 2024, 2025]


def ndvi_from(rain, years, slope=0.002, extra=0.0):
    return {y: round(0.1 + slope * rain[y] + extra * (y - 2000), 6) for y in years}


def write_csv(path, header, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(header + "\n" + "\n".join(f"{y},{v}" for y, v in data.items()) + "\n")


@pytest.fixture
def inv(data_dir):
    return InvestigationStore(data_dir / "app" / "investigations").load("INV-001")


def by(section, name):
    return {p.year: p for p in section.scenarios if p.scenario_name == name}


def test_contract_formulas(inv):
    req = ProjectRequest(stress={"type": "linear", "delta_per_year": -2.0})
    s = engine.build_section(inv, req, RAIN, {})
    x0 = sum(RAIN.values()) / len(RAIN)
    assert s.baseline.value == pytest.approx(x0, abs=1e-3) and s.baseline.n == 28
    stab, trend, stress = by(s, "stabilization"), by(s, "trend_continuation"), by(s, "increased_stress")
    for t in range(2025, 2036):
        assert stab[t].projected_value == pytest.approx(x0, abs=1e-3)
        assert trend[t].projected_value == pytest.approx(x0 + 1.43 * (t - 2025), abs=1e-3)
        assert stress[t].projected_value == pytest.approx(x0 + 1.43 * (t - 2025) - 2.0 * (t - 2025), abs=1e-3)
        assert trend[t].low <= trend[t].projected_value <= trend[t].high
    assert trend[2035].low == pytest.approx(x0 - 0.58 * 10, abs=1e-3)
    assert stress[2035].stress_perturbation == -20.0
    assert stab[2035].low is None and stab[2035].assumed_slope == 0


def test_disclaimer_and_limits_follow_layer1(inv):
    s = engine.build_section(inv, ProjectRequest(scenarios=["trend_continuation"]), RAIN, {})
    assert s.disclaimer == "Scenario, not a forecast. The historical trend is not significant (p = 0.15)."
    assert any("includes zero" in x for x in s.limitations)
    assert s.trend.evidence_id == "E-006"


def test_comparison_differences(inv):
    req = ProjectRequest(stress={"type": "constant", "delta": -10.0})
    row = engine.build_section(inv, req, RAIN, {}).comparison[-1]
    assert row.year == 2035
    assert row.diff_vs_stabilization["stabilization"] == 0
    assert row.diff_vs_stabilization["trend_continuation"] == pytest.approx(14.3, abs=1e-3)
    assert row.diff_vs_stabilization["increased_stress"] == pytest.approx(4.3, abs=1e-3)
    assert row.pct_vs_stabilization["trend_continuation"] == pytest.approx(100 * 14.3 / X0, abs=0.01)


def test_baseline_needs_series_or_value(inv):
    with pytest.raises(engine.Layer4Unprocessable) as e:
        engine.build_section(inv, ProjectRequest(scenarios=["stabilization"]), {}, {})
    assert "prcptot_jjas.csv" in e.value.missing[0]
    s = engine.build_section(inv, ProjectRequest(scenarios=["stabilization"], baseline_value=450), {}, {})
    assert s.baseline.source == "request" and s.scenarios[0].projected_value == 450
    assert any("given by the researcher" in x for x in s.limitations)


def test_ndvi_indicator_fit_and_restrend(inv):
    ndvi = ndvi_from(RAIN, NDVI_YEARS)
    s = engine.build_section(inv, ProjectRequest(scenarios=["stabilization", "trend_continuation"]), RAIN, ndvi)
    ind = next(i for i in s.indicators if i.indicator_id == "IND-NDVI")
    assert ind.status == "available" and ind.label.startswith("Calculated indicator")
    assert ind.fit.slope == pytest.approx(0.002, abs=1e-6) and ind.fit.r2 > 0.99 and ind.fit.n == 10
    assert not ind.restrend.significant                     # NDVI is pure rain: nothing left over
    v2035 = next(v for v in ind.values if v.scenario_name == "trend_continuation" and v.year == 2035)
    rain_2035 = by(s, "trend_continuation")[2035].projected_value
    assert v2035.value == pytest.approx(0.1 + 0.002 * rain_2035, abs=1e-4)
    assert v2035.extrapolated == (rain_2035 > ind.fit.rain_range[1])
    assert "gaps" in ind.reason


def test_restrend_detects_greening_beyond_rain(inv):
    ndvi = ndvi_from(RAIN_FLAT, NDVI_YEARS, extra=0.01)     # +0.01 per year not explained by rain
    s = engine.build_section(inv, ProjectRequest(scenarios=["stabilization"]), RAIN_FLAT, ndvi)
    r = next(i for i in s.indicators if i.indicator_id == "IND-NDVI").restrend
    assert r.significant and r.sen_slope > 0 and r.reading.startswith("Greener")


def test_ndvi_indicator_says_what_is_missing(inv):
    s = engine.build_section(inv, ProjectRequest(scenarios=["stabilization"]), RAIN, {})
    ind = next(i for i in s.indicators if i.indicator_id == "IND-NDVI")
    assert ind.status == "not_available" and "E-104.csv" in ind.reason
    few = ndvi_from(RAIN, [2022, 2023, 2024])
    ind = next(i for i in engine.build_section(inv, ProjectRequest(scenarios=["stabilization"]), RAIN, few).indicators
               if i.indicator_id == "IND-NDVI")
    assert "only 3 years" in ind.reason
    dry = next(i for i in s.indicators if i.indicator_id == "IND-DRYSPELL")
    assert dry.status == "not_available"


def test_request_validation():
    with pytest.raises(ValueError):
        ProjectRequest(scenarios=["increased_stress"])             # stress missing
    with pytest.raises(ValueError):
        ProjectRequest(start_year=2030, end_year=2025)
    with pytest.raises(ValueError):
        ProjectRequest(stress={"type": "constant"})                 # delta missing


# ------------------------------------------------------------------ API

def test_api_flow(client, data_dir):
    prepared = data_dir / "prepared" / "INV-001"
    write_csv(prepared / "prcptot_jjas.csv", "year,prcptot", RAIN)
    write_csv(prepared / "E-104.csv", "year,ndvi_sum_jul_oct", ndvi_from(RAIN, NDVI_YEARS))

    assert client.get("/api/v1/investigations/INV-001/project").status_code == 404

    inp = client.get("/api/v1/investigations/INV-001/project/input").json()
    assert inp["rainfall_series_available"] and inp["ndvi_n"] == 10
    assert inp["baseline_from_series"] == pytest.approx(X0, abs=0.01)
    assert len(inp["rainfall_series"]) == 28 and inp["rainfall_series"][0] == {"year": 1998, "value": RAIN[1998]}
    assert [p["year"] for p in inp["ndvi_series"]] == NDVI_YEARS

    body = inp["default_request"]
    prev = client.post("/api/v1/investigations/INV-001/project/preview", json=body)
    assert prev.status_code == 200
    assert client.get("/api/v1/investigations/INV-001/project").status_code == 404   # preview did not save

    r = client.post("/api/v1/investigations/INV-001/project", json=body)
    assert r.status_code == 201
    saved = client.get("/api/v1/investigations/INV-001/project").json()
    assert saved["disclaimer"].startswith("Scenario, not a forecast.")
    assert set(saved["handoff"]["end_year_values"]) == {"stabilization", "trend_continuation", "increased_stress"}
    assert "IND-NDVI" in saved["handoff"]["indicator_ids"]

    inv = client.get("/api/v1/investigations/INV-001").json()
    assert inv["project"]["created_at"] and inv["detect"]["results"][0]["sen_slope"] == 1.43  # Layer 1 untouched


def test_api_errors(client):
    r = client.post("/api/v1/investigations/INV-001/project", json={"scenarios": ["stabilization"]})
    assert r.status_code == 422 and "prcptot_jjas.csv" in r.json()["detail"]["missing"][0]
    r = client.post("/api/v1/investigations/INV-001/project", json={"scenarios": ["increased_stress"]})
    assert r.status_code == 422
    r = client.post("/api/v1/investigations/INV-001/project", json={"metric": "CDD", "baseline_value": 3,
                                                                           "scenarios": ["stabilization"]})
    assert r.status_code == 409
