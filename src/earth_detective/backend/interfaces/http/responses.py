"""The single place where a Result becomes an HTTP response."""
from __future__ import annotations

import logging

from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse, PlainTextResponse, Response

from ...domain.result import AppError, ErrorKind, Result
from ...infrastructure.logging_config import request_id_var

log = logging.getLogger(__name__)

STATUS = {ErrorKind.NOT_FOUND: 404, ErrorKind.VALIDATION: 422, ErrorKind.CONFLICT: 409, ErrorKind.NOT_AVAILABLE: 422,
          ErrorKind.UNAUTHORIZED: 401, ErrorKind.PAYLOAD_TOO_LARGE: 413, ErrorKind.RATE_LIMITED: 429,
          ErrorKind.CAPACITY: 503, ErrorKind.UNEXPECTED: 500}


class ApiError(Exception):
    """Raised by FastAPI dependencies (which cannot return a Result); turned into the uniform error body by a handler."""
    def __init__(self, error: AppError, headers: dict[str, str] | None = None):
        super().__init__(error.message)
        self.error, self.headers = error, headers or {}


def error_response(err: AppError, headers: dict[str, str] | None = None) -> JSONResponse:
    status = STATUS[err.kind]
    (log.error if status >= 500 else log.info)("request failed", extra={"event": "request.error", "kind": err.kind.value,
                                                                        "status": status, "error_message": err.message})
    return JSONResponse(status_code=status, content={"error": {"kind": err.kind.value, "message": err.message,
                                                               "details": jsonable_encoder(err.details), "request_id": request_id_var.get()}},
                        headers=headers)


def to_response(result: Result, status_code: int = 200) -> Response:
    if not result.is_ok:
        return error_response(result.error)
    return JSONResponse(status_code=status_code, content=jsonable_encoder(result.value))


def to_text(result: Result, media_type: str = "text/csv") -> Response:
    if not result.is_ok:
        return error_response(result.error)
    return PlainTextResponse(result.value, media_type=media_type)
