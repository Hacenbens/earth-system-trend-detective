/**
 * Turns the backend report (report.json via useLiveReport) into the few metrics a reader needs first.
 * Shared by the on-screen key findings and the print/PDF layout. Drafted with AI assistance (Claude Code).
 */
import { pText, signed } from '@/lib/liveLayers';

const SC_LABEL = { stabilization: 'Stabilization', trend_continuation: 'Trend continuation', increased_stress: 'Increased stress' };

function bestMechanism(mechanisms) {
  const rank = { high: 5, 'medium-high': 4, medium: 3, 'low-medium': 2, low: 1 };
  return [...(mechanisms || [])].sort((a, b) => {
    const share = (m) => (m.counts?.consistent || 0) / Math.max(1, Object.values(m.counts || {}).reduce((s, v) => s + v, 0));
    return (rank[b.confidence] || 0) - (rank[a.confidence] || 0) || share(b) - share(a);
  })[0];
}

/** { headline: [{text, strong?}], tiles: [...], main, scenarios } or null when the report is not live. */
export function buildFindings(live, mechanisms, investigation) {
  const m = live?.main;
  if (!m) return null;
  const check = m.independent_check;
  const cdd = live.trends.find((r) => r.metric === 'CDD');
  const comps = live.comparisons || [];
  const support = comps.filter((c) => c.status === 'supporting').sort((a, b) => Math.abs(b.statistic) - Math.abs(a.statistic));
  const mech = bestMechanism(mechanisms);
  const sc = live.scenarios;
  const pcts = sc?.pct_difference_at_end ? Object.values(sc.pct_difference_at_end) : [];
  const endYear = sc?.projection?.trend_continuation?.at(-1)?.year;
  const dir = m.pct_per_decade > 0 ? 'increased' : m.pct_per_decade < 0 ? 'decreased' : 'did not change';
  const [y0, y1] = m.period || [investigation.startYear, investigation.endYear];

  const headline = [
    { text: `In ${investigation.region}, June–September rainfall ` },
    { text: `${dir} by ${signed(Math.abs(m.pct_per_decade))} %/decade`.replace('+', ''), strong: true },
    { text: ` over ${y0}–${y1}; this is ` },
    { text: m.significant ? 'statistically significant' : 'not statistically significant', strong: true, tone: m.significant ? 'good' : 'warn' },
    { text: ` (Mann–Kendall p = ${pText(m.p_value)}).` },
  ];
  if (check) {
    headline.push({ text: ' The independent CHIRPS record ' });
    headline.push({ text: check.agrees_in_sign ? 'agrees in direction' : 'disagrees in direction', strong: true });
    headline.push({ text: ` (${signed(check.pct_per_decade)} %/decade).` });
  }
  if (support.length) {
    headline.push({ text: ` Rainfall moves with ` });
    headline.push({ text: support.slice(0, 3).map((c) => c.label.charAt(0).toLowerCase() + c.label.slice(1)).join(', '), strong: true });
    headline.push({ text: ' (associations, not causes).' });
  }

  const tiles = [
    {
      key: 'trend',
      label: 'Rainfall trend',
      value: `${signed(m.pct_per_decade)} %/decade`,
      verdict: m.significant ? `Significant · p = ${pText(m.p_value)}` : `Not significant · p = ${pText(m.p_value)}`,
      tone: m.significant ? 'good' : 'warn',
      detail: `Sen slope ${signed(m.sen_slope, 2)} ${m.slope_unit}, 95 % interval [${signed(m.slope_ci95?.[0], 2)}, ${signed(m.slope_ci95?.[1], 2)}] · n = ${m.n}`,
    },
    check && {
      key: 'check',
      label: 'Independent check (CHIRPS)',
      value: `${signed(check.pct_per_decade)} %/decade`,
      verdict: `${check.agrees_in_sign ? 'Same direction' : 'Opposite direction'} · p = ${pText(check.p_value)}`,
      tone: check.agrees_in_sign ? 'good' : 'warn',
      detail: 'Gauge-blended dataset, same region and season',
    },
    cdd && {
      key: 'cdd',
      label: 'Longest dry spell',
      value: `${signed(cdd.pct_per_decade)} %/decade`,
      verdict: cdd.significant ? `Significant · p = ${pText(cdd.p_value)}` : `Not significant · p = ${pText(cdd.p_value)}`,
      tone: cdd.significant ? 'good' : 'warn',
      detail: 'Consecutive dry days within June–September',
    },
    comps.length && {
      key: 'drivers',
      label: 'Drivers (MERRA-2)',
      value: `${support.length} of ${comps.length}`,
      verdict: 'variables move with rainfall',
      tone: support.length ? 'good' : 'warn',
      detail: support.slice(0, 3).map((c) => `${c.label} ρ ${signed(c.statistic, 2)}`).join(' · ') || 'none at p < 0.05',
    },
    mech && {
      key: 'mechanism',
      label: 'Best-supported mechanism',
      value: mech.mechanism_id,
      verdict: `${mech.confidence} confidence (draft)`,
      tone: 'neutral',
      detail: mech.name,
    },
    pcts.length && {
      key: 'scenarios',
      label: `Scenarios to ${endYear}`,
      value: `${signed(Math.min(...pcts))} to ${signed(Math.max(...pcts))} %`,
      verdict: 'scenarios, not forecasts',
      tone: 'neutral',
      detail: Object.entries(sc.pct_difference_at_end).map(([k, v]) => `${SC_LABEL[k] ?? k} ${signed(v)} %`).join(' · '),
    },
  ].filter(Boolean);

  return { headline, tiles, main: m, scenarios: sc };
}

export const TONE_CLASS = {
  good: 'bg-[#4FB3A9]/20 text-[#0f5d56]',
  warn: 'bg-[#ffc20d]/25 text-[#7a5a00]',
  neutral: 'bg-[#131D38]/8 text-[#131D38]',
};
