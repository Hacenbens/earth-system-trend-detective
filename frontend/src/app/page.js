import DetectWorkbench from "@/components/DetectWorkbench";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-8 sm:py-12 flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">Layer 1 · Detect</p>
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">Has Sahel rainfall changed?</h1>
        <p className="max-w-2xl text-[var(--muted)]">
          Test June–September rainfall from NASA GPM IMERG (1998–2025) for a trend, region by region, with an independent check
          against CHIRPS. Then investigate, explain, project and compare solutions.
        </p>
      </header>
      <DetectWorkbench />
      <footer className="border-t border-[var(--line)] pt-4 text-xs text-[var(--muted)]">
        Earth System Trend Detective · NASA Space Apps 2026 · Data: NASA GPM IMERG V07, CHIRPS v3, MERRA-2 · Built with AI assistance
        (Claude Code), see docs/submission/si_usage.md.
      </footer>
    </main>
  );
}
