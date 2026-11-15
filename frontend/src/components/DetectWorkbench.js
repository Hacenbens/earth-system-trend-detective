"use client";
// Layer 1 screen: choose regions, period and indicators, then run trend detection on the backend.
// Drafted with AI assistance (Claude Code). See docs/submission/si_usage.md.
import { useEffect, useMemo, useState } from "react";

import { createInvestigation, detect, docsUrl, getRegions, reportCsvUrl, reportJsonUrl } from "@/lib/api";
import { FIRST_YEAR, LAST_YEAR, METRICS, MIN_SEASONS } from "@/lib/format";
import ErrorNote from "./ErrorNote";
import EvidencePanel from "./EvidencePanel";
import RegionMap from "./RegionMap";
import TrendCard from "./TrendCard";

const YEARS = Array.from({ length: LAST_YEAR - FIRST_YEAR + 1 }, (_, i) => FIRST_YEAR + i);

export default function DetectWorkbench() {
  const [regions, setRegions] = useState([]);
  const [regionsError, setRegionsError] = useState(null);
  const [selected, setSelected] = useState(["sahel", "east"]);
  const [start, setStart] = useState(FIRST_YEAR);
  const [end, setEnd] = useState(LAST_YEAR);
  const [metrics, setMetrics] = useState(["rain_total", "CDD"]);
  const [status, setStatus] = useState("idle"); // idle | creating | detecting | done | error
  const [error, setError] = useState(null);
  const [run, setRun] = useState(null); // {investigation, detection}

  const [regionsAttempt, setRegionsAttempt] = useState(0);
  useEffect(() => {
    const ctrl = new AbortController();
    getRegions({ signal: ctrl.signal })
      .then((r) => { setRegions(r); setRegionsError(null); })
      .catch((e) => !ctrl.signal.aborted && setRegionsError(e));
    return () => ctrl.abort();
  }, [regionsAttempt]);
  const loadRegions = () => { setRegionsError(null); setRegionsAttempt((n) => n + 1); };

  const seasons = end - start + 1;
  const problems = [
    !selected.length && "Choose at least one region.",
    !metrics.length && "Choose at least one indicator.",
    seasons < MIN_SEASONS && `Choose at least ${MIN_SEASONS} seasons (now ${Math.max(seasons, 0)}): shorter series cannot support a trend test.`,
  ].filter(Boolean);
  const busy = status === "creating" || status === "detecting";

  const toggle = (list, setList) => (v) => setList(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const toggleRegion = toggle(selected, setSelected);
  const toggleMetric = toggle(metrics, setMetrics);

  async function runDetect() {
    setError(null);
    setRun(null);
    setStatus("creating");
    try {
      const ordered = regions.map((r) => r.id).filter((id) => selected.includes(id));
      const inv = await createInvestigation({
        name: `Sahel rainfall ${start}-${end}`,
        regionId: ordered[0],
        startYear: start,
        endYear: end,
      });
      setStatus("detecting");
      const det = await detect(inv.id, { regionIds: ordered, metrics });
      setRun({ investigation: inv, detection: det });
      setStatus("done");
    } catch (e) {
      setError(e);
      setStatus("error");
    }
  }

  const byRegion = useMemo(() => {
    if (!run) return [];
    const names = Object.fromEntries(regions.map((r) => [r.id, r.name]));
    const groups = new Map();
    for (const r of run.detection.results) {
      if (!groups.has(r.region_id)) groups.set(r.region_id, { id: r.region_id, name: names[r.region_id] || r.region_id, results: [] });
      groups.get(r.region_id).results.push(r);
    }
    const unusual = run.detection.handoff?.unusual_seasons || [];
    for (const g of groups.values()) g.unusual = new Set(unusual.filter((u) => u.region_id === g.id).map((u) => u.year));
    return [...groups.values()];
  }, [run, regions]);

  return (
    <div className="flex flex-col gap-8">
      {/* ---------- inputs */}
      <section aria-labelledby="setup" className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="flex flex-col gap-3">
          <h2 id="setup" className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">1 · Regions</h2>
          {regionsError ? (
            <ErrorNote error={regionsError} onRetry={loadRegions} />
          ) : regions.length === 0 ? (
            <div className="h-40 rounded-lg bg-[var(--hover)] animate-pulse" aria-label="Loading regions" />
          ) : (
            <>
              <RegionMap regions={regions} selected={selected} onToggle={toggleRegion} />
              <div className="flex flex-wrap gap-2">
                {regions.map((r) => (
                  <label key={r.id} className={`cursor-pointer rounded-full border px-3 py-1 text-sm transition-colors ${
                    selected.includes(r.id) ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-ink)]" : "border-[var(--line)] hover:bg-[var(--hover)]"}`}>
                    <input type="checkbox" className="sr-only" checked={selected.includes(r.id)} onChange={() => toggleRegion(r.id)} />
                    {r.name}
                  </label>
                ))}
              </div>
              <p className="text-xs text-[var(--muted)]">Box limits are provisional (decision D-003b). Dashed outline: the whole Sahel study box.</p>
            </>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <fieldset className="flex flex-col gap-3">
            <legend className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)] mb-3">2 · Period (June–September)</legend>
            <div className="flex items-center gap-3">
              {[["From", start, setStart], ["To", end, setEnd]].map(([label, value, set]) => (
                <label key={label} className="flex flex-col text-xs text-[var(--muted)] gap-1">
                  {label}
                  <select value={value} onChange={(e) => set(Number(e.target.value))}
                          className="rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-base text-[var(--ink)] tabular-nums">
                    {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </label>
              ))}
              <span className="mt-5 text-sm text-[var(--muted)] tabular-nums">{Math.max(seasons, 0)} seasons</span>
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)] mb-3">3 · Indicators</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {METRICS.map((m) => (
                <label key={m.code} className={`cursor-pointer rounded-lg border px-3 py-2 transition-colors ${
                  metrics.includes(m.code) ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--line)] hover:bg-[var(--hover)]"}`}>
                  <input type="checkbox" className="sr-only" checked={metrics.includes(m.code)} onChange={() => toggleMetric(m.code)} />
                  <span className="block text-sm font-medium">{m.label}</span>
                  <span className="block text-xs text-[var(--muted)]">{m.hint}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="flex flex-col gap-2">
            <button onClick={runDetect} disabled={busy || problems.length > 0 || !regions.length}
                    className="rounded-lg bg-[var(--accent)] px-5 py-2.5 font-medium text-[var(--on-accent)] disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 transition">
              {status === "creating" ? "Preparing data…" : status === "detecting" ? "Testing for trends…" : "Detect trends"}
            </button>
            {problems.map((p) => <p key={p} className="text-xs text-[var(--down)]">{p}</p>)}
          </div>
        </div>
      </section>

      <ErrorNote error={error} onRetry={problems.length ? null : runDetect} />

      {/* ---------- results */}
      {run && (
        <section aria-labelledby="results" className="flex flex-col gap-6" aria-live="polite">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="results" className="text-xl font-semibold">Trends {run.investigation.config.start_year}–{run.investigation.config.end_year}</h2>
              <p className="text-sm text-[var(--muted)]">
                Mann–Kendall test with Sen&apos;s slope, α = 0.05 · {run.investigation.prepared?.dataset?.name}, checked against CHIRPS · investigation {run.investigation.id}
              </p>
            </div>
            <div className="flex gap-3 text-sm">
              <a className="underline underline-offset-2" href={reportJsonUrl(run.investigation.id)} target="_blank" rel="noreferrer">Report (JSON)</a>
              <a className="underline underline-offset-2" href={reportCsvUrl(run.investigation.id)} target="_blank" rel="noreferrer">Data (CSV)</a>
            </div>
          </div>

          {byRegion.map((g) => (
            <div key={g.id} className="flex flex-col gap-3">
              <h3 className="font-semibold">{g.name}</h3>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {g.results.map((r) => (
                  <TrendCard key={r.metric} result={r} unusualYears={r.metric === "rain_total" ? g.unusual : undefined} />
                ))}
              </div>
            </div>
          ))}

          {run.detection.skipped?.length > 0 && (
            <div className="rounded-lg border border-[var(--line)] p-4 text-sm">
              <p className="font-medium mb-1">Not computed</p>
              <ul className="list-disc pl-5 text-[var(--muted)]">
                {run.detection.skipped.map((s, i) => <li key={i}>{s.region_id ?? ""} {s.metric ?? s.value ?? ""}: {s.reason || s.message}</li>)}
              </ul>
            </div>
          )}

          <p className="text-xs text-[var(--muted)]">
            On rainfall charts, circles mark unusual seasons (more than 1.5 standard deviations from the mean). Colours show
            direction only (teal up, amber down), not good or bad. A trend is a statistical pattern, not a cause:
            the next layers investigate why. The 2024–2025 near-real-time values are shown apart and never used for trends.
          </p>
        </section>
      )}

      {run && (
        <EvidencePanel key={run.investigation.id} investigationId={run.investigation.id} detection={run.detection}
                       regionIds={run.detection.handoff?.regions || byRegion.map((g) => g.id)}
                       regionNames={Object.fromEntries(regions.map((r) => [r.id, r.name]))} />
      )}

      {!run && status !== "error" && (
        <p className="text-sm text-[var(--muted)]">
          Choose regions, a period and indicators, then run the test. API documentation: <a className="underline" href={docsUrl}>{docsUrl}</a>
        </p>
      )}
    </div>
  );
}
