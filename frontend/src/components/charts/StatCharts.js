'use client';
/**
 * Statistical charts in the EarthSignal palette, with labelled axes and units: trend series with Sen fit, p-value
 * significance scale, slope intervals (forest plot), start-year sensitivity, correlation bars.
 * Used by the layer pages, the report and the print/PDF layout. Drafted with AI assistance (Claude Code).
 */

const PALETTE = {
  dark: { bg: 'transparent', ink: '#f4f1ea', muted: '#A9B1C6', grid: 'rgba(244,241,234,0.12)', axis: 'rgba(244,241,234,0.35)' },
  light: { bg: 'transparent', ink: '#131D38', muted: '#5B6478', grid: '#E6E0D2', axis: '#A9B1C6' },
};
const TEAL = '#4FB3A9';
const AMBER = '#ffc20d';
const CORAL = '#FF7A6B';
const FONT = 'JetBrains Mono, monospace';

/** "Nice" tick values covering [min, max]. */
export function niceTicks(min, max, count = 5) {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [];
  if (min === max) return [min];
  const span = max - min;
  const raw = span / Math.max(1, count - 1);
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= count) ?? 10 * mag;
  const out = [];
  for (let v = Math.ceil(min / step) * step; v <= max + step * 1e-9; v += step) out.push(Number(v.toFixed(10)));
  return out;
}

const fmt = (v) => {
  if (Math.abs(v) < 1e-9) return '0';
  const a = Math.abs(v);
  const s = a >= 100 ? v.toFixed(0) : a >= 10 ? v.toFixed(0) : a >= 1 ? v.toFixed(1) : v.toFixed(2);
  return s.replace(/^-/, '−');
};

function Axes({ x0, x1, y0, y1, xTicks, yTicks, sx, sy, xLabel, yLabel, c, xFormat = String, yFormat = fmt }) {
  return (
    <g fontFamily={FONT} fontSize="10">
      {yTicks.map((t) => (
        <g key={`y${t}`}>
          <line x1={x0} x2={x1} y1={sy(t)} y2={sy(t)} stroke={c.grid} />
          <text x={x0 - 6} y={sy(t) + 3.5} textAnchor="end" fill={c.muted}>
            {yFormat(t)}
          </text>
        </g>
      ))}
      {xTicks.map((t) => (
        <g key={`x${t}`}>
          <line x1={sx(t)} x2={sx(t)} y1={y1} y2={y1 + 4} stroke={c.axis} />
          <text x={sx(t)} y={y1 + 15} textAnchor="middle" fill={c.muted}>
            {xFormat(t)}
          </text>
        </g>
      ))}
      <line x1={x0} x2={x1} y1={y1} y2={y1} stroke={c.axis} />
      <line x1={x0} x2={x0} y1={y0} y2={y1} stroke={c.axis} />
      {xLabel && (
        <text x={(x0 + x1) / 2} y={y1 + 30} textAnchor="middle" fill={c.muted}>
          {xLabel}
        </text>
      )}
      {yLabel && (
        <text transform={`translate(12 ${(y0 + y1) / 2}) rotate(-90)`} textAnchor="middle" fill={c.muted}>
          {yLabel}
        </text>
      )}
    </g>
  );
}

/** Seasonal series with Sen fit. points [{x: year, y}], slope per year, optional highlight years (circles). */
export function TrendChart({ points, slope, yLabel, xLabel = 'Year (June–September season)', theme = 'dark', highlight, zeroLine = false, height = 240 }) {
  const c = PALETTE[theme];
  if (!points?.length || points.length < 2) return null;
  const W = 620, H = height, L = 58, R = 14, T = 12, B = 44;
  const xs = points.map((p) => p.x), ys = points.map((p) => p.y);
  const [xMin, xMax] = [Math.min(...xs), Math.max(...xs)];
  const pad = (Math.max(...ys) - Math.min(...ys)) * 0.08 || 1;
  const yTicks = niceTicks(Math.min(...ys) - pad, Math.max(...ys) + pad, 7);
  const [yMin, yMax] = [Math.min(yTicks[0], Math.min(...ys)), Math.max(yTicks.at(-1), Math.max(...ys))];
  const sx = (x) => L + ((x - xMin) / Math.max(1, xMax - xMin)) * (W - L - R);
  const sy = (y) => H - B - ((y - yMin) / (yMax - yMin || 1)) * (H - T - B);
  const xTicks = niceTicks(xMin, xMax, 6).filter((t) => Number.isInteger(t));
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(1)} ${sy(p.y).toFixed(1)}`).join(' ');
  let sen = null;
  if (slope != null) {
    const r = points.map((p) => p.y - slope * p.x).sort((a, b) => a - b);
    const m = r.length;
    const b = m % 2 ? r[(m - 1) / 2] : (r[m / 2 - 1] + r[m / 2]) / 2;
    sen = [xMin, xMax].map((x) => [sx(x), sy(b + slope * x)]);
  }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={`${yLabel} by year, ${xMin} to ${xMax}`}>
      <Axes x0={L} x1={W - R} y0={T} y1={H - B} xTicks={xTicks} yTicks={yTicks} sx={sx} sy={sy} xLabel={xLabel} yLabel={yLabel} c={c} />
      {zeroLine && yMin < 0 && yMax > 0 && <line x1={L} x2={W - R} y1={sy(0)} y2={sy(0)} stroke={c.axis} strokeDasharray="4 3" />}
      <path d={path} fill="none" stroke={TEAL} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p) => (
        <circle key={p.x} cx={sx(p.x)} cy={sy(p.y)} r={highlight?.has(p.x) ? 3.6 : 2} fill={highlight?.has(p.x) ? AMBER : TEAL} />
      ))}
      {sen && <line x1={sen[0][0]} y1={sen[0][1]} x2={sen[1][0]} y2={sen[1][1]} stroke={AMBER} strokeWidth="2" strokeDasharray="6 4" />}
    </svg>
  );
}

/** p-values on a log scale with the α line. tests [{label, p}] */
export function PValueScale({ tests, alpha = 0.05, theme = 'light' }) {
  const c = PALETTE[theme];
  const rows = tests.filter((t) => t.p != null);
  if (!rows.length) return null;
  const W = 620, L = 170, R = 70, rowH = 26, T = 22, B = 34, H = T + rows.length * rowH + B;
  const lo = Math.log10(0.0005), hi = 0;
  const sx = (p) => L + ((Math.log10(Math.max(p, 0.0005)) - lo) / (hi - lo)) * (W - L - R);
  const ticks = [0.001, 0.01, 0.05, 0.1, 0.5, 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="p-values of the trend tests on a log scale">
      <rect x={L} y={T - 6} width={sx(alpha) - L} height={rows.length * rowH + 8} fill={TEAL} fillOpacity="0.12" />
      <text x={L + 4} y={T - 9} fontFamily={FONT} fontSize="9" fill={c.muted}>significant (p &lt; {alpha})</text>
      <line x1={sx(alpha)} x2={sx(alpha)} y1={T - 6} y2={H - B + 2} stroke={AMBER} strokeWidth="1.5" />
      {rows.map((t, i) => {
        const y = T + i * rowH + rowH / 2;
        const sig = t.p < alpha;
        return (
          <g key={t.label} fontFamily={FONT} fontSize="11">
            <text x={L - 10} y={y + 4} textAnchor="end" fill={c.ink}>{t.label}</text>
            <line x1={L} x2={W - R} y1={y} y2={y} stroke={c.grid} />
            <circle cx={sx(t.p)} cy={y} r="6" fill={sig ? TEAL : c.bg} stroke={sig ? TEAL : c.muted} strokeWidth="2" />
            <text x={W - R + 8} y={y + 4} fill={sig ? TEAL : c.muted} fontWeight="600">
              {t.p < 0.001 ? '<0.001' : t.p.toFixed(3)}
            </text>
          </g>
        );
      })}
      <g fontFamily={FONT} fontSize="10">
        <line x1={L} x2={W - R} y1={H - B + 2} y2={H - B + 2} stroke={c.axis} />
        {ticks.map((t) => (
          <g key={t}>
            <line x1={sx(t)} x2={sx(t)} y1={H - B + 2} y2={H - B + 6} stroke={c.axis} />
            <text x={sx(t)} y={H - B + 17} textAnchor="middle" fill={c.muted}>{t}</text>
          </g>
        ))}
        <text x={(L + W - R) / 2} y={H - 4} textAnchor="middle" fill={c.muted}>p-value (log scale) · smaller = stronger evidence of a trend</text>
      </g>
    </svg>
  );
}

/** Forest plot: estimates with intervals around zero. rows [{label, value, lo?, hi?}] in `unit`. */
export function SlopeIntervals({ rows, unit = '%/decade', theme = 'light' }) {
  const c = PALETTE[theme];
  const data = rows.filter((r) => r.value != null);
  if (!data.length) return null;
  const W = 620, L = 170, R = 70, rowH = 30, T = 10, B = 36, H = T + data.length * rowH + B;
  const ext = Math.max(1, ...data.flatMap((r) => [Math.abs(r.value), Math.abs(r.lo ?? 0), Math.abs(r.hi ?? 0)])) * 1.15;
  const ticks = niceTicks(-ext, ext, 5);
  const [mn, mx] = [Math.min(ticks[0], -ext), Math.max(ticks.at(-1), ext)];
  const sx = (v) => L + ((v - mn) / (mx - mn)) * (W - L - R);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={`Estimated change in ${unit} with intervals`}>
      <line x1={sx(0)} x2={sx(0)} y1={T} y2={H - B} stroke={c.axis} strokeDasharray="4 3" />
      {data.map((r, i) => {
        const y = T + i * rowH + rowH / 2;
        const color = r.lo != null && r.hi != null && (r.lo > 0 || r.hi < 0) ? (r.value > 0 ? TEAL : CORAL) : c.muted;
        return (
          <g key={r.label} fontFamily={FONT} fontSize="11">
            <text x={L - 10} y={y + 4} textAnchor="end" fill={c.ink}>{r.label}</text>
            {r.lo != null && r.hi != null && <line x1={sx(r.lo)} x2={sx(r.hi)} y1={y} y2={y} stroke={color} strokeWidth="3" strokeLinecap="round" />}
            <rect x={sx(r.value) - 5} y={y - 5} width="10" height="10" fill={color} transform={`rotate(45 ${sx(r.value)} ${y})`} />
            <text x={W - R + 8} y={y + 4} fill={c.ink} fontWeight="600">{fmt(r.value)}</text>
          </g>
        );
      })}
      <g fontFamily={FONT} fontSize="10">
        <line x1={L} x2={W - R} y1={H - B + 2} y2={H - B + 2} stroke={c.axis} />
        {ticks.map((t) => (
          <g key={t}>
            <line x1={sx(t)} x2={sx(t)} y1={H - B + 2} y2={H - B + 6} stroke={c.axis} />
            <text x={sx(t)} y={H - B + 17} textAnchor="middle" fill={c.muted}>{fmt(t)}</text>
          </g>
        ))}
        <text x={(L + W - R) / 2} y={H - 4} textAnchor="middle" fill={c.muted}>Change ({unit}) · bar = 95 % interval, crossing 0 = not significant</text>
      </g>
    </svg>
  );
}

/** Start-year sensitivity: %/decade for each start year; filled = p < alpha. rows [{start, pct, p}] */
export function SensitivityBars({ rows, alpha = 0.05, theme = 'light' }) {
  const c = PALETTE[theme];
  const data = (rows || []).filter((r) => r.pct_per_decade != null);
  if (data.length < 2) return null;
  const W = 620, H = 210, L = 58, R = 14, T = 12, B = 44;
  const vals = data.map((r) => r.pct_per_decade);
  const yTicks = niceTicks(Math.min(0, ...vals), Math.max(0, ...vals), 5);
  const [mn, mx] = [Math.min(yTicks[0], ...vals, 0), Math.max(yTicks.at(-1), ...vals, 0)];
  const sy = (v) => H - B - ((v - mn) / (mx - mn || 1)) * (H - T - B);
  const band = (W - L - R) / data.length;
  const sx = (s) => L + (s - data[0].start) * band + band / 2;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Trend for each start year">
      <Axes x0={L} x1={W - R} y0={T} y1={H - B} xTicks={data.map((r) => r.start).filter((s, i) => i % 2 === 0)} yTicks={yTicks}
            sx={sx} sy={sy} xLabel="First year of the series (end year fixed)" yLabel="%/decade" c={c} />
      <line x1={L} x2={W - R} y1={sy(0)} y2={sy(0)} stroke={c.axis} />
      {data.map((r) => {
        const sig = r.p_value != null && r.p_value < alpha;
        const color = r.pct_per_decade >= 0 ? TEAL : CORAL;
        const y = sy(Math.max(0, r.pct_per_decade)), h = Math.abs(sy(r.pct_per_decade) - sy(0));
        return (
          <rect key={r.start} x={sx(r.start) - band * 0.32} y={y} width={band * 0.64} height={Math.max(1, h)} rx="2"
                fill={sig ? color : 'none'} stroke={color} strokeWidth="1.5">
            <title>{`${r.start}: ${fmt(r.pct_per_decade)} %/decade, p = ${r.p_value?.toFixed(3)}`}</title>
          </rect>
        );
      })}
    </svg>
  );
}

/** Detrended correlations. rows [{label, rho, p, status}] sorted by |rho|. */
export function RhoBars({ rows, theme = 'light' }) {
  const c = PALETTE[theme];
  const data = [...(rows || [])].sort((a, b) => Math.abs(b.rho) - Math.abs(a.rho));
  if (!data.length) return null;
  const W = 640, L = 230, R = 60, rowH = 24, T = 8, B = 36, H = T + data.length * rowH + B;
  const short = (s) => s.replace(/\s*\(.*\)$/, '');
  const sx = (v) => L + ((v + 1) / 2) * (W - L - R);
  const color = { supporting: TEAL, contrasting: CORAL, unclear: c.muted };
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Detrended correlation of each variable with rainfall">
      {[-1, -0.5, 0, 0.5, 1].map((t) => (
        <line key={t} x1={sx(t)} x2={sx(t)} y1={T} y2={H - B + 2} stroke={t === 0 ? c.axis : c.grid} />
      ))}
      {data.map((r, i) => {
        const y = T + i * rowH + rowH / 2;
        const col = color[r.status] ?? c.muted;
        return (
          <g key={r.label} fontFamily={FONT} fontSize="11">
            <text x={L - 10} y={y + 4} textAnchor="end" fill={c.ink}>{short(r.label)}</text>
            <rect x={Math.min(sx(0), sx(r.rho))} y={y - 7} width={Math.abs(sx(r.rho) - sx(0))} height="14" rx="3"
                  fill={col} fillOpacity={r.status === 'unclear' ? 0.35 : 0.9} />
            <text x={W - R + 8} y={y + 4} fill={col} fontWeight="600">{fmt(r.rho)}</text>
          </g>
        );
      })}
      <g fontFamily={FONT} fontSize="10">
        <line x1={L} x2={W - R} y1={H - B + 2} y2={H - B + 2} stroke={c.axis} />
        {[-1, -0.5, 0, 0.5, 1].map((t) => (
          <text key={t} x={sx(t)} y={H - B + 16} textAnchor="middle" fill={c.muted}>{fmt(t)}</text>
        ))}
        <text x={(L + W - R) / 2} y={H - 4} textAnchor="middle" fill={c.muted}>
          ρ after removing trends · teal = supports (p &lt; 0.05) · grey = unclear
        </text>
      </g>
    </svg>
  );
}

/** Two series on one axis as standardized anomalies (z-scores). a, b: [{x: year, y}] (raw values). */
export function PairChart({ a, b, theme = 'dark', height = 220 }) {
  const c = PALETTE[theme];
  const z = (pts) => {
    const v = pts.map((p) => p.y);
    const m = v.reduce((s, x) => s + x, 0) / (v.length || 1);
    const sd = Math.sqrt(v.reduce((s, x) => s + (x - m) ** 2, 0) / Math.max(1, v.length - 1)) || 1;
    return pts.map((p) => ({ x: p.x, y: (p.y - m) / sd }));
  };
  const za = a?.length > 1 ? z(a) : [];
  const zb = b?.length > 1 ? z(b) : [];
  const all = [...za, ...zb];
  if (all.length < 2) return null;
  const W = 620, H = height, L = 58, R = 14, T = 12, B = 44;
  const xs = all.map((p) => p.x);
  const [xMin, xMax] = [Math.min(...xs), Math.max(...xs)];
  const lim = Math.max(2.5, ...all.map((p) => Math.abs(p.y)));
  const sx = (x) => L + ((x - xMin) / Math.max(1, xMax - xMin)) * (W - L - R);
  const sy = (y) => H - B - ((y + lim) / (2 * lim)) * (H - T - B);
  const path = (pts) => pts.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(1)} ${sy(p.y).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Variable and rainfall as standardized anomalies by year">
      <Axes x0={L} x1={W - R} y0={T} y1={H - B} xTicks={niceTicks(xMin, xMax, 6).filter(Number.isInteger)} yTicks={[-2, -1, 0, 1, 2]}
            sx={sx} sy={sy} xLabel="Year (June–September season)" yLabel="Std. deviations from mean" c={c}
            yFormat={(v) => (v > 0 ? `+${v}σ` : v < 0 ? `−${-v}σ` : '0')} />
      {zb.length > 1 && <path d={path(zb)} fill="none" stroke={TEAL} strokeWidth="2" strokeDasharray="5 4" />}
      {za.length > 1 && <path d={path(za)} fill="none" stroke={AMBER} strokeWidth="2.6" strokeLinejoin="round" />}
    </svg>
  );
}

/** Small legend chips. items [{color, label, dashed?}] */
export function Legend({ items, theme = 'dark' }) {
  const c = PALETTE[theme];
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px]" style={{ color: c.muted }}>
      {items.map((it) => (
        <span key={it.label} className="inline-flex items-center gap-1.5">
          <span className="inline-block w-4" style={{ borderTop: `2px ${it.dashed ? 'dashed' : 'solid'} ${it.color}` }} />
          {it.label}
        </span>
      ))}
    </div>
  );
}

export const CHART_COLORS = { TEAL, AMBER, CORAL };
