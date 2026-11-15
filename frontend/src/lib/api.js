/**
 * Client for the Earth System Trend Detective API (backend: src/earth_detective/backend, contract: docs/app/api_contract.md).
 * Drafted with AI assistance (Claude Code). See docs/submission/si_usage.md.
 *
 * Every backend error has the shape {error: {kind, message, details, request_id}}; it is thrown here as an ApiError.
 * POST /explain needs the team key: never call it from the browser (the key would be public), use a server route.
 */

export const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");
const API = `${API_URL}/api/v1`;

export class ApiError extends Error {
  constructor({ status, kind, message, details = {}, requestId = null, retryAfter = null }) {
    super(message);
    this.name = "ApiError";
    this.status = status;       // HTTP status, 0 when the server could not be reached
    this.kind = kind;           // validation | not_found | conflict | not_available | rate_limited | capacity | ... | network
    this.details = details;
    this.requestId = requestId; // quote it when reporting a problem: it is in the server logs
    this.retryAfter = retryAfter; // seconds, for rate_limited
  }
}

async function request(path, { method = "GET", body, signal, timeoutMs = 60000, base = API } = {}) {
  const signals = [AbortSignal.timeout(timeoutMs), signal].filter(Boolean);
  let res;
  try {
    res = await fetch(`${base}${path}`, {
      method,
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: signals.length > 1 ? AbortSignal.any(signals) : signals[0],
    });
  } catch (err) {
    if (signal?.aborted) throw err;
    const timedOut = err?.name === "TimeoutError";
    throw new ApiError({
      status: 0,
      kind: "network",
      message: timedOut ? "The API took too long to answer." : `Cannot reach the API at ${API_URL}. Is it running (make api)?`,
    });
  }
  const isJson = (res.headers.get("content-type") || "").includes("application/json");
  const payload = isJson ? await res.json() : await res.text();
  if (!res.ok) {
    const e = (isJson && payload?.error) || {};
    throw new ApiError({
      status: res.status,
      kind: e.kind || "unexpected",
      message: e.message || `HTTP ${res.status}`,
      details: e.details || {},
      requestId: e.request_id || res.headers.get("x-request-id"),
      retryAfter: Number(res.headers.get("retry-after")) || null,
    });
  }
  return payload;
}

// ---- catalogue (read-only)
export const health = (opts) => request("/health", { ...opts, base: API_URL });

/** Preset regions, flattened from GeoJSON: [{id, name, status, lat: [min, max], lon: [min, max]}]. */
export async function getRegions(opts) {
  const fc = await request("/regions", opts);
  return (fc.features || []).map(({ properties: p }) => ({
    id: p.id,
    name: p.name,
    status: p.status,
    lat: [p.lat_min, p.lat_max],
    lon: [p.lon_min, p.lon_max],
  }));
}

export const getVariables = (opts) => request("/variables", opts);
export const getDatasets = (opts) => request("/datasets", opts);
export const getMechanisms = (opts) => request("/mechanisms", opts);
export const getInterventions = (opts) => request("/interventions", opts);
export const getPrecomputedTrends = ({ variable, region, dataset } = {}, opts) =>
  request(`/trends?${new URLSearchParams(Object.entries({ variable, region, dataset }).filter(([, v]) => v))}`, opts);

// ---- investigations
export const createInvestigation = ({ name, regionId, startYear, endYear }, opts) =>
  request("/investigations", {
    ...opts,
    method: "POST",
    body: { name, region_id: regionId, start_year: startYear, end_year: endYear },
  });

export const getInvestigation = (id, opts) => request(`/investigations/${encodeURIComponent(id)}`, opts);

/** Layer 1. Returns {results, skipped, recent_conditions, handoff}. */
export const detect = (id, { regionIds, metrics = ["rain_total"], dataset = "auto", extremes = false, sensitivity = true } = {}, opts) =>
  request(`/investigations/${encodeURIComponent(id)}/detect`, {
    ...opts,
    method: "POST",
    body: { region_ids: regionIds, metrics, dataset, extremes, sensitivity },
  });

/** Layer 2. */
export const investigate = (id, { regionIds, evidence, variables, compareTo = "rain_total" } = {}, opts) =>
  request(`/investigations/${encodeURIComponent(id)}/investigate`, {
    ...opts,
    method: "POST",
    body: { region_ids: regionIds, evidence, variables, compare_to: compareTo },
  });

/** Layer 4 (scenarios, not forecasts). */
export const project = (id, body = {}, opts) =>
  request(`/investigations/${encodeURIComponent(id)}/project`, { ...opts, method: "POST", body });

/** Layer 5 (qualitative comparison). */
export const solve = (id, body = {}, opts) =>
  request(`/investigations/${encodeURIComponent(id)}/solve`, { ...opts, method: "POST", body });

export const getReport = (id, opts) => request(`/investigations/${encodeURIComponent(id)}/report.json`, opts);
export const getReportCsv = (id, opts) => request(`/investigations/${encodeURIComponent(id)}/report.csv`, opts);
export const reportJsonUrl = (id) => `${API}/investigations/${encodeURIComponent(id)}/report.json`;
export const reportCsvUrl = (id) => `${API}/investigations/${encodeURIComponent(id)}/report.csv`;
export const docsUrl = `${API_URL}/docs`;
