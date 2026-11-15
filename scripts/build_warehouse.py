"""Build the analytical warehouse (star schema, SQLite) from the processed data. Reproducible: same inputs -> same tables.

Drafted with AI assistance (Claude Code). See docs/submission/si_usage.md.

Steps
  0. Materialise regional seasonal series that otherwise live only in git-ignored raw data (only if the raw files exist;
     otherwise the committed CSVs in data/processed/ are used).
  1. Dimensions (time, region, dataset, variable, method, evidence, mechanism).
  2. fact_observation: monthly and JJAS-season values for every dataset x region x variable.
  3. fact_trend: Mann-Kendall + Sen etc., recomputed from fact_observation seasons 1998-2025.
  4. fact_relationship: detrended Spearman between rainfall series and atmospheric drivers.
  5. fact_case_metric (EarthCARE), fact_mechanism_expectation + bridge_mechanism_evidence (Layer 3).
  6. meta_build (input hashes, git commit, row counts); CSV export of every table and view.
Output: data/warehouse/trend_detective.sqlite, data/warehouse/csv/*.csv
Usage : .venv/bin/python scripts/build_warehouse.py      (or: make warehouse)
"""
import hashlib
import json
import re
import sqlite3
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd
from scipy import stats

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))
from earth_detective import catalogue as C
from earth_detective.trend import trend_summary

P, W = ROOT / "data" / "processed", ROOT / "data" / "warehouse"
DB = W / "trend_detective.sqlite"
JJAS = (6, 7, 8, 9)
LON = {r[0]: (r[4], r[5]) for r in C.REGIONS}
inputs_used = {}


def read_csv(path, **kw):
    inputs_used[str(path.relative_to(ROOT))] = hashlib.sha256(path.read_bytes()).hexdigest()
    return pd.read_csv(path, **kw)


# ---------------------------------------------------------------- 0. materialise regional seasonal series
def materialise():
    # optional: refresh two CSVs from raw NetCDF when present (local analysis machine); the committed CSVs are used
    # otherwise, so the deployed image does not need xarray/netCDF
    pc = ROOT / "data" / "raw" / "imerg_jjas_percell_1998_2025.nc"
    out = P / "sahel_imerg_jjas_regions_1998_2025.csv"
    if pc.exists():
        import xarray as xr
        ds = xr.open_dataset(pc).load()
        rows = []
        for reg, lon in LON.items():
            f = ds.sel(lon=slice(*lon)); w = np.cos(np.deg2rad(f.lat))
            tot = f.total.weighted(w).mean(("lat", "lon")).to_series(); cdd = f.cdd.weighted(w).mean(("lat", "lon")).to_series()
            rows += [{"year": int(y), "region": reg, "rain_total_mm": tot[y], "cdd_days": cdd[y]} for y in tot.index]
        pd.DataFrame(rows).to_csv(out, index=False, float_format="%.4f")
    pl = ROOT / "data" / "raw" / "merra2_box" / "M2IMNPASM_1998_2025.nc"
    out2 = P / "sahel_merra2_shear_jjas_regions_1998_2025.csv"
    if pl.exists():
        import xarray as xr
        w_ = xr.open_dataset(pl).load(); w_ = w_.sel(time=w_.time.dt.month.isin(JJAS))
        fields = {"shear_925_600": w_.U.sel(lev=925) - w_.U.sel(lev=600), "AEJ_U600": w_.U.sel(lev=600)}
        rows = []
        for reg, lon in LON.items():
            for code, da in fields.items():
                s = da.sel(lon=slice(*lon)); s = s.weighted(np.cos(np.deg2rad(s.lat))).mean(("lat", "lon")).groupby("time.year").mean().to_series()
                rows += [{"year": int(y), "region": reg, "variable": code, "value": s[y]} for y in s.index]
        pd.DataFrame(rows).to_csv(out2, index=False, float_format="%.5f")


materialise()

# ---------------------------------------------------------------- 1. dimensions
years = range(1998, 2027)
dim_time = [(y * 100 + m, "month", y, m, "JJAS" if m in JJAS else None, f"{y}-{m:02d}-01", "GPM" if y >= 2014 else "TRMM")
            for y in years for m in range(1, 13)]
dim_time += [(y * 100, "season", y, None, "JJAS", f"{y}-06-01", "GPM" if y >= 2014 else "TRMM") for y in years]
dim_region = [(i + 1, c, n, a, b, x, z, C.REGION_STATUS, C.region_geojson(a, b, x, z)) for i, (c, n, a, b, x, z) in enumerate(C.REGIONS)]
dim_dataset = [(i + 1, *d) for i, d in enumerate(C.DATASETS)]
dim_variable = [(i + 1, *v) for i, v in enumerate(C.VARIABLES)]
dim_method = [(i + 1, *m) for i, m in enumerate(C.METHODS)]
RK = {r[1]: r[0] for r in dim_region}; DK = {d[1]: d[0] for d in dim_dataset}
VK = {v[1]: v[0] for v in dim_variable}; MK = {m[1]: m[0] for m in dim_method}

ledger = (ROOT / "docs" / "research" / "evidence_ledger.md").read_text()
inputs_used["docs/research/evidence_ledger.md"] = hashlib.sha256(ledger.encode()).hexdigest()
dim_evidence = []
clean = lambda s: re.sub(r"\*\*", "", s).strip()
for line in ledger.splitlines():
    if re.match(r"^\|\s*E-\d{3}\s*\|", line):
        # columns: ID | Claim | Dataset | Period & region | Statistics | Publications | Alternatives | Limitations | Status
        # split on " | " only: cells may contain |rho| without spaces
        cells = [clean(c) for c in re.split(r"\s\|\s", line.strip().strip("|").strip())]
        if len(cells) != 9:
            raise SystemExit(f"evidence ledger row {cells[0]!r}: expected 9 columns, got {len(cells)}")
        eid, claim, datasets, period, stat_text, pubs, alts, limits, status = cells
        dim_evidence.append((len(dim_evidence) + 1, eid, claim[:600], status, datasets, period, stat_text, pubs, alts, limits))
EK = {e[1]: e[0] for e in dim_evidence}

mech = json.loads((ROOT / "data" / "app" / "mechanisms.json").read_text())
inputs_used["data/app/mechanisms.json"] = hashlib.sha256((ROOT / "data" / "app" / "mechanisms.json").read_bytes()).hexdigest()
dim_mechanism = [(i + 1, m["mechanism_id"], m["name"], m["scientific_description"], m["confidence"], m["researcher_interpretation"])
                 for i, m in enumerate(mech["mechanisms"])]

# ---------------------------------------------------------------- 2. fact_observation
obs = []


def add(time_key, region, dataset, variable, value, src, flag="ok", note=None):
    if value is None or (isinstance(value, float) and not np.isfinite(value)):
        return
    obs.append((int(time_key), RK[region], DK[dataset], VK[variable], float(value), flag, note, src))


def add_seasons(df, region, dataset, variable, src, how="sum"):
    """df: columns date (Timestamp), value. Adds a season row only when all four JJAS months are present."""
    d = df[df.date.dt.month.isin(JJAS)]
    for y, g in d.groupby(d.date.dt.year):
        if len(g) == 4:
            add(y * 100, region, dataset, variable, g.value.sum() if how == "sum" else g.value.mean(), src)


# IMERG Final monthly, box
f = "data/processed/sahel_imerg_final_monthly_1998_2025.csv"
im = read_csv(ROOT / f, parse_dates=["date"])
for r in im.itertuples():
    add(r.date.year * 100 + r.date.month, "sahel", "imerg_final_monthly", "rain_total", r.mm, f)
add_seasons(im.rename(columns={"mm": "value"}), "sahel", "imerg_final_monthly", "rain_total", f)

# IMERG Late Run monthly (from daily), box, 2024-2026: near-real-time, never used for trends
f = "data/processed/sahel_imerg_monthly_2024_2026.csv"
lt = read_csv(ROOT / f); lt["date"] = pd.to_datetime(lt.month + "-01")
for r in lt.itertuples():
    add(r.date.year * 100 + r.date.month, "sahel", "imerg_late_daily", "rain_total", r.late_mm, f,
        "ok" if r.complete else "partial", None if r.complete else f"{r.days} of {r.days_in_month} days")
add_seasons(lt[lt.complete].rename(columns={"late_mm": "value"}), "sahel", "imerg_late_daily", "rain_total", f)

# CHIRPS v3, box and sub-regions (JJAS months only)
f = "data/processed/sahel_chirps_v3_jjas_monthly.csv"
ch = read_csv(ROOT / f, parse_dates=["date"])
for r in ch.itertuples():
    add(r.date.year * 100 + r.date.month, "sahel", "chirps_v3_monthly", "rain_total", r.chirps_mm, f)
add_seasons(ch.rename(columns={"chirps_mm": "value"}), "sahel", "chirps_v3_monthly", "rain_total", f)
f = "data/processed/sahel_chirps_v3_jjas_subregions.csv"
cs = read_csv(ROOT / f, parse_dates=["date"])
for reg in ("west", "central", "east"):
    for r in cs.itertuples():
        add(r.date.year * 100 + r.date.month, reg, "chirps_v3_monthly", "rain_total", getattr(r, reg), f)
    add_seasons(cs[["date", reg]].rename(columns={reg: "value"}), reg, "chirps_v3_monthly", "rain_total", f)

# IMERG Final daily -> season indices: box (all ETCCDI) and sub-regions (total, CDD)
f = "data/processed/sahel_jjas_extreme_indices_1998_2025.csv"
ex = read_csv(ROOT / f)
for r in ex.itertuples():
    for v in ("PRCPTOT", "wet_days", "SDII", "Rx1day", "Rx5day", "R10mm", "R20mm", "R95p", "R95pTOT", "CDD"):
        add(r.year * 100, "sahel", "imerg_final_daily", v, getattr(r, v), f,
            "suspect" if v in ("SDII", "Rx1day", "Rx5day", "R95p", "R95pTOT") else "ok",
            "daily tail not homogeneous across 2014 (E-006)" if v in ("SDII", "Rx1day", "Rx5day", "R95p", "R95pTOT") else None)
f = "data/processed/sahel_imerg_jjas_regions_1998_2025.csv"
rg = read_csv(ROOT / f)
for r in rg[rg.region != "sahel"].itertuples():
    add(r.year * 100, r.region, "imerg_final_daily", "rain_total", r.rain_total_mm, f)
    add(r.year * 100, r.region, "imerg_final_daily", "CDD", r.cdd_days, f)

# MERRA-2 monthly, box and sub-regions
f = "data/processed/sahel_merra2_monthly_1998_2025.csv"
me = read_csv(ROOT / f, parse_dates=["date"])
me["T2M_C"] = me.T2M - 273.15
me["mfc_mm_day"] = me.DQVDT_DYN * 86400
me["EF"] = me.LHLAND / (me.LHLAND + me.SHLAND)
MV = ["TQV", "QV2M", "T2M_C", "OMEGA500", "U850", "V850", "UFLXQV", "VFLXQV", "mfc_mm_day", "DUEXTTAU", "TOTEXTTAU",
      "GWETTOP", "GWETROOT", "LHLAND", "SHLAND", "EF"]
for reg, g in me.groupby("region"):
    for v in MV:
        for r in g[["date", v]].itertuples():
            sus = v in ("DUEXTTAU", "TOTEXTTAU") and r.date.year == 2025
            add(r.date.year * 100 + r.date.month, reg, "merra2_monthly", v, r[2], f,
                "suspect" if sus else "ok", "2025 aerosol values ~ -4 sigma, likely assimilation artefact (E-010)" if sus else None)
        add_seasons(g[["date", v]].rename(columns={v: "value"}), reg, "merra2_monthly", v, f, how="mean")
f = "data/processed/sahel_merra2_shear_jjas_regions_1998_2025.csv"
sh = read_csv(ROOT / f)
for r in sh.itertuples():
    add(r.year * 100, r.region, "merra2_plevel_monthly", r.variable, r.value, f)

fact_obs = pd.DataFrame(obs, columns=["time_key", "region_key", "dataset_key", "variable_key", "value", "quality_flag", "note", "source_file"])
dup = fact_obs.duplicated(["time_key", "region_key", "dataset_key", "variable_key"])
assert not dup.any(), fact_obs[dup].head()

# ---------------------------------------------------------------- 3. fact_trend (seasons 1998-2025, roles that may carry trends)
inv = {k: {v: k_ for k_, v in d.items()} for k, d in (("r", RK), ("d", DK), ("v", VK))}
seasons = fact_obs[(fact_obs.time_key % 100 == 0) & (fact_obs.time_key // 100).between(1998, 2025)].copy()
seasons["year"] = seasons.time_key // 100
role = {d[0]: d[7] for d in dim_dataset}
trends = []
for (rk, dk, vk), g in seasons.groupby(["region_key", "dataset_key", "variable_key"]):
    if role[dk] not in ("trend", "check", "supporting") or len(g) < 20:
        continue
    s = g.set_index("year").value.sort_index()
    t = trend_summary(s)
    sig = bool(t["mk_p"] < 0.05)
    hint = "increasing" if t["sen_slope"] > 0 else "decreasing" if t["sen_slope"] < 0 else "flat"
    trends.append((rk, dk, vk, t["start"], t["end"], t["n"], t["mean"], t["sen_slope"], t["slope_ci_low"], t["slope_ci_high"],
                   t["slope_pct_per_decade"] if abs(t["mean"]) > 1e-12 else None, t["mk_tau"], t["mk_p"], t["mk_hamed_rao_p"], t["mk_yue_wang_p"],
                   t["ols_slope"], t["ols_p"], t["ar1_slope"], t["ar1_p"], t["ar1_phi"], t["lag1_autocorr"],
                   hint if sig else "no_significant_trend", hint, int(sig), MK["mann_kendall_sen"]))

# ---------------------------------------------------------------- 4. fact_relationship (detrended Spearman)
def series(rk, dk, vk):
    g = seasons[(seasons.region_key == rk) & (seasons.dataset_key == dk) & (seasons.variable_key == vk)]
    return g.set_index("year").value.sort_index()


def detrend(s):
    return s - np.polyval(np.polyfit(s.index, s.values, 1), s.index)


drivers = [(DK["merra2_monthly"], VK[v]) for v in MV] + [(DK["merra2_plevel_monthly"], VK[v]) for v in ("shear_925_600", "AEJ_U600")]
rels = []
for reg in LON:
    rain_d = DK["imerg_final_monthly"] if reg == "sahel" else DK["imerg_final_daily"]
    ys = [(rain_d, VK["rain_total"]), (DK["imerg_final_daily"], VK["CDD"])]
    if reg == "sahel":
        ys += [(DK["imerg_final_daily"], VK[v]) for v in ("wet_days", "SDII", "Rx1day", "R95p")]
    for ydk, yvk in ys:
        y = series(RK[reg], ydk, yvk)
        for xdk, xvk in drivers:
            x = series(RK[reg], xdk, xvk)
            idx = x.index.intersection(y.index)
            if len(idx) < 20:
                continue
            r, p = stats.spearmanr(detrend(x.loc[idx]), detrend(y.loc[idx]))
            rels.append((RK[reg], xdk, xvk, ydk, yvk, int(idx.min()), int(idx.max()), len(idx), float(r), float(p), MK["spearman_detrended"]))

# ---------------------------------------------------------------- 5. EarthCARE cases + Layer 3
f = "outputs/earthcare/case_metrics.csv"
cm = read_csv(ROOT / f)
cases = []
for r in cm.to_dict("records"):
    m = re.match(r"(\d{4})-(\d{2})-(\d{2}) .* orbit (\d+)(\w)", r["case"])
    cid = f"{m.group(1)}-{m.group(2)}-{m.group(3)}_{int(m.group(4)):05d}{m.group(5)}"
    for k, v in r.items():
        if k in ("case", "type", "region") or not isinstance(v, (int, float)) or not np.isfinite(v):
            continue
        cases.append((cid, int(m.group(1)) * 100 + int(m.group(2)), RK[r["region"]], DK["earthcare_l2"], r["type"], k, float(v)))

expect, bridge = [], set()
for mk_, m in zip(dim_mechanism, mech["mechanisms"]):
    for i, e in enumerate(m["expected_observations"], 1):
        expect.append((mk_[0], i, e["expectation"], e["observed"], e["status"]))
        for eid in e["evidence_ids"]:
            if eid in EK:
                bridge.add((mk_[0], EK[eid], "cited"))
    for role_, key in (("supporting", "supporting_evidence_ids"), ("contradicting", "contradictory_evidence_ids")):
        for eid in m[key]:
            if eid in EK:
                bridge.add((mk_[0], EK[eid], role_))

# ---------------------------------------------------------------- 6. write
W.mkdir(parents=True, exist_ok=True)
if DB.exists():
    DB.unlink()
con = sqlite3.connect(DB)
con.executescript((ROOT / "sql" / "schema.sql").read_text())
ins = lambda table, rows: con.executemany(f"INSERT INTO {table} VALUES ({','.join('?' * len(rows[0]))})", rows) if rows else None
ins("dim_time", dim_time); ins("dim_region", dim_region); ins("dim_dataset", dim_dataset); ins("dim_variable", dim_variable)
ins("dim_method", dim_method); ins("dim_evidence", dim_evidence); ins("dim_mechanism", dim_mechanism)
ins("fact_observation", list(fact_obs.itertuples(index=False, name=None)))
ins("fact_trend", trends); ins("fact_relationship", rels); ins("fact_case_metric", cases)
ins("fact_mechanism_expectation", expect); ins("bridge_mechanism_evidence", sorted(bridge))
tables = [r[0] for r in con.execute("SELECT name FROM sqlite_master WHERE type IN ('table','view') AND name NOT LIKE 'sqlite_%' ORDER BY type, name")]
counts = {t: con.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0] for t in tables if not t.startswith("v_") and t != "meta_build"}
try:
    import os
    commit = os.environ.get("WAREHOUSE_GIT_COMMIT") or subprocess.run(["git", "rev-parse", "--short", "HEAD"], cwd=ROOT, capture_output=True, text=True).stdout.strip()
except Exception:
    commit = None
con.execute("INSERT INTO meta_build VALUES (?,?,?,?)", (datetime.now(timezone.utc).isoformat(timespec="seconds"), commit,
                                                       json.dumps(inputs_used, indent=0), json.dumps(counts)))
con.commit()
fk = con.execute("PRAGMA foreign_key_check").fetchall()
assert not fk, f"foreign-key violations: {fk[:5]}"

(W / "csv").mkdir(exist_ok=True)
for t in tables:
    pd.read_sql(f"SELECT * FROM {t}", con).to_csv(W / "csv" / f"{t}.csv", index=False, float_format="%.6g")
con.close()

print(f"built {DB.relative_to(ROOT)} ({DB.stat().st_size / 1e6:.1f} MB), git {commit}")
for t, n in counts.items():
    print(f"  {t:30s} {n:7d}")
