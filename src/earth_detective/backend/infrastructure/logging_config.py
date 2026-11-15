"""Logging system: structured JSON (default) or readable text lines, request-ID correlation, optional file.

Environment:
  LOG_LEVEL   DEBUG | INFO (default) | WARNING | ERROR
  LOG_FORMAT  json (default) | text
  LOG_FILE    optional path; logs are also written there (rotating, 5 x 5 MB)
Every record carries the current request ID (contextvar set by the HTTP middleware) and any `extra=` fields.
"""
from __future__ import annotations

import contextvars
import json
import logging
import logging.handlers
import os
import sys
from datetime import datetime, timezone

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


def configure_logging(level: str | None = None, fmt: str | None = None, logfile: str | None = None) -> None:
    level = (level or os.environ.get("LOG_LEVEL", "INFO")).upper()
    formatter = TextFormatter() if (fmt or os.environ.get("LOG_FORMAT", "json")).lower() == "text" else JsonFormatter()
    handlers: list[logging.Handler] = [logging.StreamHandler(sys.stdout)]
    logfile = logfile or os.environ.get("LOG_FILE")
    if logfile:
        handlers.append(logging.handlers.RotatingFileHandler(logfile, maxBytes=5_000_000, backupCount=5, encoding="utf-8"))
    root = logging.getLogger("earth_detective")
    root.handlers.clear()
    for h in handlers:
        h.setFormatter(formatter)
        h.addFilter(RequestIdFilter())
        root.addHandler(h)
    root.setLevel(level)
    root.propagate = False
    for noisy in ("uvicorn.access",):   # replaced by our own access log (with request id and duration)
        logging.getLogger(noisy).disabled = True
