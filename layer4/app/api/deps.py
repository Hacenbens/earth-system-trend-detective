"""FastAPI dependencies. Tests override these to use a temporary data folder."""
from pathlib import Path

from app.core.config import get_settings
from app.services.storage import InvestigationStore


def get_store() -> InvestigationStore:
    return InvestigationStore(get_settings().investigations_dir)


def get_prepared_root() -> Path:
    """data/prepared/: input series (one folder per investigation)."""
    return get_settings().data_dir / "prepared"
