'use client';
// Key findings: the few metrics and keywords a reader needs first. Drafted with AI assistance (Claude Code).
import { TONE_CLASS } from './findings';

export function Headline({ parts, className = '' }) {
  return (
    <p className={className}>
      {parts.map((p, i) =>
        p.strong ? (
          <mark
            key={i}
            className={`rounded px-1 font-semibold ${p.tone === 'warn' ? 'bg-[#ffc20d]/35' : p.tone === 'good' ? 'bg-[#4FB3A9]/30' : 'bg-[#ffc20d]/20'} text-inherit`}
          >
            {p.text}
          </mark>
        ) : (
          <span key={i}>{p.text}</span>
        )
      )}
    </p>
  );
}

export function FindingTiles({ tiles, compact = false }) {
  return (
    <div className={`grid gap-3 ${compact ? 'grid-cols-3' : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3'}`}>
      {tiles.map((t) => (
        <div key={t.key} className="p-4 rounded-[18px] bg-[#f4f1ea] border border-[#E6E0D2] break-inside-avoid">
          <div className="font-mono text-[10px] uppercase tracking-wider text-[#5B6478]">{t.label}</div>
          <div className={`mt-1 font-display font-semibold text-[#131D38] tabular-nums ${compact ? 'text-[18px]' : 'text-[24px]'}`}>
            {t.value}
          </div>
          <span className={`inline-block mt-1 px-2 py-0.5 rounded-full font-mono text-[10px] ${TONE_CLASS[t.tone]}`}>{t.verdict}</span>
          <div className="mt-2 text-[11px] text-[#5B6478] leading-snug">{t.detail}</div>
        </div>
      ))}
    </div>
  );
}
