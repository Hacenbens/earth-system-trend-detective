"""Business logic of the API: dataset choice, trend results, evidence comparisons, scenarios.

Drafted with AI assistance (Claude Code). See docs/submission/si_usage.md.
All statistics reuse src/earth_detective/trend.py, the same code as the analysis and the warehouse build.
"""
import numpy as np
import pandas as pd
import pymannkendall as mk
from scipy import stats

from ..trend import trend_summary
from .db import one, rows

ALPHA = 0.05
TREND_ROLES = ("trend", "check", "supporting")
ROLE_RANK = {"trend": 0, "check": 1, "supporting": 2}

# Evidence-ledger IDs that document a (region, variable) result, shown next to the number in the app.
EVIDENCE = {("sahel", "rain_total"): ["E-005"], ("east", "rain_total"): ["E-007"], ("west", "rain_total"): ["E-007"],
            ("central", "rain_total"): ["E-007"], ("east", "CDD"): ["E-007"]}
for v in ("PRCPTOT", "wet_days", "SDII", "Rx1day", "Rx5day", "R10mm", "R20mm", "R95p", "R95pTOT", "CDD"):
    EVIDENCE.setdefault(("sahel", v), ["E-006"])

# Expected sign of the association with RAINFALL if the physical mechanism holds (for dry spells: the opposite).
EXPECTED_SIGN = {"TQV": 1, "QV2M": 1, "mfc_mm_day": 1, "U850": 1, "V850": 1, "OMEGA500": -1, "shear_925_600": 1, "AEJ_U600": 1,
                 "DUEXTTAU": -1, "TOTEXTTAU": -1, "GWETTOP": 1, "GWETROOT": 1, "EF": 1, "T2M_C": -1, "UFLXQV": 1, "VFLXQV": 1}
EVIDENCE_VARS = {"moisture": ["TQV", "mfc_mm_day", "QV2M"], "circulation": ["U850", "V850", "OMEGA500", "shear_925_600", "AEJ_U600"],
                 "dust": ["DUEXTTAU"], "land": ["GWETTOP", "EF", "T2M_C"]}
MECH_FOR_VAR = {"TQV": "M-01", "mfc_mm_day": "M-01", "QV2M": "M-02", "U850": "M-01", "V850": "M-01", "OMEGA500": "M-03",
                "shear_925_600": "M-03", "AEJ_U600": "M-03", "DUEXTTAU": "M-04", "GWETTOP": "M-05", "EF": "M-05", "T2M_C": "M-05"}


class NotFound(Exception):
    pass


# ------------------------------------------------------------------ catalogue
def regions() -> list[dict]:
    return rows("SELECT code, name, lat_min, lat_max, lon_min, lon_max, status, geojson FROM dim_region ORDER BY region_key")


def region_codes() -> set[str]:
    return {r["code"] for r in regions()}


def check_regions(codes):
    bad = [c for c in codes if c not in region_codes()]
    if bad:
        raise NotFound(f"unknown region(s) {bad}. The MVP offers the preset regions {sorted(region_codes())}; "
                       "a custom box needs a live NASA fetch (not available yet).")


def variable(code: str) -> dict:
    v = one("SELECT code, label, unit, category, aggregation, description FROM dim_variable WHERE code = ?", (code,))
    if not v:
        raise NotFound(f"unknown variable '{code}'")
    return v


def dataset(code: str) -> dict:
    d = one("SELECT * FROM dim_dataset WHERE code = ?", (code,))
    if not d:
        raise NotFound(f"unknown dataset '{code}'")
    return d


def available_datasets(region: str, var: str) -> list[dict]:
    """Datasets that have JJAS season values for (region, variable), best trend dataset first."""
    ds = rows("""SELECT d.code, d.role, d.name, d.version, d.agency, d.kind, d.is_nasa, COUNT(*) AS n
                 FROM fact_observation o JOIN dim_time t USING (time_key) JOIN dim_region r USING (region_key)
                 JOIN dim_dataset d USING (dataset_key) JOIN dim_variable v USING (variable_key)
                 WHERE t.grain = 'season' AND r.code = ? AND v.code = ? GROUP BY d.code""", (region, var))
    return sorted(ds, key=lambda d: (ROLE_RANK.get(d["role"], 9), -d["n"]))


def pick_dataset(region: str, var: str, requested: str = "auto") -> dict:
    av = available_datasets(region, var)
    if requested != "auto":
        m = [d for d in av if d["code"] == requested]
        if not m:
            raise NotFound(f"dataset '{requested}' has no season values for {var} in {region}; available: {[d['code'] for d in av]}")
        return m[0]
    trendable = [d for d in av if d["role"] in TREND_ROLES]
    if not trendable:
        raise NotFound(f"no trend-quality dataset for {var} in {region}")
    return trendable[0]


def season_series(region: str, var: str, ds: str, y0: int = 1998, y1: int = 2026) -> pd.DataFrame:
    return pd.DataFrame(rows("""SELECT t.year, o.value, o.quality_flag, o.note FROM fact_observation o
        JOIN dim_time t USING (time_key) JOIN dim_region r USING (region_key) JOIN dim_dataset d USING (dataset_key)
        JOIN dim_variable v USING (variable_key)
        WHERE t.grain = 'season' AND r.code = ? AND v.code = ? AND d.code = ? AND t.year BETWEEN ? AND ? ORDER BY t.year""",
                             (region, var, ds, y0, y1)), columns=["year", "value", "quality_flag", "note"])


# ------------------------------------------------------------------ Layer 1
def provenance(region: str, var: dict, ds: dict, y0: int, y1: int, method: str, limitations: list[str]) -> dict:
    r = one("SELECT lat_min, lat_max, lon_min, lon_max FROM dim_region WHERE code = ?", (region,))
    return {"dataset": ds["name"], "dataset_code": ds["code"], "version": ds.get("version"), "agency": ds.get("agency"),
            "kind": ds.get("kind"), "variable": var["code"], "units": var["unit"],
            "box": {"lat": [r["lat_min"], r["lat_max"]], "lon": [r["lon_min"], r["lon_max"]]},
            "period": [y0, y1], "season": [6, 7, 8, 9], "method": method, "limitations": limitations}


def trend_result(region: str, var_code: str, y0: int, y1: int, requested_ds: str = "auto", sensitivity: bool = True) -> dict:
    var = variable(var_code)
    ds = pick_dataset(region, var_code, requested_ds)
    df = season_series(region, var_code, ds["code"], y0, y1)
    if len(df) < 15:
        raise NotFound(f"only {len(df)} seasons of {var_code} in {region} for {y0}-{y1}: at least 15 are needed")
    s = df.set_index("year").value
    t = trend_summary(s)
    sig = t["mk_p"] < ALPHA
    hint = "increasing" if t["sen_slope"] > 0 else "decreasing" if t["sen_slope"] < 0 else "flat"
    mean = float(s.mean())
    limitations = sorted({n for n in df.note.dropna()})
    if ds["kind"] == "reanalysis":
        limitations.append("Reanalysis (model constrained by observations), not a direct measurement")
    out = {
        "region_id": region, "metric": var_code, "label": var["label"], "unit": var["unit"], "dataset": ds["code"],
        "direction": hint if sig else "no_significant_trend", "direction_hint": hint,
        "wording": (f"Significant {hint} trend" if sig else f"{hint.capitalize()} tendency, not statistically significant") if hint != "flat" else "No change",
        "sen_slope": t["sen_slope"], "slope_unit": f"{var['unit']}/yr", "slope_ci95": [t["slope_ci_low"], t["slope_ci_high"]],
        "pct_per_decade": t["slope_pct_per_decade"] if abs(mean) > 1e-12 else None,
        "mk_s": float(mk.original_test(s.values).s), "mk_tau": t["mk_tau"], "p_value": t["mk_p"], "significant": bool(sig), "alpha": ALPHA,
        "autocorrelation": {"lag1": t["lag1_autocorr"],
                            "method": "Original Mann-Kendall reported; Hamed-Rao (variance floored at 1) and Yue-Wang pre-whitening as checks",
                            "mk_hamed_rao_p": t["mk_hamed_rao_p"], "mk_yue_wang_p": t["mk_yue_wang_p"]},
        "cross_checks": {"ols_slope": t["ols_slope"], "ols_p": t["ols_p"], "ar1_slope": t["ar1_slope"], "ar1_p": t["ar1_p"],
                         "ar1_note": "AR(1) p is anti-conservative when the AR coefficient is negative and not significant"
                         if (t["ar1_phi"] or 0) < 0 else None},
        "n": t["n"], "period": [t["start"], t["end"]], "evidence_ids": EVIDENCE.get((region, var_code), []),
        "quality": {"suspect_seasons": int((df.quality_flag == "suspect").sum()), "notes": limitations},
        "series": [{"date": str(int(r.year)), "value": float(r.value), "anomaly": float(r.value - mean),
                    "missing": False, "quality_flag": r.quality_flag} for r in df.itertuples()],
        "provenance": provenance(region, var, ds, int(t["start"]), int(t["end"]), "Mann-Kendall + Sen's slope (src/earth_detective/trend.py)", limitations),
    }
    # independent check with another trend-capable dataset (e.g. CHIRPS)
    others = [d for d in available_datasets(region, var_code) if d["code"] != ds["code"] and d["role"] in TREND_ROLES]
    if others:
        o = season_series(region, var_code, others[0]["code"], y0, y1)
        if len(o) >= 15:
            to = trend_summary(o.set_index("year").value)
            out["independent_check"] = {"dataset": others[0]["code"], "pct_per_decade": to["slope_pct_per_decade"], "p_value": to["mk_p"],
                                        "agrees_in_sign": bool(np.sign(to["sen_slope"]) == np.sign(t["sen_slope"]))}
    if sensitivity:
        sens = []
        for start in range(int(t["start"]), int(t["end"]) - 14 + 1):
            sub = s.loc[start:]
            if len(sub) < 15:
                break
            ts = trend_summary(sub)
            sens.append({"start": start, "pct_per_decade": ts["slope_pct_per_decade"], "p_value": ts["mk_p"]})
            if start - int(t["start"]) >= 12:
                break
        out["start_year_sensitivity"] = sens
    return out


def recent_conditions(region: str) -> list[dict]:
    """Seasons after the trend record (Late Run / CHIRPS 2026): shown apart, never used for trends."""
    return rows("""SELECT t.year, d.code AS dataset, d.role, o.value, o.quality_flag FROM fact_observation o
        JOIN dim_time t USING (time_key) JOIN dim_region r USING (region_key) JOIN dim_dataset d USING (dataset_key)
        JOIN dim_variable v USING (variable_key)
        WHERE t.grain = 'season' AND r.code = ? AND v.code = 'rain_total' AND t.year >= 2024 ORDER BY t.year, d.code""", (region,))


# ------------------------------------------------------------------ Layer 2
def detrend(s: pd.Series) -> pd.Series:
    return s - np.polyval(np.polyfit(s.index, s.values, 1), s.index)


def evidence_comparison(region: str, var_code: str, compare_to: str, y0: int, y1: int) -> dict:
    var = variable(var_code)
    ds = pick_dataset(region, var_code)
    x = season_series(region, var_code, ds["code"], y0, y1).set_index("year").value
    rain_ds = pick_dataset(region, compare_to)
    y = season_series(region, compare_to, rain_ds["code"], y0, y1).set_index("year").value
    idx = x.index.intersection(y.index)
    r, p = stats.spearmanr(detrend(x.loc[idx]), detrend(y.loc[idx]))
    exp = EXPECTED_SIGN.get(var_code, 0) * (1 if compare_to == "rain_total" else -1)
    status = "unclear" if p >= ALPHA or exp == 0 else ("supporting" if np.sign(r) == exp else "contrasting")
    t = trend_summary(x)
    return {
        "variable": var_code, "label": var["label"], "unit": var["unit"], "dataset": ds["code"], "rainfall_metric": compare_to,
        "comparison_period": [int(idx.min()), int(idx.max())], "relationship": "spearman_detrended", "statistic": float(r), "p_value": float(p),
        "expected_sign": exp, "status": status, "mechanism_id": MECH_FOR_VAR.get(var_code),
        "variable_trend": {"per_decade": 10 * t["sen_slope"], "pct_per_decade": t["slope_pct_per_decade"] if abs(t["mean"]) > 1e-12 else None, "p_value": t["mk_p"]},
        "records": [{"year": int(k), "value": float(v), "anomaly": float(v - x.mean())} for k, v in x.items()],
        "quality": "reanalysis" if ds["kind"] == "reanalysis" else "observation",
    }


def case_studies(region: str | None = None) -> list[dict]:
    q = """SELECT c.case_id, c.case_type, r.code AS region, c.metric, c.value FROM fact_case_metric c JOIN dim_region r USING (region_key)"""
    df = pd.DataFrame(rows(q + (" WHERE r.code = ?" if region and region != "sahel" else ""), (region,) if region and region != "sahel" else ()))
    if df.empty:
        return []
    out = []
    for (cid, ctype, reg), g in df.groupby(["case_id", "case_type", "region"]):
        out.append({"case_id": cid, "type": ctype, "region": reg, "metrics": dict(zip(g.metric, g.value)),
                    "figure": f"outputs/earthcare/cross_section_{cid.split('_')[0]}_{cid.split('_')[1].lstrip('0')}.png",
                    "note": "EarthCARE (ESA-JAXA) case study: present-day process illustration, never a trend"})
    return out


# ------------------------------------------------------------------ Layer 3
def mechanisms() -> list[dict]:
    out = []
    for m in rows("SELECT * FROM dim_mechanism ORDER BY mechanism_key"):
        exps = rows("SELECT expectation_no, expectation, observed, status FROM fact_mechanism_expectation WHERE mechanism_key = ? ORDER BY expectation_no",
                    (m["mechanism_key"],))
        ev = rows("""SELECT e.evidence_id, e.status, b.role FROM bridge_mechanism_evidence b JOIN dim_evidence e USING (evidence_key)
                     WHERE b.mechanism_key = ? ORDER BY e.evidence_id""", (m["mechanism_key"],))
        counts = {s: sum(x["status"] == s for x in exps) for s in ("consistent", "inconsistent", "unclear", "not_tested")}
        out.append({"mechanism_id": m["mechanism_id"], "name": m["name"], "description": m["description"], "confidence": m["confidence"],
                    "interpretation": m["interpretation"], "interpretation_status": "DRAFT, to be confirmed by the science lead",
                    "counts": counts, "expected_observations": exps,
                    "supporting_evidence_ids": [e["evidence_id"] for e in ev if e["role"] == "supporting"],
                    "contradicting_evidence_ids": [e["evidence_id"] for e in ev if e["role"] == "contradicting"]})
    return out


def evidence_ids() -> set[str]:
    return {r["evidence_id"] for r in rows("SELECT evidence_id FROM dim_evidence")}


# ------------------------------------------------------------------ Layer 4
def scenarios(region: str, metric: str, base: tuple[int, int], t0: int, t1: int, kinds: list[str], delta: float) -> dict:
    tr = trend_result(region, metric, base[0], base[1], sensitivity=False)
    s = pd.Series({int(r["date"]): r["value"] for r in tr["series"]})
    x0, beta = float(s.mean()), float(tr["sen_slope"])
    years = list(range(t0, t1 + 1))
    out = {}
    for k in kinds:
        vals = []
        for y in years:
            v = x0 if k == "stabilization" else x0 + beta * (y - t0)
            if k == "increased_stress":
                v += delta * (y - t0)
            vals.append({"year": y, "value": v})
        out[k] = vals
    end = {k: v[-1]["value"] for k, v in out.items()}
    warn = ["Scenario, not a forecast."]
    if not tr["significant"]:
        warn.append(f"The historical trend is not statistically significant (p = {tr['p_value']:.2f}): trend continuation is an assumption, not an expectation.")
    return {"region_id": region, "metric": metric, "unit": tr["unit"], "baseline_period": list(base), "baseline_value": x0,
            "assumed_slope": beta, "slope_unit": tr["slope_unit"], "stress_per_year": delta, "projection": out,
            "difference_at_end": {k: end[k] - end.get("stabilization", x0) for k in end},
            "pct_difference_at_end": {k: 100 * (end[k] / end.get("stabilization", x0) - 1) for k in end},
            "trend_p_value": tr["p_value"], "warnings": warn,
            "formulas": {"stabilization": "X(t) = X0", "trend_continuation": "X(t) = X0 + beta (t - t0)",
                         "increased_stress": "X(t) = X0 + beta (t - t0) + delta (t - t0)"}}


# ------------------------------------------------------------------ Layer 5 (qualitative MVP)
INTERVENTIONS = [
    {"id": "rainwater_harvesting", "name": "Rainwater harvesting", "problem": "Runoff and low infiltration",
     "expected_effect": "More of each storm's rain is kept for crops and storage instead of running off",
     "model_representation": "Change the runoff/infiltration split in the water balance",
     "evidence": "Relevant where rain comes in intense storms (E-012: deep convective systems)", "references": ["TO-FIND"],
     "unknowns": ["Local soil infiltration capacity", "Construction and maintenance cost", "Effect size in the Sahel"]},
    {"id": "mulching", "name": "Mulching and soil conservation", "problem": "Soil-moisture stress between rains",
     "expected_effect": "Less evaporation from bare soil, longer-lasting soil moisture through dry spells",
     "model_representation": "Lower soil-evaporation or storage-loss parameters",
     "evidence": "Dry spells remain a key risk even where they shorten (E-007)", "references": ["TO-FIND"], "unknowns": ["Effect size", "Material availability"]},
    {"id": "agroforestry", "name": "Agroforestry and restoration", "problem": "Vegetation degradation",
     "expected_effect": "More ground cover, shade and soil organic matter", "model_representation": "Clearly labelled vegetation-response scenario",
     "evidence": "NDVI add-on not yet analysed (D-011)", "references": ["L-36", "L-39 (TO-VERIFY)"], "unknowns": ["Response time (years)", "Species and land tenure"]},
    {"id": "soil_water_conservation", "name": "Soil and water conservation (bunds, zaï pits)", "problem": "Erosion and runoff in heavy rain",
     "expected_effect": "Less soil loss, more infiltration on slopes", "model_representation": "Qualitative risk-reduction matrix",
     "evidence": "Heavy-rain trend unresolved (E-006)", "references": ["TO-FIND"], "unknowns": ["Labour needs", "Site suitability"]},
]
NUMERIC_PARAMETERS = ["initial soil-water storage", "storage capacity", "evapotranspiration (ET)", "runoff coefficient (Q)",
                      "deep drainage (D)", "intervention effect on each parameter, with a published source"]
