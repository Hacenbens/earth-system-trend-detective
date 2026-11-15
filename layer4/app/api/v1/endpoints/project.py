"""Layer 4 - PROJECT endpoints.

GET  /investigations/{id}/project/input     what Layer 4 can use (pre-fills the form)
POST /investigations/{id}/project/preview   compute scenarios, do NOT save (for sliders)
POST /investigations/{id}/project           compute and save in the investigation
GET  /investigations/{id}/project           the saved scenarios
"""
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_prepared_root, get_store
from app.schemas.project import Layer4Input, ProjectRequest, ProjectSection
from app.services.layer4 import engine
from app.services.storage import InvestigationStore

router = APIRouter(prefix="/investigations/{investigation_id}/project", tags=["layer 4 - project"])


def _compute(investigation_id: str, req: ProjectRequest, store: InvestigationStore, prepared_root: Path):
    inv = store.load(investigation_id)
    folder = prepared_root / investigation_id
    try:
        section = engine.build_section(inv, req, engine.load_rain(folder), engine.load_ndvi(folder))
    except engine.Layer4InputMissing as e:
        raise HTTPException(status.HTTP_409_CONFLICT, str(e)) from e
    except engine.Layer4Unprocessable as e:
        raise HTTPException(422, {"message": "cannot compute the scenarios", "missing": e.missing}) from e
    return inv, section


@router.get("/input", response_model=Layer4Input)
def read_input(investigation_id: str, store: InvestigationStore = Depends(get_store),
               prepared_root: Path = Depends(get_prepared_root)) -> Layer4Input:
    folder = prepared_root / investigation_id
    try:
        return engine.layer4_input(store.load(investigation_id), engine.load_rain(folder), engine.load_ndvi(folder))
    except engine.Layer4InputMissing as e:
        raise HTTPException(status.HTTP_409_CONFLICT, str(e)) from e


@router.post("/preview", response_model=ProjectSection)
def preview(investigation_id: str, req: ProjectRequest, store: InvestigationStore = Depends(get_store),
            prepared_root: Path = Depends(get_prepared_root)) -> ProjectSection:
    return _compute(investigation_id, req, store, prepared_root)[1]


@router.post("", response_model=ProjectSection, status_code=status.HTTP_201_CREATED)
def run(investigation_id: str, req: ProjectRequest, store: InvestigationStore = Depends(get_store),
        prepared_root: Path = Depends(get_prepared_root)) -> ProjectSection:
    inv, section = _compute(investigation_id, req, store, prepared_root)
    section.created_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
    inv.project = section
    store.save(inv)
    return section


@router.get("", response_model=ProjectSection)
def read(investigation_id: str, store: InvestigationStore = Depends(get_store)) -> ProjectSection:
    inv = store.load(investigation_id)
    if inv.project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Layer 4 has not been run for this investigation")
    return inv.project
