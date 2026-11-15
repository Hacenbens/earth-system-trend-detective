"""Application settings (Layer 4 only). No secrets are needed.

EARTH_DATA_DIR can point the app at another data folder (tests use a temporary copy).
"""
import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]


@dataclass(frozen=True)
class Settings:
    app_name: str
    api_prefix: str
    data_dir: Path

    @property
    def investigations_dir(self) -> Path:
        # Team contract: one JSON document per investigation, no database in the MVP.
        return self.data_dir / "app" / "investigations"


@lru_cache
def get_settings() -> Settings:
    data_dir = Path(os.getenv("EARTH_DATA_DIR", PROJECT_ROOT / "data"))
    return Settings(app_name="Earth System Trend Detective API - Layer 4", api_prefix="/api/v1",
                    data_dir=data_dir.resolve())
