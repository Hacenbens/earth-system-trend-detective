'use client';

import { useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  Check,
  Database,
  Download,
  FileText,
  Globe2,
  Lock,
  MapPin,
} from 'lucide-react';

import { WORKFLOW_LAYERS } from '@/app/api/earthSignalData';
import { getInvestigationBounds, parseCoordsLabel } from '@/app/api/regionBounds';
import { StudyAreaMap } from '@/app/pages/investigations/StudyAreaMap';

const STEPPER_NODES = [
  { id: 'data', label: 'Data', code: '00', stageIdx: -1 },
  { id: 'detect', label: 'Detect', code: '01', stageIdx: 0 },
  { id: 'investigate', label: 'Investigate', code: '02', stageIdx: 1 },
  { id: 'explain', label: 'Explain', code: '03', stageIdx: 2 },
  { id: 'project', label: 'Project', code: '04', stageIdx: 3 },
  { id: 'solve', label: 'Solve', code: '05', stageIdx: 4 },
];

export function InvestigationHeader({
  investigation,
  activeSubView,
  onSelectSubView,
  onShowToast,
}) {
  const gateOpen = Boolean(investigation.dataGatePassed);

  const handleStepClick = (node) => {
    if (node.id !== 'data' && !gateOpen) {
      onShowToast(
        'Review the Data Preparation quality gate below before unlocking Layer 01 (Detect).'
      );
      onSelectSubView('data');
      return;
    }
    onSelectSubView(node.id);
  };

  return (
    <header className="rounded-[28px] bg-[#FBFAF6] border border-[#E6E0D2] p-5 sm:p-6 shadow-[0_18px_46px_rgba(19,29,56,0.06)] space-y-5">
      {/* Top title & meta strip */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#131D38] text-[#ffc20d] font-mono text-[10px] uppercase">
              {investigation.status === 'completed'
                ? 'COMPLETED'
                : investigation.status === 'draft'
                  ? 'DRAFT'
                  : 'IN PROGRESS'}
            </span>
            <span className="px-3 py-1 rounded-full bg-[#f4f1ea] border border-[#E6E0D2] font-mono text-[11px] text-[#131D38]">
              {investigation.region} · {investigation.coords}
            </span>
            <span className="px-3 py-1 rounded-full bg-[#f4f1ea] border border-[#E6E0D2] font-mono text-[11px] text-[#131D38] tabular-nums">
              {investigation.period}
            </span>
            <span className="px-3 py-1 rounded-full bg-[#4FB3A9]/15 text-[#131D38] text-[11px] font-medium">
              {investigation.variable}
            </span>
          </div>

          <h1 className="mt-2.5 font-display text-[24px] sm:text-[28px] font-semibold text-[#131D38] leading-tight">
            {investigation.title}
          </h1>
        </div>

        {/* Sub-view secondary tabs */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {[
            { id: 'overview', label: 'Overview', icon: Globe2 },
            { id: 'regions', label: 'Regions', icon: BarChart3 },
            { id: 'report', label: 'Report', icon: FileText },
            { id: 'export', label: 'Export', icon: Download },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeSubView === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelectSubView(tab.id)}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#131D38] text-[#f4f1ea]'
                    : 'bg-[#f4f1ea] border border-[#E6E0D2] text-[#131D38] hover:bg-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 6-step horizontal stepper: Data -> Detect -> Investigate -> Explain -> Project -> Solve */}
      <nav aria-label="Investigation workflow stepper" className="pt-4 border-t border-[#E6E0D2]">
        <ol className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {STEPPER_NODES.map((node) => {
            const active = activeSubView === node.id;
            const locked = node.id !== 'data' && !gateOpen;
            const completed =
              node.id === 'data' ? gateOpen : gateOpen && investigation.stageIndex > node.stageIdx;

            return (
              <li key={node.id}>
                <button
                  type="button"
                  onClick={() => handleStepClick(node)}
                  className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-[16px] border text-left transition-all cursor-pointer ${
                    active
                      ? 'bg-[#ffc20d] border-[#ffc20d] text-[#131D38] font-semibold shadow-sm'
                      : locked
                        ? 'bg-[#f4f1ea]/60 border-[#E6E0D2] text-[#5B6478] hover:border-[#131D38]/30'
                        : 'bg-[#f4f1ea] border-[#E6E0D2] text-[#131D38] hover:bg-white'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="font-mono text-[10px] uppercase tracking-wider opacity-75">
                      {node.code === '00' ? 'Gate' : `Layer ${node.code}`}
                    </div>
                    <div className="text-[13px] font-semibold truncate">{node.label}</div>
                  </div>
                  <span
                    className={`w-6 h-6 rounded-full inline-flex items-center justify-center shrink-0 ${
                      active
                        ? 'bg-[#131D38] text-[#ffc20d]'
                        : completed
                          ? 'bg-[#131D38] text-[#f4f1ea]'
                          : 'bg-white border border-[#E6E0D2] text-[#5B6478]'
                    }`}
                  >
                    {locked ? (
                      <Lock className="w-3 h-3" />
                    ) : completed ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>
    </header>
  );
}

/* ============================================================================
 * PAGE 09: INVESTIGATION OVERVIEW (/investigations/:id)
 * ========================================================================== */
export function InvestigationOverviewPage({ investigation, onSelectSubView }) {
  const activeLayer = WORKFLOW_LAYERS[investigation.stageIndex] ?? WORKFLOW_LAYERS[0];
  const studyBounds = getInvestigationBounds(investigation);

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Left 7 cols: Research Framing + Discovery Summary */}
      <div className="col-span-12 xl:col-span-7 space-y-6">
        <section className="rounded-[28px] bg-[#FBFAF6] border border-[#E6E0D2] p-6 sm:p-7 shadow-[0_20px_50px_rgba(19,29,56,0.06)]">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5B6478]">
            RESEARCH QUESTION & FRAMING
          </p>
          <h2 className="mt-2 font-display text-[22px] font-semibold text-[#131D38] leading-snug">
            {investigation.researchQuestion ||
              `Is ${investigation.variable.toLowerCase()} shifting across ${investigation.region} (${investigation.period})?`}
          </h2>
          <p className="mt-3 text-[15px] leading-[1.6] text-[#5B6478]">
            {investigation.description ||
              'Connected five-layer investigation aligning satellite rainfall signals, reanalysis circulation fields, physical mechanisms, conditional scenarios, and land-water intervention sensitivity.'}
          </p>

          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { k: 'Primary dataset', v: investigation.dataset },
              { k: 'Primary variable', v: investigation.variable },
              { k: 'Season mask', v: investigation.season },
              { k: 'Audit status', v: investigation.datasetStatus },
            ].map((item) => (
              <div
                key={item.k}
                className="p-3.5 rounded-[18px] bg-[#f4f1ea] border border-[#E6E0D2]"
              >
                <div className="font-mono text-[10px] uppercase text-[#5B6478]">{item.k}</div>
                <div className="mt-1 text-[13px] font-semibold text-[#131D38] leading-snug">
                  {item.v}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Five-Layer Progress Breakdown */}
        <section className="rounded-[28px] bg-[#FBFAF6] border border-[#E6E0D2] p-6 sm:p-7 shadow-[0_20px_50px_rgba(19,29,56,0.06)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5B6478]">
                FIVE-LAYER WORKFLOW
              </p>
              <h2 className="mt-1 font-display text-[19px] font-semibold text-[#131D38]">
                Current focus: {activeLayer.title}
              </h2>
            </div>
            <button
              type="button"
              onClick={() =>
                onSelectSubView(investigation.dataGatePassed ? activeLayer.id : 'data')
              }
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#ffc20d] text-[#131D38] text-[13px] font-semibold hover:bg-[#eab006] transition-colors cursor-pointer"
            >
              <span>
                {investigation.dataGatePassed
                  ? `Continue at ${activeLayer.title}`
                  : 'Review data gate first'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-5 space-y-3">
            {WORKFLOW_LAYERS.map((layer, idx) => {
              const isDone = idx < investigation.stageIndex;
              const isCurr = idx === investigation.stageIndex;
              return (
                <button
                  key={layer.id}
                  type="button"
                  onClick={() => onSelectSubView(investigation.dataGatePassed ? layer.id : 'data')}
                  className="w-full flex items-center justify-between gap-4 p-4 rounded-[20px] bg-[#f4f1ea] border border-[#E6E0D2] hover:border-[#131D38]/35 text-left transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span
                      className={`w-8 h-8 rounded-full inline-flex items-center justify-center font-mono text-[11px] font-semibold shrink-0 ${
                        isDone
                          ? 'bg-[#131D38] text-[#f4f1ea]'
                          : isCurr
                            ? 'bg-[#ffc20d] text-[#131D38]'
                            : 'bg-white border border-[#E6E0D2] text-[#5B6478]'
                      }`}
                    >
                      {layer.number}
                    </span>
                    <div className="min-w-0">
                      <div className="text-[14px] font-semibold text-[#131D38]">
                        {layer.title} ·{' '}
                        <span className="font-normal text-[#5B6478]">{layer.question}</span>
                      </div>
                      <div className="text-[12px] text-[#5B6478] truncate">{layer.explanation}</div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#5B6478] shrink-0" />
                </button>
              );
            })}
          </div>
        </section>
      </div>

      {/* Right 5 cols: Study Area Navy Map + Quick Actions */}
      <div className="col-span-12 xl:col-span-5 space-y-6">
        <section className="rounded-[28px] bg-[#131D38] text-[#f4f1ea] p-6 shadow-[0_20px_50px_rgba(19,29,56,0.12)]">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#ffc20d]">
              STUDY AREA BOUNDARY
            </span>
            {investigation.provisionalBoundary && (
              <span className="px-2.5 py-0.5 rounded-full bg-[#1E2B52] border border-[#f4f1ea]/15 font-mono text-[10px] uppercase text-[#A9B1C6]">
                Provisional until verified
              </span>
            )}
          </div>

          <div className="mt-4 rounded-[20px] bg-[#0B1224] border border-[#f4f1ea]/10 p-3">
            {studyBounds ? (
              <StudyAreaMap
                label={`${investigation.region.toUpperCase()} · ${investigation.coords}`}
                boxes={[{ id: investigation.id, bounds: studyBounds, dashArray: '6 4' }]}
              />
            ) : (
              <svg
                viewBox="0 0 320 190"
                className="w-full h-auto"
                role="img"
                aria-label={`Map of ${investigation.region}`}
              >
                <line
                  x1="0"
                  y1="60"
                  x2="320"
                  y2="60"
                  stroke="#f4f1ea"
                  strokeOpacity="0.08"
                  strokeDasharray="3 3"
                />
                <line
                  x1="0"
                  y1="120"
                  x2="320"
                  y2="120"
                  stroke="#f4f1ea"
                  strokeOpacity="0.08"
                  strokeDasharray="3 3"
                />
                <line
                  x1="100"
                  y1="0"
                  x2="100"
                  y2="190"
                  stroke="#f4f1ea"
                  strokeOpacity="0.08"
                  strokeDasharray="3 3"
                />
                <line
                  x1="210"
                  y1="0"
                  x2="210"
                  y2="190"
                  stroke="#f4f1ea"
                  strokeOpacity="0.08"
                  strokeDasharray="3 3"
                />
                <path
                  d="M54 24 L268 24 L292 78 L278 168 L194 168 L160 138 L94 140 L48 110 L42 68 Z"
                  fill="#1E2B52"
                  stroke="#f4f1ea"
                  strokeOpacity="0.24"
                />
                <rect
                  x="54"
                  y="66"
                  width="218"
                  height="50"
                  rx="8"
                  fill="#4FB3A9"
                  fillOpacity="0.34"
                />
                <rect
                  x="54"
                  y="66"
                  width="218"
                  height="50"
                  fill="none"
                  stroke="#ffc20d"
                  strokeWidth="2"
                  strokeDasharray="6 4"
                />
                <text
                  x="60"
                  y="59"
                  fill="#ffc20d"
                  fontSize="10"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {investigation.region.toUpperCase()} · {investigation.coords}
                </text>
              </svg>
            )}
          </div>

          <div className="mt-5 p-4 rounded-[20px] bg-[#1E2B52] border border-[#f4f1ea]/10">
            <div className="font-mono text-[10px] uppercase tracking-wider text-[#ffc20d]">
              DISCOVERY SUMMARY (CANDIDATE PREVIEW)
            </div>
            <p className="mt-1.5 text-[13px] text-[#f4f1ea]/90 leading-[1.55]">
              Structured for {investigation.period} {investigation.season}. Final Sen’s slope and
              Mann-Kendall values remain labeled as placeholders until GPM IMERG V07B file
              verification completes.
            </p>
          </div>
        </section>

        <section className="rounded-[28px] bg-[#FBFAF6] border border-[#E6E0D2] p-6 shadow-[0_20px_50px_rgba(19,29,56,0.06)] space-y-3">
          <h3 className="font-display text-[17px] font-semibold text-[#131D38]">
            Quick workspace actions
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => onSelectSubView('data')}
              className="flex items-center justify-between px-4 py-3 rounded-[18px] bg-[#f4f1ea] border border-[#E6E0D2] hover:border-[#131D38]/30 text-[13px] font-semibold text-[#131D38] cursor-pointer"
            >
              <span className="inline-flex items-center gap-2">
                <Database className="w-4 h-4" />
                Review data
              </span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onSelectSubView('regions')}
              className="flex items-center justify-between px-4 py-3 rounded-[18px] bg-[#f4f1ea] border border-[#E6E0D2] hover:border-[#131D38]/30 text-[13px] font-semibold text-[#131D38] cursor-pointer"
            >
              <span className="inline-flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Compare regions
              </span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onSelectSubView('report')}
              className="flex items-center justify-between px-4 py-3 rounded-[18px] bg-[#f4f1ea] border border-[#E6E0D2] hover:border-[#131D38]/30 text-[13px] font-semibold text-[#131D38] cursor-pointer"
            >
              <span className="inline-flex items-center gap-2">
                <FileText className="w-4 h-4" />
                View report
              </span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onSelectSubView('export')}
              className="flex items-center justify-between px-4 py-3 rounded-[18px] bg-[#131D38] text-[#f4f1ea] hover:bg-[#1E2B52] text-[13px] font-semibold cursor-pointer"
            >
              <span className="inline-flex items-center gap-2">
                <Download className="w-4 h-4 text-[#ffc20d]" />
                Export results
              </span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

/* ============================================================================
 * PAGE 11: REGIONAL COMPARISON (/investigations/:id/regions)
 * ========================================================================== */
const SAHEL_SUBREGIONS = [
  {
    id: 'western',
    name: 'Western Sahel',
    bounds: '10°N–20°N, 18°W–0°E',
    seasonTotal: '428 mm (placeholder)',
    rx1day: '+4.8% / decade (placeholder)',
    wetSpellShift: 'Later onset, sharper Aug peak',
    color: '#4FB3A9',
    bars: [58, 62, 55, 68, 72, 78, 82],
  },
  {
    id: 'central',
    name: 'Central Sahel',
    bounds: '10°N–18°N, 0°E–15°E',
    seasonTotal: '492 mm (placeholder)',
    rx1day: '+6.1% / decade (placeholder)',
    wetSpellShift: 'Strongest organized MCS burst signal',
    color: '#ffc20d',
    bars: [64, 60, 66, 74, 79, 86, 91],
  },
  {
    id: 'eastern',
    name: 'Eastern Sahel',
    bounds: '10°N–18°N, 15°E–35°E',
    seasonTotal: '518 mm (placeholder)',
    rx1day: '+3.2% / decade (placeholder)',
    wetSpellShift: 'Higher year-to-year variability',
    color: '#131D38',
    bars: [68, 72, 65, 70, 71, 75, 77],
  },
  {
    id: 'full',
    name: 'Full Sahel Belt',
    bounds: '10°N–20°N, 18°W–35°E',
    seasonTotal: '476 mm (placeholder)',
    rx1day: '+4.7% / decade (placeholder)',
    wetSpellShift: 'Extremes rising faster than seasonal totals',
    color: '#5B6478',
    bars: [63, 65, 62, 71, 74, 80, 83],
  },
];

// Map styling for the three longitudinal boxes (same colours as the original preview)
const SUBREGION_MAP_STYLE = [
  { id: 'western', label: 'WEST', color: '#4FB3A9', on: 0.55, off: 0.15 },
  { id: 'central', label: 'CENTRAL', color: '#ffc20d', on: 0.45, off: 0.12 },
  { id: 'eastern', label: 'EAST', color: '#f4f1ea', on: 0.25, off: 0.08 },
];

export function RegionalComparisonPage({ investigation, onSelectSubView }) {
  const [selectedIds, setSelectedIds] = useState(['western', 'central', 'eastern']);

  const toggleRegion = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? (prev.length > 1 ? prev.filter((r) => r !== id) : prev) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] bg-[#FBFAF6] border border-[#E6E0D2] p-6 sm:p-7 shadow-[0_20px_50px_rgba(19,29,56,0.06)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5B6478]">
              LONGITUDINAL SUB-REGION COMPARISON
            </p>
            <h2 className="mt-1 font-display text-[22px] font-semibold text-[#131D38]">
              Consistent-definition Sahel comparison ({investigation.period})
            </h2>
          </div>

          <div className="flex flex-wrap gap-2">
            {SAHEL_SUBREGIONS.map((sub) => {
              const active = selectedIds.includes(sub.id);
              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => toggleRegion(sub.id)}
                  className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold border transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#131D38] text-[#f4f1ea] border-[#131D38]'
                      : 'bg-[#f4f1ea] text-[#5B6478] border-[#E6E0D2]'
                  }`}
                >
                  {sub.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sub-region Map + Multi-region Intensity Bars */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 rounded-[22px] bg-[#131D38] p-5 text-[#f4f1ea]">
            <div className="font-mono text-[10px] uppercase tracking-wider text-[#ffc20d]">
              WEST · CENTRAL · EAST BOXES
            </div>
            <div className="mt-3">
              <StudyAreaMap
                aspect="320 / 175"
                boxes={SUBREGION_MAP_STYLE.map((style) => {
                  const sub = SAHEL_SUBREGIONS.find((s) => s.id === style.id);
                  const active = selectedIds.includes(style.id);
                  return {
                    id: style.id,
                    bounds: parseCoordsLabel(sub.bounds),
                    label: style.label,
                    stroke: style.color,
                    fill: style.color,
                    weight: 1,
                    fillOpacity: active ? style.on : style.off,
                    onClick: () => toggleRegion(style.id),
                  };
                })}
              />
            </div>
            <p className="mt-3 text-[12px] text-[#A9B1C6]">
              Every sub-region applies identical GPM IMERG V07B JJAS definitions and Sen’s slope
              windowing.
            </p>
          </div>

          <div className="lg:col-span-7 rounded-[22px] bg-[#f4f1ea] border border-[#E6E0D2] p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-wider text-[#5B6478]">
                  INTENSITY PROFILE · PLACEHOLDER DIAGNOSTIC PREVIEW
                </span>
                <span className="font-mono text-[10px] text-[#5B6478]">Rx1day relative index</span>
              </div>

              <div className="mt-4 space-y-4">
                {SAHEL_SUBREGIONS.filter((s) => selectedIds.includes(s.id)).map((sub) => (
                  <div key={sub.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-[13px]">
                      <span className="font-semibold text-[#131D38]">{sub.name}</span>
                      <span className="font-mono text-[11px] text-[#5B6478]">{sub.rx1day}</span>
                    </div>
                    <div className="grid grid-cols-7 gap-1.5 items-end h-10">
                      {sub.bars.map((val, idx) => (
                        <div key={idx} className="h-full flex items-end">
                          <div
                            className="w-full rounded-t-[6px]"
                            style={{
                              height: `${val}%`,
                              backgroundColor: sub.id === 'central' ? '#ffc20d' : sub.color,
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#E6E0D2] text-[12px] text-[#5B6478]">
              Key regional finding: Western and Central Sahel exhibit stronger extreme convective
              intensification relative to seasonal totals than the Eastern basin.
            </div>
          </div>
        </div>

        {/* Comparison Table */}
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-left border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-[#E6E0D2] font-mono text-[10px] uppercase tracking-wider text-[#5B6478]">
                <th className="py-3 pr-4">Sub-region</th>
                <th className="py-3 pr-4">Coordinates</th>
                <th className="py-3 pr-4">JJAS Total</th>
                <th className="py-3 pr-4">Rx1day Trend</th>
                <th className="py-3">Characteristic Shift</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6E0D2]">
              {SAHEL_SUBREGIONS.map((sub) => (
                <tr key={sub.id} className="hover:bg-[#f4f1ea]/50">
                  <td className="py-3 pr-4 font-semibold text-[#131D38]">{sub.name}</td>
                  <td className="py-3 pr-4 font-mono text-[12px] text-[#5B6478]">{sub.bounds}</td>
                  <td className="py-3 pr-4 font-mono tabular-nums">{sub.seasonTotal}</td>
                  <td className="py-3 pr-4 font-mono tabular-nums">{sub.rx1day}</td>
                  <td className="py-3 text-[#5B6478]">{sub.wetSpellShift}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => onSelectSubView('detect')}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#ffc20d] text-[#131D38] text-[14px] font-semibold hover:bg-[#eab006] transition-colors cursor-pointer"
        >
          <span>Return to Layer 01 (Detect)</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
