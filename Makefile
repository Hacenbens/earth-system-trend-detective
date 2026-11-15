# Earth System Trend Detective: reproducible pipeline.
# Drafted with AI assistance (Claude Code). See docs/submission/si_usage.md and docs/app/data_model.md.
#
#   make warehouse   rebuild the star-schema warehouse from committed data/processed CSVs (no download, ~10 s)
#   make analysis    rerun every analysis on local data (needs data/raw, created by the fetch targets)
#   make fetch       download all inputs (NASA Earthdata login in .env or ~/.netrc; CHIRPS needs no login)
#   make all         analysis + warehouse
#   make test        run the backend unit tests (in-memory adapters, no database needed)
#   make smoke       live end-to-end test against a running API (start `make api` first; PORT=8000 by default)
#   make smoke-protections  live test of rate limits, body limit, storage cap and team key (starts its own server)
#   make api         run the API on http://$(HOST):$(PORT) (docs at /docs); builds the warehouse first if missing
#                    HOST=0.0.0.0 exposes it on the network: set TEAM_API_KEY first (see docs/app/backend_architecture.md)
#
# Credentials stay in .env / ~/.netrc (git-ignored). EarthCARE needs an ESA MAAP token (see .env.example).

PY := .venv/bin/python

PORT ?= 8000
HOST ?= 127.0.0.1

.PHONY: smoke smoke-protections test api all fetch fetch-imerg fetch-imerg-daily fetch-chirps fetch-merra2 fetch-earthcare analysis cards warehouse clean-warehouse

all: analysis warehouse

# ---------- 1. acquisition (network)
fetch: fetch-imerg fetch-imerg-daily fetch-chirps fetch-merra2
fetch-imerg:
	$(PY) scripts/fetch_imerg_final_monthly.py
	$(PY) scripts/fetch_sahel_series.py
fetch-imerg-daily:
	$(PY) -u scripts/fetch_imerg_daily_box.py
fetch-chirps:
	$(PY) -u scripts/fetch_chirps_sahel.py
	$(PY) -u scripts/fetch_chirps_subregions.py
fetch-merra2:
	$(PY) -u scripts/fetch_merra2_monthly.py
fetch-earthcare:
	$(PY) scripts/earthcare_candidates.py
	$(PY) scripts/earthcare_confirm.py
	$(PY) scripts/fetch_earthcare.py

# ---------- 2. analysis (local data)
analysis:
	$(PY) scripts/analyze_jjas_trend.py
	$(PY) scripts/analyze_extremes.py
	$(PY) scripts/robustness_east.py
	$(PY) scripts/eda_correlation_maps.py
	$(PY) scripts/analyze_layer2_merra2.py
	$(PY) scripts/analyze_shear_soil.py
	$(PY) scripts/eof_composites.py
	$(PY) scripts/multivariate_extended.py
	$(PY) scripts/earthcare_cross_sections.py
	$(MAKE) cards

cards:
	$(PY) scripts/render_evidence_cards.py

# ---------- 3. warehouse (star schema for the API)
warehouse:
	$(PY) scripts/build_warehouse.py

clean-warehouse:
	rm -rf data/warehouse

# ---------- 4. API
api:
	@test -f data/warehouse/trend_detective.sqlite || $(MAKE) warehouse
	$(PY) -m uvicorn earth_detective.backend.interfaces.http.app:app --app-dir src --host $(HOST) --port $(PORT)

# ---------- 5. tests
test:
	PYTHONPATH=src $(PY) -m unittest discover -s tests -t . -v

smoke:
	$(PY) scripts/smoke_test_api.py http://127.0.0.1:$(PORT)

smoke-protections:
	$(PY) scripts/smoke_test_protections.py
