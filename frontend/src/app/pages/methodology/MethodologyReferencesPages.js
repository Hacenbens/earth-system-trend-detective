'use client';

import { useMemo, useState } from 'react';
import { BookOpen, ExternalLink, Search, ShieldCheck } from 'lucide-react';
import { SCIENTIFIC_REFERENCES } from '@/app/api/dashboardData';

const METHODOLOGY_SECTIONS = [
  {
    num: '01',
    title: 'Investigation architecture',
    body: 'EarthSignal couples five connected analytical layers—Detect, Investigate, Explain, Project, and Solve—behind an explicit Data Preparation trust gate.',
  },
  {
    num: '02',
    title: 'Bounding box & spatial subsetting',
    body: 'Study boxes (e.g., Western Sahel 10°N–20°N, 18°W–20°E) are clipped directly at each archive’s native resolution without inventing sub-grid detail.',
  },
  {
    num: '03',
    title: 'Missing data & NaN preservation',
    body: 'Missing satellite months or thick dust-cloud occlusions (such as MODIS NDVI 2001–2002) remain NaN and are never zero-filled before trend calculation.',
  },
  {
    num: '04',
    title: 'Non-parametric Mann-Kendall & Sen’s slope',
    body: 'Seasonal rainfall totals and extremes are evaluated with rank-based Mann-Kendall tests and Sen’s median slope estimator to resist skew from outlier convective storms.',
  },
  {
    num: '05',
    title: 'Extreme precipitation definitions',
    body: 'Daily GPM IMERG V07B granules enable Rx1day (max 1-day), R95p (very wet days), SDII (wet-day intensity), and CDD (consecutive dry days).',
  },
  {
    num: '06',
    title: 'Reanalysis context & scale mismatch',
    body: 'MERRA-2 circulation and moisture fields (0.5° × 0.625°) provide dynamical context while flagging that coarse reanalysis cells smooth individual convective updrafts.',
  },
  {
    num: '07',
    title: 'EarthCARE 2024+ process rule',
    body: 'ESA/JAXA EarthCARE CPR and ATLID launched in May 2024 and are strictly confined to contemporary vertical storm/dust case studies—excluded from 2001–2025 trends.',
  },
  {
    num: '08',
    title: 'Conditional scenarios, never forecasts',
    body: 'Layer 04 stress pathways illustrate sensitivity to moisture and dry-spell perturbations and must not be read as seasonal or decadal forecasts.',
  },
];

export function MethodologyPage({ datasets }) {
  return (
    <div className="space-y-8">
      <section className="rounded-[28px] bg-[#131D38] text-[#f4f1ea] p-7 sm:p-9 shadow-[0_20px_50px_rgba(19,29,56,0.12)]">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#ffc20d]">
          TRANSPARENT PROTOCOL
        </p>
        <h1 className="mt-2 font-display text-[30px] sm:text-[36px] font-semibold leading-tight">
          Scientific methodology &amp;{' '}
          <span className="font-editorial-italic text-[#ffc20d] font-normal">data provenance</span>
        </h1>
        <p className="mt-3 text-[15px] leading-[1.6] text-[#A9B1C6] max-w-3xl">
          Every EarthSignal investigation documents dataset audit states, missing-data treatment,
          statistical estimators, and physical scope boundaries so results remain reproducible and
          scientifically honest.
        </p>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {METHODOLOGY_SECTIONS.map((sec) => (
          <article
            key={sec.num}
            className="rounded-[26px] bg-[#FBFAF6] border border-[#E6E0D2] p-6 shadow-[0_14px_34px_rgba(19,29,56,0.05)]"
          >
            <div className="font-mono text-[11px] uppercase tracking-wider text-[#5B6478]">
              Protocol {sec.num}
            </div>
            <h2 className="mt-1.5 font-display text-[18px] font-semibold text-[#131D38]">
              {sec.title}
            </h2>
            <p className="mt-2 text-[14px] leading-[1.6] text-[#5B6478]">{sec.body}</p>
          </article>
        ))}
      </section>

      {/* Full Data Provenance Table */}
      <section className="rounded-[28px] bg-[#FBFAF6] border border-[#E6E0D2] p-6 sm:p-7 shadow-[0_20px_50px_rgba(19,29,56,0.06)]">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-[#131D38]" />
          <h2 className="font-display text-[20px] font-semibold text-[#131D38]">
            Dataset provenance registry
          </h2>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-[#E6E0D2] font-mono text-[10px] uppercase tracking-wider text-[#5B6478]">
                <th className="py-3 pr-4">Dataset</th>
                <th className="py-3 pr-4">Agency &amp; Product</th>
                <th className="py-3 pr-4">Span</th>
                <th className="py-3 pr-4">Resolution</th>
                <th className="py-3">Audit Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6E0D2]">
              {datasets.map((ds) => (
                <tr key={ds.id} className="hover:bg-[#f4f1ea]/50">
                  <td className="py-3 pr-4 font-semibold text-[#131D38]">{ds.name}</td>
                  <td className="py-3 pr-4 font-mono text-[12px] text-[#5B6478]">
                    {ds.agency} · {ds.product}
                  </td>
                  <td className="py-3 pr-4 font-mono text-[12px] tabular-nums">
                    {ds.coverageStart}–{ds.coverageEnd}
                  </td>
                  <td className="py-3 pr-4 text-[#5B6478]">{ds.resolution}</td>
                  <td className="py-3">
                    <span className="px-3 py-1 rounded-full bg-[#131D38] text-[#ffc20d] font-mono text-[10px] uppercase">
                      {ds.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export function ReferencesPage() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  const categories = useMemo(
    () => ['All', ...Array.from(new Set(SCIENTIFIC_REFERENCES.map((r) => r.category)))],
    []
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return SCIENTIFIC_REFERENCES.filter((r) => {
      const catOk = categoryFilter === 'All' || r.category === categoryFilter;
      const qOk =
        !q ||
        r.title.toLowerCase().includes(q) ||
        r.authors.toLowerCase().includes(q) ||
        r.relatedMechanism.toLowerCase().includes(q);
      return catOk && qOk;
    });
  }, [search, categoryFilter]);

  return (
    <div className="space-y-6">
      <section>
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5B6478]">
          PEER-REVIEWED LITERATURE &amp; MISSION DOCS
        </p>
        <h1 className="mt-1 font-display text-[28px] sm:text-[32px] font-semibold text-[#131D38]">
          Scientific <span className="font-editorial-italic font-normal">references</span>
        </h1>
        <p className="mt-1 text-[15px] text-[#5B6478]">
          Foundational Sahel meteorology papers, statistical estimators, and NASA mission
          documentation linked across Layers 01–05.
        </p>
      </section>

      <section className="rounded-[24px] bg-[#FBFAF6] border border-[#E6E0D2] p-4 sm:p-5 space-y-4">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-[#5B6478] absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by author, title, or mechanism…"
            className="w-full h-11 pl-10 pr-4 rounded-full bg-[#f4f1ea] border border-[#E6E0D2] text-[13px] text-[#131D38] focus:outline-none focus:border-[#131D38]"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold cursor-pointer transition-colors ${
                categoryFilter === cat
                  ? 'bg-[#131D38] text-[#f4f1ea]'
                  : 'bg-[#f4f1ea] border border-[#E6E0D2] text-[#5B6478] hover:text-[#131D38]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filtered.map((ref) => (
          <article
            key={ref.id}
            className="rounded-[26px] bg-[#FBFAF6] border border-[#E6E0D2] p-6 shadow-[0_14px_34px_rgba(19,29,56,0.05)] flex flex-col justify-between"
          >
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="px-2.5 py-1 rounded-full bg-[#4FB3A9]/15 text-[#131D38] text-[11px] font-medium">
                  {ref.category}
                </span>
                <span className="font-mono text-[11px] text-[#5B6478]">{ref.year}</span>
              </div>
              <h2 className="mt-3 font-display text-[17px] font-semibold text-[#131D38] leading-snug">
                {ref.title}
              </h2>
              <p className="mt-1 text-[13px] font-medium text-[#5B6478]">
                {ref.authors} · <em>{ref.journal}</em>
              </p>
              <p className="mt-2.5 text-[13px] text-[#5B6478] leading-[1.6]">{ref.description}</p>
            </div>

            <div className="mt-4 pt-3 border-t border-[#E6E0D2] flex items-center justify-between gap-3">
              <span className="font-mono text-[10px] uppercase text-[#5B6478]">
                Mechanism: {ref.relatedMechanism}
              </span>
              <a
                href={ref.doi}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#131D38] hover:underline underline-offset-4 shrink-0"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Source / DOI</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
