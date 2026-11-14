"""IMERG V07 Final monthly, Sahel box, full record 1998-01 .. 2025-09 -> data/processed/sahel_imerg_final_monthly_1998_2025.csv

Drafted with AI assistance (Claude Code). See docs/submission/si_usage.md.
Usage:  .venv/bin/python scripts/fetch_imerg_final_monthly.py   (needs Earthdata credentials in .env or ~/.netrc)
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))
from earth_detective.imerg import series  # noqa: E402

df = series("GPM_3IMERGM", "1998-01-01", "2025-09-30")
df = df.rename(columns={"rate": "mm_per_hr"})
df["mm"] = df.mm_per_hr * df.date.dt.days_in_month * 24
out = ROOT / "data" / "processed" / "sahel_imerg_final_monthly_1998_2025.csv"
df.to_csv(out, index=False, float_format="%.5f")
print(f"{len(df)} months, {df.date.min():%Y-%m}..{df.date.max():%Y-%m}, min valid cells {df.valid_cells.min()} -> {out}")
print("check Aug 2024:", df.loc[df.date == "2024-08-01", "mm_per_hr"].round(4).tolist(), "(expected 0.2404)")
