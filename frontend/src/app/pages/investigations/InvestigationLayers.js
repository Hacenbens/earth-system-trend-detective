'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, CheckCircle2, Info } from 'lucide-react';
import { pText, scaler, senEnds, signed, useLiveDetect, useLiveInvestigate, zScores } from '@/lib/liveLayers';

/* ============================================================================
 * PAGE 10: LAYER 01 — DETECT / TREND EXPLORER
 * ========================================================================== */
export function DetectLayerPage({ investigation, onUpdateInvestigation, onNextLayer }) {
  const [trendMethod, setTrendMethod] = useState('Mann-Kendall');
  const [slopeMethod, setSlopeMethod] = useState("Sen's slope");
  const [seasonMode, setSeasonMode] = useState(investigation.season);
  const [viewAnomaly, setViewAnomaly] = useState(false);
  const [showExtremes, setShowExtremes] = useState(investigation.extremesEnabled ?? true);
  // Live results from the backend API (src/lib/liveLayers.js); placeholders below are kept when unavailable.
  const live = useLiveDetect(investigation);
  const liveMain = live.status === 'ready' ? live.main : null;

  const years = useMemo(() => {
    const start = investigation.startYear ?? 2001;
    const end = investigation.endYear ?? 2025;
    const arr = [];
    for (let y = start; y <= end; y++) arr.push(y);
    return arr;
  }, [investigation.startYear, investigation.endYear]);

  // Illustrative candidate curve (explicitly labeled as placeholder pending archive execution)
  const points = useMemo(() => {
    return years.map((yr, idx) => {
      const base = 405 + Math.sin(idx * 0.72) * 34 + idx * 1.9;
      const anom = base - 425;
      return { yr, val: Math.round(base), anom: Math.round(anom) };
    });
  }, [years]);

  const livePlot = useMemo(() => {
    if (!liveMain) return null;
    const pts = (liveMain.series || [])
      .filter((p) => p.value != null)
      .map((p) => ({ x: Number(p.date), y: viewAnomaly ? p.anomaly : p.value }));
    if (pts.length < 2) return null;
    const { toX, toY } = scaler(pts, { x0: 36, x1: 596, y0: 18, y1: 170 });
    const path = pts.map((p, i) => `${i ? 'L' : 'M'} ${toX(p.x).toFixed(1)} ${toY(p.y).toFixed(1)}`).join(' ');
    const sen = senEnds(pts, liveMain.sen_slope);
    return {
      path,
      sen: sen && { x1: toX(sen[0].x), y1: toY(sen[0].y), x2: toX(sen[1].x), y2: toY(sen[1].y) },
      years: pts.map((p) => p.x),
    };
  }, [liveMain, viewAnomaly]);

  const svgPath = useMemo(() => {
    if (livePlot) return livePlot.path;
    if (points.length === 0) return '';
    return points
      .map((p, idx) => {
        const x = 36 + (idx / Math.max(1, points.length - 1)) * 560;
        const yVal = viewAnomaly ? p.anom : p.val - 340;
        const y = viewAnomaly ? 95 - yVal * 0.9 : 165 - yVal * 1.05;
        return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${Math.max(18, Math.min(170, y)).toFixed(1)}`;
      })
      .join(' ');
  }, [points, viewAnomaly, livePlot]);
  const axisYears = livePlot?.years ?? years;

  return (
    <div className="space-y-6">
      {/* Configuration Strip */}
      <section className="rounded-[28px] bg-[#FBFAF6] border border-[#E6E0D2] p-5 sm:p-6 shadow-[0_18px_46px_rgba(19,29,56,0.06)]">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#E6E0D2]">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5B6478]">
              LAYER 01 · DETECT
            </p>
            <h2 className="mt-0.5 font-display text-[21px] font-semibold text-[#131D38]">
              Trend & intensity explorer
            </h2>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#131D38] text-[#ffc20d] font-mono text-[10px] uppercase">
            <Info className="w-3.5 h-3.5" />
            {liveMain
              ? `Live · ${liveMain.provenance?.dataset ?? 'NASA data'} via backend API`
              : live.status === 'loading'
                ? 'Loading NASA results…'
                : 'Illustrative preview · verify dataset before citing'}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-[12px]">
          <div className="p-3 rounded-[16px] bg-[#f4f1ea] border border-[#E6E0D2]">
            <div className="font-mono text-[10px] uppercase text-[#5B6478]">Region</div>
            <div className="mt-1 font-semibold text-[#131D38]">{investigation.region}</div>
          </div>
          <div className="p-3 rounded-[16px] bg-[#f4f1ea] border border-[#E6E0D2]">
            <div className="font-mono text-[10px] uppercase text-[#5B6478]">Dataset</div>
            <div className="mt-1 font-semibold text-[#131D38] truncate">
              {investigation.dataset}
            </div>
          </div>
          <label className="p-3 rounded-[16px] bg-[#f4f1ea] border border-[#E6E0D2] block">
            <span className="font-mono text-[10px] uppercase text-[#5B6478] block">Season</span>
            <select
              value={seasonMode}
              onChange={(e) => setSeasonMode(e.target.value)}
              className="mt-1 w-full bg-transparent font-semibold text-[#131D38] focus:outline-none cursor-pointer"
            >
              <option value="June–September">June–September</option>
              <option value="Annual (Jan–Dec)">Annual (Jan–Dec)</option>
              <option value="Peak July–August">Peak July–August</option>
            </select>
          </label>
          <label className="p-3 rounded-[16px] bg-[#f4f1ea] border border-[#E6E0D2] block">
            <span className="font-mono text-[10px] uppercase text-[#5B6478] block">Trend test</span>
            <select
              value={trendMethod}
              onChange={(e) => setTrendMethod(e.target.value)}
              className="mt-1 w-full bg-transparent font-semibold text-[#131D38] focus:outline-none cursor-pointer"
            >
              <option value="Mann-Kendall">Mann-Kendall</option>
              <option value="Linear OLS">Linear OLS</option>
            </select>
          </label>
          <label className="p-3 rounded-[16px] bg-[#f4f1ea] border border-[#E6E0D2] block">
            <span className="font-mono text-[10px] uppercase text-[#5B6478] block">Slope</span>
            <select
              value={slopeMethod}
              onChange={(e) => setSlopeMethod(e.target.value)}
              className="mt-1 w-full bg-transparent font-semibold text-[#131D38] focus:outline-none cursor-pointer"
            >
              <option value="Sen's slope">Sen&apos;s slope</option>
              <option value="Least squares">Least squares</option>
            </select>
          </label>
          <div className="p-3 rounded-[16px] bg-[#f4f1ea] border border-[#E6E0D2] flex flex-col justify-between">
            <span className="font-mono text-[10px] uppercase text-[#5B6478]">Extremes</span>
            <label className="mt-1 inline-flex items-center gap-2 font-semibold text-[#131D38] cursor-pointer">
              <input
                type="checkbox"
                checked={showExtremes}
                onChange={(e) => setShowExtremes(e.target.checked)}
                className="accent-[#131D38] cursor-pointer"
              />
              <span>{showExtremes ? 'Enabled' : 'Hidden'}</span>
            </label>
          </div>
        </div>
      </section>

      {/* Main Historical Time-Series + Trend Statistics */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <section className="xl:col-span-8 rounded-[28px] bg-[#FBFAF6] border border-[#E6E0D2] p-6 shadow-[0_20px_50px_rgba(19,29,56,0.06)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-[18px] font-semibold text-[#131D38]">
                {viewAnomaly
                  ? 'Standardized seasonal anomaly'
                  : `${seasonMode} precipitation series`}
              </h3>
              <p className="text-[13px] text-[#5B6478]">
                {investigation.period} · {slopeMethod} baseline overlay{' '}
                {liveMain ? `(${liveMain.provenance?.dataset ?? 'live'}, n = ${liveMain.n})` : '(illustrative preview)'}
              </p>
            </div>
            <div className="inline-flex rounded-full bg-[#f4f1ea] border border-[#E6E0D2] p-1">
              <button
                type="button"
                onClick={() => setViewAnomaly(false)}
                className={`px-3.5 py-1 rounded-full text-[12px] font-semibold cursor-pointer ${
                  !viewAnomaly ? 'bg-[#131D38] text-[#f4f1ea]' : 'text-[#5B6478]'
                }`}
              >
                Totals (mm)
              </button>
              <button
                type="button"
                onClick={() => setViewAnomaly(true)}
                className={`px-3.5 py-1 rounded-full text-[12px] font-semibold cursor-pointer ${
                  viewAnomaly ? 'bg-[#131D38] text-[#f4f1ea]' : 'text-[#5B6478]'
                }`}
              >
                Anomaly
              </button>
            </div>
          </div>

          <div className="mt-5 rounded-[22px] bg-[#131D38] p-5 text-[#f4f1ea]">
            <svg
              viewBox="0 0 620 195"
              className="w-full h-auto"
              role="img"
              aria-label="Historical rainfall trend chart"
            >
              <line
                x1="36"
                y1="45"
                x2="596"
                y2="45"
                stroke="#f4f1ea"
                strokeOpacity="0.1"
                strokeDasharray="3 3"
              />
              <line
                x1="36"
                y1="95"
                x2="596"
                y2="95"
                stroke="#f4f1ea"
                strokeOpacity="0.18"
                strokeDasharray={viewAnomaly ? '0' : '3 3'}
              />
              <line
                x1="36"
                y1="145"
                x2="596"
                y2="145"
                stroke="#f4f1ea"
                strokeOpacity="0.1"
                strokeDasharray="3 3"
              />

              {/* Linear Sen slope placeholder line (live Sen fit when available) */}
              <line
                x1={livePlot?.sen?.x1 ?? 36}
                y1={livePlot?.sen?.y1 ?? (viewAnomaly ? 112 : 128)}
                x2={livePlot?.sen?.x2 ?? 596}
                y2={livePlot?.sen?.y2 ?? (viewAnomaly ? 74 : 78)}
                stroke="#ffc20d"
                strokeWidth="2"
                strokeDasharray="6 4"
              />
              {/* Main series */}
              <path
                d={svgPath}
                fill="none"
                stroke="#4FB3A9"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <text
                x="36"
                y="186"
                fill="#A9B1C6"
                fontSize="10"
                fontFamily="JetBrains Mono, monospace"
              >
                {axisYears[0]}
              </text>
              <text
                x="305"
                y="186"
                fill="#A9B1C6"
                fontSize="10"
                fontFamily="JetBrains Mono, monospace"
              >
                {axisYears[Math.floor(axisYears.length / 2)]}
              </text>
              <text
                x="570"
                y="186"
                fill="#A9B1C6"
                fontSize="10"
                fontFamily="JetBrains Mono, monospace"
              >
                {axisYears[axisYears.length - 1]}
              </text>
            </svg>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 font-mono text-[11px] text-[#A9B1C6]">
              <span className="inline-flex items-center gap-2">
                <span className="w-3 h-0.5 bg-[#4FB3A9]" /> Annual {seasonMode} series
                {liveMain ? '' : ' (illustrative)'}
              </span>
              <span className="inline-flex items-center gap-2 text-[#ffc20d]">
                <span className="w-3 h-0.5 bg-[#ffc20d]" /> {liveMain ? "Sen's slope" : slopeMethod} fit
                {liveMain ? '' : ' (placeholder)'}
              </span>
            </div>
          </div>
        </section>

        {/* Trend Statistics Card */}
        <section className="xl:col-span-4 rounded-[28px] bg-[#FBFAF6] border border-[#E6E0D2] p-6 shadow-[0_20px_50px_rgba(19,29,56,0.06)] flex flex-col justify-between">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5B6478]">
              {liveMain ? 'TREND DIAGNOSTICS' : 'TREND DIAGNOSTICS (PLACEHOLDER)'}
            </p>
            <h3 className="mt-1 font-display text-[18px] font-semibold text-[#131D38]">
              {trendMethod} & {slopeMethod}
            </h3>

            <dl className="mt-4 grid grid-cols-2 gap-3 text-[13px]">
              {(liveMain
                ? [
                    { k: 'Direction', v: liveMain.wording },
                    { k: "Sen's slope", v: `${signed(liveMain.sen_slope, 2)} ${liveMain.slope_unit} (${signed(liveMain.pct_per_decade)}%/dec)` },
                    { k: 'p-value', v: `${pText(liveMain.p_value)}${liveMain.significant ? ' (α 0.05)' : ' (n.s.)'}` },
                    { k: '95% CI', v: liveMain.slope_ci95 ? `[${signed(liveMain.slope_ci95[0], 2)}, ${signed(liveMain.slope_ci95[1], 2)}]` : '[—, —]' },
                    { k: 'Sample count', v: `n = ${liveMain.n} yrs` },
                    { k: 'Autocorrelation', v: `lag-1 ${signed(liveMain.autocorrelation?.lag1, 2)} · Yue–Wang p ${pText(liveMain.autocorrelation?.mk_yue_wang_p)}` },
                  ]
                : [
                    { k: 'Direction', v: 'Upward (tentative)' },
                    { k: "Sen's slope", v: '— mm/yr (pending)' },
                    { k: 'p-value', v: '— (to compute)' },
                    { k: '95% CI', v: '[—, —]' },
                    { k: 'Sample count', v: `n = ${years.length} yrs` },
                    { k: 'Autocorrelation', v: 'Pre-whitened check' },
                  ]
              ).map((stat) => (
                <div
                  key={stat.k}
                  className="p-3 rounded-[16px] bg-[#f4f1ea] border border-[#E6E0D2]"
                >
                  <dt className="font-mono text-[10px] uppercase text-[#5B6478]">{stat.k}</dt>
                  <dd className="mt-1 font-mono text-[12px] font-semibold text-[#131D38] tabular-nums">
                    {stat.v}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <p className="mt-4 text-[12px] text-[#5B6478] leading-[1.5]">
            {liveMain
              ? `Mann–Kendall + Sen on ${liveMain.provenance?.dataset} ${liveMain.provenance?.version}. Independent check (${liveMain.independent_check?.dataset ?? '—'}): ${signed(liveMain.independent_check?.pct_per_decade)}%/dec, p ${pText(liveMain.independent_check?.p_value)}. Evidence ${(liveMain.evidence_ids || []).join(', ')}.`
              : live.status === 'error'
                ? `Backend unavailable (${live.error?.message ?? 'error'}). Showing the placeholder.`
                : live.status === 'unavailable'
                  ? live.reason
                  : 'Statistical significance is kept intentionally blank until verified GPM IMERG V07B netCDF computations run against the archive.'}
          </p>
        </section>
      </div>

      {/* Extreme Indicators + Spatial Trend Map */}
      {showExtremes && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <section className="lg:col-span-7 rounded-[28px] bg-[#FBFAF6] border border-[#E6E0D2] p-6 shadow-[0_20px_50px_rgba(19,29,56,0.06)]">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5B6478]">
              EXTREME PRECIPITATION INDICES
            </p>
            <h3 className="mt-1 font-display text-[18px] font-semibold text-[#131D38]">
              Daily convective intensity vs dry-spell persistence
            </h3>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                {
                  code: 'Rx1day',
                  name: 'Max 1-day rainfall',
                  note: 'Diagnostic priority: tracks single-storm convective peaks.',
                },
                {
                  code: 'R95p',
                  name: 'Very wet day total',
                  note: 'Share of seasonal rain falling above the 95th percentile.',
                },
                {
                  code: 'SDII',
                  name: 'Simple daily intensity index',
                  note: 'Mean precipitation per wet day (≥1 mm/day).',
                },
                {
                  code: 'CDD',
                  name: 'Consecutive dry days',
                  note: 'Longest intra-seasonal dry spell risking crop germination.',
                },
              ].map((idx) => (
                <div
                  key={idx.code}
                  className="p-4 rounded-[20px] bg-[#f4f1ea] border border-[#E6E0D2]"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[12px] font-semibold text-[#131D38]">
                      {idx.code}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-white border border-[#E6E0D2] font-mono text-[10px] text-[#5B6478]">
                      {live.byMetric?.[idx.code]
                        ? `${signed(live.byMetric[idx.code].pct_per_decade)}%/dec · p ${pText(live.byMetric[idx.code].p_value)}`
                        : live.skipped?.some((s) => s.metric === idx.code)
                          ? 'Sahel box only'
                          : 'Placeholder'}
                    </span>
                  </div>
                  <div className="mt-1 text-[14px] font-semibold text-[#131D38]">{idx.name}</div>
                  <p className="mt-1 text-[12px] text-[#5B6478]">{idx.note}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="lg:col-span-5 rounded-[28px] bg-[#131D38] text-[#f4f1ea] p-6 shadow-[0_20px_50px_rgba(19,29,56,0.12)] flex flex-col justify-between">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#ffc20d]">
                SPATIAL TREND FOOTPRINT
              </p>
              <h3 className="mt-1 font-display text-[18px] font-semibold">
                Grid-cell directional pattern
              </h3>
              <div className="mt-4 rounded-[20px] bg-[#0B1224] border border-[#f4f1ea]/10 p-4">
                <svg
                  viewBox="0 0 300 135"
                  className="w-full h-auto"
                  role="img"
                  aria-label="Spatial trend grid preview"
                >
                  {Array.from({ length: 10 }).map((_, c) =>
                    Array.from({ length: 4 }).map((__, r) => (
                      <rect
                        key={`${c}-${r}`}
                        x={16 + c * 27}
                        y={16 + r * 26}
                        width="24"
                        height="22"
                        rx="4"
                        fill={
                          (c + r) % 4 === 0 ? '#ffc20d' : (c + r) % 3 === 0 ? '#FF7A6B' : '#4FB3A9'
                        }
                        fillOpacity={0.55}
                      />
                    ))
                  )}
                </svg>
              </div>
            </div>
            <p className="mt-4 text-[12px] text-[#A9B1C6]">
              Teal cells indicate wetting tendencies; amber highlights intense storm cores; coral
              marks localized dry-spell persistence (diagnostic mockup).
            </p>
          </section>
        </div>
      )}

      {/* Statistical vs Scientific Interpretation + Continue */}
      <section className="rounded-[28px] bg-[#FBFAF6] border border-[#E6E0D2] p-6 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="max-w-3xl">
          <div className="font-mono text-[11px] uppercase tracking-wider text-[#5B6478]">
            STATISTICAL VS SCIENTIFIC INTERPRETATION
          </div>
          <p className="mt-1.5 text-[14px] text-[#131D38] leading-[1.6]">
            A rising seasonal total alongside rising <strong>CDD</strong> or <strong>Rx1day</strong>{' '}
            implies fewer, heavier convective storms rather than uniform gentle wetting. Proceed to
            Layer 02 to test which physical drivers co-vary with these bursts.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            onUpdateInvestigation({ stageIndex: Math.max(investigation.stageIndex, 1) });
            onNextLayer();
          }}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#ffc20d] text-[#131D38] text-[14px] font-semibold hover:bg-[#eab006] transition-colors cursor-pointer shrink-0"
        >
          <span>Continue to Investigate</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </section>
    </div>
  );
}

/* ============================================================================
 * PAGE 12: LAYER 02 — INVESTIGATE / ATMOSPHERIC INVESTIGATOR
 * ========================================================================== */
const INVESTIGATE_VARS = [
  {
    id: 'qv850',
    category: 'Moisture',
    name: '850 hPa Specific Humidity (QV850)',
    dataset: 'MERRA-2',
    corr: '+0.64 (placeholder)',
    status: 'Supports',
    summary:
      'Increased boundary-layer specific humidity supplies latent energy for deep convective updrafts.',
    points: [32, 38, 35, 44, 48, 52, 59, 64],
  },
  {
    id: 'tqv',
    category: 'Moisture',
    name: 'Total-Column Water Vapour (TQV)',
    dataset: 'MERRA-2',
    corr: '+0.61 (placeholder)',
    status: 'Supports',
    summary: 'Column moisture amplification scales strongly with heavy daily rain peaks (Rx1day).',
    points: [35, 41, 39, 46, 51, 55, 60, 66],
  },
  {
    id: 'u850',
    category: 'Circulation',
    name: '850 hPa Zonal Wind & Monsoon Inflow',
    dataset: 'MERRA-2',
    corr: '+0.49 (placeholder)',
    status: 'Supports',
    summary:
      'Stronger low-level westerly monsoon flow transports Gulf of Guinea moisture deeper into the Sahel.',
    points: [40, 42, 37, 45, 49, 53, 56, 61],
  },
  {
    id: 'omega500',
    category: 'Circulation',
    name: '500 hPa Vertical Velocity (OMEGA500)',
    dataset: 'MERRA-2',
    corr: '-0.42 (placeholder)',
    status: 'Unclear',
    summary: 'Coarse 0.5° reanalysis grid averages out localized mesoscale updraft cores.',
    points: [52, 48, 54, 47, 45, 43, 46, 41],
  },
  {
    id: 'aod',
    category: 'Aerosols',
    name: 'Mineral Dust Optical Depth (AOD 550nm)',
    dataset: 'MODIS Col. 6.1',
    corr: '-0.31 (placeholder)',
    status: 'Unclear',
    summary:
      'Dual radiative cooling vs ice-nucleation microphysics leaves net directional effect mixed.',
    points: [62, 58, 65, 56, 54, 57, 51, 49],
  },
  {
    id: 'ndvi',
    category: 'Surface',
    name: 'Vegetation Greenness (NDVI)',
    dataset: 'MODIS MYD13C2',
    corr: '+0.52 lag-1 (placeholder)',
    status: 'Supports',
    summary:
      'Vegetation greening lags wet-season peaks by ~1 month and sustains soil moisture recycling.',
    points: [38, 40, 42, 46, 49, 53, 55, 60],
  },
  {
    id: 'earthcare',
    category: 'Process Case Study',
    name: 'EarthCARE CPR Radar & ATLID Lidar (2024+)',
    dataset: 'ESA/JAXA EarthCARE',
    corr: 'Orbital curtain only',
    status: 'Supports',
    summary:
      '2024+ vertical radar/lidar profiles illuminate Saharan dust atop convective storm anvils—never used in 2001–2025 trends.',
    points: [44, 58, 72, 65, 68, 74, 62, 70],
  },
];

// ---- live feed (backend API, MERRA-2 detrended Spearman) mapped onto the INVESTIGATE_VARS shape above
const LIVE_CATEGORY = {
  TQV: 'Moisture', QV2M: 'Moisture', mfc_mm_day: 'Moisture', UFLXQV: 'Moisture', VFLXQV: 'Moisture',
  U850: 'Circulation', V850: 'Circulation', OMEGA500: 'Circulation', shear_925_600: 'Circulation', AEJ_U600: 'Circulation',
  DUEXTTAU: 'Aerosols', TOTEXTTAU: 'Aerosols',
  GWETTOP: 'Surface', GWETROOT: 'Surface', EF: 'Surface', LHLAND: 'Surface', SHLAND: 'Surface', T2M_C: 'Surface',
};
const LIVE_SUMMARY_FROM = { TQV: 'tqv', U850: 'u850', OMEGA500: 'omega500' }; // reuse the team's wording where it matches
const LIVE_STATUS = { supporting: 'Supports', contrasting: 'Contrasts', unclear: 'Unclear' };
const toChartScale = (pts) => zScores(pts).map((p) => Math.max(4, Math.min(96, 50 + p.y * 15)));

function liveInvestigateVars(live) {
  const vars = live.comparisons.map((c) => {
    const reuse = INVESTIGATE_VARS.find((v) => v.id === LIVE_SUMMARY_FROM[c.variable]);
    const pts = (c.records || []).filter((r) => r.value != null).map((r) => ({ x: r.year, y: r.value }));
    return {
      id: c.variable,
      category: LIVE_CATEGORY[c.variable] ?? 'Other',
      name: `${c.label} (${c.variable})`,
      dataset: c.dataset?.startsWith('merra2') ? 'MERRA-2' : c.dataset,
      corr: `${signed(c.statistic, 2)} (p ${pText(c.p_value)})`,
      status: LIVE_STATUS[c.status] ?? 'Unclear',
      summary:
        reuse?.summary ??
        `Mechanism ${c.mechanism_id}: expected ${c.expected_sign > 0 ? 'positive' : 'negative'} association with seasonal rainfall. Own trend ${signed(c.variable_trend?.per_decade, 2)} ${c.unit}/decade.`,
      points: toChartScale(pts),
    };
  });
  const earthcare = INVESTIGATE_VARS.find((v) => v.id === 'earthcare');
  if (live.caseStudies.length && earthcare) {
    vars.push({ ...earthcare, corr: `${live.caseStudies.length} overpass case studies` });
  }
  return vars;
}

export function InvestigateLayerPage({ investigation, onUpdateInvestigation, onNextLayer }) {
  const liveEv = useLiveInvestigate(investigation);
  const isLive = liveEv.status === 'ready' && liveEv.comparisons.length > 0;
  const vars = useMemo(() => (isLive ? liveInvestigateVars(liveEv) : INVESTIGATE_VARS), [isLive, liveEv]);
  const [selectedVarId, setSelectedVarId] = useState(INVESTIGATE_VARS[0].id);
  const [lagMonths, setLagMonths] = useState(0);
  const activeVar = vars.find((v) => v.id === selectedVarId) ?? vars[0];

  const step = 504 / Math.max(1, activeVar.points.length - 1);
  const path = activeVar.points
    .map((v, i) => `${i === 0 ? 'M' : 'L'} ${30 + i * step} ${135 - v * 1.4}`)
    .join(' ');
  const baselinePoints = isLive && liveEv.rainfall?.length > 1 ? toChartScale(liveEv.rainfall) : null;
  const baselinePath = baselinePoints
    ? baselinePoints
        .map((v, i) => `${i === 0 ? 'M' : 'L'} ${30 + i * (504 / (baselinePoints.length - 1))} ${135 - v * 1.4}`)
        .join(' ')
    : 'M 30 98 L 102 92 L 174 96 L 246 82 L 318 76 L 390 68 L 462 60 L 534 52';

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] bg-[#FBFAF6] border border-[#E6E0D2] p-6 shadow-[0_20px_50px_rgba(19,29,56,0.06)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5B6478]">
              LAYER 02 · INVESTIGATE
            </p>
            <h2 className="mt-1 font-display text-[21px] font-semibold text-[#131D38]">
              Atmospheric & surface driver cross-examination
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] text-[#5B6478]">Lag:</span>
            {[0, 1, 2].map((lag) => (
              <button
                key={lag}
                type="button"
                onClick={() => setLagMonths(lag)}
                className={`px-3 py-1 rounded-full font-mono text-[11px] cursor-pointer ${
                  lagMonths === lag
                    ? 'bg-[#131D38] text-[#f4f1ea]'
                    : 'bg-[#f4f1ea] border border-[#E6E0D2] text-[#131D38]'
                }`}
              >
                {lag} mo
              </button>
            ))}
          </div>
        </div>

        {/* Variable pills */}
        <div className="mt-4 flex flex-wrap gap-2">
          {vars.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setSelectedVarId(v.id)}
              className={`px-3.5 py-2 rounded-full text-[12px] font-semibold border transition-colors cursor-pointer ${
                selectedVarId === v.id
                  ? 'bg-[#ffc20d] border-[#ffc20d] text-[#131D38]'
                  : 'bg-[#f4f1ea] border-[#E6E0D2] text-[#131D38] hover:bg-white'
              }`}
            >
              {v.name.split(' (')[0]}
            </button>
          ))}
        </div>

        {/* Detail Split */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 rounded-[22px] bg-[#131D38] p-5 text-[#f4f1ea]">
            <div className="flex items-center justify-between font-mono text-[10px] uppercase text-[#A9B1C6]">
              <span>
                {activeVar.dataset} · LAG {lagMonths} MONTH(S)
              </span>
              <span className="text-[#ffc20d]">
                {isLive
                  ? lagMonths
                    ? 'LAGGED TESTS NOT AVAILABLE · SHOWING LAG 0'
                    : 'STANDARDIZED · ρ AFTER DETRENDING'
                  : 'CO-VARIATION PREVIEW'}
              </span>
            </div>
            <svg
              viewBox="0 0 560 150"
              className="w-full h-auto mt-3"
              role="img"
              aria-label={`Co-variation chart for ${activeVar.name}`}
            >
              <line
                x1="25"
                y1="75"
                x2="545"
                y2="75"
                stroke="#f4f1ea"
                strokeOpacity="0.14"
                strokeDasharray="3 3"
              />
              <path
                d={baselinePath}
                fill="none"
                stroke="#4FB3A9"
                strokeWidth="2.2"
                strokeDasharray="4 4"
              />
              <path d={path} fill="none" stroke="#ffc20d" strokeWidth="2.8" strokeLinecap="round" />
            </svg>
            <div className="mt-3 flex flex-wrap gap-4 font-mono text-[11px] text-[#A9B1C6]">
              <span className="inline-flex items-center gap-1.5 text-[#ffc20d]">
                <span className="w-3 h-0.5 bg-[#ffc20d]" /> {activeVar.name}
              </span>
              <span className="inline-flex items-center gap-1.5 text-[#4FB3A9]">
                <span className="w-3 h-0.5 bg-[#4FB3A9]" /> {investigation.variable} baseline
              </span>
            </div>
          </div>

          <div className="lg:col-span-5 rounded-[22px] bg-[#f4f1ea] border border-[#E6E0D2] p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-wider text-[#5B6478]">
                  {activeVar.category}
                </span>
                <span
                  className={`px-3 py-0.5 rounded-full font-mono text-[10px] uppercase font-semibold ${
                    activeVar.status === 'Supports'
                      ? 'bg-[#4FB3A9]/20 text-[#131D38]'
                      : 'bg-[#FF7A6B]/20 text-[#991B1B]'
                  }`}
                >
                  {activeVar.status}
                </span>
              </div>
              <h3 className="mt-2 font-display text-[18px] font-semibold text-[#131D38]">
                {activeVar.name}
              </h3>
              <p className="mt-2 text-[14px] text-[#5B6478] leading-[1.6]">{activeVar.summary}</p>
            </div>

            <div className="mt-4 pt-3 border-t border-[#E6E0D2] flex items-center justify-between text-[13px]">
              <span className="font-mono text-[11px] text-[#5B6478]">Correlation:</span>
              <span className="font-mono font-semibold text-[#131D38]">{activeVar.corr}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Evidence Comparison Table + Limitations */}
      <section className="rounded-[28px] bg-[#FBFAF6] border border-[#E6E0D2] p-6 shadow-[0_20px_50px_rgba(19,29,56,0.06)]">
        <h3 className="font-display text-[18px] font-semibold text-[#131D38]">
          Evidence comparison table
        </h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-[#E6E0D2] font-mono text-[10px] uppercase tracking-wider text-[#5B6478]">
                <th className="py-2.5 pr-4">Variable</th>
                <th className="py-2.5 pr-4">Dataset</th>
                <th className="py-2.5 pr-4">Correlation</th>
                <th className="py-2.5">Evidence status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6E0D2]">
              {vars.map((v) => (
                <tr
                  key={v.id}
                  onClick={() => setSelectedVarId(v.id)}
                  className="hover:bg-[#f4f1ea]/60 cursor-pointer"
                >
                  <td className="py-2.5 pr-4 font-semibold text-[#131D38]">{v.name}</td>
                  <td className="py-2.5 pr-4 text-[#5B6478]">{v.dataset}</td>
                  <td className="py-2.5 pr-4 font-mono text-[12px]">{v.corr}</td>
                  <td className="py-2.5">
                    <span
                      className={`px-2.5 py-0.5 rounded-full font-mono text-[10px] uppercase ${
                        v.status === 'Supports'
                          ? 'bg-[#4FB3A9]/20 text-[#131D38]'
                          : 'bg-[#FF7A6B]/20 text-[#991B1B]'
                      }`}
                    >
                      {v.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-[#E6E0D2]">
          <p className="text-[12px] text-[#5B6478]">
            {isLive
              ? `${liveEv.notes.join(' ')} Reanalysis spatial smoothing (0.5°) limits single-variable attribution.`
              : liveEv.status === 'error'
                ? `Backend unavailable (${liveEv.error?.message ?? 'error'}). Showing the illustrative table.`
                : 'Limitation: Reanalysis spatial smoothing (0.5°) and MODIS cloud occlusion limit single-variable causal attribution.'}
          </p>
          <button
            type="button"
            onClick={() => {
              onUpdateInvestigation({ stageIndex: Math.max(investigation.stageIndex, 2) });
              onNextLayer();
            }}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#ffc20d] text-[#131D38] text-[14px] font-semibold hover:bg-[#eab006] transition-colors cursor-pointer shrink-0"
          >
            <span>Continue to Explain</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>
    </div>
  );
}

/* ============================================================================
 * PAGE 13: LAYER 03 — EXPLAIN / EVIDENCE LEDGER
 * ========================================================================== */
const MECHANISMS = [
  {
    id: 'monsoon',
    name: 'West African Monsoon / ITCZ',
    role: 'Primary seasonal moisture conduit',
    status: 'Supports',
    expected: 'Northward ITCZ excursion and stronger 850 hPa westerly inflow during JJAS.',
    observed:
      'Consistent 850 hPa wind inflow signal co-varying with Western Sahel rainfall bursts.',
  },
  {
    id: 'moisture',
    name: 'Atmospheric moisture availability',
    role: 'Thermodynamic fuel for convective peaks',
    status: 'Supports',
    expected: 'Rising TQV and 850 hPa specific humidity scaling with extreme daily rainfall.',
    observed: 'Positive co-variation between MERRA-2 QV850 and Rx1day intensity indicators.',
  },
  {
    id: 'convection',
    name: 'Organized mesoscale convection',
    role: 'Storm intensity amplification',
    status: 'Supports',
    expected:
      'Stronger meridional Sahara–Guinea temperature gradients intensifying squall lines (Taylor et al., 2017).',
    observed:
      'Supported qualitatively by Rx1day divergence and EarthCARE 2024+ anvil reflectivity.',
  },
  {
    id: 'dust',
    name: 'Dust & aerosol interactions',
    role: 'Competing radiative & microphysical driver',
    status: 'Unclear',
    expected: 'Mineral dust dampening surface heating vs seeding ice-phase precipitation.',
    observed: 'MODIS AOD correlation remains weak/mixed due to seasonal dust-cloud overlap.',
  },
  {
    id: 'land',
    name: 'Soil moisture & vegetation feedback',
    role: 'Post-rain boundary-layer recycling',
    status: 'Not tested',
    expected:
      'Mesoscale soil moisture gradients triggering afternoon storm initiation (Taylor et al., 2012).',
    observed:
      'Deferred pending sub-daily soil moisture archive integration (2001–2002 NDVI gap flagged).',
  },
];

export function ExplainLayerPage({
  investigation,
  onUpdateInvestigation,
  onNextLayer,
  onShowToast,
}) {
  const [selectedMechId, setSelectedMechId] = useState(MECHANISMS[0].id);
  const [confidence, setConfidence] = useState('Medium');
  const [notes, setNotes] = useState(
    investigation.researcherNotes ??
      'Monsoon inflow and thermodynamic moisture supply best align with intensifying convective rainfall bursts, whereas aerosol forcing and sub-daily land feedbacks require higher-resolution validation.'
  );

  const activeMech = MECHANISMS.find((m) => m.id === selectedMechId) ?? MECHANISMS[0];

  const handleSaveNotes = () => {
    onUpdateInvestigation({
      researcherNotes: notes,
      updatedLabel: 'Updated just now',
    });
    onShowToast('Researcher interpretation saved to investigation record.');
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] bg-[#FBFAF6] border border-[#E6E0D2] p-6 shadow-[0_20px_50px_rgba(19,29,56,0.06)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5B6478]">
              LAYER 03 · EXPLAIN
            </p>
            <h2 className="mt-1 font-display text-[21px] font-semibold text-[#131D38]">
              Candidate mechanisms & structured evidence ledger
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] text-[#5B6478]">Confidence:</span>
            {['Low', 'Medium', 'High'].map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setConfidence(lvl)}
                className={`px-3 py-1 rounded-full text-[12px] font-semibold cursor-pointer ${
                  confidence === lvl
                    ? 'bg-[#131D38] text-[#ffc20d]'
                    : 'bg-[#f4f1ea] border border-[#E6E0D2] text-[#131D38]'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        {/* 5 Mechanism Cards */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {MECHANISMS.map((m) => {
            const active = selectedMechId === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelectedMechId(m.id)}
                className={`p-4 rounded-[20px] border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  active
                    ? 'bg-[#131D38] text-[#f4f1ea] border-[#131D38]'
                    : 'bg-[#f4f1ea] text-[#131D38] border-[#E6E0D2] hover:border-[#131D38]/35'
                }`}
              >
                <div>
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full font-mono text-[9px] uppercase ${
                      m.status === 'Supports'
                        ? active
                          ? 'bg-[#ffc20d] text-[#131D38]'
                          : 'bg-[#4FB3A9]/20 text-[#131D38]'
                        : 'bg-[#FF7A6B]/20 text-[#991B1B]'
                    }`}
                  >
                    {m.status}
                  </span>
                  <div className="mt-2 font-display text-[14px] font-semibold leading-snug">
                    {m.name}
                  </div>
                </div>
                <div className={`mt-2 text-[11px] ${active ? 'text-[#A9B1C6]' : 'text-[#5B6478]'}`}>
                  {m.role}
                </div>
              </button>
            );
          })}
        </div>

        {/* Mechanism Detail + Researcher Notes */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 p-5 rounded-[22px] bg-[#f4f1ea] border border-[#E6E0D2] space-y-3">
            <h3 className="font-display text-[17px] font-semibold text-[#131D38]">
              {activeMech.name}
            </h3>
            <div className="p-3.5 rounded-[16px] bg-white border border-[#E6E0D2]">
              <div className="font-mono text-[10px] uppercase text-[#5B6478]">
                Expected physical signature
              </div>
              <p className="mt-1 text-[13px] text-[#131D38]">{activeMech.expected}</p>
            </div>
            <div className="p-3.5 rounded-[16px] bg-white border border-[#E6E0D2]">
              <div className="font-mono text-[10px] uppercase text-[#5B6478]">
                Observed dataset assessment
              </div>
              <p className="mt-1 text-[13px] text-[#131D38]">{activeMech.observed}</p>
            </div>
            <p className="text-[12px] text-[#5B6478]">
              Alternative explanation: North Atlantic multidecadal SST variability may modulate
              decadal amplitude independently of greenhouse warming.
            </p>
          </div>

          <div className="lg:col-span-6 p-5 rounded-[22px] bg-[#f4f1ea] border border-[#E6E0D2] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <label
                  htmlFor="researcher-notes"
                  className="font-mono text-[10px] uppercase tracking-wider text-[#5B6478]"
                >
                  Researcher interpretation (persisted)
                </label>
                <span className="font-mono text-[10px] text-[#5B6478]">
                  Confidence: {confidence}
                </span>
              </div>
              <textarea
                id="researcher-notes"
                rows={5}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-2 w-full rounded-[16px] bg-white border border-[#E6E0D2] p-3.5 text-[13px] text-[#131D38] leading-[1.55] focus:outline-none focus:border-[#131D38]"
              />
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleSaveNotes}
                className="px-4 py-2 rounded-full bg-[#131D38] text-[#f4f1ea] text-[12px] font-semibold hover:bg-[#1E2B52] cursor-pointer"
              >
                Save interpretation
              </button>
              <button
                type="button"
                onClick={() => {
                  onUpdateInvestigation({
                    researcherNotes: notes,
                    stageIndex: Math.max(investigation.stageIndex, 3),
                  });
                  onNextLayer();
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#ffc20d] text-[#131D38] text-[13px] font-semibold hover:bg-[#eab006] cursor-pointer"
              >
                <span>Continue to Project</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ============================================================================
 * PAGE 14: LAYER 04 — PROJECT / SCENARIO SIMULATOR
 * ========================================================================== */
const SCENARIOS = [
  {
    id: 'stabilization',
    name: 'Stabilization pathway',
    desc: 'Modest moisture flattening and restrained extreme convective escalation.',
    precipDelta: '+2% to +5% seasonal',
    rx1dayDelta: '+6% peak storm',
    color: '#4FB3A9',
    yEnd: 82,
  },
  {
    id: 'continuation',
    name: 'Trend continuation',
    desc: 'Extends recent 2003–2025 observational moisture and storm-intensity trajectory.',
    precipDelta: '+4% to +9% seasonal',
    rx1dayDelta: '+14% peak storm',
    color: '#ffc20d',
    yEnd: 62,
  },
  {
    id: 'stress',
    name: 'Increased convective stress',
    desc: 'Higher boundary-layer humidity paired with sharper intra-seasonal dry breaks.',
    precipDelta: '-3% to +11% volatile',
    rx1dayDelta: '+24% peak storm',
    color: '#FF7A6B',
    yEnd: 46,
  },
];

export function ProjectLayerPage({ investigation, onUpdateInvestigation, onNextLayer }) {
  const [selectedScenario, setSelectedScenario] = useState(SCENARIOS[1].id);
  const [moisturePerturb, setMoisturePerturb] = useState(8);
  const [drySpellPerturb, setDrySpellPerturb] = useState(12);

  return (
    <div className="space-y-6">
      {/* Mandatory Scientific Honesty Banner */}
      <div className="rounded-[22px] bg-[#131D38] text-[#f4f1ea] px-5 py-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-[#ffc20d] shrink-0" />
          <div>
            <span className="font-mono text-[11px] uppercase tracking-wider text-[#ffc20d]">
              CONDITIONAL SCENARIOS, NEVER FORECASTS
            </span>
            <p className="text-[13px] text-[#A9B1C6]">
              Pathways below (2025–2050) are diagnostic sensitivity envelopes conditioned on assumed
              climate stresses—not weather predictions.
            </p>
          </div>
        </div>
      </div>

      <section className="rounded-[28px] bg-[#FBFAF6] border border-[#E6E0D2] p-6 shadow-[0_20px_50px_rgba(19,29,56,0.06)]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Scenario Selector + Perturbations */}
          <div className="lg:col-span-5 space-y-4">
            <h2 className="font-display text-[20px] font-semibold text-[#131D38]">
              Layer 04 · Conditional pathways (2025–2050)
            </h2>

            <div className="space-y-2.5">
              {SCENARIOS.map((sc) => (
                <button
                  key={sc.id}
                  type="button"
                  onClick={() => setSelectedScenario(sc.id)}
                  className={`w-full p-4 rounded-[20px] border text-left transition-all cursor-pointer ${
                    selectedScenario === sc.id
                      ? 'bg-[#131D38] text-[#f4f1ea] border-[#131D38]'
                      : 'bg-[#f4f1ea] text-[#131D38] border-[#E6E0D2]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-display text-[15px] font-semibold">{sc.name}</span>
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: sc.color }} />
                  </div>
                  <p
                    className={`mt-1 text-[12px] ${
                      selectedScenario === sc.id ? 'text-[#A9B1C6]' : 'text-[#5B6478]'
                    }`}
                  >
                    {sc.desc}
                  </p>
                </button>
              ))}
            </div>

            <div className="p-4 rounded-[20px] bg-[#f4f1ea] border border-[#E6E0D2] space-y-3">
              <div className="font-mono text-[10px] uppercase text-[#5B6478]">
                Sensitivity perturbation controls
              </div>
              <label className="block text-[12px]">
                <div className="flex justify-between font-medium">
                  <span>Atmospheric moisture shift</span>
                  <span className="font-mono">+{moisturePerturb}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={20}
                  value={moisturePerturb}
                  onChange={(e) => setMoisturePerturb(Number(e.target.value))}
                  className="w-full accent-[#131D38] mt-1"
                />
              </label>
              <label className="block text-[12px]">
                <div className="flex justify-between font-medium">
                  <span>Intra-seasonal dry-spell risk</span>
                  <span className="font-mono">+{drySpellPerturb}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={30}
                  value={drySpellPerturb}
                  onChange={(e) => setDrySpellPerturb(Number(e.target.value))}
                  className="w-full accent-[#131D38] mt-1"
                />
              </label>
            </div>
          </div>

          {/* Multi-pathway Fan Chart */}
          <div className="lg:col-span-7 flex flex-col justify-between">
            <div className="rounded-[22px] bg-[#131D38] p-5 text-[#f4f1ea]">
              <div className="flex items-center justify-between font-mono text-[10px] uppercase text-[#A9B1C6]">
                <span>HISTORICAL BASELINE (2001–2025) → CONDITIONAL FAN (2025–2050)</span>
                <span className="text-[#ffc20d]">SENSITIVITY ENVELOPE</span>
              </div>

              <svg
                viewBox="0 0 560 205"
                className="w-full h-auto mt-3"
                role="img"
                aria-label="Conditional scenario fan chart"
              >
                {/* Divider at 2025 */}
                <line
                  x1="250"
                  y1="16"
                  x2="250"
                  y2="178"
                  stroke="#f4f1ea"
                  strokeOpacity="0.25"
                  strokeDasharray="4 4"
                />
                {/* Historical line */}
                <path
                  d="M 24 128 L 70 118 L 116 122 L 162 110 L 208 106 L 250 98"
                  fill="none"
                  stroke="#f4f1ea"
                  strokeWidth="2.4"
                />
                {/* Shaded uncertainty fan */}
                <polygon
                  points={`250,98 536,${Math.max(20, 42 - moisturePerturb * 0.6)} 536,${Math.min(165, 118 + drySpellPerturb * 0.5)}`}
                  fill="#ffc20d"
                  fillOpacity="0.14"
                />
                {SCENARIOS.map((sc) => (
                  <path
                    key={sc.id}
                    d={`M 250 98 Q 390 ${Math.round((98 + sc.yEnd) / 2)} 536 ${
                      sc.id === 'stress' ? Math.max(24, sc.yEnd - moisturePerturb * 0.5) : sc.yEnd
                    }`}
                    fill="none"
                    stroke={sc.color}
                    strokeWidth={selectedScenario === sc.id ? 3.2 : 1.6}
                    strokeDasharray={selectedScenario === sc.id ? '0' : '5 4'}
                    opacity={selectedScenario === sc.id ? 1 : 0.65}
                  />
                ))}
                <text
                  x="24"
                  y="194"
                  fill="#A9B1C6"
                  fontSize="10"
                  fontFamily="JetBrains Mono, monospace"
                >
                  2001
                </text>
                <text
                  x="236"
                  y="194"
                  fill="#ffc20d"
                  fontSize="10"
                  fontFamily="JetBrains Mono, monospace"
                >
                  2025
                </text>
                <text
                  x="506"
                  y="194"
                  fill="#A9B1C6"
                  fontSize="10"
                  fontFamily="JetBrains Mono, monospace"
                >
                  2050
                </text>
              </svg>
            </div>

            <div className="mt-4 overflow-x-auto border border-[#E6E0D2] rounded-[18px] bg-[#f4f1ea]">
              <table className="w-full text-left border-collapse text-[12px]">
                <thead className="border-b border-[#E6E0D2] font-mono text-[10px] uppercase text-[#5B6478]">
                  <tr>
                    <th className="py-2.5 px-4">Pathway</th>
                    <th className="py-2.5 px-4">Seasonal shift</th>
                    <th className="py-2.5 px-4">Rx1day intensity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6E0D2]">
                  {SCENARIOS.map((sc) => (
                    <tr
                      key={sc.id}
                      className={selectedScenario === sc.id ? 'bg-white font-semibold' : ''}
                    >
                      <td className="py-2.5 px-4 text-[#131D38]">{sc.name}</td>
                      <td className="py-2.5 px-4 font-mono">{sc.precipDelta}</td>
                      <td className="py-2.5 px-4 font-mono">{sc.rx1dayDelta}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  onUpdateInvestigation({ stageIndex: Math.max(investigation.stageIndex, 4) });
                  onNextLayer();
                }}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#ffc20d] text-[#131D38] text-[14px] font-semibold hover:bg-[#eab006] transition-colors cursor-pointer"
              >
                <span>Continue to Solve</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ============================================================================
 * PAGE 15: LAYER 05 — SOLVE / SOLUTION LAB
 * ========================================================================== */
const INTERVENTIONS = [
  {
    id: 'harvesting',
    name: 'Rainwater harvesting & zai pits',
    target: 'Peak-storm runoff capture (Q -> ΔS)',
    qualitativeEffect:
      'Slows flash runoff during heavy Rx1day bursts and increases local root-zone infiltration.',
    limitations:
      'Requires local slope and soil texture calibration before assigning quantitative mm retention.',
  },
  {
    id: 'mulching',
    name: 'Mulching & surface soil conservation',
    target: 'Evaporative loss reduction (ET modulation)',
    qualitativeEffect:
      'Buffers shallow soil moisture across extended mid-season Consecutive Dry Days (CDD).',
    limitations: 'Biomass availability constrained by post-harvest pastoral demand.',
  },
  {
    id: 'agroforestry',
    name: 'Farmer-managed agroforestry regeneration',
    target: 'Canopy shade & soil organic infiltration',
    qualitativeEffect:
      'Improves microclimate cooling and stabilizes sandy Sahelian topsoil against wind erosion.',
    limitations: 'Multi-year establishment lag (5–10 years) under extreme heat spells.',
  },
  {
    id: 'bunds',
    name: 'Contour stone bunds & watershed terraces',
    target: 'Overland sheet-flow attenuation',
    qualitativeEffect: 'Reduces gully erosion and extends moisture residence time downslope.',
    limitations:
      'Site-specific engineering depends on DEM hydrology not resolved at 0.1° IMERG grid scale.',
  },
];

export function SolveLayerPage({ investigation, onUpdateInvestigation, onNextLayer }) {
  const [selectedIds, setSelectedIds] = useState(['harvesting', 'bunds']);

  const toggleIntervention = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? (prev.length > 1 ? prev.filter((i) => i !== id) : prev) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6">
      {/* Inherited Summary + Water Balance Honesty */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-7 rounded-[28px] bg-[#FBFAF6] border border-[#E6E0D2] p-6 shadow-[0_20px_50px_rgba(19,29,56,0.06)]">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5B6478]">
            LAYER 05 · SOLVE
          </p>
          <h2 className="mt-1 font-display text-[21px] font-semibold text-[#131D38]">
            Watershed & land-water adaptation comparison
          </h2>
          <p className="mt-2 text-[14px] text-[#5B6478]">
            Select interventions below to compare qualitative sensitivity against intensifying storm
            bursts ({investigation.region}, {investigation.period}).
          </p>

          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {INTERVENTIONS.map((item) => {
              const active = selectedIds.includes(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleIntervention(item.id)}
                  className={`p-4 rounded-[20px] border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    active
                      ? 'bg-[#131D38] text-[#f4f1ea] border-[#131D38]'
                      : 'bg-[#f4f1ea] text-[#131D38] border-[#E6E0D2]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[10px] uppercase text-[#4FB3A9]">
                        {item.target}
                      </span>
                      <CheckCircle2
                        className={`w-4 h-4 ${active ? 'text-[#ffc20d]' : 'text-[#5B6478]/40'}`}
                      />
                    </div>
                    <h3 className="mt-2 font-display text-[15px] font-semibold">{item.name}</h3>
                    <p
                      className={`mt-1.5 text-[12px] ${active ? 'text-[#A9B1C6]' : 'text-[#5B6478]'}`}
                    >
                      {item.qualitativeEffect}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Conceptual Water-Balance Card */}
        <section className="lg:col-span-5 rounded-[28px] bg-[#131D38] text-[#f4f1ea] p-6 shadow-[0_20px_50px_rgba(19,29,56,0.12)] flex flex-col justify-between">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#ffc20d]">
              WATER-BALANCE FRAMEWORK
            </p>
            <div className="mt-3 p-4 rounded-[18px] bg-[#0B1224] border border-[#f4f1ea]/15 font-mono text-[16px] text-center text-[#f4f1ea]">
              ΔS = P − ET − Q − D
            </div>
            <p className="mt-3 text-[13px] text-[#A9B1C6] leading-[1.6]">
              Where precipitation (<strong>P</strong>) partitions into evapotranspiration (
              <strong>ET</strong>), surface runoff (<strong>Q</strong>), deep drainage (
              <strong>D</strong>), and root-zone storage (<strong>ΔS</strong>).
            </p>
            <div className="mt-4 p-4 rounded-[18px] bg-[#1E2B52] border border-[#f4f1ea]/10 text-[12px] text-[#f4f1ea]/90">
              <strong>Honesty guard:</strong> Because 0.1° satellite precipitation lacks plot-scale
              soil infiltration parameters, intervention effects remain qualitative sensitivity
              comparisons—not site-certified yield predictions.
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              onUpdateInvestigation({
                completed: true,
                status: 'completed',
                stageIndex: 4,
                updatedLabel: 'Updated just now',
              });
              onNextLayer();
            }}
            className="mt-6 w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#ffc20d] text-[#131D38] text-[14px] font-semibold hover:bg-[#eab006] transition-colors cursor-pointer"
          >
            <span>Generate Scientific Investigation Report</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </section>
      </div>
    </div>
  );
}
