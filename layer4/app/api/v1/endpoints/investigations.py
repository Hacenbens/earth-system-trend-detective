from fastapi import APIRouter, Depends

from app.api.deps import get_store
from app.schemas.investigation import Investigation
from app.services.storage import InvestigationStore

router = APIRouter(prefix="/investigations", tags=["investigations"])


@router.get("", response_model=list[str])
def list_investigations(store: InvestigationStore = Depends(get_store)) -> list[str]:
    return store.list_ids()


@router.get("/{investigation_id}", response_model=Investigation)
def get_investigation(investigation_id: str, store: InvestigationStore = Depends(get_store)) -> Investigation:
    """The full document: every layer's section written so far."""
    return store.load(investigation_id)
