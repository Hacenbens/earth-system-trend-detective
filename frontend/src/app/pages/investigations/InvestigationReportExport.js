'use client';

import { useState } from 'react';
import { Download, FileCode2, FileSpreadsheet, Image as ImageIcon, Printer } from 'lucide-react';
import { SCIENTIFIC_REFERENCES } from '@/app/api/dashboardData';
import { pText, scaler, senEnds, signed, useLiveReport } from '@/lib/liveLayers';

// ---- live feed (backend report.json): sentences and series for the report and the exports
const SC_LABEL = { stabilization: 'Stabilization', trend_continuation: 'Trend continuation', increased_stress: 'Increased stress' };

function liveSummary(live) {
  const m = live.main;
  if (!m) return null;
  const check = m.independent_check;
  const support = live.comparisons.filter((c) => c.status === 'supporting').length;
  return (
    `Seasonal rainfall: ${m.wording.toLowerCase()} (${signed(m.pct_per_decade)} %/decade, Mann–Kendall p = ${pText(m.p_value)}, ` +
    `${m.n} seasons, ${m.provenance?.dataset} ${m.provenance?.version})` +
    (check ? `; independent check ${check.dataset}: ${signed(check.pct_per_decade)} %/decade, p = ${pText(check.p_value)}.` : '.') +
    (live.comparisons.length ? ` ${support} of ${live.comparisons.length} MERRA-2 variables move with rainfall in the expected direction.` : '')
  );
}

function liveTrendSentences(live) {
  return live.trends
    .map((r) => `${r.label}: ${signed(r.pct_per_decade)} %/decade (p = ${pText(r.p_value)}, ${r.significant ? 'significant' : 'not significant'}).`)
    .join(' ');
}

function liveEvidenceSentence(live) {
  const sup = live.comparisons.filter((c) => c.status === 'supporting');
  if (!live.comparisons.length) return '';
  return ` Supporting (detrended Spearman, p < 0.05): ${sup.map((c) => `${c.label} ρ = ${signed(c.statistic, 2)}`).join('; ') || 'none'}.`;
}

function liveScenarioSentence(live) {
  const s = live.scenarios;
  if (!s?.pct_difference_at_end) return '';
  const last = s.projection?.trend_continuation?.at(-1)?.year;
  const parts = Object.entries(s.pct_difference_at_end).map(([k, v]) => `${SC_LABEL[k] ?? k} ${signed(v)} %`);
  return ` By ${last}: ${parts.join(', ')} (rainfall vs the ${s.baseline_period.join('–')} mean). ${(s.warnings || []).slice(1).join(' ')}`;
}

function liveSeriesPoints(live) {
  return (live.main?.series || []).filter((p) => p.value != null).map((p) => ({ x: Number(p.date), y: p.value }));
}

/* ============================================================================
 * PAGE 16: SCIENTIFIC INVESTIGATION REPORT (/investigations/:id/report)
 * ========================================================================== */
export function ScientificReportPage({ investigation, datasets, onGoToExport }) {
  const live = useLiveReport(investigation);
  const isLive = live.status === 'ready' && !!live.main;
  return (
    <article className="rounded-[28px] bg-[#FBFAF6] border border-[#E6E0D2] p-6 sm:p-10 shadow-[0_20px_50px_rgba(19,29,56,0.06)] space-y-8 print:shadow-none print:border-none">
      {/* Report Header */}
      <header className="pb-6 border-b border-[#E6E0D2] flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5B6478]">
            EARTHSIGNAL SCIENTIFIC REPORT · {investigation.id.toUpperCase()}
          </p>
          <h2 className="mt-2 font-display text-[28px] sm:text-[32px] font-semibold text-[#131D38] leading-tight">
            {investigation.title}
          </h2>
          <p className="mt-2 text-[14px] text-[#5B6478] tabular-nums">
            Region: {investigation.region} ({investigation.coords}) · Period: {investigation.period}{' '}
            ({investigation.season})
          </p>
        </div>
        <button
          type="button"
          onClick={onGoToExport}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#ffc20d] text-[#131D38] text-[13px] font-semibold hover:bg-[#eab006] transition-colors cursor-pointer print:hidden shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>Preview & export report</span>
        </button>
      </header>

      {/* Executive Summary */}
      <section className="p-6 rounded-[22px] bg-[#131D38] text-[#f4f1ea]">
        <div className="font-mono text-[10px] uppercase tracking-wider text-[#ffc20d]">
          {isLive ? 'EXECUTIVE SUMMARY (LIVE · BACKEND ANALYSIS)' : 'EXECUTIVE SUMMARY (CANDIDATE PROVENANCE STATUS)'}
        </div>
        <p className="mt-2 text-[15px] leading-[1.65] text-[#f4f1ea]/95">
          {investigation.researchQuestion ||
            `Evaluates ${investigation.variable} evolution across ${investigation.region} over ${investigation.period}.`}{' '}
          {isLive
            ? `${liveSummary(live)} Layers 4–5 represent conditional sensitivity scenarios and watershed comparisons, never forecasts.`
            : 'Statistical trend metrics remain clearly labeled as diagnostic placeholders until archive file audits for GPM IMERG Final V07 and MERRA-2 are verified. Layers 4–5 represent conditional sensitivity scenarios and watershed comparisons, never forecasts.'}
        </p>
      </section>

      {/* Sections 1–8 */}
      <div className="space-y-6 text-[14px] leading-[1.65] text-[#131D38]">
        <section>
          <h3 className="font-display text-[18px] font-semibold">
            1. Investigation overview & scope
          </h3>
          <p className="mt-1.5 text-[#5B6478]">
            Study box {investigation.coords} evaluated over {investigation.period} focusing on{' '}
            {investigation.season}. MODIS Aqua NDVI discontinuities in 2001–2002 are retained
            explicitly as missing (NaN) rather than zero-filled.
          </p>
        </section>

        <section>
          <h3 className="font-display text-[18px] font-semibold">
            2. Layer 01 · Trend detection (GPM IMERG Final V07)
          </h3>
          <p className="mt-1.5 text-[#5B6478]">
            Applies non-parametric Mann-Kendall testing and Sen’s slope estimation for seasonal
            rainfall totals alongside daily extreme indices (Rx1day, R95p, SDII, CDD).{' '}
            {isLive
              ? liveTrendSentences(live)
              : 'Numerical slopes are withheld as placeholders pending verified computation.'}
          </p>
        </section>

        <section>
          <h3 className="font-display text-[18px] font-semibold">
            3. Layer 02 · Environmental & atmospheric investigation
          </h3>
          <p className="mt-1.5 text-[#5B6478]">
            Cross-examines MERRA-2 850 hPa specific humidity, total-column water vapour, low-level
            zonal monsoon inflow, 500 hPa vertical velocity, and MODIS AOD/NDVI. EarthCARE CPR &
            ATLID (2024+) serve exclusively as contemporary process case studies.
            {isLive ? liveEvidenceSentence(live) : ''}
          </p>
        </section>

        <section>
          <h3 className="font-display text-[18px] font-semibold">
            4. Layer 03 · Physical explanation & researcher interpretation
          </h3>
          <p className="mt-1.5 text-[#5B6478]">
            {investigation.researcherNotes ||
              'Evidence synthesis balances West African Monsoon moisture transport and organized mesoscale convection against competing aerosol radiative hypotheses.'}
          </p>
        </section>

        <section>
          <h3 className="font-display text-[18px] font-semibold">
            5. Layer 04 · Conditional scenario pathways (2025–2050)
          </h3>
          <p className="mt-1.5 text-[#5B6478]">
            Compares Stabilization, Trend continuation, and Increased convective stress pathways as
            diagnostic sensitivity bands conditioned on humidity and dry-spell perturbations—never
            weather predictions.
            {isLive ? liveScenarioSentence(live) : ''}
          </p>
        </section>

        <section>
          <h3 className="font-display text-[18px] font-semibold">
            6. Layer 05 · Watershed adaptation comparison
          </h3>
          <p className="mt-1.5 text-[#5B6478]">
            Evaluates rainwater harvesting (zai pits), mulching, farmer-managed agroforestry, and
            contour stone bunds within the ΔS = P − ET − Q − D water-balance framework.
            {isLive && live.report.solution_comparison?.note ? ` ${live.report.solution_comparison.note}` : ''}
          </p>
        </section>

        <section>
          <h3 className="font-display text-[18px] font-semibold">
            7. Scientific limitations & data provenance
          </h3>
          <ul className="mt-2 list-disc pl-5 text-[#5B6478] space-y-1">
            {datasets.slice(0, 3).map((d) => (
              <li key={d.id}>
                <strong>{d.name}</strong> ({d.status}): {d.limitations[0]}
              </li>
            ))}
            {isLive && (live.report.limitations || []).map((l) => <li key={l}>{l}</li>)}
          </ul>
        </section>

        <section>
          <h3 className="font-display text-[18px] font-semibold">8. Peer-reviewed references</h3>
          <ul className="mt-2 space-y-1.5 text-[13px] text-[#5B6478]">
            {SCIENTIFIC_REFERENCES.slice(0, 5).map((r) => (
              <li key={r.id}>
                {r.authors} ({r.year}). <em>{r.title}</em>. {r.journal}.
              </li>
            ))}
          </ul>
        </section>
      </div>
    </article>
  );
}

/* ============================================================================
 * PAGE 17: REPORT PREVIEW & EXPORT (/investigations/:id/export)
 * ========================================================================== */
export function ReportExportPage({ investigation, datasets, onShowToast }) {
  const live = useLiveReport(investigation);
  const isLive = live.status === 'ready' && !!live.main;
  const series = isLive ? liveSeriesPoints(live) : [];
  // real series as an SVG path inside a (w x h) box with padding p; Sen line endpoints too
  const seriesPath = (w, h, p) => {
    if (series.length < 2) return null;
    const { toX, toY } = scaler(series, { x0: p, x1: w - p, y0: p, y1: h - p });
    const sen = senEnds(series, live.main.sen_slope);
    return {
      d: series.map((q, i) => `${i ? 'L' : 'M'}${toX(q.x).toFixed(1)} ${toY(q.y).toFixed(1)}`).join(' '),
      sen: sen && [toX(sen[0].x), toY(sen[0].y), toX(sen[1].x), toY(sen[1].y)].map((v) => v.toFixed(1)),
    };
  };
  const [includeCharts, setIncludeCharts] = useState(true);
  const [includeProvenance, setIncludeProvenance] = useState(true);
  const [includeLimitations, setIncludeLimitations] = useState(true);
  const [includeReferences, setIncludeReferences] = useState(true);

  const downloadBlob = (content, filename, mime) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadJson = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      investigation,
      options: { includeCharts, includeProvenance, includeLimitations, includeReferences },
      datasets: includeProvenance
        ? datasets.map((d) => ({ id: d.id, name: d.name, status: d.status, agency: d.agency }))
        : undefined,
      references: includeReferences ? SCIENTIFIC_REFERENCES : undefined,
      backendReport: isLive ? live.report : undefined,
      notice: isLive
        ? 'backendReport holds the computed results (backend API report.json). Layers 4-5 are conditional scenarios, never forecasts.'
        : 'Layers 4-5 are conditional scenarios, never forecasts. Placeholder values require verification.',
    };
    downloadBlob(
      JSON.stringify(payload, null, 2),
      `${investigation.id}-report.json`,
      'application/json'
    );
    onShowToast('Downloaded investigation bundle as JSON.');
  };

  const handleDownloadCsv = () => {
    const rows = [
      ['Field', 'Value'],
      ['Title', investigation.title],
      ['Region', investigation.region],
      ['Coordinates', investigation.coords],
      ['Period', investigation.period],
      ['Season', investigation.season],
      ['Primary Variable', investigation.variable],
      ['Dataset', investigation.dataset],
      ['Dataset Status', investigation.datasetStatus],
      ['Current Stage Index', String(investigation.stageIndex + 1)],
      ['Notes', investigation.researcherNotes || 'Candidate workspace preview'],
      ...(isLive
        ? [
            ...live.trends.flatMap((r) => [
              [`${r.label} trend (%/decade)`, signed(r.pct_per_decade, 2)],
              [`${r.label} Mann-Kendall p`, pText(r.p_value)],
              [`${r.label} Sen slope (${r.slope_unit})`, signed(r.sen_slope, 3)],
            ]),
            ...series.map((q) => [`${live.main.label} ${q.x} (${live.main.unit})`, q.y.toFixed(1)]),
            ['Source', `${live.main.provenance?.dataset} ${live.main.provenance?.version} via backend API`],
          ]
        : []),
    ]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    downloadBlob(rows, `${investigation.id}-summary.csv`, 'text/csv;charset=utf-8');
    onShowToast('Downloaded investigation summary as CSV.');
  };

  const handleDownloadSvgChart = () => {
    const sp = seriesPath(640, 240, 36);
    if (sp) {
      const m = live.main;
      const svgLive = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="240" viewBox="0 0 640 240"><rect width="640" height="240" fill="#131D38"/><text x="28" y="30" fill="#ffc20d" font-family="monospace" font-size="13">${investigation.title} · ${series[0].x}–${series[series.length - 1].x}</text><path d="${sp.d}" fill="none" stroke="#4FB3A9" stroke-width="2.5"/>${sp.sen ? `<line x1="${sp.sen[0]}" y1="${sp.sen[1]}" x2="${sp.sen[2]}" y2="${sp.sen[3]}" stroke="#ffc20d" stroke-width="2" stroke-dasharray="6 4"/>` : ''}<text x="28" y="226" fill="#A9B1C6" font-family="monospace" font-size="11">${m.label} (${m.unit}) · Sen ${signed(m.pct_per_decade)} %/decade, MK p = ${pText(m.p_value)} · ${m.provenance?.dataset} ${m.provenance?.version}</text></svg>`;
      downloadBlob(svgLive, `${investigation.id}-chart.svg`, 'image/svg+xml;charset=utf-8');
      onShowToast('Downloaded publication-ready chart vector (SVG).');
      return;
    }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="240" viewBox="0 0 640 240"><rect width="640" height="240" fill="#131D38"/><text x="28" y="38" fill="#ffc20d" font-family="monospace" font-size="13">${investigation.title} · ${investigation.period}</text><path d="M 36 165 L 140 150 L 240 156 L 340 132 L 440 118 L 580 96" fill="none" stroke="#4FB3A9" stroke-width="3"/><text x="28" y="212" fill="#A9B1C6" font-family="monospace" font-size="11">Illustrative EarthSignal diagnostic export · Verify dataset status before citing</text></svg>`;
    downloadBlob(svg, `${investigation.id}-chart.svg`, 'image/svg+xml;charset=utf-8');
    onShowToast('Downloaded publication-ready chart vector (SVG).');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <section className="lg:col-span-5 rounded-[28px] bg-[#FBFAF6] border border-[#E6E0D2] p-6 shadow-[0_20px_50px_rgba(19,29,56,0.06)] space-y-5">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5B6478]">
            EXPORT CONFIGURATION
          </p>
          <h2 className="mt-1 font-display text-[21px] font-semibold text-[#131D38]">
            Package & download options
          </h2>
        </div>

        <div className="space-y-3 text-[13px]">
          {[
            {
              label: 'Include diagnostic figures & vector charts',
              checked: includeCharts,
              set: setIncludeCharts,
            },
            {
              label: 'Include full dataset provenance audit log',
              checked: includeProvenance,
              set: setIncludeProvenance,
            },
            {
              label: 'Include scientific limitations & EarthCARE rule',
              checked: includeLimitations,
              set: setIncludeLimitations,
            },
            {
              label: 'Include peer-reviewed references',
              checked: includeReferences,
              set: setIncludeReferences,
            },
          ].map((opt) => (
            <label
              key={opt.label}
              className="flex items-center justify-between gap-3 p-3.5 rounded-[18px] bg-[#f4f1ea] border border-[#E6E0D2] cursor-pointer"
            >
              <span className="font-medium text-[#131D38]">{opt.label}</span>
              <input
                type="checkbox"
                checked={opt.checked}
                onChange={(e) => opt.set(e.target.checked)}
                className="w-4 h-4 accent-[#131D38] cursor-pointer"
              />
            </label>
          ))}
        </div>

        <div className="pt-2 space-y-2.5">
          <button
            type="button"
            onClick={() => window.print()}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-[#ffc20d] text-[#131D38] text-[14px] font-semibold hover:bg-[#eab006] cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print / Save as PDF</span>
          </button>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={handleDownloadJson}
              className="inline-flex items-center justify-center gap-1.5 py-2.5 rounded-full bg-[#131D38] text-[#f4f1ea] text-[12px] font-semibold hover:bg-[#1E2B52] cursor-pointer"
            >
              <FileCode2 className="w-3.5 h-3.5" />
              <span>JSON</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadCsv}
              className="inline-flex items-center justify-center gap-1.5 py-2.5 rounded-full border border-[#131D38]/25 bg-white text-[#131D38] text-[12px] font-semibold hover:bg-[#f4f1ea] cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadSvgChart}
              className="inline-flex items-center justify-center gap-1.5 py-2.5 rounded-full border border-[#131D38]/25 bg-white text-[#131D38] text-[12px] font-semibold hover:bg-[#f4f1ea] cursor-pointer"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Chart</span>
            </button>
          </div>
        </div>
      </section>

      {/* Live Print Preview Card */}
      <section className="lg:col-span-7 rounded-[28px] bg-[#131D38] text-[#f4f1ea] p-6 sm:p-8 shadow-[0_20px_50px_rgba(19,29,56,0.12)]">
        <div className="flex items-center justify-between pb-4 border-b border-[#f4f1ea]/12">
          <span className="font-mono text-[10px] uppercase tracking-wider text-[#ffc20d]">
            LIVE REPORT PREVIEW
          </span>
          <span className="font-mono text-[10px] text-[#A9B1C6]">EARTHSIGNAL ARCHIVE PACKAGE</span>
        </div>

        <div className="mt-5 rounded-[22px] bg-[#FBFAF6] text-[#131D38] p-6 space-y-4">
          <div className="font-mono text-[10px] uppercase text-[#5B6478]">
            {investigation.region} · {investigation.period}
          </div>
          <h3 className="font-display text-[22px] font-semibold">{investigation.title}</h3>
          <p className="text-[13px] text-[#5B6478]">
            {investigation.researchQuestion || 'Multi-layer Earth-system investigation dossier.'}
          </p>

          {includeCharts && (
            <div className="p-4 rounded-[16px] bg-[#131D38] text-[#f4f1ea]">
              <div className="font-mono text-[10px] text-[#4FB3A9]">INCLUDED FIGURE PREVIEW</div>
              <svg viewBox="0 0 400 70" className="w-full h-14 mt-2">
                <path
                  d={seriesPath(400, 70, 8)?.d || 'M10 56 L70 48 L130 52 L190 36 L250 40 L310 24 L385 16'}
                  fill="none"
                  stroke="#ffc20d"
                  strokeWidth="2.5"
                />
              </svg>
            </div>
          )}

          {includeProvenance && (
            <div className="p-3 rounded-[14px] bg-[#f4f1ea] border border-[#E6E0D2] text-[12px]">
              <strong>Provenance attached:</strong> {datasets.length} catalogued products (
              {investigation.datasetStatus}).
            </div>
          )}
          {includeLimitations && (
            <div className="p-3 rounded-[14px] bg-[#f4f1ea] border border-[#E6E0D2] text-[12px]">
              <strong>Honesty guard:</strong> Missing data remain NaN; EarthCARE restricted to 2024+
              process case studies; Layers 4–5 are conditional scenarios, never forecasts.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
