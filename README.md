# Earth System Trend Detective

NASA Space Apps 2026: *Earth Science Data Trend Detective* challenge.

Pick a variable, a region and a time period. The app builds the time series, tests whether the trend is statistically significant, and then investigates the atmospheric structure and physical mechanisms that could explain it.

## Workspace
```
docs/
  challenge/        challenge brief, judging criteria, submission rules (source material + CHALLENGE_SUMMARY.md)
  decisions/        DECISIONS.md: decision log (read this first)
  research/         project_framework.md, dataset_inventory.md, evidence_ledger.md, literature.md
  submission/       si_usage.md (AI policy log), nasa_data_used.md
  team/             Team_Briefing_v0.1.pdf (team read + feedback), build_briefing.py (regenerate: needs reportlab)
    contribution/   teammates' feedback and research contributions (drop new files here)
scripts/            data fetch scripts (IMERG via NASA OPeNDAP, CHIRPS cross-check)
notebooks/          scientific prototypes (phase 02–04)
src/earth_detective/  core library: data access, harmonisation, trend statistics
data/raw|processed/ local data (git-ignored)
outputs/figures/    charts and maps for the app and slides
```

## Getting started
1. **Python env** (Python 3.12):
   ```bash
   uv venv .venv && uv pip install --python .venv/bin/python -r requirements.txt
   # or: python -m venv .venv && .venv/bin/pip install -r requirements.txt
   ```
2. **NASA Earthdata login** (needed for IMERG): create an account at https://urs.earthdata.nasa.gov, then put your credentials in `~/.netrc`:
   ```
   machine urs.earthdata.nasa.gov login <your_user> password <your_password>
   ```
   (`chmod 600 ~/.netrc`). Never commit credentials. `.netrc` and `.env` are git-ignored.
3. **Reproduce the data** (outputs go to `data/processed/`):
   ```bash
   .venv/bin/python scripts/fetch_sahel_series.py      # IMERG V07 Final monthly + Late daily, Sahel box, 2024–2026
   .venv/bin/python -u scripts/fetch_chirps_sahel.py   # CHIRPS v3 JJAS 1998–2026 (independent cross-check, no login)
   ```

## Team rules
- **Read `docs/decisions/DECISIONS.md` first.** Change scope only via a new decision entry. Never edit an accepted one.
- **Every claim** shown in the app or slides needs a row in `docs/research/evidence_ledger.md`. Cite only papers marked `READ` in `literature.md`.
- **AI use must be logged** in `docs/submission/si_usage.md` (Space Apps rule): which tool, for what, and who reviewed it.
- Work on a branch (`git switch -c <name>/<topic>`) and open a pull request into `main`.
- Data files (`data/raw`, `data/processed`, `*.nc`, `*.HDF5`, `*.tif`) are not committed. Regenerate them with the scripts.

## Status
- Phase 01 (scientific framing): done. Decisions D-001…D-013.
- Phase 02 (data verification): IMERG V07 pipeline checked against Giovanni and CHIRPS v3 (see `dataset_inventory.md`, ledger E-004).
- Next: IMERG Final JJAS 1998–2025 series and first trend test (Mann–Kendall + Sen's slope).
