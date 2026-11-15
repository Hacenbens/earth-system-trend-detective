"""Run-time settings, read once from the environment (12-factor). One typed, immutable object; no global lookups of
os.environ elsewhere in the backend.

Variable                 Default                                         Meaning
TREND_DETECTIVE_DB       data/warehouse/trend_detective.sqlite           warehouse built by `make warehouse`
TREND_DETECTIVE_STORE    data/app/investigations                         investigation JSON documents
LOG_LEVEL                INFO                                            DEBUG | INFO | WARNING | ERROR
LOG_FORMAT               json                                            json | text
LOG_FILE                 (none)                                          optional rotating log file
CORS_ORIGINS             *                                               comma-separated list of allowed origins
RATE_LIMIT_PER_MINUTE    120                                             requests per client IP per minute (all endpoints)
RATE_LIMIT_HEAVY_PER_MINUTE 20                                          per client IP per minute: create, detect, investigate, project
MAX_BODY_BYTES           32768                                           larger request bodies are refused (413)
MAX_INVESTIGATIONS       500                                             storage cap; new investigations refused when full (503)
INVESTIGATION_TTL_DAYS   7                                               investigations older than this are deleted on create
TEAM_API_KEY             (none)                                          when set, POST /explain requires header X-API-Key
TRUST_PROXY_HEADERS      false                                           client IP from X-Forwarded-For (only behind your own proxy)
DEEPSEEK_API_KEY         (none)                                          enables POST /narrative (LLM over the warehouse)
LLM_BASE_URL             https://api.deepseek.com                        any OpenAI-compatible chat-completions endpoint
LLM_MODEL                deepseek-chat                                   model name
LLM_RATE_LIMIT_PER_HOUR  10                                              narrative requests per client IP per hour
LLM_MAX_CALLS_PER_DAY    200                                             narratives generated per day (cost cap; cached ones are free)

Values come from the process environment, then from the git-ignored .env at the project root for names not set there
(the environment always wins). Set TREND_DETECTIVE_ENV_FILE to use another file, or to an empty string to skip it.
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
    rate_limit_per_minute: int = 120
    rate_limit_heavy_per_minute: int = 20
    max_body_bytes: int = 32_768
    max_investigations: int = 500
    investigation_ttl_days: int = 7
    team_api_key: str | None = None
    trust_proxy_headers: bool = False
    llm_api_key: str | None = None
    llm_base_url: str = "https://api.deepseek.com"
    llm_model: str = "deepseek-chat"
    llm_rate_limit_per_hour: int = 10
    llm_max_calls_per_day: int = 200
    api_title: str = API_TITLE
    api_version: str = API_VERSION

    @classmethod
    def from_env(cls, env: dict[str, str] | None = None) -> "Settings":
        e = {**read_env_file(_env_file_path()), **os.environ} if env is None else env
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
            rate_limit_per_minute=_positive_int(e, "RATE_LIMIT_PER_MINUTE", 120),
            rate_limit_heavy_per_minute=_positive_int(e, "RATE_LIMIT_HEAVY_PER_MINUTE", 20),
            max_body_bytes=_positive_int(e, "MAX_BODY_BYTES", 32_768),
            max_investigations=_positive_int(e, "MAX_INVESTIGATIONS", 500),
            investigation_ttl_days=_positive_int(e, "INVESTIGATION_TTL_DAYS", 7),
            team_api_key=e.get("TEAM_API_KEY") or None,
            trust_proxy_headers=e.get("TRUST_PROXY_HEADERS", "false").lower() in ("1", "true", "yes"),
            llm_api_key=e.get("DEEPSEEK_API_KEY") or None,
            llm_base_url=(e.get("LLM_BASE_URL") or "https://api.deepseek.com").rstrip("/"),
            llm_model=e.get("LLM_MODEL") or "deepseek-chat",
            llm_rate_limit_per_hour=_positive_int(e, "LLM_RATE_LIMIT_PER_HOUR", 10),
            llm_max_calls_per_day=_positive_int(e, "LLM_MAX_CALLS_PER_DAY", 200),
        )

    def describe(self) -> dict:
        """Settings safe to log (no secrets)."""
        return {"warehouse": str(self.warehouse_path), "log_level": self.log_level, "log_format": self.log_format.value,
                "cors_origins": list(self.cors_origins), "rate_limit_per_minute": self.rate_limit_per_minute,
                "rate_limit_heavy_per_minute": self.rate_limit_heavy_per_minute, "max_body_bytes": self.max_body_bytes,
                "max_investigations": self.max_investigations, "investigation_ttl_days": self.investigation_ttl_days,
                "team_api_key_set": self.team_api_key is not None, "trust_proxy_headers": self.trust_proxy_headers,
                "llm_configured": self.llm_api_key is not None, "llm_model": self.llm_model, "llm_base_url": self.llm_base_url,
                "llm_rate_limit_per_hour": self.llm_rate_limit_per_hour, "llm_max_calls_per_day": self.llm_max_calls_per_day}


def _env_file_path() -> Path | None:
    raw = os.environ.get("TREND_DETECTIVE_ENV_FILE")
    if raw == "":
        return None
    return Path(raw) if raw else PROJECT_ROOT / ".env"


def read_env_file(path: Path | None) -> dict[str, str]:
    """Minimal KEY=VALUE reader (comments, blank lines, optional `export`, matching quotes). Never executes anything."""
    if path is None or not path.is_file():
        return {}
    out: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.removeprefix("export ").strip()
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in "'\"":
            value = value[1:-1]
        if key:
            out[key] = value
    return out


def _positive_int(env, name: str, default: int) -> int:
    raw = env.get(name)
    try:
        value = int(raw) if raw not in (None, "") else default
    except ValueError:
        raise ValueError(f"{name} must be an integer, got {raw!r}") from None
    if value <= 0:
        raise ValueError(f"{name} must be > 0, got {value}")
    return value


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings.from_env()
