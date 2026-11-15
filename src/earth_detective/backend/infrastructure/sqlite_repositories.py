"""SQLite adapters over the star-schema warehouse (docs/app/data_model.md). Read-only."""
from __future__ import annotations

import json
import logging
import sqlite3
import threading
from pathlib import Path
from typing import Any

from ..core.helpers import json_safe
from ..domain.models import (CaseStudy, Dataset, DatasetAvailability, Expectation, Mechanism, Region, SeasonPoint, Variable)

log = logging.getLogger(__name__)


class WarehouseUnavailable(RuntimeError):
    pass


class SqliteWarehouse:
    """Owns the connections (single responsibility); repositories receive it by injection.

    One read-only connection per thread: FastAPI runs sync endpoints in a thread pool, and a single sqlite3
    connection shared across threads fails under concurrent requests ("bad parameter or other API misuse")."""

    def __init__(self, path: Path):
        if not path.exists():
            raise WarehouseUnavailable(f"Warehouse not found at {path}. Build it with `make warehouse`.")
        self._uri = f"file:{path}?mode=ro"
        self._local = threading.local()
        self._connection()  # fail fast if the file cannot be opened
        log.info("warehouse opened", extra={"event": "warehouse.opened", "path": str(path)})

    def _connection(self) -> sqlite3.Connection:
        con = getattr(self._local, "con", None)
        if con is None:
            con = sqlite3.connect(self._uri, uri=True)
            con.row_factory = sqlite3.Row
            self._local.con = con
        return con

    def rows(self, sql: str, params: tuple = ()) -> list[dict[str, Any]]:
        return [{k: json_safe(r[k]) for k in r.keys()} for r in self._connection().execute(sql, params).fetchall()]

    def one(self, sql: str, params: tuple = ()) -> dict[str, Any] | None:
        r = self.rows(sql, params)
        return r[0] if r else None


def _dataset(r: dict) -> Dataset:
    return Dataset(code=r["code"], product=r["product"], name=r["name"], version=r["version"], agency=r["agency"], kind=r["kind"],
                   role=r["role"], resolution=r.get("resolution"), coverage_start=r.get("coverage_start"),
                   coverage_end=r.get("coverage_end"), access=r.get("access"), doi=r.get("doi"), is_nasa=bool(r.get("is_nasa")))


class SqliteCatalogueRepository:
    def __init__(self, db: SqliteWarehouse):
        self._db = db

    def regions(self) -> list[Region]:
        return [Region(**{k: r[k] for k in ("code", "name", "lat_min", "lat_max", "lon_min", "lon_max", "status", "geojson")})
                for r in self._db.rows("SELECT * FROM dim_region ORDER BY region_key")]

    def region(self, code: str) -> Region | None:
        return next((r for r in self.regions() if r.code == code), None)

    def datasets(self) -> list[dict[str, Any]]:
        return self._db.rows("""SELECT d.*, (SELECT COUNT(*) FROM fact_observation o WHERE o.dataset_key = d.dataset_key) AS observations,
                                (SELECT GROUP_CONCAT(DISTINCT v.code) FROM fact_observation o JOIN dim_variable v USING (variable_key)
                                 WHERE o.dataset_key = d.dataset_key) AS variables FROM dim_dataset d ORDER BY dataset_key""")

    def dataset(self, code: str) -> Dataset | None:
        r = self._db.one("SELECT * FROM dim_dataset WHERE code = ?", (code,))
        return _dataset(r) if r else None

    def variables(self) -> list[Variable]:
        return [Variable(**r) for r in self._db.rows(
            "SELECT code, label, unit, category, aggregation, description FROM dim_variable ORDER BY variable_key")]

    def variable(self, code: str) -> Variable | None:
        r = self._db.one("SELECT code, label, unit, category, aggregation, description FROM dim_variable WHERE code = ?", (code,))
        return Variable(**r) if r else None


class SqliteObservationRepository:
    def __init__(self, db: SqliteWarehouse):
        self._db = db

    def availability(self, region: str, variable: str) -> list[DatasetAvailability]:
        rs = self._db.rows("""SELECT d.*, COUNT(*) AS n FROM fact_observation o JOIN dim_time t USING (time_key)
            JOIN dim_region r USING (region_key) JOIN dim_dataset d USING (dataset_key) JOIN dim_variable v USING (variable_key)
            WHERE t.grain = 'season' AND r.code = ? AND v.code = ? GROUP BY d.dataset_key""", (region, variable))
        return [DatasetAvailability(_dataset(r), r["n"]) for r in rs]

    def season_series(self, region: str, variable: str, dataset: str, year_start: int, year_end: int) -> list[SeasonPoint]:
        rs = self._db.rows("""SELECT t.year, o.value, o.quality_flag, o.note FROM fact_observation o
            JOIN dim_time t USING (time_key) JOIN dim_region r USING (region_key) JOIN dim_dataset d USING (dataset_key)
            JOIN dim_variable v USING (variable_key)
            WHERE t.grain = 'season' AND r.code = ? AND v.code = ? AND d.code = ? AND t.year BETWEEN ? AND ? ORDER BY t.year""",
                           (region, variable, dataset, year_start, year_end))
        return [SeasonPoint(r["year"], r["value"], r["quality_flag"], r["note"]) for r in rs]

    def series(self, region: str, variable: str, dataset: str, grain: str) -> list[dict[str, Any]]:
        return self._db.rows("""SELECT year, month, value, quality_flag, note FROM v_observation
            WHERE region = ? AND variable = ? AND dataset = ? AND grain = ? ORDER BY year, month""", (region, variable, dataset, grain))

    def recent_seasons(self, region: str, variable: str, from_year: int) -> list[dict[str, Any]]:
        return self._db.rows("""SELECT t.year, d.code AS dataset, d.role, o.value, o.quality_flag FROM fact_observation o
            JOIN dim_time t USING (time_key) JOIN dim_region r USING (region_key) JOIN dim_dataset d USING (dataset_key)
            JOIN dim_variable v USING (variable_key)
            WHERE t.grain = 'season' AND r.code = ? AND v.code = ? AND t.year >= ? ORDER BY t.year, d.code""", (region, variable, from_year))


class SqlitePrecomputedTrendRepository:
    def __init__(self, db: SqliteWarehouse):
        self._db = db

    def trends(self, variable, region, dataset) -> list[dict[str, Any]]:
        q, p = "SELECT * FROM v_trend WHERE 1=1", []
        for col, val in (("variable", variable), ("region", region), ("dataset", dataset)):
            if val:
                q += f" AND {col} = ?"
                p.append(val)
        return self._db.rows(q + " ORDER BY variable, region, dataset", tuple(p))


class SqliteMechanismRepository:
    def __init__(self, db: SqliteWarehouse):
        self._db = db

    def mechanisms(self) -> list[Mechanism]:
        out = []
        for m in self._db.rows("SELECT * FROM dim_mechanism ORDER BY mechanism_key"):
            exps = tuple(Expectation(e["expectation_no"], e["expectation"], e["observed"], e["status"]) for e in self._db.rows(
                "SELECT * FROM fact_mechanism_expectation WHERE mechanism_key = ? ORDER BY expectation_no", (m["mechanism_key"],)))
            ev = self._db.rows("""SELECT e.evidence_id, b.role FROM bridge_mechanism_evidence b JOIN dim_evidence e USING (evidence_key)
                                  WHERE b.mechanism_key = ? ORDER BY e.evidence_id""", (m["mechanism_key"],))
            out.append(Mechanism(m["mechanism_id"], m["name"], m["description"], m["confidence"], m["interpretation"], exps,
                                 tuple(e["evidence_id"] for e in ev if e["role"] == "supporting"),
                                 tuple(e["evidence_id"] for e in ev if e["role"] == "contradicting")))
        return out

    def evidence_ids(self) -> set[str]:
        return {r["evidence_id"] for r in self._db.rows("SELECT evidence_id FROM dim_evidence")}


class SqliteEvidenceRepository:
    """Evidence ledger rows (claim, statistics incl. robustness tests, alternatives, limitations/confidence, status)."""
    COLUMNS = "evidence_id, claim, status, datasets, period_region, statistics, alternatives, limitations"

    def __init__(self, db: SqliteWarehouse):
        self._db = db

    def evidence(self, ids: list[str] | None) -> list[dict[str, Any]]:
        if ids:
            marks = ",".join("?" * len(ids))
            return self._db.rows(f"SELECT {self.COLUMNS} FROM dim_evidence WHERE evidence_id IN ({marks}) ORDER BY evidence_id",
                                 tuple(ids))
        return self._db.rows(f"SELECT {self.COLUMNS} FROM dim_evidence ORDER BY evidence_id")


class SqliteCaseStudyRepository:
    def __init__(self, db: SqliteWarehouse):
        self._db = db

    def case_studies(self, region: str | None) -> list[CaseStudy]:
        sql = "SELECT c.case_id, c.case_type, r.code AS region, c.metric, c.value FROM fact_case_metric c JOIN dim_region r USING (region_key)"
        rows = self._db.rows(sql + " WHERE r.code = ?", (region,)) if region and region != "sahel" else self._db.rows(sql)
        cases: dict[tuple, dict] = {}
        for r in rows:
            cases.setdefault((r["case_id"], r["case_type"], r["region"]), {})[r["metric"]] = r["value"]
        return [CaseStudy(cid, ctype, reg, metrics) for (cid, ctype, reg), metrics in sorted(cases.items())]


class SqliteBuildInfoRepository:
    def __init__(self, db: SqliteWarehouse):
        self._db = db

    def latest(self) -> dict[str, Any] | None:
        b = self._db.one("SELECT * FROM meta_build ORDER BY built_at DESC LIMIT 1")
        if b:
            b["inputs"], b["row_counts"] = json.loads(b["inputs"]), json.loads(b["row_counts"])
        return b


class SqliteDatasetReferenceRepository:
    def __init__(self, db: SqliteWarehouse):
        self._db = db

    def references(self) -> list[dict[str, Any]]:
        return self._db.rows("SELECT code, name, version, agency, doi FROM dim_dataset ORDER BY dataset_key")
