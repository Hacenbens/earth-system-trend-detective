'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  CircleDashed,
  Copy,
  ExternalLink,
  FileCheck,
  Layers,
  LayoutGrid,
  Link2,
  List,
  Plus,
  Search,
  X,
} from 'lucide-react';

export function StatusPill({ status }) {
  switch (status) {
    case 'Verified':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#131D38] text-[#131D38] font-mono text-[10px] uppercase">
          <CheckCircle2 className="w-3 h-3" />
          <span>Verified</span>
        </span>
      );
    case 'Acquired':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#131D38] text-[#f4f1ea] font-mono text-[10px] uppercase">
          <FileCheck className="w-3 h-3" />
          <span>Acquired</span>
        </span>
      );
    case 'Used':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ffc20d] text-[#131D38] font-mono text-[10px] uppercase font-semibold">
          <Link2 className="w-3 h-3" />
          <span>Used</span>
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#E6E0D2] bg-white text-[#5B6478] font-mono text-[10px] uppercase">
          <CircleDashed className="w-3 h-3" />
          <span>Candidate</span>
        </span>
      );
  }
}

export function DatasetCataloguePage({
  datasets,
  initialDetailId = null,
  onUpdateStatus,
  onUseInInvestigation,
  onShowToast,
}) {
  const [search, setSearch] = useState('');
  const [agencyFilter, setAgencyFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState('cards');
  const [detailId, setDetailId] = useState(initialDetailId);
  const [compareIds, setCompareIds] = useState([]);

  useEffect(() => {
    if (initialDetailId) setDetailId(initialDetailId);
  }, [initialDetailId]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') setDetailId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return datasets.filter((d) => {
      if (
        q &&
        !d.name.toLowerCase().includes(q) &&
        !d.role.toLowerCase().includes(q) &&
        !d.variables.some((v) => v.name.toLowerCase().includes(q))
      ) {
        return false;
      }
      if (agencyFilter !== 'all' && d.agency !== agencyFilter) return false;
      if (statusFilter !== 'all' && d.status !== statusFilter) return false;
      return true;
    });
  }, [datasets, search, agencyFilter, statusFilter]);

  const detailDataset = datasets.find((d) => d.id === detailId) ?? null;
  const compareList = datasets.filter((d) => compareIds.includes(d.id));

  const toggleCompare = (id) => {
    setCompareIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 3 ? [...prev, id] : prev
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[36px] sm:text-[44px] font-semibold leading-[1.08] tracking-[-0.025em] text-[#131D38]">
            Data{' '}
            <span className="font-editorial-italic font-normal underline decoration-[#ffc20d] decoration-[3px] underline-offset-8">
              catalogue
            </span>
          </h1>
          <p className="mt-3 text-[16px] text-[#5B6478]">
            The Earth-observation datasets behind every EarthSignal investigation.
          </p>
        </div>

        <div className="font-mono text-[12px] uppercase tracking-[0.1em] text-[#5B6478] tabular-nums">
          {datasets.length} PRODUCTS · 1 PRIMARY · 2 AGENCIES
        </div>
      </div>

      {/* Toolbar */}
      <div className="rounded-[28px] bg-[#FBFAF6] border border-[#E6E0D2] p-4 sm:p-5 shadow-[0_20px_50px_rgba(19,29,56,0.06)] flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-[#5B6478] absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search datasets or variables…"
            className="w-full h-11 rounded-full bg-[#f4f1ea] border border-[#E6E0D2] pl-10 pr-4 text-[14px] focus:outline-none focus:border-[#131D38]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {['all', 'NASA', 'ESA/JAXA'].map((ag) => (
            <button
              key={ag}
              type="button"
              onClick={() => setAgencyFilter(ag)}
              className={`px-3.5 py-2 rounded-full text-[12px] font-medium cursor-pointer ${
                agencyFilter === ag
                  ? 'bg-[#131D38] text-[#f4f1ea]'
                  : 'bg-[#f4f1ea] border border-[#E6E0D2] text-[#5B6478]'
              }`}
            >
              {ag === 'all' ? 'All agencies' : ag}
            </button>
          ))}

          {['all', 'Candidate', 'Verified', 'Acquired', 'Used'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3.5 py-2 rounded-full text-[12px] font-medium cursor-pointer ${
                statusFilter === st
                  ? 'bg-[#ffc20d] text-[#131D38] font-semibold'
                  : 'bg-[#f4f1ea] border border-[#E6E0D2] text-[#5B6478]'
              }`}
            >
              {st === 'all' ? 'All statuses' : st}
            </button>
          ))}

          <div className="inline-flex p-1 rounded-full bg-[#f4f1ea] border border-[#E6E0D2]">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              aria-label="Cards view"
              className={`w-8 h-8 rounded-full inline-flex items-center justify-center cursor-pointer ${
                viewMode === 'cards' ? 'bg-[#131D38] text-[#f4f1ea]' : 'text-[#5B6478]'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              aria-label="List view"
              className={`w-8 h-8 rounded-full inline-flex items-center justify-center cursor-pointer ${
                viewMode === 'list' ? 'bg-[#131D38] text-[#f4f1ea]' : 'text-[#5B6478]'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Slim Honesty Info Banner */}
      <div className="rounded-[20px] bg-[#131D38] text-[#f4f1ea] px-5 py-3 text-[13px] flex items-center gap-3">
        <CircleDashed className="w-4 h-4 text-[#ffc20d] shrink-0" />
        <span>
          Dataset details are marked <strong>Candidate</strong> until the team has opened a sample
          file and checked its metadata.
        </span>
      </div>

      {/* Side-by-Side Comparison Strip (if >= 2 selected) */}
      {compareList.length >= 2 && (
        <div className="rounded-[28px] bg-[#FBFAF6] border border-[#E6E0D2] p-5 overflow-x-auto">
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-[11px] uppercase tracking-wider text-[#5B6478]">
              Side-by-side comparison ({compareList.length}/3)
            </span>
            <button
              type="button"
              onClick={() => setCompareIds([])}
              className="text-[12px] font-semibold underline cursor-pointer"
            >
              Clear comparison
            </button>
          </div>
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-[#E6E0D2] font-mono text-[11px] uppercase text-[#5B6478]">
                <th className="py-2 pr-4">Dataset</th>
                <th className="py-2 px-4">Agency</th>
                <th className="py-2 px-4">Coverage</th>
                <th className="py-2 px-4">Spatial resolution</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6E0D2]">
              {compareList.map((d) => (
                <tr key={d.id}>
                  <td className="py-2.5 pr-4 font-semibold">{d.name}</td>
                  <td className="py-2.5 px-4">{d.agency}</td>
                  <td className="py-2.5 px-4 font-mono text-[12px]">
                    {d.coverageStart}–{d.coverageEnd}
                  </td>
                  <td className="py-2.5 px-4 text-[#5B6478]">{d.resolution}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty Search */}
      {filtered.length === 0 ? (
        <div className="rounded-[28px] bg-[#FBFAF6] border border-[#E6E0D2] p-10 text-center">
          <p className="font-display text-[18px] font-semibold">No datasets match your search</p>
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setAgencyFilter('all');
              setStatusFilter('all');
            }}
            className="mt-4 px-5 py-2.5 rounded-full bg-[#131D38] text-[#f4f1ea] text-[13px] font-semibold cursor-pointer"
          >
            Clear filters
          </button>
        </div>
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map((ds) => {
            const isEarthCare = ds.agency === 'ESA/JAXA';
            const leftPct = Math.max(0, ((ds.coverageStart - 2000) / 26) * 100);
            const widthPct = Math.min(
              100 - leftPct,
              ((ds.coverageEnd - ds.coverageStart) / 26) * 100
            );
            const selLeftPct = ((2001 - 2000) / 26) * 100;
            const selWidthPct = ((2025 - 2001) / 26) * 100;
            const isComparing = compareIds.includes(ds.id);

            return (
              <article
                key={ds.id}
                className={`rounded-[28px] bg-[#FBFAF6] border border-[#E6E0D2] overflow-hidden shadow-[0_20px_50px_rgba(19,29,56,0.07)] flex flex-col justify-between ${
                  ds.roleType === 'primary' ? 'md:col-span-2 xl:col-span-2' : ''
                }`}
              >
                <div>
                  {isEarthCare && (
                    <div className="bg-[#131D38] text-[#ffc20d] px-6 py-2 font-mono text-[10px] uppercase tracking-[0.14em]">
                      ESA / JAXA · RECORD FROM 2024
                    </div>
                  )}

                  <div className="p-6">
                    <div className="flex items-start justify-between gap-3">
                      <span className="w-11 h-11 rounded-[14px] bg-[#131D38] text-[#4FB3A9] inline-flex items-center justify-center">
                        <Layers className="w-5 h-5" />
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleCompare(ds.id)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-mono uppercase border cursor-pointer ${
                            isComparing
                              ? 'bg-[#131D38] text-[#f4f1ea] border-[#131D38]'
                              : 'border-[#E6E0D2] text-[#5B6478]'
                          }`}
                        >
                          {isComparing ? 'Comparing ✓' : 'Compare'}
                        </button>
                        <StatusPill status={ds.status} />
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-[20px] font-semibold text-[#131D38]">
                        {ds.name}
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-full bg-[#f4f1ea] border border-[#E6E0D2] font-mono text-[10px] uppercase">
                        {ds.agency}
                      </span>
                    </div>

                    <div className="mt-2">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-[11px] font-semibold ${
                          ds.roleType === 'primary'
                            ? 'bg-[#ffc20d] text-[#131D38]'
                            : 'border border-[#131D38]/25 text-[#131D38]'
                        }`}
                      >
                        {ds.role}
                      </span>
                    </div>

                    <p className="mt-3 text-[14px] leading-[1.55] text-[#5B6478]">{ds.notes}</p>

                    {isEarthCare && (
                      <p className="mt-2 text-[12px] font-medium text-[#131D38]">
                        Contemporary process case study. Not a 2001–2025 trend dataset.
                      </p>
                    )}

                    {/* Variable tags */}
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {ds.variables.slice(0, 4).map((v) => (
                        <span
                          key={v.name}
                          className="px-2.5 py-1 rounded-full bg-[#f4f1ea] border border-[#E6E0D2] font-mono text-[11px] text-[#131D38]"
                        >
                          {v.name}
                        </span>
                      ))}
                    </div>

                    {/* Coverage Bar 2000-2026 */}
                    <div className="mt-5">
                      <div className="flex justify-between font-mono text-[10px] text-[#5B6478] mb-1">
                        <span>2000</span>
                        <span>
                          Covers {ds.coverageStart}–{ds.coverageEnd}
                        </span>
                        <span>2026</span>
                      </div>
                      <div
                        className="relative h-2.5 rounded-full bg-[#E6E0D2] overflow-hidden"
                        aria-label={`Covers ${ds.coverageStart} to ${ds.coverageEnd}`}
                      >
                        <div
                          className="absolute top-0 bottom-0 bg-[#131D38]"
                          style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                        />
                        <div
                          className="absolute top-0 bottom-0 border-2 border-[#ffc20d]"
                          style={{ left: `${selLeftPct}%`, width: `${selWidthPct}%` }}
                          title="2001–2025 investigation window"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="px-6 pb-6 pt-4 border-t border-[#E6E0D2] flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setDetailId(ds.id)}
                    className="px-4 py-2 rounded-full border border-[#131D38] text-[13px] font-semibold hover:bg-[#131D38] hover:text-[#f4f1ea] transition-colors cursor-pointer"
                  >
                    View details
                  </button>
                  <button
                    type="button"
                    onClick={() => onUseInInvestigation(ds)}
                    className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#131D38] hover:underline underline-offset-4 cursor-pointer"
                  >
                    <span>{isEarthCare ? 'Add as case study' : 'Use in investigation'}</span>
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        /* Compact List View */
        <div className="rounded-[28px] bg-[#FBFAF6] border border-[#E6E0D2] divide-y divide-[#E6E0D2] overflow-hidden">
          {filtered.map((ds) => (
            <div
              key={ds.id}
              className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#f4f1ea]"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-display text-[17px] font-semibold">{ds.name}</span>
                  <span className="font-mono text-[10px] uppercase text-[#5B6478]">
                    {ds.agency}
                  </span>
                  <StatusPill status={ds.status} />
                </div>
                <p className="mt-1 text-[13px] text-[#5B6478]">
                  {ds.role} · Covers {ds.coverageStart}–{ds.coverageEnd}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setDetailId(ds.id)}
                  className="px-4 py-2 rounded-full border border-[#131D38] text-[13px] font-semibold cursor-pointer"
                >
                  View details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* RIGHT-SIDE 640px DETAIL DRAWER */}
      {detailDataset && (
        <div
          className="fixed inset-0 z-50 bg-[#0B1224]/70 backdrop-blur-xs flex justify-end"
          role="dialog"
          aria-modal="true"
          onClick={() => setDetailId(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-[640px] h-full bg-[#f4f1ea] text-[#131D38] overflow-y-auto shadow-2xl flex flex-col"
          >
            {/* Navy Drawer Header */}
            <div className="bg-[#131D38] text-[#f4f1ea] p-6 sm:p-8 flex items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[10px] uppercase px-2.5 py-0.5 rounded-full bg-[#1E2B52] text-[#A9B1C6]">
                    {detailDataset.agency}
                  </span>
                  <span className="font-mono text-[10px] uppercase px-2.5 py-0.5 rounded-full bg-[#ffc20d] text-[#131D38] font-semibold">
                    {detailDataset.status}
                  </span>
                </div>
                <h2 className="mt-2.5 font-display text-[24px] font-semibold">
                  {detailDataset.name}
                </h2>
                <p className="mt-1 font-mono text-[12px] text-[#A9B1C6]">{detailDataset.product}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    onUseInInvestigation(detailDataset);
                    setDetailId(null);
                  }}
                  className="px-4 py-2 rounded-full bg-[#ffc20d] text-[#131D38] text-[13px] font-semibold cursor-pointer"
                >
                  Use in investigation
                </button>
                <button
                  type="button"
                  onClick={() => setDetailId(null)}
                  aria-label="Close dataset drawer"
                  className="w-9 h-9 rounded-full bg-[#1E2B52] text-[#f4f1ea] inline-flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-6 sm:p-8 space-y-7">
              {detailDataset.agency === 'ESA/JAXA' && (
                <div className="rounded-[20px] bg-[#131D38] text-[#ffc20d] p-4 text-[13px] font-medium">
                  EarthCARE is an ESA/JAXA mission. Its data are used as contemporary process case
                  studies, never as a 2001–2025 trend dataset.
                </div>
              )}

              {/* Overview */}
              <div className="rounded-[22px] bg-[#FBFAF6] border border-[#E6E0D2] p-5">
                <div className="font-mono text-[10px] uppercase tracking-wider text-[#5B6478]">
                  Role in EarthSignal
                </div>
                <p className="mt-1.5 text-[15px] font-semibold">{detailDataset.role}</p>
                <p className="mt-2 text-[14px] text-[#5B6478]">{detailDataset.notes}</p>
              </div>

              {/* Key Facts */}
              <div>
                <h3 className="font-mono text-[11px] uppercase tracking-wider text-[#5B6478] mb-3">
                  Key facts
                </h3>
                <dl className="rounded-[22px] bg-[#FBFAF6] border border-[#E6E0D2] divide-y divide-[#E6E0D2] text-[13px]">
                  {[
                    ['Dataset name', detailDataset.name],
                    ['Agency', detailDataset.agency],
                    ['Product / version', detailDataset.product],
                    ['Spatial resolution', detailDataset.resolution],
                    ['Temporal resolution', detailDataset.temporalResolution],
                    [
                      'Available period',
                      `${detailDataset.coverageStart}–${detailDataset.coverageEnd}`,
                    ],
                    ['Geographic coverage', detailDataset.geographicCoverage],
                  ].map(([k, v]) => (
                    <div key={k} className="px-4 py-3 grid grid-cols-3 gap-3">
                      <dt className="text-[#5B6478]">{k}</dt>
                      <dd className="col-span-2 font-medium italic-to-verify">{v}</dd>
                    </div>
                  ))}
                  <div className="px-4 py-3 grid grid-cols-3 gap-3">
                    <dt className="text-[#5B6478]">Dataset source</dt>
                    <dd className="col-span-2">
                      <a
                        href={detailDataset.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-medium underline underline-offset-4"
                      >
                        <span>Official archive</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Available Variables */}
              <div>
                <h3 className="font-mono text-[11px] uppercase tracking-wider text-[#5B6478] mb-3">
                  Available variables
                </h3>
                <div className="rounded-[22px] bg-[#FBFAF6] border border-[#E6E0D2] overflow-hidden">
                  <table className="w-full text-left text-[13px]">
                    <thead className="bg-[#f4f1ea] border-b border-[#E6E0D2] font-mono text-[10px] uppercase text-[#5B6478]">
                      <tr>
                        <th className="py-2.5 px-4">Variable</th>
                        <th className="py-2.5 px-4">Units</th>
                        <th className="py-2.5 px-4">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E6E0D2]">
                      {detailDataset.variables.map((v) => (
                        <tr key={v.name}>
                          <td className="py-2.5 px-4 font-mono text-[12px] font-medium">
                            {v.name}
                          </td>
                          <td className="py-2.5 px-4 font-mono text-[12px] text-[#4FB3A9]">
                            {v.units}
                          </td>
                          <td className="py-2.5 px-4 text-[#5B6478]">{v.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Known Limitations */}
              <div>
                <h3 className="font-mono text-[11px] uppercase tracking-wider text-[#5B6478] mb-3">
                  Known limitations
                </h3>
                <ul className="space-y-2">
                  {detailDataset.limitations.map((lim, i) => (
                    <li
                      key={i}
                      className="rounded-[18px] bg-[#FBFAF6] border border-[#E6E0D2] p-3.5 flex items-start gap-2.5 text-[13px] text-[#5B6478]"
                    >
                      <AlertTriangle className="w-4 h-4 text-[#C24136] shrink-0 mt-0.5" />
                      <span>{lim}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Verification Audit Stepper */}
              <div>
                <h3 className="font-mono text-[11px] uppercase tracking-wider text-[#5B6478] mb-3">
                  Verification log (audit status)
                </h3>
                <div className="rounded-[22px] bg-[#FBFAF6] border border-[#E6E0D2] p-4 flex flex-wrap gap-2">
                  {['Candidate', 'Verified', 'Acquired', 'Used'].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => onUpdateStatus(detailDataset.id, st)}
                      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-mono cursor-pointer ${
                        detailDataset.status === st
                          ? 'bg-[#ffc20d] text-[#131D38] font-semibold'
                          : 'bg-[#f4f1ea] border border-[#E6E0D2] text-[#5B6478]'
                      }`}
                    >
                      {detailDataset.status === st && <Check className="w-3.5 h-3.5" />}
                      <span>{st}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Citation */}
              <div className="rounded-[22px] bg-[#FBFAF6] border border-[#E6E0D2] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-[12px] text-[#5B6478]">{detailDataset.citation}</p>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(detailDataset.citation);
                    onShowToast('Citation copied — verify version metadata before citing.');
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-[#131D38]/25 text-[12px] font-semibold shrink-0 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy citation</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
