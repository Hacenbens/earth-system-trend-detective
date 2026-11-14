"""NASA Earthdata login shared by all scripts.

Drafted with AI assistance (Claude Code). See docs/submission/si_usage.md.

Order: variables already in the environment > project `.env` file > `~/.netrc`.
`.env` (git-ignored) holds EARTHDATA_USERNAME / EARTHDATA_PASSWORD; copy `.env.example` to create it.
Values are never printed.
"""
import os
from pathlib import Path

import earthaccess

ROOT = Path(__file__).resolve().parents[2]


def load_env(path: Path = ROOT / ".env") -> None:
    """Minimal .env reader (KEY=VALUE lines, # comments, optional quotes). Does not override existing variables."""
    if not path.exists():
        return
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, val = line.split("=", 1)
        key, val = key.strip().removeprefix("export ").strip(), val.strip().strip('"').strip("'")
        if val and key not in os.environ:
            os.environ[key] = val


def login():
    """Log in to Earthdata; returns the earthaccess Auth object. Raises if no credentials are found."""
    load_env()
    have_env = os.environ.get("EARTHDATA_USERNAME") and os.environ.get("EARTHDATA_PASSWORD")
    auth = earthaccess.login(strategy="environment" if have_env else "netrc")
    if not auth or not auth.authenticated:
        raise RuntimeError("Earthdata login failed: fill in .env (see .env.example) or ~/.netrc.")
    return auth


def https_session():
    login()
    return earthaccess.get_requests_https_session()
