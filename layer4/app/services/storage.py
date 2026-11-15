"""Investigation documents stored as JSON files (MVP: no database).

data/app/investigations/<id>.json  ->  one Investigation document.
"""
import json
import os
import re
import tempfile
from pathlib import Path

from app.schemas.investigation import Investigation

_SAFE_ID = re.compile(r"^[A-Za-z0-9_-]{1,64}$")


class InvestigationNotFound(Exception):
    def __init__(self, investigation_id: str):
        super().__init__(f"Investigation '{investigation_id}' not found")
        self.investigation_id = investigation_id


class InvestigationStore:
    def __init__(self, folder: Path):
        self.folder = folder
        self.folder.mkdir(parents=True, exist_ok=True)

    def _path(self, investigation_id: str) -> Path:
        # The id comes from the URL: refuse anything that could escape the folder.
        if not _SAFE_ID.match(investigation_id):
            raise InvestigationNotFound(investigation_id)
        return self.folder / f"{investigation_id}.json"

    def list_ids(self) -> list[str]:
        return sorted(p.stem for p in self.folder.glob("*.json"))

    def load(self, investigation_id: str) -> Investigation:
        path = self._path(investigation_id)
        if not path.exists():
            raise InvestigationNotFound(investigation_id)
        return Investigation.model_validate_json(path.read_text(encoding="utf-8"))

    def save(self, investigation: Investigation) -> None:
        """Write to a temp file then rename, so a crash never leaves half a JSON file."""
        path = self._path(investigation.id)
        data = investigation.model_dump(mode="json", exclude_none=False)
        fd, tmp = tempfile.mkstemp(dir=self.folder, suffix=".tmp")
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        os.replace(tmp, path)
