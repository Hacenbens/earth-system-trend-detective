from fastapi import APIRouter

from app.api.v1.endpoints import health, investigations, project

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(investigations.router)
api_router.include_router(project.router)
