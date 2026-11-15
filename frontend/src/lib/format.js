// Display helpers for trend results. Drafted with AI assistance (Claude Code).

// Same values as the backend (src/earth_detective/backend/core/constants.py, decision D-006).
export const FIRST_YEAR = 1998;
export const LAST_YEAR = 2025;
export const MIN_SEASONS = 15;

export const METRICS = [
  { code: "rain_total", label: "Rainfall total", hint: "JJAS total, mm", group: "Amount" },
  { code: "CDD", label: "Longest dry spell", hint: "consecutive dry days", group: "Regularity" },
  { code: "wet_days", label: "Wet days", hint: "days ≥ 1 mm", group: "Frequency" },
  { code: "SDII", label: "Rain per wet day", hint: "intensity, mm/day", group: "Intensity" },
  { code: "Rx1day", label: "Wettest day", hint: "max 1-day rain", group: "Intensity" },
  { code: "R95p", label: "Very wet days", hint: "rain above 95th pct", group: "Intensity" },
];

export const signed = (x, digits = 1) =>
  x == null || Number.isNaN(x) ? "—" : `${x > 0 ? "+" : x < 0 ? "−" : ""}${Math.abs(x).toFixed(digits)}`;

export const pValue = (p) => (p == null ? "—" : p < 0.001 ? "< 0.001" : p.toFixed(3));

/** Tone of a result: significant up / significant down / not significant. */
export function tone(result) {
  if (result.direction === "increasing") return "up";
  if (result.direction === "decreasing") return "down";
  return "flat";
}

/** Sen line through the series: intercept = median(y - slope * x). */
export function senLine(points, slope) {
  const xs = points.map((p) => p.x);
  const residuals = points.map((p) => p.y - slope * p.x).sort((a, b) => a - b);
  const m = residuals.length;
  if (!m) return null;
  const intercept = m % 2 ? residuals[(m - 1) / 2] : (residuals[m / 2 - 1] + residuals[m / 2]) / 2;
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  return [{ x: x0, y: intercept + slope * x0 }, { x: x1, y: intercept + slope * x1 }];
}
