"""T-03: download the priority EarthCARE L2 files (ESA MAAP) listed in outputs/earthcare/download_list.csv.

Drafted with AI assistance (Claude Code). See docs/submission/si_usage.md.

Auth: ESA EO Sign In -> MAAP access token. The user generates the token themselves (MAAP portal) and puts it in .env as
ESA_MAAP_TOKEN. The token is read from the environment / .env and never printed. No password is used here.
Usage : .venv/bin/python scripts/fetch_earthcare.py [--all]     (default: priority-1 files only)
Output: data/raw/earthcare/<file>.h5 (git-ignored). Existing files are skipped.
"""
import os
import sys
from pathlib import Path

import pandas as pd
import requests

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))
from earth_detective.auth import load_env

load_env()
TOKEN = os.environ.get("ESA_MAAP_TOKEN")
if not TOKEN:
    sys.exit("ESA_MAAP_TOKEN is missing: generate a token in the ESA MAAP portal (EO Sign In) and add it to .env")

OUT = ROOT / "data" / "raw" / "earthcare"
OUT.mkdir(parents=True, exist_ok=True)
dl = pd.read_csv(ROOT / "outputs" / "earthcare" / "download_list.csv")
if "--all" not in sys.argv:
    dl = dl[dl.priority.str.startswith("1")]

s = requests.Session()
s.headers["Authorization"] = f"Bearer {TOKEN}"
for r in dl.itertuples():
    dest = OUT / (r.file + ".h5")
    if dest.exists():
        print(f"skip {dest.name}")
        continue
    with s.get(r.download_h5, stream=True, timeout=600) as resp:
        if resp.status_code in (401, 403):
            sys.exit(f"HTTP {resp.status_code}: the token was refused (expired, wrong type, or no access). Generate a new one.")
        resp.raise_for_status()
        tmp = dest.with_suffix(".part")
        with open(tmp, "wb") as fh:
            for chunk in resp.iter_content(1 << 20):
                fh.write(chunk)
        tmp.rename(dest)
    print(f"ok   {dest.name}  {dest.stat().st_size / 1e6:.1f} MB  ({r.case})", flush=True)
print("done")
