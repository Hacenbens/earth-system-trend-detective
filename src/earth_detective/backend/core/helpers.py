"""Small pure helpers used by several layers (standard library only)."""
from __future__ import annotations

import math
import re
import uuid
from collections.abc import Sequence
from datetime import datetime, timezone

from .constants import INVESTIGATION_ID_LENGTH, REQUEST_ID_LENGTH, REQUEST_ID_MAX_LENGTH

_ID_PATTERN = re.compile(rf"^[a-f0-9]{{{INVESTIGATION_ID_LENGTH}}}$")


def utc_now_iso() -> str:
    """Current UTC time, ISO 8601 to the second."""
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def new_investigation_id() -> str:
    return uuid.uuid4().hex[:INVESTIGATION_ID_LENGTH]


def is_valid_investigation_id(value: str | None) -> bool:
    return bool(value) and bool(_ID_PATTERN.match(value))


def new_request_id(incoming: str | None = None) -> str:
    """Reuse a caller's request id (truncated) or create one."""
    return (incoming or uuid.uuid4().hex[:REQUEST_ID_LENGTH])[:REQUEST_ID_MAX_LENGTH]


def json_safe(value):
    """NaN and infinity are not valid JSON: map them to None."""
    if isinstance(value, float) and (math.isnan(value) or math.isinf(value)):
        return None
    return value


def linear_detrend(years: Sequence[float], values: Sequence[float]) -> list[float]:
    """Residuals of an ordinary least-squares line (pure Python, used before year-to-year correlations)."""
    n = len(years)
    if n < 2:
        return [0.0] * n
    mx, my = sum(years) / n, sum(values) / n
    sxx = sum((x - mx) ** 2 for x in years)
    slope = sum((x - mx) * (y - my) for x, y in zip(years, values)) / sxx if sxx else 0.0
    return [y - (my + slope * (x - mx)) for x, y in zip(years, values)]


def mean(values: Sequence[float]) -> float:
    return sum(values) / len(values) if values else float("nan")


def rms(values: Sequence[float]) -> float:
    return (sum(v * v for v in values) / len(values)) ** 0.5 if values else float("nan")
