'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  Activity,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CloudRain,
  Copy,
  Database,
  FileText,
  FolderKanban,
  Globe2,
  Layers,
  MoreHorizontal,
  Pencil,
  Plus,
  Sparkles,
  Star,
  Trash2,
  Wind,
} from 'lucide-react';
import { PipelineStory } from '@/app/pages/dashboard/PipelineStory';
import { StudyAreaMap } from '@/app/pages/investigations/StudyAreaMap';
import { RegionThumbMap } from '@/app/pages/investigations/RegionThumbMap';
import { getInvestigationBounds } from '@/app/api/regionBounds';
import { WORKFLOW_LAYERS } from '@/app/api/earthSignalData';

function useCountUp(target, duration = 600) {
  const [value, setValue] = useState(target);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced || hasAnimated.current) {
      setValue(target);
      return;
    }

    hasAnimated.current = true;
    const start = performance.now();
    let frame = 0;

    const tick = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}

function VariableIcon({ variable, className = 'w-4 h-4' }) {
  switch (variable) {
    case 'Rainfall':
    case 'Precipitation':
      return <CloudRain className={className} />;
    case 'Atmospheric moisture':
      return <Activity className={className} />;
    case 'Dust aerosols':
      return <Wind className={className} />;
    default:
      return <Layers className={className} />;
  }
}

function MiniMapThumbSvg({ region, variable }) {
  const isRainfall =
    variable === 'Rainfall' || variable === 'Precipitation' || variable === 'Atmospheric moisture';
  return (
    <svg viewBox="0 0 240 120" className="w-full h-full" aria-label={`Map preview for ${region}`}>
      <rect width="240" height="120" fill="#131D38" />
      <line x1="0" y1="40" x2="240" y2="40" stroke="#f4f1ea" strokeOpacity="0.08" />
      <line x1="0" y1="80" x2="240" y2="80" stroke="#f4f1ea" strokeOpacity="0.08" />
      <line x1="80" y1="0" x2="80" y2="120" stroke="#f4f1ea" strokeOpacity="0.08" />
      <line x1="160" y1="0" x2="160" y2="120" stroke="#f4f1ea" strokeOpacity="0.08" />
      <path
        d="M36 22 L195 20 L214 55 L202 108 L138 106 L112 92 L62 94 L30 74 Z"
        fill="#1E2B52"
        stroke="#f4f1ea"
        strokeOpacity="0.18"
      />
      <rect
        x="48"
        y="44"
        width="138"
        height="34"
        rx="8"
        fill={isRainfall ? '#4FB3A9' : '#ffc20d'}
        fillOpacity="0.3"
      />
      <rect
        x="48"
        y="44"
        width="138"
        height="34"
        fill="none"
        stroke="#ffc20d"
        strokeWidth="1.5"
        strokeDasharray="4 3"
      />
    </svg>
  );
}

// Real satellite thumbnail of the investigation's own study box
// (falls back to the drawn preview if the record has no usable coordinates).
function MiniMapThumb({ investigation, padding }) {
  const bounds = getInvestigationBounds(investigation);
  if (!bounds) {
    return <MiniMapThumbSvg region={investigation.region} variable={investigation.variable} />;
  }
  const isRainfall = ['Rainfall', 'Precipitation', 'Atmospheric moisture'].includes(
    investigation.variable
  );
  return (
    <RegionThumbMap bounds={bounds} fill={isRainfall ? '#4FB3A9' : '#ffc20d'} padding={padding} />
  );
}

export function DashboardBento({
  isFirstVisit,
  investigations,
  datasets,
  loading,
  onNewInvestigation,
  onStartTour,
  onBrowseDatasets,
  onViewReports,
  onViewAllInvestigations,
  onOpenInvestigation,
  onReadMethod,
  onRenameInvestigation,
  onDuplicateInvestigation,
  onDeleteInvestigation,
  onLoadSahelCaseStudy,
}) {
  const [workflowInvId, setWorkflowInvId] = useState(
    investigations[0]?.id ?? 'sahel-rainfall-2001-2025'
  );
  const [openMenuId, setOpenMenuId] = useState(null);
  const [renamingId, setRenamingId] = useState(null);
  const [renameDraft, setRenameDraft] = useState('');
  const recentScrollRef = useRef(null);

  useEffect(() => {
    if (!investigations.some((i) => i.id === workflowInvId) && investigations[0]) {
      setWorkflowInvId(investigations[0].id);
    }
  }, [investigations, workflowInvId]);

  const totalCount = investigations.length;
  const completedCount = investigations.filter((i) => i.completed).length;
  const activeCount = investigations.filter((i) => !i.completed).length;
  const candidateCount = datasets.filter((d) => d.status === 'Candidate').length;
  const verifiedCount = datasets.filter((d) => d.status === 'Verified').length;

  const animatedTotal = useCountUp(totalCount);
  const animatedCompleted = useCountUp(completedCount);
  const animatedActive = useCountUp(activeCount);
  const animatedDatasets = useCountUp(datasets.length);

  const featuredInv = investigations.find((i) => i.isFeatured) ?? investigations[0] ?? null;
  const latestInv = investigations[0] ?? null;
  const workflowInv = investigations.find((i) => i.id === workflowInvId) ?? featuredInv;
  const activeStage = workflowInv ? workflowInv.stageIndex : 1; // 0-indexed (1 => 2 of 5)

  const featuredDatasetStatus =
    datasets.find((d) => d.id === 'gpm-imerg-v07')?.status ??
    featuredInv?.datasetStatus ??
    'Candidate';

  if (loading) {
    return (
      <div className="grid grid-cols-12 gap-6" aria-busy="true" aria-label="Loading dashboard">
        <div className="col-span-12 xl:col-span-8 h-[260px] rounded-[28px] skeleton-cream" />
        <div className="col-span-12 xl:col-span-4 h-[260px] rounded-[28px] skeleton-cream" />
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="col-span-12 sm:col-span-6 xl:col-span-3 h-[150px] rounded-[28px] skeleton-cream"
          />
        ))}
        <div className="col-span-12 lg:col-span-8 h-[360px] rounded-[28px] skeleton-cream" />
        <div className="col-span-12 lg:col-span-4 h-[360px] rounded-[28px] skeleton-cream" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* ROW A1: Navy Welcome Card (8 cols) */}
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.0, ease: [0.16, 1, 0.3, 1] }}
        className="col-span-12 xl:col-span-8 relative overflow-hidden rounded-[28px] bg-[#131D38] text-[#f4f1ea] p-7 sm:p-9 min-h-[260px] flex flex-col justify-between shadow-[0_20px_50px_rgba(19,29,56,0.12)]"
      >
        {/* Real 3D Earth telling the pipeline as a story (Detect → Solve) */}
        <PipelineStory />

        <div className="relative z-10 max-w-lg">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#ffc20d]">
            {isFirstVisit ? 'WELCOME' : 'WELCOME BACK'}
          </p>
          <h1 className="mt-2 font-display text-[30px] sm:text-[38px] font-semibold leading-[1.1] tracking-[-0.025em] text-[#f4f1ea]">
            Welcome to{' '}
            <span className="font-editorial-italic text-[#ffc20d] font-normal text-[1.08em]">
              EarthSignal
            </span>
          </h1>
          <p className="mt-3 text-[15px] leading-[1.6] text-[#A9B1C6] max-w-md">
            Detect a trend in NASA data, investigate the physics behind it, and explore what could
            happen next.
          </p>
        </div>

        <div className="relative z-10 mt-6 flex flex-wrap items-center gap-5">
          <button
            type="button"
            onClick={onNewInvestigation}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#ffc20d] text-[#131D38] text-[14px] font-semibold hover:bg-[#eab006] transition-colors cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>New Investigation</span>
          </button>

          <button
            type="button"
            onClick={onStartTour}
            className="text-[14px] font-medium text-[#f4f1ea]/90 hover:text-[#ffc20d] transition-colors cursor-pointer underline underline-offset-4"
          >
            Take the 1-minute tour
          </button>
        </div>
      </motion.section>

      {/* ROW A2: Quick Access Card (4 cols) */}
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
        className="col-span-12 xl:col-span-4 rounded-[28px] bg-[#FBFAF6] border border-[#E6E0D2] p-6 shadow-[0_20px_50px_rgba(19,29,56,0.08)] flex flex-col justify-between"
      >
        <div>
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="font-display text-[17px] font-semibold text-[#131D38]">Quick access</h2>
            <span className="font-mono text-[11px] uppercase tracking-wider text-[#5B6478]">
              Start something
            </span>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={onNewInvestigation}
              className="group flex flex-col items-center text-center gap-2 p-3 rounded-[20px] bg-[#f4f1ea] border border-[#E6E0D2] hover:border-[#131D38]/30 hover:-translate-y-0.5 transition-all cursor-pointer"
            >
              <span className="w-10 h-10 rounded-[14px] bg-[#ffc20d] text-[#131D38] inline-flex items-center justify-center">
                <Plus className="w-5 h-5" />
              </span>
              <span className="text-[12px] font-medium text-[#131D38] leading-tight">
                Create investigation
              </span>
            </button>

            <button
              type="button"
              onClick={onBrowseDatasets}
              className="group flex flex-col items-center text-center gap-2 p-3 rounded-[20px] bg-[#f4f1ea] border border-[#E6E0D2] hover:border-[#131D38]/30 hover:-translate-y-0.5 transition-all cursor-pointer"
            >
              <span className="w-10 h-10 rounded-[14px] bg-white border border-[#E6E0D2] text-[#131D38] inline-flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </span>
              <span className="text-[12px] font-medium text-[#131D38] leading-tight">
                Browse datasets
              </span>
            </button>

            <button
              type="button"
              onClick={onViewReports}
              className="group flex flex-col items-center text-center gap-2 p-3 rounded-[20px] bg-[#f4f1ea] border border-[#E6E0D2] hover:border-[#131D38]/30 hover:-translate-y-0.5 transition-all cursor-pointer"
            >
              <span className="w-10 h-10 rounded-[14px] bg-white border border-[#E6E0D2] text-[#131D38] inline-flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </span>
              <span className="text-[12px] font-medium text-[#131D38] leading-tight">
                View reports
              </span>
            </button>
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-[#E6E0D2]">
          <p className="font-mono text-[10px] uppercase tracking-wider text-[#5B6478]">
            Pick up where you left off
          </p>
          {latestInv ? (
            <button
              type="button"
              onClick={() => onOpenInvestigation(latestInv)}
              className="mt-2 w-full flex items-center justify-between gap-3 p-2.5 rounded-[16px] hover:bg-[#f4f1ea] transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-9 rounded-[10px] overflow-hidden shrink-0 border border-[#E6E0D2]">
                  <MiniMapThumb investigation={latestInv} padding={3} />
                </div>
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold text-[#131D38] truncate">
                    {latestInv.title}
                  </div>
                  <div className="font-mono text-[10px] uppercase text-[#5B6478]">
                    {WORKFLOW_LAYERS[latestInv.stageIndex]?.title ?? 'Detect'}
                  </div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-[#5B6478] shrink-0" />
            </button>
          ) : (
            <p className="mt-2 text-[13px] text-[#5B6478]">No active session yet.</p>
          )}
        </div>
      </motion.section>

      {/* ROW B: Four Stat Tiles (3 cols each desktop, 2x2 <=1200px) */}
      {[
        {
          id: 'total',
          label: 'Total investigations',
          value: animatedTotal,
          icon: FolderKanban,
          caption: 'Including the Sahel case study',
          onAction: onViewAllInvestigations,
        },
        {
          id: 'completed',
          label: 'Completed',
          value: animatedCompleted,
          icon: CheckCircle2,
          caption: 'segmented',
          onAction: onViewAllInvestigations,
        },
        {
          id: 'active',
          label: 'Active',
          value: animatedActive,
          icon: Activity,
          caption: 'Currently in progress',
          onAction: onViewAllInvestigations,
        },
        {
          id: 'datasets',
          label: 'Available datasets',
          value: animatedDatasets,
          icon: Database,
          caption: 'datasets',
          onAction: onBrowseDatasets,
        },
      ].map((tile, idx) => {
        const Icon = tile.icon;
        const completedSegments =
          totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 5);

        return (
          <motion.article
            key={tile.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.5,
              delay: 0.12 + idx * 0.06,
              ease: [0.16, 1, 0.3, 1],
            }}
            onClick={tile.onAction}
            className="group col-span-12 sm:col-span-6 xl:col-span-3 rounded-[28px] bg-[#FBFAF6] border border-[#E6E0D2] p-6 min-h-[152px] flex flex-col justify-between shadow-[0_20px_50px_rgba(19,29,56,0.06)] hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(19,29,56,0.11)] transition-all duration-200 cursor-pointer"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[11px] uppercase tracking-wider text-[#5B6478]">
                {tile.label}
              </span>
              <span className="w-8 h-8 rounded-[10px] bg-[#f4f1ea] border border-[#E6E0D2] inline-flex items-center justify-center text-[#131D38]">
                <Icon className="w-4 h-4" />
              </span>
            </div>

            <div className="mt-2 flex items-baseline justify-between gap-2">
              <span className="font-display text-[44px] leading-none font-semibold text-[#131D38] tabular-nums">
                {tile.value}
              </span>
              <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[12px] font-semibold text-[#131D38] whitespace-nowrap">
                View all →
              </span>
            </div>

            <div className="mt-3">
              {tile.caption === 'segmented' ? (
                <div
                  className="flex items-center gap-1.5"
                  aria-label={`${completedCount} of ${totalCount} completed`}
                >
                  {[0, 1, 2, 3, 4].map((seg) => (
                    <span
                      key={seg}
                      className={`h-1.5 flex-1 rounded-full ${
                        seg < completedSegments ? 'bg-[#ffc20d]' : 'bg-[#E6E0D2]'
                      }`}
                    />
                  ))}
                </div>
              ) : tile.caption === 'datasets' ? (
                <p className="text-[12px] text-[#5B6478] flex items-center gap-1.5">
                  <span>{candidateCount} candidates</span>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#ffc20d]" aria-hidden="true" />
                    <span>{verifiedCount} verified</span>
                  </span>
                </p>
              ) : (
                <p className="text-[12px] text-[#5B6478]">{tile.caption}</p>
              )}
            </div>
          </motion.article>
        );
      })}

      {/* ROW C1: Featured Scientific Investigation (8 cols) */}
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.36, ease: [0.16, 1, 0.3, 1] }}
        className="col-span-12 lg:col-span-8 rounded-[28px] bg-[#FBFAF6] border border-[#E6E0D2] p-6 sm:p-7 shadow-[0_20px_50px_rgba(19,29,56,0.08)]"
      >
        <div className="grid grid-cols-1 md:grid-cols-12 gap-7 items-stretch">
          {/* Left 45% (5 cols): Sahel Study Box Map + Prepared case study circular badge */}
          <div className="md:col-span-5 relative flex flex-col">
            <div className="relative flex-1 min-h-[250px] rounded-[22px] bg-[#131D38] p-4 flex flex-col justify-between overflow-hidden">
              {/* Circular navy overlapping badge */}
              <div className="inline-flex items-center gap-2 self-start rounded-full bg-[#0B1224]/90 border border-[#f4f1ea]/15 px-3 py-1.5 text-[#f4f1ea]">
                <Star className="w-3.5 h-3.5 text-[#ffc20d] fill-[#ffc20d]" />
                <span className="font-mono text-[10px] uppercase tracking-wider">
                  Prepared case study
                </span>
              </div>

              {/* Real map of the Western Sahel study box (10°N–20°N, 18°W–20°E) */}
              <div className="my-2">
                <StudyAreaMap
                  aspect="320 / 200"
                  showZoom={false}
                  label="PROVISIONAL BOUNDARY · 10°N–20°N"
                  boxes={[
                    {
                      id: 'featured-sahel',
                      bounds: { north: 20, south: 10, west: -18, east: 20 },
                      dashArray: '6 4',
                    },
                  ]}
                />
              </div>

              <div className="flex items-center justify-between font-mono text-[10px] text-[#A9B1C6]">
                <span>18°W–20°E</span>
                <span>Provisional until verified</span>
              </div>
            </div>
          </div>

          {/* Right 55% (7 cols) */}
          <div className="md:col-span-7 flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5B6478]">
                  FEATURED INVESTIGATION
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#131D38] text-[#ffc20d] font-mono text-[10px] uppercase tracking-wider">
                  DATASET: {featuredDatasetStatus.toUpperCase()}
                </span>
              </div>

              <h2 className="mt-2.5 font-display text-[24px] sm:text-[28px] font-semibold leading-[1.15] tracking-tight text-[#131D38]">
                Western Sahel rainfall, 2001–2025
              </h2>

              <div className="mt-3 flex flex-wrap gap-2">
                {['2001–2025', 'June–September', 'GPM IMERG Final V07'].map((chip) => (
                  <span
                    key={chip}
                    className="px-3 py-1 rounded-full bg-[#f4f1ea] border border-[#E6E0D2] font-mono text-[11px] text-[#131D38] tabular-nums"
                  >
                    {chip}
                  </span>
                ))}
              </div>

              {/* Detected-trend mini panel */}
              <div className="mt-5 rounded-[20px] bg-[#f4f1ea] border border-[#E6E0D2] p-4">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[#5B6478]">
                    Detected trend (Placeholder pending verification)
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <svg
                    viewBox="0 0 180 42"
                    className="w-40 h-10 shrink-0"
                    role="img"
                    aria-label="Placeholder rainfall sparkline"
                  >
                    <path
                      d="M4 32 L26 27 L48 30 L70 21 L92 25 L114 16 L136 18 L158 11 L176 9"
                      fill="none"
                      stroke="#4FB3A9"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    <path
                      d="M114 16 L136 18 L158 11 L176 9"
                      fill="none"
                      stroke="#ffc20d"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                  </svg>

                  <div className="grid grid-cols-2 gap-4 flex-1 text-[13px]">
                    <div>
                      <div className="font-mono text-[10px] uppercase text-[#5B6478]">
                        Sen’s slope
                      </div>
                      <div className="font-mono font-medium text-[#131D38] tabular-nums">
                        — mm/yr
                      </div>
                    </div>
                    <div>
                      <div className="font-mono text-[10px] uppercase text-[#5B6478]">
                        Significance
                      </div>
                      <div className="font-mono font-medium text-[#131D38] tabular-nums">—</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-5">
              <button
                type="button"
                onClick={() =>
                  featuredInv ? onOpenInvestigation(featuredInv) : onLoadSahelCaseStudy()
                }
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#ffc20d] text-[#131D38] text-[14px] font-semibold hover:bg-[#eab006] transition-colors cursor-pointer"
              >
                <span>Explore investigation</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={onReadMethod}
                className="text-[14px] font-semibold text-[#131D38] hover:text-[#5B6478] underline-offset-4 hover:underline transition-colors cursor-pointer"
              >
                Read the method →
              </button>
            </div>
          </div>
        </div>
      </motion.section>

      {/* ROW C2: Investigation Workflow Overview (4 cols) */}
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.42, ease: [0.16, 1, 0.3, 1] }}
        className="col-span-12 lg:col-span-4 rounded-[28px] bg-[#FBFAF6] border border-[#E6E0D2] p-6 shadow-[0_20px_50px_rgba(19,29,56,0.08)] flex flex-col justify-between"
      >
        <div>
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-[17px] font-semibold text-[#131D38]">
              Investigation workflow
            </h2>
            {investigations.length > 0 && (
              <select
                aria-label="Select investigation for workflow"
                value={workflowInv?.id ?? ''}
                onChange={(e) => setWorkflowInvId(e.target.value)}
                className="max-w-[140px] truncate rounded-full bg-[#f4f1ea] border border-[#E6E0D2] px-3 py-1 text-[11px] font-medium text-[#131D38] focus:outline-none cursor-pointer"
              >
                {investigations.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.title}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Stepper: vertical on desktop (lg+), horizontal on <=1024px */}
          <ol className="mt-5 grid grid-cols-5 lg:grid-cols-1 gap-2 lg:gap-3.5 relative">
            {WORKFLOW_LAYERS.map((layer, index) => {
              const isDone = index < activeStage;
              const isCurrent = index === activeStage;
              return (
                <li
                  key={layer.id}
                  aria-label={
                    isCurrent
                      ? `Step ${index + 1} of 5, current: ${layer.title}`
                      : `Step ${index + 1} of 5: ${layer.title}`
                  }
                  className="relative flex flex-col lg:flex-row items-center lg:items-start text-center lg:text-left gap-2 lg:gap-3.5"
                >
                  {/* Thin connecting line (desktop vertical) */}
                  {index < WORKFLOW_LAYERS.length - 1 && (
                    <span
                      aria-hidden="true"
                      className="hidden lg:block absolute left-[11px] top-6 bottom-[-14px] w-px bg-[#E6E0D2]"
                    />
                  )}

                  {/* Circle marker */}
                  <span
                    className={`relative z-10 w-6 h-6 rounded-full inline-flex items-center justify-center shrink-0 ${
                      isDone
                        ? 'bg-[#ffc20d] text-[#131D38]'
                        : isCurrent
                          ? 'bg-[#FBFAF6] border-2 border-[#ffc20d] shadow-[0_0_0_4px_rgba(255,194,13,0.2)]'
                          : 'bg-[#FBFAF6] border-2 border-[#E6E0D2]'
                    }`}
                  >
                    {isDone && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                    {isCurrent && (
                      <span className="w-2 h-2 rounded-full bg-[#ffc20d] motion-safe:animate-pulse" />
                    )}
                  </span>

                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold text-[#131D38] leading-tight">
                      {layer.title}
                    </div>
                    <div className="hidden lg:block text-[12px] text-[#5B6478] mt-0.5">
                      {layer.question}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        {/* Hatched amber progress bar */}
        <div className="mt-6 pt-4 border-t border-[#E6E0D2]">
          <div className="flex items-center justify-between text-[11px] font-mono uppercase text-[#131D38] mb-2">
            <span>Progress</span>
            <span className="tabular-nums">{activeStage + 1} of 5 layers</span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-[#E6E0D2] overflow-hidden">
            <div
              className="h-full rounded-full bg-hatched-amber transition-all duration-500"
              style={{ width: `${((activeStage + 1) / 5) * 100}%` }}
            />
          </div>
          <p className="mt-2.5 text-[11px] text-[#5B6478]">
            Layers 4–5 are conditional scenarios, never forecasts.
          </p>
        </div>
      </motion.section>

      {/* ROW D: Recent Investigations (12 cols) */}
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.48, ease: [0.16, 1, 0.3, 1] }}
        className="col-span-12"
      >
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-4">
            <h2 className="font-display text-[20px] font-semibold text-[#131D38]">
              Recent investigations
            </h2>
            <button
              type="button"
              onClick={onViewAllInvestigations}
              className="text-[13px] font-semibold text-[#5B6478] hover:text-[#131D38] underline-offset-4 hover:underline cursor-pointer"
            >
              View all
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <button
              type="button"
              onClick={() => recentScrollRef.current?.scrollBy({ left: -300, behavior: 'smooth' })}
              aria-label="Scroll investigations left"
              className="w-9 h-9 rounded-full bg-[#FBFAF6] border border-[#E6E0D2] inline-flex items-center justify-center text-[#131D38] hover:bg-white cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => recentScrollRef.current?.scrollBy({ left: 300, behavior: 'smooth' })}
              aria-label="Scroll investigations right"
              className="w-9 h-9 rounded-full bg-[#FBFAF6] border border-[#E6E0D2] inline-flex items-center justify-center text-[#131D38] hover:bg-white cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Empty State */}
        {investigations.length === 0 ? (
          <div className="rounded-[28px] bg-[#FBFAF6] border border-[#E6E0D2] p-10 text-center shadow-[0_20px_50px_rgba(19,29,56,0.06)]">
            <div className="mx-auto w-20 h-20 rounded-full bg-[#f4f1ea] border border-[#E6E0D2] flex items-center justify-center text-[#131D38]">
              <Globe2 className="w-9 h-9 text-[#4FB3A9]" />
            </div>
            <p className="mt-4 font-display text-[18px] font-semibold text-[#131D38]">
              No investigations yet.
            </p>
            <p className="mt-1.5 text-[14px] text-[#5B6478]">
              Start with the Sahel case study or create your own.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={onLoadSahelCaseStudy}
                className="px-6 py-3 rounded-full bg-[#ffc20d] text-[#131D38] text-[14px] font-semibold hover:bg-[#eab006] transition-colors cursor-pointer"
              >
                Load Sahel case study
              </button>
              <button
                type="button"
                onClick={onNewInvestigation}
                className="px-6 py-3 rounded-full border border-[#131D38]/25 text-[#131D38] text-[14px] font-semibold hover:bg-[#131D38] hover:text-[#f4f1ea] transition-colors cursor-pointer"
              >
                Create your own
              </button>
            </div>
          </div>
        ) : (
          <div
            ref={recentScrollRef}
            className="flex sm:grid sm:grid-cols-2 xl:grid-cols-4 gap-5 overflow-x-auto sm:overflow-visible snap-x snap-mandatory pb-2 sm:pb-0"
          >
            {investigations.slice(0, 3).map((inv) => {
              const stageName = WORKFLOW_LAYERS[inv.stageIndex]?.title ?? 'Detect';
              const isRenaming = renamingId === inv.id;

              return (
                <article
                  key={inv.id}
                  onClick={() => {
                    if (!isRenaming && openMenuId !== inv.id) {
                      onOpenInvestigation(inv);
                    }
                  }}
                  className="snap-start shrink-0 w-[82vw] sm:w-auto relative rounded-[28px] bg-[#FBFAF6] border border-[#E6E0D2] p-4 shadow-[0_20px_50px_rgba(19,29,56,0.06)] hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(19,29,56,0.11)] transition-all duration-200 flex flex-col justify-between cursor-pointer"
                >
                  <div>
                    {/* Map thumbnail */}
                    <div className="relative h-28 rounded-[20px] overflow-hidden border border-[#E6E0D2]">
                      <MiniMapThumb investigation={inv} />
                      <span className="absolute top-2.5 left-2.5 w-8 h-8 rounded-full bg-[#131D38]/90 text-[#4FB3A9] inline-flex items-center justify-center border border-[#f4f1ea]/15">
                        <VariableIcon variable={inv.variable} />
                      </span>
                    </div>

                    <div className="mt-4 px-1">
                      <div className="flex items-start justify-between gap-2">
                        {isRenaming ? (
                          <form
                            onClick={(e) => e.stopPropagation()}
                            onSubmit={(e) => {
                              e.preventDefault();
                              if (renameDraft.trim()) {
                                onRenameInvestigation(inv.id, renameDraft.trim());
                              }
                              setRenamingId(null);
                            }}
                            className="flex-1 flex items-center gap-1.5"
                          >
                            <input
                              type="text"
                              autoFocus
                              value={renameDraft}
                              onChange={(e) => setRenameDraft(e.target.value)}
                              className="w-full rounded-lg border border-[#131D38] bg-white px-2.5 py-1 text-[14px] font-semibold text-[#131D38]"
                            />
                            <button
                              type="submit"
                              className="px-2.5 py-1 rounded-lg bg-[#131D38] text-[#f4f1ea] text-[12px] cursor-pointer"
                            >
                              Save
                            </button>
                          </form>
                        ) : (
                          <h3 className="font-display text-[17px] font-semibold text-[#131D38] leading-snug line-clamp-2">
                            {inv.title}
                          </h3>
                        )}

                        <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => setOpenMenuId(openMenuId === inv.id ? null : inv.id)}
                            aria-label={`Actions for ${inv.title}`}
                            className="w-8 h-8 rounded-full hover:bg-[#f4f1ea] inline-flex items-center justify-center text-[#5B6478] cursor-pointer"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>

                          {openMenuId === inv.id && (
                            <div className="absolute right-0 mt-1 w-40 rounded-[18px] bg-white border border-[#E6E0D2] shadow-instrument p-1.5 z-20 text-[13px]">
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  setRenameDraft(inv.title);
                                  setRenamingId(inv.id);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 rounded-[12px] hover:bg-[#f4f1ea] text-[#131D38] cursor-pointer"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                                <span>Rename</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  onDuplicateInvestigation(inv.id);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 rounded-[12px] hover:bg-[#f4f1ea] text-[#131D38] cursor-pointer"
                              >
                                <Copy className="w-3.5 h-3.5" />
                                <span>Duplicate</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  onDeleteInvestigation(inv.id);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 rounded-[12px] hover:bg-[#FF7A6B]/15 text-[#991B1B] cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      <p className="mt-1 text-[13px] text-[#5B6478] tabular-nums">
                        {inv.region} · {inv.period}
                      </p>

                      <div className="mt-3 flex items-center justify-between gap-2">
                        <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#4FB3A9]/15 text-[#131D38] text-[12px] font-medium">
                          {inv.variable}
                        </span>

                        <div className="flex items-center gap-1.5">
                          <div className="flex items-center gap-1" aria-hidden="true">
                            {[0, 1, 2, 3, 4].map((dot) => (
                              <span
                                key={dot}
                                className={`w-1.5 h-1.5 rounded-full ${
                                  dot === inv.stageIndex
                                    ? 'bg-[#ffc20d]'
                                    : dot < inv.stageIndex
                                      ? 'bg-[#131D38]'
                                      : 'bg-[#E6E0D2]'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="font-mono text-[10px] uppercase text-[#5B6478]">
                            {stageName}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 px-1 pt-3 border-t border-[#E6E0D2]">
                    <p className="text-[12px] text-[#5B6478] mb-3">{inv.updatedLabel}</p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenInvestigation(inv);
                      }}
                      className="w-full py-2.5 rounded-full border border-[#131D38] text-[#131D38] text-[13px] font-semibold hover:bg-[#131D38] hover:text-[#f4f1ea] transition-colors cursor-pointer"
                    >
                      Continue investigation
                    </button>
                  </div>
                </article>
              );
            })}

            {/* Dashed New Investigation Card */}
            <button
              type="button"
              onClick={onNewInvestigation}
              className="snap-start shrink-0 w-[82vw] sm:w-auto min-h-[290px] rounded-[28px] border-2 border-dashed border-[#131D38]/20 bg-[#f4f1ea]/50 hover:bg-[#FBFAF6] hover:border-[#131D38]/40 p-6 flex flex-col items-center justify-center text-center gap-3 transition-all cursor-pointer group"
            >
              <span className="w-12 h-12 rounded-full bg-[#ffc20d] text-[#131D38] inline-flex items-center justify-center group-hover:scale-105 transition-transform">
                <Plus className="w-5 h-5" />
              </span>
              <div>
                <div className="font-display text-[16px] font-semibold text-[#131D38]">
                  New investigation
                </div>
                <p className="mt-1 text-[13px] text-[#5B6478] max-w-[190px]">
                  Pick a region, NASA variable, and observation window.
                </p>
              </div>
              <span className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-wider text-[#5B6478]">
                <Sparkles className="w-3.5 h-3.5" />
                <span>5-layer setup</span>
              </span>
            </button>
          </div>
        )}
      </motion.section>
    </div>
  );
}
