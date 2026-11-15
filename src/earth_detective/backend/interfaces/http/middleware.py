"""Middleware: request id + access log + security headers (outer), abuse protection (inner); error handlers."""
from __future__ import annotations

import logging
import time

from fastapi import Request
from fastapi.exceptions import RequestValidationError
from starlette.middleware.base import BaseHTTPMiddleware

from ...core.constants import API_PREFIX, HEAVY_ENDPOINT_SUFFIXES, REQUEST_ID_HEADER, SECURITY_HEADERS
from ...core.helpers import new_request_id
from ...domain.result import AppError
from ...infrastructure.logging_config import request_id_var
from ...infrastructure.rate_limiter import SlidingWindowRateLimiter
from .responses import ApiError, error_response

log = logging.getLogger("earth_detective.backend.access")


class RequestContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        rid = new_request_id(request.headers.get(REQUEST_ID_HEADER))
        token = request_id_var.set(rid)
        start = time.perf_counter()
        try:
            try:
                response = await call_next(request)
            except Exception as exc:  # unexpected fault: log with traceback and answer as a Result error, same request id
                logging.getLogger("earth_detective.backend.errors").exception(
                    "unhandled error", extra={"event": "http.unhandled", "path": request.url.path, "error_type": type(exc).__name__})
                response = error_response(AppError.unexpected("internal error; see server logs with this request_id"))
            ms = round((time.perf_counter() - start) * 1000, 1)
            response.headers[REQUEST_ID_HEADER] = rid
            for k, v in SECURITY_HEADERS.items():
                response.headers.setdefault(k, v)
            log.info("request", extra={"event": "http.access", "method": request.method, "path": request.url.path,
                                       "query": str(request.url.query) or None, "status": response.status_code, "duration_ms": ms})
            return response
        finally:
            request_id_var.reset(token)


def client_ip(request: Request, trust_proxy_headers: bool) -> str:
    """Client address. X-Forwarded-For is trusted only when the API runs behind our own proxy (it is easy to forge)."""
    if trust_proxy_headers:
        fwd = request.headers.get("x-forwarded-for")
        if fwd:
            return fwd.split(",")[0].strip()[:64]
    return request.client.host if request.client else "unknown"


def is_heavy(method: str, path: str) -> bool:
    """Endpoints that run trend fits or write storage."""
    if method != "POST":
        return False
    return path.rstrip("/") == f"{API_PREFIX}/investigations" or path.endswith(HEAVY_ENDPOINT_SUFFIXES)


class ProtectionMiddleware(BaseHTTPMiddleware):
    """Refuses oversized bodies (413) and clients above the rate limits (429, with Retry-After)."""

    def __init__(self, app, *, max_body_bytes: int, limiter: SlidingWindowRateLimiter,
                 heavy_limiter: SlidingWindowRateLimiter, trust_proxy_headers: bool = False,
                 llm_limiter: SlidingWindowRateLimiter | None = None):
        super().__init__(app)
        self._max, self._limiter, self._heavy, self._trust = max_body_bytes, limiter, heavy_limiter, trust_proxy_headers
        self._llm = llm_limiter

    async def dispatch(self, request: Request, call_next):
        if request.method in ("POST", "PUT", "PATCH"):
            length = request.headers.get("content-length")
            if length is None:
                if request.headers.get("transfer-encoding"):  # chunked upload: size unknown in advance
                    return error_response(AppError.payload_too_large("a Content-Length header is required for request bodies"))
            elif not length.isdigit() or int(length) > self._max:
                return error_response(AppError.payload_too_large(f"request body above {self._max} bytes",
                                                                 max_body_bytes=self._max))
        ip = client_ip(request, self._trust)
        checks = [(self._limiter, "all")]
        if is_heavy(request.method, request.url.path):
            checks.append((self._heavy, "heavy"))
        if self._llm is not None and request.method == "POST" and request.url.path.endswith("/narrative"):
            checks.append((self._llm, "llm"))
        for limiter, scope in checks:
            ok, retry = limiter.hit(f"{scope}:{ip}")
            if not ok:
                log.warning("rate limited", extra={"event": "http.rate_limited", "scope": scope, "client": ip,
                                                   "path": request.url.path})
                return error_response(AppError.rate_limited("too many requests; slow down", scope=scope,
                                                            limit=limiter.limit, window_s=limiter.window, retry_after_s=retry),
                                      headers={"Retry-After": str(retry)})
        return await call_next(request)


async def api_error_handler(request: Request, exc: ApiError):
    return error_response(exc.error, headers=exc.headers)


async def unexpected_error_handler(request: Request, exc: Exception):
    logging.getLogger("earth_detective.backend.errors").exception(
        "unhandled error", extra={"event": "http.unhandled", "path": request.url.path, "error_type": type(exc).__name__})
    return error_response(AppError.unexpected("internal error; see server logs with this request_id"))


async def validation_error_handler(request: Request, exc: RequestValidationError):
    details = [{"loc": list(e.get("loc", ())), "msg": e.get("msg")} for e in exc.errors()]
    return error_response(AppError.validation("request body or parameters are invalid", errors=details))
