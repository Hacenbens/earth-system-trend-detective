"""FastAPI application factory. Run: make api   (uvicorn earth_detective.backend.interfaces.http.app:app --app-dir src)"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware

from ...infrastructure.logging_config import configure_logging
from .container import get_container
from .middleware import RequestContextMiddleware, unexpected_error_handler, validation_error_handler
from .routers import catalogue, investigations

log = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    get_container()  # fail fast (and log) if the warehouse is missing
    log.info("api started", extra={"event": "app.started", "version": app.version})
    yield
    log.info("api stopped", extra={"event": "app.stopped"})


def create_app() -> FastAPI:
    configure_logging()
    app = FastAPI(lifespan=lifespan, title="Earth System Trend Detective API", version="0.2.0",
                  description="Detect -> Investigate -> Explain -> Project -> Solve. NASA Space Apps 2026. Clean architecture; "
                              "every error is {error: {kind, message, details, request_id}}. Associations are not causes; scenarios are not forecasts.")
    app.add_middleware(RequestContextMiddleware)
    app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["GET", "POST"], allow_headers=["*"], expose_headers=["X-Request-ID"])
    app.add_exception_handler(RequestValidationError, validation_error_handler)
    app.add_exception_handler(Exception, unexpected_error_handler)
    app.include_router(catalogue.router)
    app.include_router(investigations.router)

    @app.get("/health", tags=["meta"])
    def health():
        b = get_container().build_info.execute()
        return {"status": "ok", "warehouse_built_at": b.value.get("built_at") if b.is_ok else None,
                "warehouse_git_commit": b.value.get("git_commit") if b.is_ok else None}

    return app


app = create_app()
