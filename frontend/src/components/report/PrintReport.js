'use client';
/**
 * A4 print layout of the investigation, built from the metrics (not from the screen). Rendered into <body> through a
 * portal and shown only when printing (globals.css @media print), so "Save as PDF" gives exactly this document.
 * Drafted with AI assistance (Claude Code). See docs/submission/si_usage.md.
 */
import { useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';

import { PValueScale, RhoBars, SlopeIntervals, TrendChart } from '@/components/charts/StatCharts';
import { pText, signed } from '@/lib/liveLayers';
import { FindingTiles, Headline } from './KeyFindings';
import { NarrativeText } from './NarrativePanel';

const subscribe = () => () => {};
const useIsClient = () => useSyncExternalStore(subscribe, () => true, () => false);

const SC_LABEL = { stabilization: 'Stabilization', trend_continuation: 'Trend continuation', increased_stress: 'Increased stress' };

function Section({ title, children }) {
  return (
    <section className="mt-6 break-inside-avoid">
      <h2 className="font-display text-[15px] font-semibold text-[#131D38] border-b border-[#E6E0D2] pb-1">
        <span className="print-section-number" /> {title}
      </h2>
      <div className="mt-2 text-[11.5px] leading-[1.55] text-[#131D38]">{children}</div>
    </section>
  );
}

function tests(main) {
  const ac = main.autocorrelation || {};
  const check = main.independent_check;
  return [
    { label: 'Mann–Kendall', p: main.p_value },
    { label: 'MK pre-whitened', p: ac.mk_yue_wang_p },
    { label: 'Linear regression', p: main.cross_checks?.ols_p },
    check && { label: 'Check: CHIRPS', p: check.p_value },
  ].filter(Boolean);
}

function intervals(trends, check) {
  const rows = trends.map((r) => {
    const f = r.sen_slope ? r.pct_per_decade / r.sen_slope : null;
    return { label: r.label, value: r.pct_per_decade, lo: f && r.slope_ci95 ? r.slope_ci95[0] * f : undefined, hi: f && r.slope_ci95 ? r.slope_ci95[1] * f : undefined };
  });
  if (check) rows.splice(1, 0, { label: 'Rainfall (CHIRPS)', value: check.pct_per_decade });
  return rows;
}

export function PrintReport({ investigation, live, findings, narrative, options }) {
  const isClient = useIsClient();
  if (!isClient || !findings) return null;
  const { main, scenarios } = findings;
  const report = live.report || {};
  const comps = live.comparisons || [];
  const solve = report.solution_comparison;
  const series = (main.series || []).filter((p) => p.value != null).map((p) => ({ x: Number(p.date), y: p.value }));
  const today = new Date().toISOString().slice(0, 10);

  return createPortal(
    <div className="print-root hidden print:block bg-white text-[#131D38] font-sans">
      <header className="border-b-2 border-[#131D38] pb-3">
        <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#5B6478]">
          EarthSignal · scientific investigation report · {today}
        </div>
        <h1 className="mt-1 font-display text-[24px] font-semibold leading-tight">{investigation.title}</h1>
        <div className="mt-1 text-[11px] text-[#5B6478]">
          {investigation.region} · {main.period?.join('–')} · June–September · {main.provenance?.dataset} {main.provenance?.version}
        </div>
      </header>

      <Section title="Key findings">
        <Headline parts={findings.headline} className="text-[12.5px] leading-[1.6]" />
        <div className="mt-3">
          <FindingTiles tiles={findings.tiles} compact />
        </div>
      </Section>

      {options.includeCharts && (
        <Section title={`${main.label}, ${main.period?.join('–')}`}>
          <TrendChart points={series} slope={main.sen_slope} yLabel={`${main.label} (${main.unit})`} theme="light" height={220} />
          <p className="text-[10px] text-[#5B6478]">Teal: seasonal totals · amber dashed: Sen slope fit.</p>
        </Section>
      )}

      <Section title="Statistical tests">
        {options.includeCharts ? (
          <div className="space-y-3 max-w-[520px]">
            <PValueScale tests={tests(main)} />
            <SlopeIntervals rows={intervals(live.trends, main.independent_check)} />
          </div>
        ) : (
          <ul className="list-disc pl-5">
            {tests(main).map((t) => (
              <li key={t.label}>{t.label}: p = {pText(t.p)}</li>
            ))}
          </ul>
        )}
        <p className="mt-1 text-[10px] text-[#5B6478]">
          A trend is significant when p &lt; 0.05 and its 95 % interval excludes zero. Autocorrelation lag-1 ={' '}
          {signed(main.autocorrelation?.lag1, 2)}.
        </p>
      </Section>

      {comps.length > 0 && (
        <Section title="What moves with the rain (MERRA-2, detrended)">
          {options.includeCharts && (
            <div className="max-w-[520px]">
            <RhoBars rows={comps.map((c) => ({ label: c.label, rho: c.statistic, p: c.p_value, status: c.status }))} theme="light" />
            </div>
          )}
          <p className="text-[10px] text-[#5B6478]">Associations, not causes. Spearman ρ after removing both trends.</p>
        </Section>
      )}

      {scenarios?.pct_difference_at_end && (
        <Section title="Scenarios (not forecasts)">
          <table className="w-full text-[11px] border-collapse">
            <thead>
              <tr className="text-left font-mono text-[9px] uppercase text-[#5B6478] border-b border-[#E6E0D2]">
                <th className="py-1">Pathway</th>
                <th className="py-1">Assumption</th>
                <th className="py-1 text-right">Change by {scenarios.projection?.trend_continuation?.at(-1)?.year}</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(scenarios.pct_difference_at_end).map(([k, v]) => (
                <tr key={k} className="border-b border-[#E6E0D2]">
                  <td className="py-1 font-semibold">{SC_LABEL[k] ?? k}</td>
                  <td className="py-1 font-mono">{scenarios.formulas?.[k]}</td>
                  <td className="py-1 text-right tabular-nums">
                    {signed(v)} % ({signed(scenarios.difference_at_end?.[k], 0)} {scenarios.unit})
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(scenarios.warnings || []).map((w) => (
            <p key={w} className="text-[10px] text-[#7a5a00]">{w}</p>
          ))}
        </Section>
      )}

      {solve?.comparison?.length > 0 && (
        <Section title="Adaptation options (qualitative)">
          <ul className="list-disc pl-5 space-y-0.5">
            {solve.comparison.map((c) => (
              <li key={c.id}>
                <strong>{c.name}</strong>: {c.expected_effect}. <span className="text-[#5B6478]">Unknowns: {(c.unknowns || []).join(', ')}.</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {narrative?.text && (
        <Section title="AI-assisted narrative">
          <NarrativeText data={narrative} />
          <p className="mt-1 text-[10px] text-[#5B6478]">
            {narrative.ai_label} Model {narrative.model};{' '}
            {narrative.verified ? 'every number matches the data.' : `not verified: ${narrative.unverified_numbers.join(', ')}.`}
          </p>
        </Section>
      )}

      {options.includeLimitations && (
        <Section title="Limitations">
          <ul className="list-disc pl-5">
            {(report.limitations || []).map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </Section>
      )}

      {options.includeProvenance && (
        <Section title="Data and provenance">
          <ul className="list-disc pl-5">
            {(report.references?.datasets || []).map((d) => (
              <li key={d.code}>
                {d.name} {d.version} ({d.agency}){d.doi ? `, DOI ${d.doi}` : ''}
              </li>
            ))}
          </ul>
          <p className="mt-1 text-[10px] text-[#5B6478]">
            Warehouse build {report.build?.built_at} (commit {report.build?.git_commit}).
          </p>
        </Section>
      )}

      <footer className="mt-6 pt-2 border-t border-[#E6E0D2] text-[9px] text-[#5B6478]">
        {report.ai_use} · NASA Space Apps 2026 · EarthSignal
      </footer>
    </div>,
    document.body
  );
}
