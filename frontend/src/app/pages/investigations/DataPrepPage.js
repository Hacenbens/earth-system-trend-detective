'use client';

import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  Grid,
  RefreshCw,
  ShieldCheck,
  Table,
} from 'lucide-react';
import { getInvestigationBounds } from '@/app/api/regionBounds';
import { StudyAreaMap } from '@/app/pages/investigations/StudyAreaMap';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const PIPELINE_STEPS = [
  {
    id: 'acquire',
    label: 'Acquire',
    summary: '312 monthly / orbital granules indexed from NASA GES DISC & LP DAAC endpoints.',
    duration: '1.8s (indexed)',
  },
  {
    id: 'inspect',
    label: 'Inspect',
    summary:
      'Verified CF-1.8 metadata headers, coordinate bounding arrays, and _FillValue sentinels.',
    duration: '0.4s',
  },
  {
    id: 'clip',
    label: 'Clip',
    summary:
      'Subset spatial grid cleanly to investigation bounding box without edge extrapolation.',
    duration: '0.7s',
  },
  {
    id: 'qc',
    label: 'Quality control',
    summary: 'Flagged MODIS NDVI 2001–2002 missing cells and EarthCARE post-2024 constraint.',
    duration: '0.9s',
  },
  {
    id: 'harmonize',
    label: 'Harmonize',
    summary:
      'Aligned calendars to Gregorian monthly/daily frames; native spatial resolution preserved.',
    duration: '0.6s',
  },
  {
    id: 'aggregate',
    label: 'Aggregate',
    summary: 'Prepared seasonal June–September windows while preserving gaps as NaN (never zero).',
    duration: '0.5s',
  },
  {
    id: 'ready',
    label: 'Ready',
    summary:
      'Dataset bundle staged for Layer 01 (Detect) once researcher acknowledges quality warnings.',
    duration: 'Gate open',
  },
];

const OPERATIONS_LOG = [
  {
    ts: '14:12:04 UTC',
    step: 'Acquire',
    target: 'GPM_3IMERGM V07B',
    result: '312 / 312 files indexed',
    status: 'Passed',
  },
  {
    ts: '14:12:06 UTC',
    step: 'Acquire',
    target: 'MERRA-2 M2TMNXFLX',
    result: '312 / 312 files indexed',
    status: 'Passed',
  },
  {
    ts: '14:12:08 UTC',
    step: 'Inspect',
    target: 'MODIS MYD13C2 Col 6.1',
    result: 'Missing 2001–2002 Aqua overlap flagged',
    status: 'Warning',
  },
  {
    ts: '14:12:09 UTC',
    step: 'Quality control',
    target: 'EarthCARE CPR / ATLID',
    result: 'Record starts May 2024 · excluded from trends',
    status: 'Warning',
  },
  {
    ts: '14:12:11 UTC',
    step: 'Harmonize',
    target: 'Sahel study box mask',
    result: '10°N–20°N, 18°W–20°E aligned',
    status: 'Passed',
  },
  {
    ts: '14:12:12 UTC',
    step: 'Aggregate',
    target: 'JJAS seasonal mask',
    result: 'Missing cells retained as NaN',
    status: 'Passed',
  },
];

// 8 × 3 completeness grid laid over the real study box (north row first)
const GRID_COLS = 8;
const GRID_ROWS = 3;

function formatLat(v) {
  return `${Math.abs(v).toFixed(1)}°${v >= 0 ? 'N' : 'S'}`;
}
function formatLon(v) {
  return `${Math.abs(v).toFixed(1)}°${v >= 0 ? 'E' : 'W'}`;
}

function coverageCells(b, datasetId) {
  const dLat = (b.north - b.south) / GRID_ROWS;
  const dLon = (b.east - b.west) / GRID_COLS;
  const inset = 0.08; // small gap between cells
  const cells = [];
  for (let col = 0; col < GRID_COLS; col++) {
    for (let row = 0; row < GRID_ROWS; row++) {
      const north = b.north - row * dLat;
      const west = b.west + col * dLon;
      const isGap = datasetId === 'modis-aod-ndvi' && col === 2 && row === 0;
      const isOrbital = datasetId.startsWith('earthcare') && col % 3 !== 1;
      cells.push({
        key: `${col}-${row}`,
        bounds: {
          north: north - dLat * inset,
          south: north - dLat * (1 - inset),
          west: west + dLon * inset,
          east: west + dLon * (1 - inset),
        },
        lat: formatLat(north - dLat / 2),
        lon: formatLon(west + dLon / 2),
        pct: isGap ? '76% (cloud/dust mask)' : isOrbital ? 'Nadir swath only' : '99.4% complete',
        fill: isGap ? '#FF7A6B' : isOrbital ? '#1E2B52' : '#4FB3A9',
        opacity: isGap ? 0.85 : isOrbital ? 0.5 : 0.65,
      });
    }
  }
  return cells;
}

export function DataPrepPage({
  investigation,
  datasets,
  onUpdateInvestigation,
  onUpdateDatasetStatus,
  onOpenDatasetDetail,
  onContinueToDetect,
  onShowToast,
}) {
  const startY = investigation.startYear ?? 2001;
  const endY = investigation.endYear ?? 2025;
  const activeMonths = investigation.months ?? [5, 6, 7, 8];

  const [ndviSkipped, setNdviSkipped] = useState(false);
  const [showGapDetails, setShowGapDetails] = useState(false);
  const [checkingAcquisition, setCheckingAcquisition] = useState(false);
  const [resolutionMode, setResolutionMode] = useState(
    investigation.extremesEnabled ? 'daily' : 'monthly'
  );
  const [heatmapView, setHeatmapView] = useState('grid');
  const [hoveredCell, setHoveredCell] = useState(null);
  const [selectedMapDataset, setSelectedMapDataset] = useState('gpm-imerg-v07');
  const [hoveredMapCell, setHoveredMapCell] = useState(null);
  const coverageBounds = getInvestigationBounds(investigation);
  const [useCommonPeriod, setUseCommonPeriod] = useState(false);
  const [activePipelineIdx, setActivePipelineIdx] = useState(6);
  const [showOpsLog, setShowOpsLog] = useState(false);
  const [gateChecked, setGateChecked] = useState(Boolean(investigation.dataGatePassed));

  // Derive selected dataset objects for this investigation
  const activeDatasets = useMemo(() => {
    const primary = datasets.find((d) => d.name === investigation.dataset) ?? datasets[0];
    const supportingIds = investigation.supportingDatasets ?? [
      'merra2-reanalysis',
      'modis-aod-ndvi',
    ];
    const list = [primary];
    datasets.forEach((ds) => {
      if (ds.id !== primary.id && (supportingIds.includes(ds.id) || ds.roleType === 'case_study')) {
        list.push(ds);
      }
    });
    return list;
  }, [datasets, investigation.dataset, investigation.supportingDatasets]);

  // Years array for heatmap (capped nicely for visibility)
  const yearsList = useMemo(() => {
    const yrs = [];
    const s = Math.max(2000, startY);
    const e = Math.min(2026, endY);
    for (let y = s; y <= e; y++) yrs.push(y);
    return yrs;
  }, [startY, endY]);

  // Deterministic completeness per year/month showing honest 2001-2002 NDVI gap and sporadic dust cloud gaps
  const getCellCompleteness = (year, monthIdx) => {
    if (!ndviSkipped && (year === 2001 || year === 2002) && monthIdx >= 3 && monthIdx <= 9) {
      return 0; // MODIS Aqua NDVI pre-launch / calibration gap
    }
    if ((year === 2012 || year === 2019) && monthIdx === 7) return 82; // Thick convective dust cloud occlusion
    if (year === 2025 && monthIdx >= 10) return 64; // Late-year latency
    return 98;
  };

  const hasEarlyModisGap = !ndviSkipped && startY <= 2002;
  const commonStart = Math.max(startY, hasEarlyModisGap ? 2003 : startY);
  const commonEnd = Math.min(endY, 2025);

  const handleRunAcquisitionCheck = () => {
    setCheckingAcquisition(true);
    window.setTimeout(() => {
      setCheckingAcquisition(false);
      onShowToast(
        'Acquisition check completed: 312 GPM IMERG and 312 MERRA-2 granules verified; MODIS 2001–2002 gap flagged.'
      );
    }, 650);
  };

  const handleSwitchToCommonPeriod = () => {
    onUpdateInvestigation({
      startYear: commonStart,
      endYear: commonEnd,
      period: `${commonStart}–${commonEnd}`,
      updatedLabel: 'Updated just now',
    });
    onShowToast(
      `Investigation period updated to ${commonStart}–${commonEnd} (common period across selected datasets).`
    );
  };

  const handleExportLogCsv = () => {
    const header = 'Timestamp,Step,Target,Result,Status\n';
    const rows = OPERATIONS_LOG.map(
      (r) => `"${r.ts}","${r.step}","${r.target}","${r.result}","${r.status}"`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${investigation.id}-preparation-log.csv`;
    a.click();
    URL.revokeObjectURL(url);
    onShowToast('Preparation operations log exported as CSV.');
  };

  const handleContinue = () => {
    if (!gateChecked) return;
    onUpdateInvestigation({
      dataGatePassed: true,
      extremesEnabled: resolutionMode === 'daily',
      updatedLabel: 'Updated just now',
    });
    onContinueToDetect();
  };

  return (
    <div className="space-y-6 pb-24">
      {/* 1. Persistent Alert Zone */}
      <section className="rounded-[28px] bg-[#FBFAF6] border-2 border-[#FF7A6B]/55 p-6 shadow-[0_20px_50px_rgba(19,29,56,0.08)]">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-[16px] bg-[#FF7A6B]/15 text-[#991B1B] inline-flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#FF7A6B]/20 text-[#991B1B] font-semibold">
                  DATA QUALITY TRUST GATE
                </span>
                <span className="font-mono text-[11px] text-[#5B6478]">
                  Missing data stay missing, they are never replaced by zero.
                </span>
              </div>
              <h2 className="mt-2 font-display text-[19px] font-semibold text-[#131D38]">
                {hasEarlyModisGap
                  ? 'MODIS NDVI is unavailable for 2001–2002 in this region'
                  : ndviSkipped
                    ? 'Running rainfall & atmospheric stack without 2001–2002 MODIS NDVI'
                    : 'Period aligned cleanly to common 2003–2025 coverage'}
              </h2>
              <p className="mt-1 text-[14px] text-[#5B6478] max-w-3xl leading-[1.55]">
                Combined MODIS Aqua MYD13C2 vegetation coverage begins reliably after July 2002.
                Choose whether to align the period to {commonStart}–{commonEnd}, omit NDVI for early
                years, or keep missing values explicitly masked as NaN.
              </p>

              {showGapDetails && (
                <div className="mt-3 p-4 rounded-[18px] bg-[#f4f1ea] border border-[#E6E0D2] text-[13px] text-[#131D38] space-y-1.5">
                  <p>
                    <strong>1. MODIS NDVI (2001–2002):</strong> Aqua spacecraft launched May 2002;
                    pre-launch Aqua months cannot be interpolated with zeros without biasing Sen’s
                    slope artificially upward.
                  </p>
                  <p>
                    <strong>2. EarthCARE CPR & ATLID (2024+):</strong> ESA/JAXA EarthCARE launched
                    May 2024; kept strictly in a separate contemporary process lane and excluded
                    from multi-decadal trend regressions.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {hasEarlyModisGap && (
              <>
                <button
                  type="button"
                  onClick={handleSwitchToCommonPeriod}
                  className="px-4 py-2 rounded-full bg-[#131D38] text-[#f4f1ea] text-[12px] font-semibold hover:bg-[#1E2B52] transition-colors cursor-pointer"
                >
                  Change period ({commonStart}–{commonEnd})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNdviSkipped(true);
                    onShowToast('MODIS NDVI masked as optional for 2001–2002.');
                  }}
                  className="px-4 py-2 rounded-full border border-[#131D38]/25 bg-white text-[#131D38] text-[12px] font-semibold hover:bg-[#f4f1ea] transition-colors cursor-pointer"
                >
                  Continue without NDVI
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => setShowGapDetails((v) => !v)}
              className="px-4 py-2 rounded-full border border-[#E6E0D2] bg-[#f4f1ea] text-[#131D38] text-[12px] font-medium hover:bg-white transition-colors cursor-pointer"
            >
              {showGapDetails ? 'Hide details' : 'View details'}
            </button>
          </div>
        </div>
      </section>

      {/* 2. Selected Datasets Row */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5B6478]">
              SELECTED DATA INVENTORY
            </p>
            <h2 className="font-display text-[20px] font-semibold text-[#131D38]">
              Datasets & acquisition readiness ({activeDatasets.length})
            </h2>
          </div>

          <button
            type="button"
            onClick={handleRunAcquisitionCheck}
            disabled={checkingAcquisition}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#131D38] text-[#f4f1ea] text-[13px] font-semibold hover:bg-[#1E2B52] disabled:opacity-60 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checkingAcquisition ? 'animate-spin' : ''}`} />
            <span>{checkingAcquisition ? 'Checking endpoints…' : 'Run acquisition check'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {activeDatasets.map((ds) => {
            const isCaseStudy = ds.roleType === 'case_study';
            const filesCount = isCaseStudy ? '42 of 42 swaths' : '312 of 312 opened';
            const qcWarning = ds.id === 'modis-aod-ndvi' || isCaseStudy;
            return (
              <article
                key={ds.id}
                className="rounded-[26px] bg-[#FBFAF6] border border-[#E6E0D2] p-5 shadow-[0_14px_34px_rgba(19,29,56,0.05)] flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#f4f1ea] border border-[#E6E0D2] text-[#131D38]">
                      {ds.agency} · {isCaseStudy ? '2024+ CASE STUDY' : ds.role}
                    </span>
                    <select
                      aria-label={`Audit status for ${ds.name}`}
                      value={ds.status}
                      onChange={(e) => onUpdateDatasetStatus(ds.id, e.target.value)}
                      className="px-3 py-1 rounded-full bg-[#131D38] text-[#ffc20d] font-mono text-[10px] uppercase cursor-pointer focus:outline-none"
                    >
                      {['Candidate', 'Acquired', 'Verified', 'Used'].map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>

                  <h3 className="mt-3 font-display text-[17px] font-semibold text-[#131D38]">
                    {ds.name}
                  </h3>
                  <p className="mt-0.5 font-mono text-[11px] text-[#5B6478]">{ds.product}</p>

                  <div className="mt-3 flex flex-wrap gap-2 text-[12px]">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#4FB3A9]/15 text-[#131D38] font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#131D38]" />
                      Files: {filesCount}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-[10px] uppercase ${
                        qcWarning
                          ? 'bg-[#FF7A6B]/15 text-[#991B1B]'
                          : 'bg-[#f4f1ea] border border-[#E6E0D2] text-[#131D38]'
                      }`}
                    >
                      {qcWarning ? 'QC: 1 Warning' : 'QC: Passed'}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#E6E0D2] flex items-center justify-between text-[12px]">
                  <span className="text-[#5B6478] tabular-nums">
                    {ds.coverageStart}–{ds.coverageEnd}
                  </span>
                  <button
                    type="button"
                    onClick={() => onOpenDatasetDetail(ds)}
                    className="font-semibold text-[#131D38] hover:underline underline-offset-4 cursor-pointer"
                  >
                    Inspect provenance →
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* 3. Gantt Timeline + Geographic Coverage Map */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Gantt Coverage Timeline (7 cols) */}
        <section className="xl:col-span-7 rounded-[28px] bg-[#FBFAF6] border border-[#E6E0D2] p-6 shadow-[0_20px_50px_rgba(19,29,56,0.06)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5B6478]">
                TEMPORAL COVERAGE GANTT (2000–2026)
              </p>
              <h2 className="mt-1 font-display text-[19px] font-semibold text-[#131D38]">
                Archive spans & common period bracket
              </h2>
            </div>
            <span className="px-3 py-1 rounded-full bg-[#131D38] text-[#ffc20d] font-mono text-[10px] uppercase">
              Common period: {commonStart}–{commonEnd}
            </span>
          </div>

          <div className="mt-5 space-y-4">
            {/* Axis labels */}
            <div className="flex justify-between pl-[150px] font-mono text-[10px] text-[#5B6478] tabular-nums">
              <span>2000</span>
              <span>2005</span>
              <span>2010</span>
              <span>2015</span>
              <span>2020</span>
              <span>2026</span>
            </div>

            {activeDatasets.map((ds) => {
              const isCaseStudy = ds.roleType === 'case_study';
              const leftPct = Math.max(0, ((Math.max(2000, ds.coverageStart) - 2000) / 26) * 100);
              const widthPct = Math.min(
                100 - leftPct,
                ((ds.coverageEnd - Math.max(2000, ds.coverageStart)) / 26) * 100
              );
              const selLeft = ((startY - 2000) / 26) * 100;
              const selWidth = ((endY - startY) / 26) * 100;

              return (
                <div key={ds.id} className="flex items-center gap-3">
                  <div className="w-[140px] shrink-0">
                    <div className="text-[12px] font-semibold text-[#131D38] truncate">
                      {ds.name}
                    </div>
                    <div className="font-mono text-[10px] text-[#5B6478]">
                      {isCaseStudy ? 'ESA/JAXA 2024+' : `${ds.coverageStart}–${ds.coverageEnd}`}
                    </div>
                  </div>
                  <div className="relative flex-1 h-7 rounded-full bg-[#f4f1ea] border border-[#E6E0D2] overflow-hidden">
                    {/* Selected window band */}
                    {!isCaseStudy && (
                      <div
                        className="absolute inset-y-0 bg-[#ffc20d]/25 border-x border-[#ffc20d]"
                        style={{ left: `${selLeft}%`, width: `${selWidth}%` }}
                        title={`Selected period ${startY}–${endY}`}
                      />
                    )}

                    {/* Coverage bar */}
                    <div
                      className={`absolute top-1.5 bottom-1.5 rounded-full ${
                        isCaseStudy ? 'bg-[#4FB3A9]' : 'bg-[#131D38]'
                      }`}
                      style={{ left: `${leftPct}%`, width: `${Math.max(6, widthPct)}%` }}
                    />

                    {/* Coral hatched gap for MODIS 2001-2002 */}
                    {ds.id === 'modis-aod-ndvi' && !ndviSkipped && (
                      <div
                        className="absolute top-1.5 bottom-1.5 rounded-l-full bg-[#FF7A6B]"
                        style={{
                          left: `${((2001 - 2000) / 26) * 100}%`,
                          width: `${(2 / 26) * 100}%`,
                          backgroundImage:
                            'repeating-linear-gradient(45deg, #FF7A6B, #FF7A6B 3px, #131D38 3px, #131D38 5px)',
                        }}
                        title="MODIS Aqua NDVI missing 2001–2002"
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 pt-4 border-t border-[#E6E0D2] flex flex-wrap items-center gap-4 text-[11px] font-mono text-[#5B6478]">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-2 rounded-full bg-[#131D38]" /> NASA archive span
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-2 rounded-full bg-[#ffc20d]" /> Investigation window
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-2 rounded-full bg-[#FF7A6B]" /> Missing / incomplete gap
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-2 rounded-full bg-[#4FB3A9]" /> EarthCARE 2024+ case study lane
            </span>
          </div>
        </section>

        {/* Geographic Coverage Map (5 cols) */}
        <section className="xl:col-span-5 rounded-[28px] bg-[#131D38] text-[#f4f1ea] p-6 shadow-[0_20px_50px_rgba(19,29,56,0.12)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2">
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#ffc20d]">
                GEOGRAPHIC COVERAGE
              </p>
              <select
                aria-label="Inspect coverage map for dataset"
                value={selectedMapDataset}
                onChange={(e) => setSelectedMapDataset(e.target.value)}
                className="px-3 py-1 rounded-full bg-[#1E2B52] border border-[#f4f1ea]/15 text-[11px] text-[#f4f1ea] cursor-pointer focus:outline-none"
              >
                {activeDatasets.map((ds) => (
                  <option key={ds.id} value={ds.id}>
                    {ds.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-4 rounded-[20px] bg-[#0B1224] border border-[#f4f1ea]/10 p-3 relative">
              {coverageBounds ? (
                <StudyAreaMap
                  aspect="320 / 170"
                  boxes={[
                    ...coverageCells(coverageBounds, selectedMapDataset).map((cell) => {
                      const isHovered = hoveredMapCell?.key === cell.key;
                      return {
                        id: cell.key,
                        bounds: cell.bounds,
                        stroke: '#ffc20d',
                        weight: isHovered ? 1.6 : 0.7,
                        fill: cell.fill,
                        fillOpacity: isHovered ? 0.95 : cell.opacity,
                        onHover: (on) =>
                          setHoveredMapCell(
                            on
                              ? { key: cell.key, lat: cell.lat, lon: cell.lon, val: cell.pct }
                              : null
                          ),
                      };
                    }),
                    {
                      id: 'coverage-outline',
                      bounds: coverageBounds,
                      dashArray: '5 3',
                      weight: 1.8,
                      fillOpacity: 0,
                      interactive: false,
                    },
                  ]}
                />
              ) : (
                <svg
                  viewBox="0 0 320 170"
                  className="w-full h-auto"
                  role="img"
                  aria-label="Grid completeness map"
                >
                  <path
                    d="M40 20 L270 18 L295 72 L280 154 L190 154 L152 126 L90 128 L44 96 L35 60 Z"
                    fill="#1E2B52"
                    stroke="#f4f1ea"
                    strokeOpacity="0.2"
                  />
                  {/* Interactive grid cells across Sahel box */}
                  {Array.from({ length: 8 }).map((_, col) =>
                    Array.from({ length: 3 }).map((__, row) => {
                      const isGap =
                        selectedMapDataset === 'modis-aod-ndvi' && col === 2 && row === 0;
                      const isOrbital = selectedMapDataset.startsWith('earthcare') && col % 3 !== 1;
                      const lat = `${18 - row * 3}°N`;
                      const lon = `${-16 + col * 5}°`;
                      const pct = isGap
                        ? '76% (cloud/dust mask)'
                        : isOrbital
                          ? 'Nadir swath only'
                          : '99.4% complete';
                      return (
                        <rect
                          key={`${col}-${row}`}
                          x={52 + col * 26}
                          y={58 + row * 18}
                          width="24"
                          height="16"
                          rx="3"
                          fill={isGap ? '#FF7A6B' : isOrbital ? '#1E2B52' : '#4FB3A9'}
                          fillOpacity={isGap ? 0.85 : isOrbital ? 0.5 : 0.65}
                          stroke="#ffc20d"
                          strokeWidth="0.7"
                          className="cursor-pointer transition-opacity hover:opacity-100"
                          onMouseEnter={() => setHoveredMapCell({ lat, lon, val: pct })}
                          onMouseLeave={() => setHoveredMapCell(null)}
                        />
                      );
                    })
                  )}
                  <rect
                    x="50"
                    y="56"
                    width="210"
                    height="56"
                    fill="none"
                    stroke="#ffc20d"
                    strokeWidth="1.8"
                    strokeDasharray="5 3"
                  />
                </svg>
              )}

              <div className="mt-2 flex items-center justify-between font-mono text-[10px] text-[#A9B1C6]">
                <span>{investigation.coords}</span>
                <span>
                  {hoveredMapCell
                    ? `${hoveredMapCell.lat}, ${hoveredMapCell.lon} · ${hoveredMapCell.val}`
                    : 'Hover grid cell to inspect completeness'}
                </span>
              </div>
            </div>
          </div>

          <p className="mt-4 text-[12px] text-[#A9B1C6]">
            Resolution differences (0.1° IMERG vs 0.5° MERRA-2) are preserved without synthetic
            downscaling.
          </p>
        </section>
      </div>

      {/* 4. Variables & Units Table + Temporal Resolution Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-8 rounded-[28px] bg-[#FBFAF6] border border-[#E6E0D2] p-6 shadow-[0_20px_50px_rgba(19,29,56,0.06)]">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5B6478]">
            HARMONIZED SCHEMA
          </p>
          <h2 className="mt-1 font-display text-[19px] font-semibold text-[#131D38]">
            Variables & physical units
          </h2>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-[#E6E0D2] font-mono text-[10px] uppercase tracking-wider text-[#5B6478]">
                  <th className="py-2.5 pr-4">Variable</th>
                  <th className="py-2.5 pr-4">Units</th>
                  <th className="py-2.5 pr-4">Dataset</th>
                  <th className="py-2.5">Scientific role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6E0D2]">
                {[
                  {
                    v: 'precipitation',
                    u: 'mm/day · mm/season',
                    d: 'GPM IMERG V07',
                    r: 'Primary trend & Rx1day/R95p extremes',
                  },
                  {
                    v: 'QV850 / TQV',
                    u: 'kg/kg · kg/m²',
                    d: 'MERRA-2',
                    r: 'Low-level monsoon moisture supply',
                  },
                  {
                    v: 'U850 / OMEGA500',
                    u: 'm/s · Pa/s',
                    d: 'MERRA-2',
                    r: 'Jet shear & vertical ascent anomalies',
                  },
                  {
                    v: 'AOD_550 / NDVI',
                    u: 'unitless · -1 to 1',
                    d: 'MODIS Col. 6.1',
                    r: 'Dust loading & surface vegetation lag',
                  },
                ].map((row) => (
                  <tr key={row.v} className="hover:bg-[#f4f1ea]/60">
                    <td className="py-3 pr-4 font-mono font-semibold text-[#131D38]">{row.v}</td>
                    <td className="py-3 pr-4 font-mono text-[12px] text-[#5B6478]">{row.u}</td>
                    <td className="py-3 pr-4 text-[#131D38]">{row.d}</td>
                    <td className="py-3 text-[#5B6478]">{row.r}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="lg:col-span-4 rounded-[28px] bg-[#FBFAF6] border border-[#E6E0D2] p-6 shadow-[0_20px_50px_rgba(19,29,56,0.06)] flex flex-col justify-between">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5B6478]">
              TEMPORAL RESOLUTION
            </p>
            <h2 className="mt-1 font-display text-[19px] font-semibold text-[#131D38]">
              Aggregation cadence
            </h2>
            <div className="mt-4 inline-flex rounded-full bg-[#f4f1ea] border border-[#E6E0D2] p-1 w-full">
              <button
                type="button"
                onClick={() => setResolutionMode('daily')}
                className={`flex-1 py-2 rounded-full text-[13px] font-semibold transition-colors cursor-pointer ${
                  resolutionMode === 'daily'
                    ? 'bg-[#131D38] text-[#f4f1ea]'
                    : 'text-[#5B6478] hover:text-[#131D38]'
                }`}
              >
                Daily (Rx1day + Totals)
              </button>
              <button
                type="button"
                onClick={() => setResolutionMode('monthly')}
                className={`flex-1 py-2 rounded-full text-[13px] font-semibold transition-colors cursor-pointer ${
                  resolutionMode === 'monthly'
                    ? 'bg-[#131D38] text-[#f4f1ea]'
                    : 'text-[#5B6478] hover:text-[#131D38]'
                }`}
              >
                Monthly only
              </button>
            </div>

            {resolutionMode === 'monthly' ? (
              <div className="mt-4 p-4 rounded-[18px] bg-[#FF7A6B]/15 border border-[#FF7A6B]/40 text-[13px] text-[#991B1B]">
                <strong>Extreme indices unavailable:</strong> Monthly GPM_3IMERGM files cannot
                compute daily Rx1day, R95p, or consecutive dry days (CDD). Switch back to Daily to
                enable extremes.
              </div>
            ) : (
              <div className="mt-4 p-4 rounded-[18px] bg-[#4FB3A9]/15 border border-[#4FB3A9]/30 text-[13px] text-[#131D38]">
                Daily GPM_3IMERGDF V07B supports seasonal totals alongside extreme daily intensity
                (Rx1day, R95p, SDII) and CDD.
              </div>
            )}
          </div>
          <p className="mt-4 font-mono text-[11px] text-[#5B6478]">
            Season focus: {investigation.season}
          </p>
        </section>
      </div>

      {/* 5. Missing-Data Heatmap (Years x Months) + View as Table */}
      <section className="rounded-[28px] bg-[#FBFAF6] border border-[#E6E0D2] p-6 shadow-[0_20px_50px_rgba(19,29,56,0.06)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5B6478]">
              COMPLETENESS MATRIX ({yearsList[0]}–{yearsList[yearsList.length - 1]})
            </p>
            <h2 className="mt-1 font-display text-[19px] font-semibold text-[#131D38]">
              Monthly data completeness heatmap
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {hoveredCell && (
              <span className="px-3 py-1 rounded-full bg-[#131D38] text-[#f4f1ea] font-mono text-[11px] tabular-nums">
                {MONTHS[hoveredCell.month]} {hoveredCell.year}: {hoveredCell.pct}% valid
              </span>
            )}
            <div className="inline-flex rounded-full bg-[#f4f1ea] border border-[#E6E0D2] p-1">
              <button
                type="button"
                onClick={() => setHeatmapView('grid')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-semibold cursor-pointer ${
                  heatmapView === 'grid' ? 'bg-[#131D38] text-[#f4f1ea]' : 'text-[#5B6478]'
                }`}
              >
                <Grid className="w-3.5 h-3.5" />
                <span>Heatmap</span>
              </button>
              <button
                type="button"
                onClick={() => setHeatmapView('table')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-semibold cursor-pointer ${
                  heatmapView === 'table' ? 'bg-[#131D38] text-[#f4f1ea]' : 'text-[#5B6478]'
                }`}
              >
                <Table className="w-3.5 h-3.5" />
                <span>View as table</span>
              </button>
            </div>
          </div>
        </div>

        {heatmapView === 'grid' ? (
          <div className="mt-5 overflow-x-auto">
            <div className="min-w-[680px]">
              <div className="grid grid-cols-[64px_repeat(12,minmax(0,1fr))] gap-1.5 mb-1.5 font-mono text-[10px] uppercase text-[#5B6478] text-center">
                <div className="text-left">Year</div>
                {MONTHS.map((m, idx) => (
                  <div
                    key={m}
                    className={
                      activeMonths.includes(idx)
                        ? 'font-bold text-[#131D38] underline decoration-[#ffc20d] decoration-2 underline-offset-4'
                        : ''
                    }
                  >
                    {m}
                  </div>
                ))}
              </div>

              <div className="space-y-1">
                {yearsList.map((yr) => (
                  <div
                    key={yr}
                    className="grid grid-cols-[64px_repeat(12,minmax(0,1fr))] gap-1.5 items-center"
                  >
                    <div className="font-mono text-[11px] text-[#131D38] tabular-nums">{yr}</div>
                    {MONTHS.map((_, mIdx) => {
                      const pct = getCellCompleteness(yr, mIdx);
                      const isSeason = activeMonths.includes(mIdx);
                      const isMissing = pct === 0;
                      const isPartial = pct > 0 && pct < 95;
                      return (
                        <div
                          key={`${yr}-${mIdx}`}
                          onMouseEnter={() => setHoveredCell({ year: yr, month: mIdx, pct })}
                          onMouseLeave={() => setHoveredCell(null)}
                          title={`${MONTHS[mIdx]} ${yr}: ${pct}% completeness`}
                          className={`h-5 rounded-[5px] transition-transform hover:scale-105 ${
                            isSeason ? 'ring-1 ring-[#ffc20d]' : ''
                          }`}
                          style={{
                            backgroundColor: isMissing
                              ? '#FF7A6B'
                              : isPartial
                                ? '#2B3E70'
                                : '#131D38',
                            backgroundImage: isMissing
                              ? 'repeating-linear-gradient(45deg, #FF7A6B, #FF7A6B 3px, #f4f1ea 3px, #f4f1ea 5px)'
                              : undefined,
                          }}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-5 overflow-x-auto max-h-72 overflow-y-auto border border-[#E6E0D2] rounded-[18px]">
            <table className="w-full text-left border-collapse text-[12px]">
              <thead className="sticky top-0 bg-[#f4f1ea] border-b border-[#E6E0D2] font-mono text-[10px] uppercase text-[#5B6478]">
                <tr>
                  <th className="py-2.5 px-4">Year</th>
                  <th className="py-2.5 px-4">Season mean completeness</th>
                  <th className="py-2.5 px-4">Missing months</th>
                  <th className="py-2.5 px-4">Rule applied</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6E0D2]">
                {yearsList.map((yr) => {
                  const seasonVals = activeMonths.map((m) => getCellCompleteness(yr, m));
                  const avg = Math.round(seasonVals.reduce((a, b) => a + b, 0) / seasonVals.length);
                  const missingCount = seasonVals.filter((v) => v === 0).length;
                  return (
                    <tr key={yr} className="hover:bg-[#f4f1ea]/50">
                      <td className="py-2 px-4 font-mono font-semibold tabular-nums">{yr}</td>
                      <td className="py-2 px-4 font-mono tabular-nums">{avg}%</td>
                      <td className="py-2 px-4 font-mono tabular-nums">{missingCount}</td>
                      <td className="py-2 px-4 text-[#5B6478]">
                        {missingCount > 0
                          ? 'Preserved as NaN (no zero-fill)'
                          : 'Accepted for trend test'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-[#E6E0D2] flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono text-[#5B6478]">
          <div className="flex flex-wrap items-center gap-4">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-[#131D38]" /> &ge; 95% complete
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-[#2B3E70]" /> 50–94% partial
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-[#FF7A6B]" /> Missing (kept NaN)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded ring-2 ring-[#ffc20d]" /> Active season months
            </span>
          </div>
          <span>Rule: Never substitute missing values with 0 mm.</span>
        </div>
      </section>

      {/* 6. Quality Control Summary + Navy Common Period Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-7 rounded-[28px] bg-[#FBFAF6] border border-[#E6E0D2] p-6 shadow-[0_20px_50px_rgba(19,29,56,0.06)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5B6478]">
                QUALITY CONTROL SUMMARY
              </p>
              <h2 className="mt-1 font-display text-[19px] font-semibold text-[#131D38]">
                8 passed · {hasEarlyModisGap ? '2 warnings' : '1 warning'} · 0 failed
              </h2>
            </div>
            <div className="flex items-center gap-1 w-40">
              {Array.from({ length: 10 }).map((_, idx) => (
                <span
                  key={idx}
                  className={`h-2 flex-1 rounded-full ${
                    idx < 8
                      ? 'bg-[#4FB3A9]'
                      : idx === 8 || hasEarlyModisGap
                        ? 'bg-[#ffc20d]'
                        : 'bg-[#4FB3A9]'
                  }`}
                />
              ))}
            </div>
          </div>

          <ul className="mt-4 space-y-2.5 text-[13px]">
            {[
              { label: 'Coordinate bounds within Sahel research domain', status: 'Passed' },
              { label: 'GPM IMERG V07B precipitation units calibrated (mm/day)', status: 'Passed' },
              { label: 'No synthetic zero-filling detected in missing months', status: 'Passed' },
              {
                label: 'MODIS NDVI 2001–2002 pre-Aqua temporal discontinuity',
                status: hasEarlyModisGap ? 'Warning' : 'Passed',
              },
              {
                label: 'EarthCARE 2024+ restricted to contemporary process case studies',
                status: 'Warning',
              },
            ].map((item) => (
              <li
                key={item.label}
                className="flex items-center justify-between gap-3 p-3 rounded-[16px] bg-[#f4f1ea] border border-[#E6E0D2]"
              >
                <span className="text-[#131D38]">{item.label}</span>
                <span
                  className={`px-2.5 py-0.5 rounded-full font-mono text-[10px] uppercase shrink-0 ${
                    item.status === 'Warning'
                      ? 'bg-[#FF7A6B]/20 text-[#991B1B]'
                      : 'bg-[#4FB3A9]/20 text-[#131D38]'
                  }`}
                >
                  {item.status}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="lg:col-span-5 rounded-[28px] bg-[#131D38] text-[#f4f1ea] p-6 shadow-[0_20px_50px_rgba(19,29,56,0.12)] flex flex-col justify-between">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#ffc20d]">
              COMMON OVERLAP WINDOW
            </p>
            <div className="mt-2 font-display text-[34px] font-semibold text-[#ffc20d] tabular-nums">
              {commonStart}–{commonEnd}
            </div>
            <p className="mt-2 text-[14px] text-[#A9B1C6] leading-[1.55]">
              Using the {commonEnd - commonStart + 1}-year common period guarantees every dataset in
              the core Sahel stack contributes valid seasonal grids without asymmetric start-year
              leverage.
            </p>
          </div>

          <div className="mt-5 pt-4 border-t border-[#f4f1ea]/15 space-y-3">
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <span className="text-[13px] text-[#f4f1ea]">
                Allow dataset-specific periods instead
              </span>
              <input
                type="checkbox"
                checked={useCommonPeriod}
                onChange={(e) => setUseCommonPeriod(e.target.checked)}
                className="w-4 h-4 accent-[#ffc20d] cursor-pointer"
              />
            </label>
            {startY < commonStart && !useCommonPeriod && (
              <button
                type="button"
                onClick={handleSwitchToCommonPeriod}
                className="w-full py-2.5 rounded-full bg-[#ffc20d] text-[#131D38] text-[13px] font-semibold hover:bg-[#eab006] transition-colors cursor-pointer"
              >
                Align investigation to {commonStart}–{commonEnd}
              </button>
            )}
          </div>
        </section>
      </div>

      {/* 7. 7-Node Preparation Pipeline + Operations Log */}
      <section className="rounded-[28px] bg-[#FBFAF6] border border-[#E6E0D2] p-6 shadow-[0_20px_50px_rgba(19,29,56,0.06)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5B6478]">
              PREPARATION PIPELINE
            </p>
            <h2 className="mt-1 font-display text-[19px] font-semibold text-[#131D38]">
              Seven-stage harmonization & readiness
            </h2>
          </div>

          <button
            type="button"
            onClick={() => setShowOpsLog((v) => !v)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-[#E6E0D2] bg-[#f4f1ea] text-[12px] font-semibold text-[#131D38] hover:bg-white cursor-pointer"
          >
            <span>Operations log</span>
            {showOpsLog ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {PIPELINE_STEPS.map((st, idx) => {
            const active = activePipelineIdx === idx;
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => setActivePipelineIdx(idx)}
                className={`p-3 rounded-[18px] border text-left transition-all cursor-pointer ${
                  active
                    ? 'bg-[#131D38] text-[#f4f1ea] border-[#131D38]'
                    : 'bg-[#f4f1ea] text-[#131D38] border-[#E6E0D2] hover:border-[#131D38]/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`font-mono text-[10px] ${
                      active ? 'text-[#ffc20d]' : 'text-[#5B6478]'
                    }`}
                  >
                    0{idx + 1}
                  </span>
                  <CheckCircle2
                    className={`w-3.5 h-3.5 ${active ? 'text-[#4FB3A9]' : 'text-[#4FB3A9]'}`}
                  />
                </div>
                <div className="mt-2 text-[13px] font-semibold leading-tight">{st.label}</div>
              </button>
            );
          })}
        </div>

        <div className="mt-4 p-4 rounded-[18px] bg-[#f4f1ea] border border-[#E6E0D2] flex flex-wrap items-center justify-between gap-3 text-[13px]">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#5B6478]">
              Stage detail · {PIPELINE_STEPS[activePipelineIdx].label}
            </span>
            <p className="mt-0.5 text-[#131D38] font-medium">
              {PIPELINE_STEPS[activePipelineIdx].summary}
            </p>
          </div>
          <span className="font-mono text-[11px] text-[#5B6478]">
            {PIPELINE_STEPS[activePipelineIdx].duration}
          </span>
        </div>

        {showOpsLog && (
          <div className="mt-4 pt-4 border-t border-[#E6E0D2]">
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-[11px] uppercase text-[#5B6478]">
                Execution audit trail
              </span>
              <button
                type="button"
                onClick={handleExportLogCsv}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-[#131D38]/20 text-[12px] font-semibold text-[#131D38] hover:bg-[#f4f1ea] cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export log (CSV)</span>
              </button>
            </div>
            <div className="overflow-x-auto border border-[#E6E0D2] rounded-[16px]">
              <table className="w-full text-left border-collapse text-[12px]">
                <thead className="bg-[#f4f1ea] font-mono text-[10px] uppercase text-[#5B6478] border-b border-[#E6E0D2]">
                  <tr>
                    <th className="py-2 px-3">Time</th>
                    <th className="py-2 px-3">Stage</th>
                    <th className="py-2 px-3">Target</th>
                    <th className="py-2 px-3">Result</th>
                    <th className="py-2 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6E0D2]">
                  {OPERATIONS_LOG.map((row) => (
                    <tr key={`${row.ts}-${row.target}`}>
                      <td className="py-2 px-3 font-mono text-[#5B6478]">{row.ts}</td>
                      <td className="py-2 px-3 font-medium text-[#131D38]">{row.step}</td>
                      <td className="py-2 px-3 font-mono text-[#131D38]">{row.target}</td>
                      <td className="py-2 px-3 text-[#5B6478]">{row.result}</td>
                      <td className="py-2 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full font-mono text-[10px] uppercase ${
                            row.status === 'Warning'
                              ? 'bg-[#FF7A6B]/15 text-[#991B1B]'
                              : 'bg-[#4FB3A9]/15 text-[#131D38]'
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Sticky Navy Gate Bar */}
      <div className="sticky bottom-4 z-30 rounded-[24px] bg-[#131D38] text-[#f4f1ea] border border-[#f4f1ea]/15 px-5 py-4 shadow-[0_24px_60px_rgba(11,18,36,0.35)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-[#ffc20d]" />
            <span className="text-[#ffc20d]">
              GATE: {hasEarlyModisGap ? '2 WARNINGS' : '1 WARNING'} · 0 BLOCKERS
            </span>
          </div>
          <label className="flex items-center gap-2.5 text-[13px] text-[#f4f1ea] cursor-pointer">
            <input
              type="checkbox"
              checked={gateChecked}
              onChange={(e) => setGateChecked(e.target.checked)}
              className="w-4 h-4 accent-[#ffc20d] cursor-pointer"
            />
            <span>I’ve reviewed the data quality notes & missing-data NaN handling</span>
          </label>
        </div>

        <button
          type="button"
          onClick={handleContinue}
          disabled={!gateChecked}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#ffc20d] text-[#131D38] text-[14px] font-semibold hover:bg-[#eab006] disabled:opacity-45 disabled:cursor-not-allowed transition-colors cursor-pointer whitespace-nowrap"
        >
          <span>Continue to Detect</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
