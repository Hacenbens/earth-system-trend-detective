"""Report use cases: assemble every layer into one investigation report."""
from __future__ import annotations

import csv
import io

from ..core.constants import AI_USE_NOTE, ASSOCIATION_DISCLAIMER
from ..core.enums import Layer
from ..domain.ports import BuildInfoReader, DatasetReferenceReader
from ..domain.result import AppError, Err, Ok, Result
from .investigations import investigation_view
from .services import InvestigationLoader

LIMITATIONS = ["28 seasons (1998-2025) is a short record", "Atmospheric variables come from a reanalysis (MERRA-2)",
               "Daily heavy-rain indices are not homogeneous across the 2014 satellite change (E-006)",
               f"{ASSOCIATION_DISCLAIMER} Scenarios are not forecasts."]


class BuildReport:
    def __init__(self, loader: InvestigationLoader, references: DatasetReferenceReader, build: BuildInfoReader):
        self._loader, self._refs, self._build = loader, references, build

    def execute(self, investigation_id: str) -> Result[dict]:
        inv_r = self._loader.load(investigation_id)
        if not inv_r.is_ok:
            return inv_r
        v = investigation_view(inv_r.value)
        b = self._build.latest() or {}
        return Ok({"overview": {"id": v["id"], "name": v["config"]["name"], "config": v["config"], "prepared": v["prepared"]},
                   "trend_detection": v["layers"].get(Layer.DETECT), "environmental_investigation": v["layers"].get(Layer.INVESTIGATE),
                   "physical_explanation": v["layers"].get(Layer.EXPLAIN), "future_scenarios": v["layers"].get(Layer.PROJECT),
                   "solution_comparison": v["layers"].get(Layer.SOLVE), "limitations": LIMITATIONS,
                   "references": {"datasets": self._refs.references(), "evidence_ledger": "docs/research/evidence_ledger.md",
                                  "literature": "docs/research/literature.md (TO-VERIFY until read)"},
                   "build": {"built_at": b.get("built_at"), "git_commit": b.get("git_commit")},
                   "ai_use": AI_USE_NOTE})


class ExportReportCsv:
    def __init__(self, loader: InvestigationLoader):
        self._loader = loader

    def execute(self, investigation_id: str) -> Result[str]:
        inv_r = self._loader.load(investigation_id)
        if not inv_r.is_ok:
            return inv_r
        det = inv_r.value.layers.get(Layer.DETECT)
        if not det:
            return Err(AppError.conflict("run /detect before exporting the CSV report"))
        buf = io.StringIO()
        w = csv.writer(buf)
        w.writerow(["region", "metric", "dataset", "year", "value", "anomaly", "quality_flag", "trend_pct_per_decade", "trend_p_value"])
        for r in det["results"]:
            for p in r["series"]:
                w.writerow([r["region_id"], r["metric"], r["dataset"], p["date"], p["value"], p["anomaly"], p["quality_flag"],
                            r["pct_per_decade"], r["p_value"]])
        return Ok(buf.getvalue())
