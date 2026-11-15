"use client";
// One trend result (region x metric): verdict, effect size, uncertainty, independent check and the series.
// Drafted with AI assistance (Claude Code).
import { pValue, senLine, signed, tone } from "@/lib/format";

const DATASETS = { imerg_final_monthly: "IMERG Final monthly", imerg_final_daily: "IMERG Final daily",
  imerg_late_daily: "IMERG Late daily", chirps_v3_monthly: "CHIRPS v3", merra2_monthly: "MERRA-2" };
const shortDataset = (code) => DATASETS[code] || code?.replace(/_/g, " ");

const TONE = {
  up: "bg-[var(--up-soft)] text-[var(--up)]",
  down: "bg-[var(--down-soft)] text-[var(--down)]",
  flat: "bg-[var(--hover)] text-[var(--muted)]",
};

function Sparkline({ result, unusualYears }) {
  const pts = (result.series || []).filter((p) => !p.missing && p.value != null).map((p) => ({ x: Number(p.date), y: p.value }));
  if (pts.length < 2) return null;
  const W = 320, H = 92, PAD = 6;
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  const [x0, x1] = [Math.min(...xs), Math.max(...xs)];
  let [y0, y1] = [Math.min(...ys), Math.max(...ys)];
  if (y0 === y1) { y0 -= 1; y1 += 1; }
  const sx = (v) => PAD + ((v - x0) / (x1 - x0)) * (W - 2 * PAD);
  const sy = (v) => H - PAD - ((v - y0) / (y1 - y0)) * (H - 2 * PAD);
  const path = pts.map((p, i) => `${i ? "L" : "M"}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join("");
  const sen = senLine(pts, result.sen_slope ?? 0);
  const t = tone(result);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img"
         aria-label={`${result.label} ${x0} to ${x1}, Sen slope ${signed(result.sen_slope, 2)} ${result.slope_unit}`}>
      <path d={path} fill="none" className="stroke-[var(--series)]" strokeWidth="1.5" strokeLinejoin="round" />
      {sen && (
        <line x1={sx(sen[0].x)} y1={sy(sen[0].y)} x2={sx(sen[1].x)} y2={sy(sen[1].y)} strokeWidth="2" strokeDasharray={t === "flat" ? "4 3" : undefined}
              className={t === "up" ? "stroke-[var(--up)]" : t === "down" ? "stroke-[var(--down)]" : "stroke-[var(--muted)]"} />
      )}
      {pts.filter((p) => unusualYears.has(p.x)).map((p) => (
        <circle key={p.x} cx={sx(p.x)} cy={sy(p.y)} r="3" className="fill-[var(--surface)] stroke-[var(--ink)]" strokeWidth="1.5">
          <title>{`${p.x}: unusual season`}</title>
        </circle>
      ))}
      <text x={PAD} y={H - 1} className="fill-[var(--muted)] text-[9px]">{x0}</text>
      <text x={W - PAD} y={H - 1} textAnchor="end" className="fill-[var(--muted)] text-[9px]">{x1}</text>
    </svg>
  );
}

export default function TrendCard({ result, unusualYears = new Set() }) {
  const t = tone(result);
  const check = result.independent_check;
  const ci = result.slope_ci95;
  return (
    <article className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 flex flex-col gap-3">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h4 className="font-semibold leading-tight">{result.label}</h4>
          <p className="text-xs text-[var(--muted)]" title={result.provenance?.dataset}>
            {shortDataset(result.dataset)} {result.provenance?.version} · {result.n} seasons
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${TONE[t]}`}>
          {result.significant ? "Significant" : "Not significant"}
        </span>
      </header>

      <div className="flex items-baseline gap-2">
        <span className={`text-3xl font-semibold tabular-nums ${t === "up" ? "text-[var(--up)]" : t === "down" ? "text-[var(--down)]" : ""}`}>
          {signed(result.pct_per_decade)}%
        </span>
        <span className="text-sm text-[var(--muted)]">per decade</span>
      </div>
      <p className="text-sm -mt-2">{result.wording}</p>

      <Sparkline result={result} unusualYears={unusualYears} />

      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <dt className="text-[var(--muted)]">Mann–Kendall p</dt><dd className="tabular-nums text-right">{pValue(result.p_value)}</dd>
        <dt className="text-[var(--muted)]">Sen slope</dt>
        <dd className="tabular-nums text-right">{signed(result.sen_slope, 2)} {result.slope_unit}</dd>
        {ci && (<><dt className="text-[var(--muted)]">95 % interval</dt>
          <dd className="tabular-nums text-right">{signed(ci[0], 2)} to {signed(ci[1], 2)}</dd></>)}
        {check && (<><dt className="text-[var(--muted)]">Check: {shortDataset(check.dataset)}</dt>
          <dd className="tabular-nums text-right">{signed(check.pct_per_decade)}% · p {pValue(check.p_value)} {check.agrees_in_sign ? "✓" : "✗"}</dd></>)}
      </dl>
      {result.evidence_ids?.length > 0 && (
        <p className="text-[11px] text-[var(--muted)]">Evidence ledger: {result.evidence_ids.join(", ")}</p>
      )}
    </article>
  );
}
