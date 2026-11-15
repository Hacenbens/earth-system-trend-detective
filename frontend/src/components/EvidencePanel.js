"use client";
// Layer 2 screen: which atmospheric and land variables move with rainfall (MERRA-2), grouped by the mechanism they test,
// plus EarthCARE storm case studies. Associations, not causes. Drafted with AI assistance (Claude Code).
import { Fragment, useEffect, useMemo, useState } from "react";

import { getMechanisms, investigate } from "@/lib/api";
import { EVIDENCE_CATEGORIES, compact, pValue, standardize } from "@/lib/format";
import ErrorNote from "./ErrorNote";

const STATUS = {
  supporting: { label: "Supporting", cls: "bg-[var(--up-soft)] text-[var(--up)]", bar: "bg-[var(--up)]" },
  contrasting: { label: "Contrasting", cls: "bg-[var(--down-soft)] text-[var(--down)]", bar: "bg-[var(--down)]" },
  unclear: { label: "Unclear", cls: "bg-[var(--hover)] text-[var(--muted)]", bar: "bg-[var(--series)]" },
};

function RhoCell({ c }) {
  if (!c) return <td className="px-2 py-2 text-center text-xs text-[var(--muted)]">—</td>;
  const s = STATUS[c.status] || STATUS.unclear;
  const w = Math.min(Math.abs(c.statistic), 1) * 50;
  return (
    <td className="px-2 py-2 align-middle">
      <div className="flex items-center gap-2">
        <div className="relative h-2 w-24 shrink-0 rounded-full bg-[var(--grid)] ring-1 ring-inset ring-[var(--line)]" aria-hidden="true">
          <div className="absolute top-[-3px] bottom-[-3px] left-1/2 w-px bg-[var(--line)]" />
          <div className={`absolute top-0 bottom-0 rounded-full ${s.bar}`}
               style={c.statistic >= 0 ? { left: "50%", width: `${w}%` } : { right: "50%", width: `${w}%` }} />
        </div>
        <span className="w-11 text-right tabular-nums text-sm">{compact(c.statistic)}</span>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${s.cls}`} title={`p = ${pValue(c.p_value)}`}>{s.label}</span>
      </div>
    </td>
  );
}

function PairChart({ c, rainfall, rainfallLabel }) {
  const v = standardize((c.records || []).filter((r) => r.value != null).map((r) => ({ x: r.year, y: r.value })));
  const r = rainfall ? standardize(rainfall) : [];
  if (v.length < 2) return null;
  const all = [...v, ...r];
  const W = 320, H = 110, P = 8;
  const xs = all.map((p) => p.x), ys = all.map((p) => p.y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys, -2), Math.max(...ys, 2)];
  const sx = (x) => P + ((x - x0) / (x1 - x0 || 1)) * (W - 2 * P);
  const sy = (y) => H - P - ((y - y0) / (y1 - y0)) * (H - 2 * P);
  const path = (pts) => pts.map((p, i) => `${i ? "L" : "M"}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join("");
  return (
    <figure className="flex flex-col gap-1">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img"
           aria-label={`${c.label} and ${rainfallLabel}, standardized, ${x0} to ${x1}`}>
        <line x1={P} x2={W - P} y1={sy(0)} y2={sy(0)} className="stroke-[var(--grid)]" />
        {r.length > 1 && <path d={path(r)} fill="none" className="stroke-[var(--series)]" strokeWidth="1.5" />}
        <path d={path(v)} fill="none" className="stroke-[var(--accent)]" strokeWidth="1.8" />
        <text x={P} y={H - 1} className="fill-[var(--muted)] text-[9px]">{x0}</text>
        <text x={W - P} y={H - 1} textAnchor="end" className="fill-[var(--muted)] text-[9px]">{x1}</text>
      </svg>
      <figcaption className="flex flex-wrap gap-x-3 text-[11px] text-[var(--muted)]">
        <span><span className="inline-block w-3 h-0.5 align-middle mr-1 bg-[var(--accent)]" />{c.label}</span>
        {r.length > 1 && <span><span className="inline-block w-3 h-0.5 align-middle mr-1 bg-[var(--series)]" />{rainfallLabel}</span>}
        <span>standardized values; ρ is computed after removing each series&apos; trend</span>
      </figcaption>
    </figure>
  );
}

const CASE_METRICS = [
  ["rain_profiles_pct", "Raining profiles", "%"],
  ["radar_echo_top_p95_km_rain_profiles", "Echo top (p95)", "km"],
  ["updraft_max_ms", "Strongest updraft", "m/s"],
  ["dust_profiles_pct", "Dusty profiles", "%"],
  ["dust_height_median_km", "Dust height (median)", "km"],
];

function CaseStudies({ cases, regionNames }) {
  const unique = [...new Map(cases.map((c) => [c.case_id, c])).values()];
  if (!unique.length) return null;
  return (
    <div className="flex flex-col gap-3">
      <div>
        <h3 className="font-semibold">Storm structure: EarthCARE case studies</h3>
        <p className="text-xs text-[var(--muted)]">ESA–JAXA cloud radar and lidar overpasses, 2024–2025. Present-day process illustrations, never a trend.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {unique.map((c) => (
          <article key={c.case_id} className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 flex flex-col gap-2">
            <header>
              <p className="text-xs uppercase tracking-wide text-[var(--muted)]">{regionNames[c.region] || c.region}</p>
              <h4 className="font-semibold">{c.case_id.slice(0, 10)}</h4>
              <p className="text-sm first-letter:uppercase">{c.type}</p>
            </header>
            <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 text-xs">
              {CASE_METRICS.filter(([k]) => c.metrics?.[k] != null).map(([k, label, unit]) => (
                <Fragment key={k}>
                  <dt className="text-[var(--muted)]">{label}</dt>
                  <dd className="tabular-nums text-right">{c.metrics[k]} {unit}</dd>
                </Fragment>
              ))}
            </dl>
          </article>
        ))}
      </div>
    </div>
  );
}

export default function EvidencePanel({ investigationId, regionIds, regionNames, detection }) {
  const [categories, setCategories] = useState(["moisture", "circulation", "dust", "land", "storm_structure"]);
  const [compareTo, setCompareTo] = useState("rain_total");
  const [mechanisms, setMechanisms] = useState([]);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(null); // expanded variable code

  useEffect(() => {
    const ctrl = new AbortController();
    getMechanisms({ signal: ctrl.signal }).then(setMechanisms).catch(() => {}); // names only: the panel works without them
    return () => ctrl.abort();
  }, []);

  const detected = new Set((detection?.results || []).map((r) => r.metric));
  const toggle = (code) => setCategories((l) => (l.includes(code) ? l.filter((x) => x !== code) : [...l, code]));

  async function run() {
    setError(null);
    setData(null);
    setOpen(null);
    setStatus("running");
    try {
      setData(await investigate(investigationId, { regionIds, evidence: categories, compareTo }));
      setStatus("done");
    } catch (e) {
      setError(e);
      setStatus("error");
    }
  }

  // rows grouped by mechanism: {mechanism, rows: [{variable, label, unit, byRegion: {region: comparison}}]}
  const groups = useMemo(() => {
    if (!data) return [];
    const mech = Object.fromEntries(mechanisms.map((m) => [m.mechanism_id, m]));
    const out = new Map();
    for (const c of data.comparisons) {
      const id = c.mechanism_id || "other";
      if (!out.has(id)) out.set(id, { id, mechanism: mech[id], rows: new Map() });
      const rows = out.get(id).rows;
      if (!rows.has(c.variable)) rows.set(c.variable, { variable: c.variable, label: c.label, unit: c.unit, byRegion: {} });
      rows.get(c.variable).byRegion[c.region_id] = c;
    }
    return [...out.values()].sort((a, b) => a.id.localeCompare(b.id)).map((g) => ({ ...g, rows: [...g.rows.values()] }));
  }, [data, mechanisms]);

  const rainfallFor = (region) => {
    const r = (detection?.results || []).find((x) => x.region_id === region && x.metric === (data?.handoff?.compare_to || compareTo));
    return r?.series?.filter((p) => p.value != null).map((p) => ({ x: Number(p.date), y: p.value }));
  };
  const rainfallLabel = compareTo === "CDD" ? "Longest dry spell" : "Rainfall total";
  const regions = data?.handoff?.regions || regionIds;
  const counts = data ? data.comparisons.reduce((a, c) => ({ ...a, [c.status]: (a[c.status] || 0) + 1 }), {}) : {};

  return (
    <section aria-labelledby="layer2" className="flex flex-col gap-6 border-t border-[var(--line)] pt-8">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">Layer 2 · Investigate</p>
        <h2 id="layer2" className="text-2xl font-semibold tracking-tight">What moves with the rain?</h2>
        <p className="max-w-2xl text-sm text-[var(--muted)]">
          Each NASA MERRA-2 variable is compared with seasonal rainfall after removing both trends (detrended Spearman correlation),
          so a shared long-term drift does not count as a link. A variable supports a mechanism when it moves in the expected direction
          with p &lt; 0.05. Associations, not causes.
        </p>
      </header>

      <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6 grid gap-5 lg:grid-cols-[2fr_1fr]">
        <fieldset>
          <legend className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)] mb-3">Evidence</legend>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {EVIDENCE_CATEGORIES.map((e) => (
              <label key={e.code} className={`cursor-pointer rounded-lg border px-3 py-2 transition-colors ${
                categories.includes(e.code) ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--line)] hover:bg-[var(--hover)]"}`}>
                <input type="checkbox" className="sr-only" checked={categories.includes(e.code)} onChange={() => toggle(e.code)} />
                <span className="block text-sm font-medium">{e.label}</span>
                <span className="block text-xs text-[var(--muted)]">{e.hint}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
            Compare with
            <select value={compareTo} onChange={(e) => setCompareTo(e.target.value)}
                    className="rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-base text-[var(--ink)]">
              <option value="rain_total">Rainfall total</option>
              <option value="CDD">Longest dry spell</option>
            </select>
          </label>
          {!detected.has(compareTo) && (
            <p className="text-xs text-[var(--muted)]">Tip: add this indicator in Layer 1 to see it on the charts.</p>
          )}
          <button onClick={run} disabled={status === "running" || !categories.length}
                  className="mt-auto rounded-lg bg-[var(--accent)] px-5 py-2.5 font-medium text-[var(--on-accent)] disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 transition">
            {status === "running" ? "Comparing variables…" : "Investigate"}
          </button>
          {!categories.length && <p className="text-xs text-[var(--down)]">Choose at least one kind of evidence.</p>}
        </div>
      </div>

      <ErrorNote error={error} onRetry={categories.length ? run : null} />

      {data && (
        <div className="flex flex-col gap-6" aria-live="polite">
          <p className="text-sm">
            <span className="font-semibold text-[var(--up)]">{counts.supporting || 0} supporting</span>
            {" · "}<span className="font-semibold text-[var(--down)]">{counts.contrasting || 0} contrasting</span>
            {" · "}<span className="text-[var(--muted)]">{counts.unclear || 0} unclear</span>
            <span className="text-[var(--muted)]"> of {data.comparisons.length} comparisons, {data.comparisons[0]?.comparison_period?.join("–")}</span>
          </p>

          {groups.map((g) => (
            <div key={g.id} className="rounded-xl border border-[var(--line)] bg-[var(--surface)] overflow-hidden">
              <div className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3 border-b border-[var(--line)]">
                <h3 className="font-semibold">
                  <span className="text-[var(--muted)] font-normal mr-2">{g.id}</span>{g.mechanism?.name || "Other variables"}
                </h3>
                {g.mechanism?.confidence && (
                  <span className="text-xs text-[var(--muted)]">Draft confidence (Layer 3): <b className="text-[var(--ink)]">{g.mechanism.confidence}</b></span>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] table-fixed text-sm">
                  <colgroup><col className="w-[34%]" />{regions.map((r) => <col key={r} />)}</colgroup>
                  <thead>
                    <tr className="text-left text-xs text-[var(--muted)]">
                      <th className="px-4 py-2 font-medium">Variable</th>
                      {regions.map((r) => <th key={r} className="px-2 py-2 font-medium">{regionNames[r] || r} · ρ with {rainfallLabel.toLowerCase()}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {g.rows.map((row) => {
                      const key = `${g.id}:${row.variable}`;
                      const any = Object.values(row.byRegion)[0];
                      return (
                        <Fragment key={key}>
                          <tr className="border-t border-[var(--line)] hover:bg-[var(--hover)] cursor-pointer" onClick={() => setOpen(open === key ? null : key)}>
                            <td className="px-4 py-2">
                              <button className="text-left" aria-expanded={open === key}>
                                <span className="font-medium">{row.label}</span>
                                <span className="block text-xs text-[var(--muted)]">
                                  {row.variable} · expected {any?.expected_sign > 0 ? "positive" : "negative"} {open === key ? "▴" : "▾"}
                                </span>
                              </button>
                            </td>
                            {regions.map((r) => <RhoCell key={r} c={row.byRegion[r]} />)}
                          </tr>
                          {open === key && (
                            <tr className="bg-[var(--bg)]">
                              <td colSpan={regions.length + 1} className="px-4 py-4">
                                <div className="grid gap-6 md:grid-cols-2">
                                  {regions.filter((r) => row.byRegion[r]).map((r) => {
                                    const c = row.byRegion[r];
                                    const t = c.variable_trend;
                                    return (
                                      <div key={r} className="flex flex-col gap-2">
                                        <p className="text-sm font-medium">{regionNames[r] || r}</p>
                                        <PairChart c={c} rainfall={rainfallFor(r)} rainfallLabel={rainfallLabel} />
                                        <p className="text-xs text-[var(--muted)]">
                                          ρ = {compact(c.statistic)}, p = {pValue(c.p_value)} · own trend {t ? `${compact(t.per_decade)} ${c.unit} per decade (p = ${pValue(t.p_value)})` : "—"} · {c.dataset === "merra2_monthly" ? "MERRA-2 reanalysis" : c.dataset}
                                        </p>
                                      </div>
                                    );
                                  })}
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {data.skipped?.length > 0 && (
            <div className="rounded-lg border border-[var(--line)] p-4 text-sm">
              <p className="font-medium mb-1">Not compared</p>
              <ul className="list-disc pl-5 text-[var(--muted)]">
                {data.skipped.map((s, i) => <li key={i}>{s.region_id} {s.variable || s.category}: {s.reason}</li>)}
              </ul>
            </div>
          )}

          <CaseStudies cases={data.case_studies || []} regionNames={regionNames} />

          {data.notes?.map((n) => <p key={n} className="text-xs text-[var(--muted)]">{n}</p>)}
        </div>
      )}
    </section>
  );
}
