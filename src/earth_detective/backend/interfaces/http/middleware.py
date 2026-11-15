"""Request ID + access log middleware, and the handler for unexpected faults."""
from __future__ import annotations

import logging
import time
import uuid

from fastapi import Request
from fastapi.exceptions import RequestValidationError
from starlette.middleware.base import BaseHTTPMiddleware

from ...domain.result import AppError
from ...infrastructure.logging_config import request_id_var
from .responses import error_response

log = logging.getLogger("earth_detective.backend.access")


class RequestContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        rid = (request.headers.get("X-Request-ID") or uuid.uuid4().hex[:12])[:64]
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
            response.headers["X-Request-ID"] = rid
            log.info("request", extra={"event": "http.access", "method": request.method, "path": request.url.path,
                                       "query": str(request.url.query) or None, "status": response.status_code, "duration_ms": ms})
            return response
        finally:
            request_id_var.reset(token)


async def unexpected_error_handler(request: Request, exc: Exception):
    logging.getLogger("earth_detective.backend.errors").exception(
        "unhandled error", extra={"event": "http.unhandled", "path": request.url.path, "error_type": type(exc).__name__})
    return error_response(AppError.unexpected("internal error; see server logs with this request_id"))


async def validation_error_handler(request: Request, exc: RequestValidationError):
    details = [{"loc": list(e.get("loc", ())), "msg": e.get("msg")} for e in exc.errors()]
    return error_response(AppError.validation("request body or parameters are invalid", errors=details))
