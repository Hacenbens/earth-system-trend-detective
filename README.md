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
2. **NASA Earthdata login** (needed for IMERG): create an account at https://urs.earthdata.nasa.gov, then:
   ```bash
   cp .env.example .env    # then fill in EARTHDATA_USERNAME and EARTHDATA_PASSWORD in .env
   chmod 600 .env
   ```
   `.env` is git-ignored. Never commit credentials. The scripts read `.env` first, then fall back to `~/.netrc`
   (`machine urs.earthdata.nasa.gov login <user> password <pass>`) if you prefer that.
3. **Reproduce the data** (outputs go to `data/processed/`):
   ```bash
   .venv/bin/python scripts/fetch_sahel_series.py      # IMERG V07 Final monthly + Late daily, Sahel box, 2024–2026
   .venv/bin/python -u scripts/fetch_chirps_sahel.py   # CHIRPS v3 JJAS 1998–2026 (independent cross-check, no login)
   ```

## Run the app backend
```bash
make warehouse        # build data/warehouse/trend_detective.sqlite from the committed CSVs (~10 s)
make api              # API on http://127.0.0.1:8000, interactive docs at http://127.0.0.1:8000/docs
```
Endpoints follow `docs/app/api_contract.md`; data model: `docs/app/data_model.md`; architecture (clean architecture, SOLID, Result pattern, logging): `docs/app/backend_architecture.md`. Tests: `make test`.

## Team rules
- **Read `docs/decisions/DECISIONS.md` first.** Change scope only via a new decision entry. Never edit an accepted one.
- **Every claim** shown in the app or slides needs a row in `docs/research/evidence_ledger.md`. Cite only papers marked `READ` in `literature.md`.
- **AI use must be logged** in `docs/submission/si_usage.md` (Space Apps rule): which tool, for what, and who reviewed it.
- Work on a branch (`git switch -c <name>/<topic>`) and open a pull request into `main`.
- Raw data (`data/raw`, `*.nc`, `*.HDF5`, `*.tif`) is not committed. Regenerate it with the scripts. Small derived CSVs in `data/processed/` **are** committed so the team can work without an Earthdata account. Keep them small (no large files).

## Status
- Phase 01 (scientific framing): done. Decisions D-001…D-013.
- Phase 02 (data verification): IMERG V07 pipeline checked against Giovanni and CHIRPS v3 (see `dataset_inventory.md`, ledger E-004).
- Next: IMERG Final JJAS 1998–2025 series and first trend test (Mann–Kendall + Sen's slope).
