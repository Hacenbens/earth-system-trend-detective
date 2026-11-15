"""Logging system: structured JSON (default) or readable text lines, request-ID correlation, optional file.

Configured from core.settings.Settings (LOG_LEVEL, LOG_FORMAT, LOG_FILE; see core/settings.py).
Every record carries the current request ID (contextvar set by the HTTP middleware) and any `extra=` fields.
"""
from __future__ import annotations

import contextvars
import json
import logging
import logging.handlers
import sys
from datetime import datetime, timezone

from ..core.constants import LOG_FILE_BACKUPS, LOG_FILE_MAX_BYTES
from ..core.enums import LogFormat
from ..core.settings import Settings

request_id_var: contextvars.ContextVar[str] = contextvars.ContextVar("request_id", default="-")

_STANDARD = set(vars(logging.LogRecord("", 0, "", 0, "", None, None))) | {"message", "asctime", "request_id"}


class RequestIdFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id_var.get()
        return True


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {"ts": datetime.fromtimestamp(record.created, timezone.utc).isoformat(timespec="milliseconds"),
                   "level": record.levelname, "logger": record.name, "msg": record.getMessage(),
                   "request_id": getattr(record, "request_id", "-")}
        payload.update({k: v for k, v in vars(record).items() if k not in _STANDARD and not k.startswith("_")})
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        return json.dumps(payload, default=str, ensure_ascii=False)


class TextFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        extra = {k: v for k, v in vars(record).items() if k not in _STANDARD and not k.startswith("_")}
        base = f"{datetime.fromtimestamp(record.created).strftime('%H:%M:%S')} {record.levelname:7s} [{getattr(record, 'request_id', '-')}] " \
               f"{record.name}: {record.getMessage()}"
        if extra:
            base += " | " + " ".join(f"{k}={v}" for k, v in extra.items())
        if record.exc_info:
            base += "\n" + self.formatException(record.exc_info)
        return base


def configure_logging(settings: Settings) -> None:
    formatter = TextFormatter() if settings.log_format == LogFormat.TEXT else JsonFormatter()
    handlers: list[logging.Handler] = [logging.StreamHandler(sys.stdout)]
    if settings.log_file:
        handlers.append(logging.handlers.RotatingFileHandler(settings.log_file, maxBytes=LOG_FILE_MAX_BYTES,
                                                             backupCount=LOG_FILE_BACKUPS, encoding="utf-8"))
    root = logging.getLogger("earth_detective")
    root.handlers.clear()
    for h in handlers:
        h.setFormatter(formatter)
        h.addFilter(RequestIdFilter())
        root.addHandler(h)
    root.setLevel(settings.log_level)
    root.propagate = False
    for noisy in ("uvicorn.access",):   # replaced by our own access log (with request id and duration)
        logging.getLogger(noisy).disabled = True
