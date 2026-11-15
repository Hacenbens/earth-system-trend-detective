"""Read-only access to the warehouse (data/warehouse/trend_detective.sqlite, built by `make warehouse`).

Drafted with AI assistance (Claude Code). See docs/submission/si_usage.md.
"""
import math
import os
import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
DB_PATH = Path(os.environ.get("TREND_DETECTIVE_DB", ROOT / "data" / "warehouse" / "trend_detective.sqlite"))


def connect() -> sqlite3.Connection:
    if not DB_PATH.exists():
        raise RuntimeError(f"Warehouse not found at {DB_PATH}. Build it with `make warehouse`.")
    con = sqlite3.connect(f"file:{DB_PATH}?mode=ro", uri=True, check_same_thread=False)
    con.row_factory = sqlite3.Row
    return con


_CON = None


def con() -> sqlite3.Connection:
    global _CON
    if _CON is None:
        _CON = connect()
    return _CON


def clean(v):
    """JSON-safe value (NaN/inf -> None)."""
    if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
        return None
    return v


def rows(sql: str, params=()) -> list[dict]:
    return [{k: clean(r[k]) for r in [row] for k in r.keys()} for row in con().execute(sql, params).fetchall()]


def one(sql: str, params=()) -> dict | None:
    r = rows(sql, params)
    return r[0] if r else None
