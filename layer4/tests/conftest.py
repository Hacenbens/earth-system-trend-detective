import shutil
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.api.deps import get_prepared_root, get_store
from app.main import app
from app.services.storage import InvestigationStore

DATA = Path(__file__).resolve().parents[1] / "data"


@pytest.fixture
def data_dir(tmp_path: Path) -> Path:
    """A throw-away copy of data/ without the prepared series (tests write their own)."""
    target = tmp_path / "data"
    shutil.copytree(DATA, target, ignore=shutil.ignore_patterns("prepared"))
    return target


@pytest.fixture
def client(data_dir: Path):
    app.dependency_overrides[get_store] = lambda: InvestigationStore(data_dir / "app" / "investigations")
    app.dependency_overrides[get_prepared_root] = lambda: data_dir / "prepared"
    yield TestClient(app)
    app.dependency_overrides.clear()
