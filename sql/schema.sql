-- Earth System Trend Detective: analytical warehouse (star schema), SQLite.
-- Built by scripts/build_warehouse.py from data/processed/*.csv and project metadata. Rebuild: `make warehouse`.
-- Drafted with AI assistance (Claude Code). See docs/submission/si_usage.md. Documentation: docs/app/data_model.md

PRAGMA foreign_keys = ON;

-- ============================================================ DIMENSIONS
CREATE TABLE dim_time (
    time_key        INTEGER PRIMARY KEY,      -- YYYYMM for a month; YYYY00 for a season (e.g. 202400 = JJAS 2024)
    grain           TEXT NOT NULL CHECK (grain IN ('month', 'season')),
    year            INTEGER NOT NULL,
    month           INTEGER,                  -- 1-12 for grain = month, NULL for a season
    season          TEXT,                     -- 'JJAS' when the month is in June-September, or for a season row
    date_start      TEXT NOT NULL,            -- ISO date of the first day covered
    satellite_era   TEXT NOT NULL             -- 'TRMM' (< 2014) or 'GPM' (>= 2014): IMERG input-constellation era
);

CREATE TABLE dim_region (
    region_key      INTEGER PRIMARY KEY,
    code            TEXT NOT NULL UNIQUE,     -- sahel | west | central | east
    name            TEXT NOT NULL,
    lat_min REAL NOT NULL, lat_max REAL NOT NULL, lon_min REAL NOT NULL, lon_max REAL NOT NULL,
    status          TEXT NOT NULL,            -- e.g. 'provisional (D-003b)'
    geojson         TEXT NOT NULL             -- polygon for map display
);

CREATE TABLE dim_dataset (
    dataset_key     INTEGER PRIMARY KEY,
    code            TEXT NOT NULL UNIQUE,     -- e.g. imerg_final_monthly
    product         TEXT NOT NULL,            -- provider short name, e.g. GPM_3IMERGM
    name            TEXT NOT NULL,
    version         TEXT,
    agency          TEXT NOT NULL,
    kind            TEXT NOT NULL,            -- satellite | gauge-blended | reanalysis | radar-lidar | derived
    role            TEXT NOT NULL,            -- trend | check | supporting | near-real-time | case-study
    resolution      TEXT,
    coverage_start  TEXT, coverage_end TEXT,
    access          TEXT,
    doi             TEXT,                     -- 'TO-VERIFY' where not confirmed
    is_nasa         INTEGER NOT NULL CHECK (is_nasa IN (0, 1))
);

CREATE TABLE dim_variable (
    variable_key    INTEGER PRIMARY KEY,
    code            TEXT NOT NULL UNIQUE,     -- e.g. PRCPTOT, CDD, TQV, shear_925_600
    label           TEXT NOT NULL,
    unit            TEXT NOT NULL,
    category        TEXT NOT NULL,            -- rain_amount | rain_frequency | rain_intensity | rain_regularity | moisture | circulation | dust | land | temperature
    aggregation     TEXT NOT NULL,            -- how a season value is built: 'sum' of months, 'mean' of months, 'index' (computed per season)
    description     TEXT NOT NULL
);

CREATE TABLE dim_method (
    method_key      INTEGER PRIMARY KEY,
    code            TEXT NOT NULL UNIQUE,
    name            TEXT NOT NULL,
    description     TEXT NOT NULL,
    reference       TEXT                      -- literature ID or citation (TO-VERIFY until read)
);

CREATE TABLE dim_evidence (
    evidence_key    INTEGER PRIMARY KEY,
    evidence_id     TEXT NOT NULL UNIQUE,     -- E-001 ... from docs/research/evidence_ledger.md
    claim           TEXT NOT NULL,
    status          TEXT NOT NULL,
    datasets        TEXT,                     -- ledger columns, used by the AI narrative (get_evidence tool)
    period_region   TEXT,
    statistics      TEXT,                     -- statistical evidence, incl. robustness tests
    publications    TEXT,
    alternatives    TEXT,                     -- alternative explanations
    limitations     TEXT                      -- limitations / confidence
);

CREATE TABLE dim_mechanism (
    mechanism_key   INTEGER PRIMARY KEY,
    mechanism_id    TEXT NOT NULL UNIQUE,     -- M-01 ... from data/app/mechanisms.json
    name            TEXT NOT NULL,
    description     TEXT NOT NULL,
    confidence      TEXT NOT NULL,
    interpretation  TEXT NOT NULL             -- DRAFT until reviewed by the science lead
);

-- ============================================================ FACTS
-- One measured or derived value: (time, region, dataset, variable). Grain = month or JJAS season.
CREATE TABLE fact_observation (
    time_key        INTEGER NOT NULL REFERENCES dim_time(time_key),
    region_key      INTEGER NOT NULL REFERENCES dim_region(region_key),
    dataset_key     INTEGER NOT NULL REFERENCES dim_dataset(dataset_key),
    variable_key    INTEGER NOT NULL REFERENCES dim_variable(variable_key),
    value           REAL NOT NULL,
    quality_flag    TEXT NOT NULL,            -- ok | partial (incomplete period) | suspect (see note)
    note            TEXT,
    source_file     TEXT NOT NULL,
    PRIMARY KEY (time_key, region_key, dataset_key, variable_key)
);

-- Trend of one seasonal series, recomputed by the build from fact_observation (reproducible).
CREATE TABLE fact_trend (
    region_key      INTEGER NOT NULL REFERENCES dim_region(region_key),
    dataset_key     INTEGER NOT NULL REFERENCES dim_dataset(dataset_key),
    variable_key    INTEGER NOT NULL REFERENCES dim_variable(variable_key),
    year_start      INTEGER NOT NULL,
    year_end        INTEGER NOT NULL,
    n               INTEGER NOT NULL,
    mean            REAL, sen_slope REAL, sen_ci_low REAL, sen_ci_high REAL, pct_per_decade REAL,
    mk_tau          REAL, mk_p REAL, mk_hamed_rao_p REAL, mk_yue_wang_p REAL,
    ols_slope       REAL, ols_p REAL, ar1_slope REAL, ar1_p REAL, ar1_phi REAL,
    lag1_autocorr   REAL,
    direction       TEXT NOT NULL,            -- increasing | decreasing | no_significant_trend (MK p < 0.05)
    direction_hint  TEXT NOT NULL,            -- sign of Sen's slope, shown as "tendency"
    significant     INTEGER NOT NULL,
    method_key      INTEGER NOT NULL REFERENCES dim_method(method_key),
    PRIMARY KEY (region_key, dataset_key, variable_key, year_start, year_end)
);

-- Year-to-year association between two seasonal series (detrended Spearman), recomputed by the build.
CREATE TABLE fact_relationship (
    region_key      INTEGER NOT NULL REFERENCES dim_region(region_key),
    x_dataset_key   INTEGER NOT NULL REFERENCES dim_dataset(dataset_key),
    x_variable_key  INTEGER NOT NULL REFERENCES dim_variable(variable_key),
    y_dataset_key   INTEGER NOT NULL REFERENCES dim_dataset(dataset_key),
    y_variable_key  INTEGER NOT NULL REFERENCES dim_variable(variable_key),
    year_start      INTEGER NOT NULL, year_end INTEGER NOT NULL, n INTEGER NOT NULL,
    rho             REAL NOT NULL, p_value REAL NOT NULL,
    method_key      INTEGER NOT NULL REFERENCES dim_method(method_key),
    PRIMARY KEY (region_key, x_dataset_key, x_variable_key, y_dataset_key, y_variable_key, method_key)
);

-- EarthCARE case-study metrics (process illustration, never a trend).
CREATE TABLE fact_case_metric (
    case_id         TEXT NOT NULL,            -- e.g. 2024-09-02_01495A
    time_key        INTEGER NOT NULL REFERENCES dim_time(time_key),
    region_key      INTEGER NOT NULL REFERENCES dim_region(region_key),
    dataset_key     INTEGER NOT NULL REFERENCES dim_dataset(dataset_key),
    case_type       TEXT NOT NULL,
    metric          TEXT NOT NULL,
    value           REAL,
    PRIMARY KEY (case_id, metric)
);

-- Layer 3: each expected observation of a mechanism, with its status.
CREATE TABLE fact_mechanism_expectation (
    mechanism_key   INTEGER NOT NULL REFERENCES dim_mechanism(mechanism_key),
    expectation_no  INTEGER NOT NULL,
    expectation     TEXT NOT NULL,
    observed        TEXT NOT NULL,
    status          TEXT NOT NULL CHECK (status IN ('consistent', 'inconsistent', 'unclear', 'not_tested')),
    PRIMARY KEY (mechanism_key, expectation_no)
);

-- Bridge: which evidence supports or contradicts a mechanism (many-to-many).
CREATE TABLE bridge_mechanism_evidence (
    mechanism_key   INTEGER NOT NULL REFERENCES dim_mechanism(mechanism_key),
    evidence_key    INTEGER NOT NULL REFERENCES dim_evidence(evidence_key),
    role            TEXT NOT NULL CHECK (role IN ('supporting', 'contradicting', 'cited')),
    PRIMARY KEY (mechanism_key, evidence_key, role)
);

-- Build provenance: one row per build.
CREATE TABLE meta_build (
    built_at        TEXT NOT NULL,
    git_commit      TEXT,
    inputs          TEXT NOT NULL,            -- JSON: input file -> sha256
    row_counts      TEXT NOT NULL             -- JSON: table -> rows
);

-- ============================================================ VIEWS (what the API reads)
CREATE VIEW v_observation AS
SELECT t.year, t.month, t.grain, t.season, t.satellite_era, r.code AS region, d.code AS dataset, d.agency, d.kind AS dataset_kind,
       v.code AS variable, v.label, v.unit, v.category, o.value, o.quality_flag, o.note
FROM fact_observation o JOIN dim_time t USING (time_key) JOIN dim_region r USING (region_key)
JOIN dim_dataset d USING (dataset_key) JOIN dim_variable v USING (variable_key);

CREATE VIEW v_trend AS
SELECT r.code AS region, d.code AS dataset, v.code AS variable, v.label, v.unit, f.year_start, f.year_end, f.n,
       f.mean, f.sen_slope, f.sen_ci_low, f.sen_ci_high, f.pct_per_decade, f.mk_tau, f.mk_p, f.mk_hamed_rao_p, f.mk_yue_wang_p,
       f.ols_p, f.ar1_p, f.ar1_phi, f.lag1_autocorr, f.direction, f.direction_hint, f.significant
FROM fact_trend f JOIN dim_region r USING (region_key) JOIN dim_dataset d USING (dataset_key) JOIN dim_variable v USING (variable_key);

CREATE VIEW v_relationship AS
SELECT r.code AS region, dx.code AS x_dataset, vx.code AS x_variable, dy.code AS y_dataset, vy.code AS y_variable,
       f.year_start, f.year_end, f.n, f.rho, f.p_value, m.code AS method
FROM fact_relationship f JOIN dim_region r USING (region_key)
JOIN dim_dataset dx ON dx.dataset_key = f.x_dataset_key JOIN dim_variable vx ON vx.variable_key = f.x_variable_key
JOIN dim_dataset dy ON dy.dataset_key = f.y_dataset_key JOIN dim_variable vy ON vy.variable_key = f.y_variable_key
JOIN dim_method m ON m.method_key = f.method_key;
