"use client";
// Schematic map of the preset study boxes (lon/lat rectangles). Click a box to toggle it.
// Drafted with AI assistance (Claude Code).

const LON = [-25, 22];
const LAT = [7, 23];
const S = 10; // px per degree
const W = (LON[1] - LON[0]) * S;
const H = (LAT[1] - LAT[0]) * S;
const x = (lon) => (lon - LON[0]) * S;
const y = (lat) => (LAT[1] - lat) * S;

export default function RegionMap({ regions, selected, onToggle }) {
  const whole = regions.filter((r) => r.lon[1] - r.lon[0] > 25);
  const parts = regions.filter((r) => r.lon[1] - r.lon[0] <= 25);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto select-none" role="group" aria-label="Study regions on a lon/lat grid">
      <rect width={W} height={H} className="fill-[var(--map-bg)]" />
      {[10, 15, 20].map((lat) => (
        <g key={lat}>
          <line x1={0} x2={W} y1={y(lat)} y2={y(lat)} className="stroke-[var(--grid)]" strokeWidth="1" />
          <text x={4} y={y(lat) - 3} className="fill-[var(--muted)] text-[9px]">{lat}°N</text>
        </g>
      ))}
      {[-15, -5, 0, 5, 15].map((lon) => (
        <g key={lon}>
          <line y1={0} y2={H} x1={x(lon)} x2={x(lon)} className="stroke-[var(--grid)]" strokeWidth="1" />
          <text x={x(lon) + 3} y={H - 4} className="fill-[var(--muted)] text-[9px]">
            {lon === 0 ? "0°" : `${Math.abs(lon)}°${lon < 0 ? "W" : "E"}`}
          </text>
        </g>
      ))}
      {parts.map((r) => {
        const on = selected.includes(r.id);
        return (
          <g key={r.id} onClick={() => onToggle(r.id)} className="cursor-pointer" role="checkbox" aria-checked={on} aria-label={r.name}
             tabIndex={0} onKeyDown={(e) => (e.key === " " || e.key === "Enter") && (e.preventDefault(), onToggle(r.id))}>
            <rect x={x(r.lon[0]) + 1} y={y(r.lat[1]) + 1} width={(r.lon[1] - r.lon[0]) * S - 2} height={(r.lat[1] - r.lat[0]) * S - 2}
                  rx="3" className={on ? "fill-[var(--accent-soft)] stroke-[var(--accent)]" : "fill-transparent stroke-[var(--line)] hover:fill-[var(--hover)]"}
                  strokeWidth={on ? 2 : 1} />
            <text x={(x(r.lon[0]) + x(r.lon[1])) / 2} y={(y(r.lat[0]) + y(r.lat[1])) / 2 + 4} textAnchor="middle"
                  className={`text-[11px] font-medium pointer-events-none ${on ? "fill-[var(--accent-ink)]" : "fill-[var(--muted)]"}`}>
              {r.name.replace(" Sahel", "")}
            </text>
          </g>
        );
      })}
      {whole.map((r) => {
        const on = selected.includes(r.id);
        return (
          <rect key={r.id} x={x(r.lon[0])} y={y(r.lat[1])} width={(r.lon[1] - r.lon[0]) * S} height={(r.lat[1] - r.lat[0]) * S}
                fill="none" strokeDasharray="5 4" className={on ? "stroke-[var(--accent)]" : "stroke-[var(--line)]"} strokeWidth={on ? 2 : 1}
                pointerEvents="none" />
        );
      })}
    </svg>
  );
}
