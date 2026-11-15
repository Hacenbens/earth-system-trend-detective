"""Investigation store (MVP, decision in docs/app/api_contract.md): one JSON document per investigation in
data/app/investigations/<id>.json, with the shape of the layer-contract entities. Git-ignored runtime data.

Drafted with AI assistance (Claude Code). See docs/submission/si_usage.md.
"""
import json
import os
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path

from .db import ROOT

DIR = Path(os.environ.get("TREND_DETECTIVE_STORE", ROOT / "data" / "app" / "investigations"))
_ID = re.compile(r"^[a-f0-9]{12}$")


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def new_id() -> str:
    return uuid.uuid4().hex[:12]


def path(inv_id: str) -> Path:
    if not _ID.match(inv_id):
        raise KeyError(inv_id)
    return DIR / f"{inv_id}.json"


def save(doc: dict) -> dict:
    DIR.mkdir(parents=True, exist_ok=True)
    doc["updated_at"] = now()
    tmp = path(doc["id"]).with_suffix(".tmp")
    tmp.write_text(json.dumps(doc, indent=2, ensure_ascii=False))
    tmp.replace(path(doc["id"]))
    return doc


def load(inv_id: str) -> dict:
    p = path(inv_id)
    if not p.exists():
        raise KeyError(inv_id)
    return json.loads(p.read_text())


def list_all() -> list[dict]:
    if not DIR.exists():
        return []
    out = []
    for p in sorted(DIR.glob("*.json")):
        d = json.loads(p.read_text())
        out.append({"id": d["id"], "name": d["config"]["name"], "created_at": d["created_at"], "layers_done": sorted(d.get("layers", {}))})
    return out
