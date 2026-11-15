'use client';
/**
 * Feeds the EarthSignal layer pages with the backend API (Layers 1-5) without changing their UI.
 * Drafted with AI assistance (Claude Code). See docs/submission/si_usage.md.
 *
 * - Maps an EarthSignal investigation (region name, years, extremes flag) to a backend investigation, created once and
 *   remembered in localStorage under its own key (the app's investigation objects are never modified).
 * - Runs detect / investigate and caches the responses per backend investigation for the session.
 * - Returns { status: 'idle' | 'loading' | 'ready' | 'unavailable' | 'error', ... }: pages keep their placeholders
 *   unless status === 'ready'.
 */
import { useEffect, useMemo, useState } from 'react';

import {
  ApiError,
  createInvestigation,
  detect,
  getDatasets,
  getInvestigation,
  getMechanisms,
  getReport,
  getReportCsv,
  investigate,
  project,
  solve,
} from './api';

const ID_MAP_KEY = 'earthsignal_backend_ids_v1';
export const EXTREME_METRICS = ['Rx1day', 'R95p', 'SDII', 'CDD'];
const ALL_EVIDENCE = ['moisture', 'circulation', 'dust', 'land', 'storm_structure'];

/** Backend preset for an EarthSignal region name, or null for a custom box (needs a live NASA fetch: not in the MVP). */
export function backendRegionFor(investigation) {
  const name = (investigation?.region || '').toLowerCase();
  if (!name.includes('sahel')) return null;
  if (name.includes('west')) return 'west';
  if (name.includes('central')) return 'central';
  if (name.includes('east')) return 'east';
  return 'sahel';
}

function readIdMap() {
  try {
    return JSON.parse(window.localStorage.getItem(ID_MAP_KEY) || '{}');
  } catch {
    return {};
  }
}

function writeIdMap(map) {
  try {
    window.localStorage.setItem(ID_MAP_KEY, JSON.stringify(map));
  } catch {
    // storage unavailable: the backend investigation is simply recreated next time
  }
}

const configKey = (inv, region) => `${region}:${inv.startYear}-${inv.endYear}`;
const pending = new Map(); // promise cache: one backend call per key, shared by every component

function once(key, factory) {
  if (!pending.has(key)) {
    const p = factory();
    pending.set(key, p);
    p.catch(() => pending.delete(key)); // failures can be retried
  }
  return pending.get(key);
}

/** Backend investigation id for this EarthSignal investigation (created on first use, recreated if expired). */
function ensureBackendInvestigation(inv, region) {
  const key = configKey(inv, region);
  return once(`inv:${inv.id}:${key}`, async () => {
    const map = readIdMap();
    const known = map[inv.id];
    if (known?.key === key) {
      try {
        await getInvestigation(known.backendId);
        return known.backendId;
      } catch (e) {
        if (!(e instanceof ApiError) || e.status !== 404) throw e; // expired on the server (TTL): create again
      }
    }
    const created = await createInvestigation({
      name: (inv.title || 'EarthSignal investigation').slice(0, 120),
      regionId: region,
      startYear: inv.startYear,
      endYear: inv.endYear,
    });
    writeIdMap({ ...readIdMap(), [inv.id]: { backendId: created.id, key } });
    return created.id;
  });
}

function fetchDetect(inv, region) {
  const metrics = ['rain_total', ...(inv.extremesEnabled ? EXTREME_METRICS : ['CDD'])];
  return once(`detect:${inv.id}:${configKey(inv, region)}:${metrics.join(',')}`, async () => {
    const id = await ensureBackendInvestigation(inv, region);
    return detect(id, { regionIds: [region], metrics });
  });
}

function fetchInvestigate(inv, region) {
  return once(`investigate:${inv.id}:${configKey(inv, region)}`, async () => {
    const id = await ensureBackendInvestigation(inv, region);
    return investigate(id, { regionIds: [region], evidence: ALL_EVIDENCE, compareTo: 'rain_total' });
  });
}

export const PROJECTION_END = 2050;

function fetchProject(inv, region, metric) {
  return once(`project:${inv.id}:${configKey(inv, region)}:${metric}`, async () => {
    const id = await ensureBackendInvestigation(inv, region);
    return project(id, {
      region_id: region,
      metric,
      baseline_period: [inv.startYear, inv.endYear],
      start_year: 2025,
      end_year: PROJECTION_END,
    });
  });
}

/** Both projections; Rx1day may be unavailable for the region (warehouse has it for the Sahel box only). */
function fetchProjects(inv, region) {
  return Promise.all([
    fetchProject(inv, region, 'rain_total'),
    fetchProject(inv, region, 'Rx1day').catch(() => null),
    fetchDetect(inv, region),
  ]);
}

function fetchSolve(inv, region) {
  return once(`solve:${inv.id}:${configKey(inv, region)}`, async () => {
    const id = await ensureBackendInvestigation(inv, region);
    return solve(id, {});
  });
}

function useLive(investigation, fetcher, shape) {
  const region = backendRegionFor(investigation);
  const key = investigation ? `${investigation.id}:${region}:${investigation.startYear}-${investigation.endYear}:${!!investigation.extremesEnabled}` : '';
  const [state, setState] = useState({ key: null, status: 'loading' });

  useEffect(() => {
    if (!investigation || !region) return undefined;
    let alive = true;
    fetcher(investigation, region)
      .then((data) => alive && setState({ key, status: 'ready', ...shape(data, region) }))
      .catch((error) => alive && setState({ key, status: 'error', error }));
    return () => {
      alive = false;
    };
    // the key captures every input that changes the request
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (!investigation) return { status: 'idle' };
  if (!region) return { status: 'unavailable', reason: 'Custom regions need a live NASA fetch (not available in this version).' };
  return state.key === key ? state : { status: 'loading' };
}

/** Layer 1: { status, main (rain_total result), byMetric {code: result}, recent, unusualYears } */
export function useLiveDetect(investigation) {
  return useLive(investigation, fetchDetect, (d) => {
    const byMetric = Object.fromEntries((d.results || []).map((r) => [r.metric, r]));
    return {
      main: byMetric.rain_total || null,
      byMetric,
      skipped: d.skipped || [],
      unusualYears: new Set((d.handoff?.unusual_seasons || []).map((u) => u.year)),
    };
  });
}

/** Layer 2: { status, comparisons (this region), caseStudies (unique), notes, rainfall [{x, y}] } */
export function useLiveInvestigate(investigation) {
  const evidence = useLive(investigation, fetchInvestigate, (d, region) => ({
    comparisons: (d.comparisons || []).filter((c) => c.region_id === region),
    caseStudies: [...new Map((d.case_studies || []).map((c) => [c.case_id, c])).values()],
    notes: d.notes || [],
  }));
  const det = useLiveDetect(investigation);
  if (evidence.status !== 'ready') return evidence;
  const series = det.status === 'ready' ? det.main?.series || [] : [];
  return { ...evidence, rainfall: series.filter((p) => p.value != null).map((p) => ({ x: Number(p.date), y: p.value })) };
}

// ---- small numeric helpers for the pages

export function signed(x, digits = 1) {
  if (x == null || Number.isNaN(x)) return '—';
  return `${x > 0 ? '+' : x < 0 ? '−' : ''}${Math.abs(x).toFixed(digits)}`;
}

export function pText(p) {
  if (p == null) return '—';
  return p < 0.001 ? '< 0.001' : p.toFixed(3);
}

/** Scales a list of {x, y} into an SVG box; returns { toX, toY } closures. */
export function scaler(points, { x0, x1, y0, y1 }) {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const [minX, maxX] = [Math.min(...xs), Math.max(...xs)];
  let [minY, maxY] = [Math.min(...ys), Math.max(...ys)];
  if (minY === maxY) {
    minY -= 1;
    maxY += 1;
  }
  const pad = (maxY - minY) * 0.08;
  return {
    toX: (x) => x0 + ((x - minX) / Math.max(1, maxX - minX)) * (x1 - x0),
    toY: (y) => y1 - ((y - (minY - pad)) / (maxY - minY + 2 * pad)) * (y1 - y0),
  };
}

/** Sen line endpoints: intercept = median(y - slope * x). */
export function senEnds(points, slope) {
  if (!points.length || slope == null) return null;
  const r = points.map((p) => p.y - slope * p.x).sort((a, b) => a - b);
  const m = r.length;
  const b = m % 2 ? r[(m - 1) / 2] : (r[m / 2 - 1] + r[m / 2]) / 2;
  const xs = points.map((p) => p.x);
  const [a, z] = [Math.min(...xs), Math.max(...xs)];
  return [{ x: a, y: b + slope * a }, { x: z, y: b + slope * z }];
}

export function zScores(points) {
  const v = points.map((p) => p.y);
  const mean = v.reduce((s, x) => s + x, 0) / (v.length || 1);
  const sd = Math.sqrt(v.reduce((s, x) => s + (x - mean) ** 2, 0) / Math.max(1, v.length - 1)) || 1;
  return points.map((p) => ({ x: p.x, y: (p.y - mean) / sd }));
}

/** Layer 3: mechanism cards (catalogue, same for every region). { status, mechanisms } */
let mechanismsPromise = null;
export function useLiveMechanisms() {
  const [state, setState] = useState({ status: 'loading' });
  useEffect(() => {
    let alive = true;
    mechanismsPromise = mechanismsPromise || getMechanisms().catch((e) => {
      mechanismsPromise = null;
      throw e;
    });
    mechanismsPromise
      .then((mechanisms) => alive && setState({ status: 'ready', mechanisms }))
      .catch((error) => alive && setState({ status: 'error', error }));
    return () => {
      alive = false;
    };
  }, []);
  return state;
}

/** Layer 4: { status, rain (project response), rx1day (or null), history [{x, y}] } */
export function useLiveProject(investigation) {
  return useLive(investigation, fetchProjects, ([rain, rx1day, det]) => {
    const main = (det.results || []).find((r) => r.metric === 'rain_total');
    return {
      rain,
      rx1day,
      history: (main?.series || []).filter((p) => p.value != null).map((p) => ({ x: Number(p.date), y: p.value })),
    };
  });
}

/** Layer 5: { status, comparison [...], note } */
export function useLiveSolve(investigation) {
  return useLive(investigation, fetchSolve, (d) => ({ comparison: d.comparison || [], note: d.note }));
}

// ---- Data catalogue: the app's dataset records enriched with warehouse facts (GET /datasets)

// app dataset id -> warehouse dataset codes
const DATASET_LINKS = {
  'gpm-imerg-v07': ['imerg_final_monthly', 'imerg_final_daily', 'imerg_late_daily'],
  'merra2-reanalysis': ['merra2_monthly', 'merra2_plevel_monthly'],
  'earthcare-cpr': ['earthcare_l2'],
  'earthcare-atlid': ['earthcare_l2'],
  'modis-aod-ndvi': [],
};
const year = (s) => (s ? Number(String(s).slice(0, 4)) : undefined);

function chirpsRecord(w) {
  return {
    id: 'chirps-v3',
    slug: 'chirps-v3',
    name: 'CHIRPS v3',
    agency: 'UCSB CHC',
    product: `${w.product} · ${w.version}`,
    role: 'Independent check',
    roleType: 'supporting',
    resolution: w.resolution,
    temporalResolution: 'Monthly',
    coverageStart: year(w.coverage_start),
    coverageEnd: year(w.coverage_end),
    geographicCoverage: '50°S–50°N land',
    sourceUrl: 'https://www.chc.ucsb.edu/data/chirps3',
    status: 'Used',
    variables: [{ name: 'precip', units: 'mm/month', description: 'Satellite + station blended precipitation' }],
    usageBullets: ['Independent check of every IMERG rainfall trend (same region, same season)'],
    limitations: ['Station density over the Sahel is low; the blend leans on satellite estimates there.'],
    notes: '',
    verificationLog: [{ status: 'Used', date: '2026-11-15', by: 'Warehouse build' }],
    citation: `${w.name}. ${w.agency}. ${w.doi || ''}`.trim(),
  };
}

function enrichDatasets(datasets, warehouse) {
  const byCode = Object.fromEntries(warehouse.map((w) => [w.code, w]));
  const out = datasets.map((d) => {
    const codes = DATASET_LINKS[d.id];
    if (!codes) return d;
    const ws = codes.map((c) => byCode[c]).filter(Boolean);
    if (!ws.length) {
      return { ...d, notes: `${d.notes ?? ''} Not in the analysis warehouse yet.`.trim() };
    }
    const main = ws[0];
    const obs = ws.reduce((s, w) => s + (w.observations || 0), 0);
    return {
      ...d,
      product: [...new Set(ws.map((w) => w.product))].join(' / ') + ` · ${main.version}`,
      resolution: main.resolution,
      coverageStart: Math.min(...ws.map((w) => year(w.coverage_start)).filter(Boolean)),
      coverageEnd: Math.max(...ws.map((w) => year(w.coverage_end)).filter(Boolean)),
      notes: `${d.notes ?? ''} Analysis warehouse: ${ws.map((w) => w.code).join(', ')}${obs ? ` · ${obs} observations` : ''} · access ${main.access}${main.doi ? ` · DOI ${main.doi}` : ''}.`.trim(),
      warehouse: ws,
    };
  });
  if (byCode.chirps_v3_monthly && !out.some((d) => d.id === 'chirps-v3')) out.push(chirpsRecord(byCode.chirps_v3_monthly));
  return out;
}

let datasetsPromise = null;
/** Returns the datasets enriched with the warehouse facts, or the input unchanged until/unless the API answers. */
export function useLiveCatalogue(datasets) {
  const [warehouse, setWarehouse] = useState(null);
  useEffect(() => {
    let alive = true;
    datasetsPromise = datasetsPromise || getDatasets().catch((e) => {
      datasetsPromise = null;
      throw e;
    });
    datasetsPromise.then((w) => alive && setWarehouse(w)).catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return useMemo(() => (warehouse ? enrichDatasets(datasets, warehouse) : datasets), [datasets, warehouse]);
}

// ---- Report: run every layer (cached), then the backend report.json + report.csv

function fetchReport(inv, region) {
  return once(`report:${inv.id}:${configKey(inv, region)}`, async () => {
    const [, , rainProjection] = await Promise.all([
      fetchDetect(inv, region),
      fetchInvestigate(inv, region),
      fetchProject(inv, region, 'rain_total'),
      fetchSolve(inv, region),
    ]);
    const id = await ensureBackendInvestigation(inv, region);
    const [json, csv] = await Promise.all([getReport(id), getReportCsv(id)]);
    // the backend keeps the latest projection only (the Project page may also run Rx1day): report the rainfall one
    return { json: { ...json, future_scenarios: rainProjection }, csv };
  });
}

/** { status, report (backend report.json), csv (string), main (rain_total trend), comparisons, scenarios } */
export function useLiveReport(investigation) {
  return useLive(investigation, fetchReport, ({ json, csv }, region) => {
    const trends = json.trend_detection?.results || [];
    return {
      report: json,
      csv,
      main: trends.find((r) => r.metric === 'rain_total' && r.region_id === region) || null,
      trends: trends.filter((r) => r.region_id === region),
      comparisons: (json.environmental_investigation?.comparisons || []).filter((c) => c.region_id === region),
      scenarios: json.future_scenarios || null,
    };
  });
}

