"""Run-time settings, read once from the environment (12-factor). One typed, immutable object; no global lookups of
os.environ elsewhere in the backend.

Variable                 Default                                         Meaning
TREND_DETECTIVE_DB       data/warehouse/trend_detective.sqlite           warehouse built by `make warehouse`
TREND_DETECTIVE_STORE    data/app/investigations                         investigation JSON documents
LOG_LEVEL                INFO                                            DEBUG | INFO | WARNING | ERROR
LOG_FORMAT               json                                            json | text
LOG_FILE                 (none)                                          optional rotating log file
CORS_ORIGINS             *                                               comma-separated list of allowed origins
"""
from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from .enums import LogFormat

PROJECT_ROOT = Path(__file__).resolve().parents[4]
API_TITLE = "Earth System Trend Detective API"
API_VERSION = "0.3.0"


@dataclass(frozen=True)
class Settings:
    warehouse_path: Path
    investigations_dir: Path
    log_level: str
    log_format: LogFormat
    log_file: Path | None
    cors_origins: tuple[str, ...]
    api_title: str = API_TITLE
    api_version: str = API_VERSION

    @classmethod
    def from_env(cls, env: dict[str, str] | None = None) -> "Settings":
        e = os.environ if env is None else env
        fmt = e.get("LOG_FORMAT", LogFormat.JSON).lower()
        level = e.get("LOG_LEVEL", "INFO").upper()
        if fmt not in tuple(LogFormat):
            raise ValueError(f"LOG_FORMAT must be one of {[f.value for f in LogFormat]}, got {fmt!r}")
        if level not in ("DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"):
            raise ValueError(f"invalid LOG_LEVEL {level!r}")
        return cls(
            warehouse_path=Path(e.get("TREND_DETECTIVE_DB", PROJECT_ROOT / "data" / "warehouse" / "trend_detective.sqlite")),
            investigations_dir=Path(e.get("TREND_DETECTIVE_STORE", PROJECT_ROOT / "data" / "app" / "investigations")),
            log_level=level,
            log_format=LogFormat(fmt),
            log_file=Path(e["LOG_FILE"]) if e.get("LOG_FILE") else None,
            cors_origins=tuple(o.strip() for o in e.get("CORS_ORIGINS", "*").split(",") if o.strip()),
        )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings.from_env()
