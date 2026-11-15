"""FastAPI entry point:  uvicorn app.main:app --reload   ->  http://127.0.0.1:8000/docs"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.services.storage import InvestigationNotFound

settings = get_settings()

app = FastAPI(title=settings.app_name, version="0.1.0")

# The light JS front-end runs on another port during the hackathon.
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


@app.exception_handler(InvestigationNotFound)
async def _not_found(_: Request, exc: InvestigationNotFound) -> JSONResponse:
    return JSONResponse(status_code=404, content={"detail": str(exc)})


app.include_router(api_router, prefix=settings.api_prefix)
