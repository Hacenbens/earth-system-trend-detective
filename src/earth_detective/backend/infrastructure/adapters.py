"""Other adapters: investigation store (JSON files), statistics, intervention catalogue, clock."""
from __future__ import annotations

import json
import logging
from dataclasses import asdict
from pathlib import Path

import pymannkendall as mk
from scipy import stats

from ...trend import trend_summary
from ..core import helpers
from ..core.constants import PCT_EPSILON, SEASON_MONTHS
from ..domain.models import Association, Intervention, Investigation, InvestigationConfig, TrendStats

log = logging.getLogger(__name__)


class SystemClock:
    def now(self) -> str:
        return helpers.utc_now_iso()


class JsonInvestigationRepository:
    """One JSON document per investigation (MVP decision, docs/app/api_contract.md). Atomic writes."""
    def __init__(self, directory: Path):
        self._dir = directory

    def _path(self, inv_id: str) -> Path | None:
        return self._dir / f"{inv_id}.json" if helpers.is_valid_investigation_id(inv_id) else None

    def next_id(self) -> str:
        return helpers.new_investigation_id()

    def save(self, inv: Investigation) -> Investigation:
        self._dir.mkdir(parents=True, exist_ok=True)
        doc = {"id": inv.id, "created_at": inv.created_at, "updated_at": inv.updated_at, "config": asdict(inv.config),
               "prepared": inv.prepared, "layers": inv.layers}
        p = self._path(inv.id)
        tmp = p.with_suffix(".tmp")
        tmp.write_text(json.dumps(doc, indent=2, ensure_ascii=False))
        tmp.replace(p)
        return inv

    def get(self, inv_id: str) -> Investigation | None:
        p = self._path(inv_id)
        if p is None or not p.exists():
            return None
        d = json.loads(p.read_text())
        c = d["config"]
        cfg = InvestigationConfig(c["name"], c["region_id"], c["start_year"], c["end_year"], c.get("variable", "precipitation"),
                                  tuple(c.get("season", SEASON_MONTHS)))
        return Investigation(d["id"], d["created_at"], cfg, d["prepared"], d.get("layers", {}), d.get("updated_at"))

    def list(self) -> list[dict]:
        if not self._dir.exists():
            return []
        out = []
        for p in sorted(self._dir.glob("*.json")):
            d = json.loads(p.read_text())
            out.append({"id": d["id"], "name": d["config"]["name"], "created_at": d["created_at"], "layers_done": sorted(d.get("layers", {}))})
        return out


class MannKendallTrendAnalyzer:
    """Adapter over src/earth_detective/trend.py (the same code as the analysis and the warehouse build)."""

    def analyze(self, series: dict[int, float], full: bool = True) -> TrendStats:
        import pandas as pd
        s = pd.Series(series).sort_index()
        t = trend_summary(s, parametric=full)
        pct = t["slope_pct_per_decade"] if abs(t["mean"]) > PCT_EPSILON else None
        return TrendStats(n=t["n"], start=int(t["start"]), end=int(t["end"]), mean=float(t["mean"]), sen_slope=float(t["sen_slope"]),
                          slope_ci_low=float(t["slope_ci_low"]), slope_ci_high=float(t["slope_ci_high"]), slope_pct_per_decade=pct,
                          mk_s=float(mk.original_test(s.values).s), mk_tau=float(t["mk_tau"]), mk_p=float(t["mk_p"]),
                          mk_hamed_rao_p=float(t["mk_hamed_rao_p"]), mk_yue_wang_p=float(t["mk_yue_wang_p"]),
                          ols_slope=t.get("ols_slope"), ols_p=t.get("ols_p"), ar1_slope=t.get("ar1_slope"), ar1_p=t.get("ar1_p"),
                          ar1_phi=t.get("ar1_phi"), lag1_autocorr=float(t["lag1_autocorr"]))


class DetrendedSpearmanAnalyzer:
    def detrended(self, x: dict[int, float], y: dict[int, float]) -> Association:
        years = sorted(set(x) & set(y))
        xv = helpers.linear_detrend(years, [x[k] for k in years])
        yv = helpers.linear_detrend(years, [y[k] for k in years])
        r, p = stats.spearmanr(xv, yv)
        return Association(float(r), float(p), len(years), int(years[0]), int(years[-1]))


class StaticInterventionCatalogue:
    """Layer 5 interventions (qualitative MVP). New interventions are added here without touching the use cases."""
    _ITEMS = (
        Intervention("rainwater_harvesting", "Rainwater harvesting", "Runoff and low infiltration",
                     "More of each storm's rain is kept for crops and storage instead of running off",
                     "Change the runoff/infiltration split in the water balance",
                     "Relevant where rain comes in intense storms (E-012: deep convective systems)", ("TO-FIND",),
                     ("Local soil infiltration capacity", "Construction and maintenance cost", "Effect size in the Sahel")),
        Intervention("mulching", "Mulching and soil conservation", "Soil-moisture stress between rains",
                     "Less evaporation from bare soil, longer-lasting soil moisture through dry spells",
                     "Lower soil-evaporation or storage-loss parameters", "Dry spells remain a key risk even where they shorten (E-007)",
                     ("TO-FIND",), ("Effect size", "Material availability")),
        Intervention("agroforestry", "Agroforestry and restoration", "Vegetation degradation", "More ground cover, shade and soil organic matter",
                     "Clearly labelled vegetation-response scenario", "NDVI add-on not yet analysed (D-011)", ("L-36", "L-39 (TO-VERIFY)"),
                     ("Response time (years)", "Species and land tenure")),
        Intervention("soil_water_conservation", "Soil and water conservation (bunds, zaï pits)", "Erosion and runoff in heavy rain",
                     "Less soil loss, more infiltration on slopes", "Qualitative risk-reduction matrix", "Heavy-rain trend unresolved (E-006)",
                     ("TO-FIND",), ("Labour needs", "Site suitability")),
    )

    def all(self) -> list[Intervention]:
        return list(self._ITEMS)
