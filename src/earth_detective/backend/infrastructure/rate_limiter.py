"""In-process sliding-window rate limiter (one API process; for several workers use a shared store such as Redis).
Drafted with AI assistance (Claude Code). See docs/submission/si_usage.md."""
from __future__ import annotations

import threading
import time
from collections import deque
from typing import Callable


class SlidingWindowRateLimiter:
    """At most `limit` hits per `window` seconds for each key (client IP). Thread-safe; idle keys are pruned."""

    def __init__(self, limit: int, window: float, clock: Callable[[], float] = time.monotonic, prune_every: int = 1000):
        if limit <= 0 or window <= 0:
            raise ValueError("limit and window must be > 0")
        self._limit, self._window, self._clock, self._prune_every = limit, window, clock, prune_every
        self._hits: dict[str, deque[float]] = {}
        self._lock = threading.Lock()
        self._calls = 0

    @property
    def limit(self) -> int:
        return self._limit

    def hit(self, key: str) -> tuple[bool, int]:
        """Record one request. Returns (allowed, retry_after_seconds); a refused request is not counted."""
        now = self._clock()
        with self._lock:
            self._calls += 1
            if self._calls % self._prune_every == 0:
                self._prune(now)
            q = self._hits.setdefault(key, deque())
            while q and q[0] <= now - self._window:
                q.popleft()
            if len(q) >= self._limit:
                return False, max(1, int(q[0] + self._window - now + 0.999))
            q.append(now)
            return True, 0

    def _prune(self, now: float) -> None:
        for k in [k for k, q in self._hits.items() if not q or q[-1] <= now - self._window]:
            del self._hits[k]

    def tracked_keys(self) -> int:
        return len(self._hits)
