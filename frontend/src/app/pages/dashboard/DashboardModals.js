'use client';

import { useEffect, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Database,
  FileText,
  FolderKanban,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import {
  PERIOD_OPTIONS,
  REGION_OPTIONS,
  VARIABLE_OPTIONS,
  WORKFLOW_LAYERS,
} from '@/app/api/earthSignalData';

/* 1. Command Palette (⌘K Search) */
export function CommandPaletteModal({
  open,
  onClose,
  investigations,
  datasets,
  reports,
  onSelectInvestigation,
  onSelectDataset,
  onSelectReport,
}) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  if (!open) return null;

  const q = query.trim().toLowerCase();
  const matchedInv = investigations.filter(
    (i) =>
      !q ||
      i.title.toLowerCase().includes(q) ||
      i.region.toLowerCase().includes(q) ||
      i.variable.toLowerCase().includes(q)
  );
  const matchedDatasets = datasets.filter(
    (d) =>
      !q ||
      d.name.toLowerCase().includes(q) ||
      d.role.toLowerCase().includes(q) ||
      d.product.toLowerCase().includes(q)
  );
  const matchedReports = reports.filter(
    (r) => !q || r.title.toLowerCase().includes(q) || r.summary.toLowerCase().includes(q)
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-[#0B1224]/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Search investigations, datasets, and reports"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl rounded-[28px] bg-[#FBFAF6] text-[#131D38] border border-[#E6E0D2] shadow-instrument overflow-hidden"
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[#E6E0D2]">
          <Search className="w-5 h-5 text-[#5B6478] shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search investigations, datasets, reports…"
            className="w-full bg-transparent text-[15px] text-[#131D38] placeholder:text-[#5B6478] focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="px-2.5 py-1 rounded-full bg-[#f4f1ea] border border-[#E6E0D2] font-mono text-[11px] text-[#5B6478] cursor-pointer"
          >
            ESC
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-5">
          <div>
            <div className="px-2 font-mono text-[10px] uppercase tracking-wider text-[#5B6478] mb-2">
              Investigations ({matchedInv.length})
            </div>
            {matchedInv.length === 0 ? (
              <p className="px-2 text-[13px] text-[#5B6478]">No matching investigations.</p>
            ) : (
              <div className="space-y-1">
                {matchedInv.map((inv) => (
                  <button
                    key={inv.id}
                    type="button"
                    onClick={() => {
                      onSelectInvestigation(inv);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-[14px] hover:bg-[#f4f1ea] text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <FolderKanban className="w-4 h-4 text-[#4FB3A9] shrink-0" />
                      <span className="text-[14px] font-medium truncate">{inv.title}</span>
                    </div>
                    <span className="font-mono text-[11px] text-[#5B6478] shrink-0">
                      {inv.period}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="px-2 font-mono text-[10px] uppercase tracking-wider text-[#5B6478] mb-2">
              Datasets ({matchedDatasets.length})
            </div>
            <div className="space-y-1">
              {matchedDatasets.map((ds) => (
                <button
                  key={ds.id}
                  type="button"
                  onClick={() => {
                    onSelectDataset();
                    onClose();
                  }}
                  className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-[14px] hover:bg-[#f4f1ea] text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Database className="w-4 h-4 text-[#131D38] shrink-0" />
                    <span className="text-[14px] font-medium truncate">{ds.name}</span>
                  </div>
                  <span className="font-mono text-[10px] uppercase px-2.5 py-0.5 rounded-full bg-[#131D38] text-[#ffc20d]">
                    {ds.status}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="px-2 font-mono text-[10px] uppercase tracking-wider text-[#5B6478] mb-2">
              Reports ({matchedReports.length})
            </div>
            <div className="space-y-1">
              {matchedReports.map((rep) => (
                <button
                  key={rep.id}
                  type="button"
                  onClick={() => {
                    onSelectReport();
                    onClose();
                  }}
                  className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-[14px] hover:bg-[#f4f1ea] text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="w-4 h-4 text-[#5B6478] shrink-0" />
                    <span className="text-[14px] font-medium truncate">{rep.title}</span>
                  </div>
                  <span className="font-mono text-[11px] text-[#5B6478] shrink-0">
                    {rep.status}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* 2. New Investigation Setup Modal */
export function NewInvestigationModal({
  open,
  onClose,
  onCreate,
  initialRegion = 'Sahel',
  initialVariable = 'Rainfall',
  initialPeriod = '2001–2025',
}) {
  const [title, setTitle] = useState('');
  const [region, setRegion] = useState(initialRegion);
  const [variable, setVariable] = useState('Rainfall');
  const [period, setPeriod] = useState(initialPeriod);

  useEffect(() => {
    if (open) {
      setRegion(initialRegion);
      const validVar = VARIABLE_OPTIONS.find((v) => v.label === initialVariable);
      setVariable(validVar?.label ?? 'Rainfall');
      setPeriod(initialPeriod);
      setTitle('');
    }
  }, [open, initialRegion, initialVariable, initialPeriod]);

  if (!open) return null;

  const selectedRegion = REGION_OPTIONS.find((r) => r.label === region) ?? REGION_OPTIONS[0];

  const handleSubmit = (e) => {
    e.preventDefault();
    const resolvedTitle = title.trim() || `${region} ${variable.toLowerCase()}, ${period}`;
    onCreate({
      title: resolvedTitle,
      region,
      coords: selectedRegion.coords,
      variable,
      period,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B1224]/75 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-[28px] bg-[#131D38] text-[#f4f1ea] border border-[#f4f1ea]/15 p-6 sm:p-8 shadow-instrument-dark"
      >
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#f4f1ea]/10">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#ffc20d]">
              NEW INVESTIGATION
            </p>
            <h2 className="mt-1 font-display text-[22px] font-semibold">
              Configure study box & signal
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close new investigation modal"
            className="w-9 h-9 rounded-full bg-[#1E2B52] text-[#f4f1ea] inline-flex items-center justify-center hover:bg-[#f4f1ea] hover:text-[#131D38] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label
              htmlFor="new-inv-title"
              className="block text-[13px] font-medium text-[#f4f1ea]/90 mb-1.5"
            >
              Investigation name
            </label>
            <input
              id="new-inv-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`${region} ${variable.toLowerCase()}, ${period}`}
              className="w-full h-12 rounded-full bg-[#0B1224] border border-[#f4f1ea]/15 px-5 text-[14px] text-[#f4f1ea] placeholder:text-[#5B6478] focus:outline-none focus:border-[#ffc20d]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="new-inv-region"
                className="block text-[13px] font-medium text-[#f4f1ea]/90 mb-1.5"
              >
                Region
              </label>
              <select
                id="new-inv-region"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full h-12 rounded-full bg-[#0B1224] border border-[#f4f1ea]/15 px-4 text-[14px] text-[#f4f1ea] focus:outline-none focus:border-[#ffc20d]"
              >
                {REGION_OPTIONS.map((r) => (
                  <option key={r.id} value={r.label} className="bg-[#131D38]">
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="new-inv-period"
                className="block text-[13px] font-medium text-[#f4f1ea]/90 mb-1.5"
              >
                Period
              </label>
              <select
                id="new-inv-period"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="w-full h-12 rounded-full bg-[#0B1224] border border-[#f4f1ea]/15 px-4 text-[14px] text-[#f4f1ea] focus:outline-none focus:border-[#ffc20d]"
              >
                {PERIOD_OPTIONS.map((p) => (
                  <option key={p} value={p} className="bg-[#131D38]">
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="new-inv-variable"
              className="block text-[13px] font-medium text-[#f4f1ea]/90 mb-1.5"
            >
              Primary Earth variable
            </label>
            <select
              id="new-inv-variable"
              value={variable}
              onChange={(e) => setVariable(e.target.value)}
              className="w-full h-12 rounded-full bg-[#0B1224] border border-[#f4f1ea]/15 px-4 text-[14px] text-[#f4f1ea] focus:outline-none focus:border-[#ffc20d]"
            >
              {VARIABLE_OPTIONS.map((v) => (
                <option key={v.id} value={v.label} className="bg-[#131D38]">
                  {v.label} ({v.dataset})
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-[18px] bg-[#1E2B52] p-3.5 text-[12px] text-[#A9B1C6] font-mono">
            Bounding box: {selectedRegion.coords} · Begins at Layer 01 (Detect)
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-full border border-[#f4f1ea]/20 text-[14px] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#ffc20d] text-[#131D38] text-[14px] font-semibold hover:bg-[#eab006] cursor-pointer"
            >
              <span>Create investigation</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* 3. Active Investigation Layer Stepper Modal (Continue / Explore) */
export function ActiveInvestigationDrawer({
  investigation,
  onClose,
  onUpdateStage,
  onToggleComplete,
}) {
  if (!investigation) return null;
  const currentLayer = WORKFLOW_LAYERS[investigation.stageIndex] ?? WORKFLOW_LAYERS[0];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B1224]/75 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl max-h-[88vh] overflow-y-auto rounded-[28px] bg-[#131D38] text-[#f4f1ea] border border-[#f4f1ea]/15 p-6 sm:p-8 shadow-instrument-dark"
      >
        <div className="flex items-start justify-between gap-4 pb-5 border-b border-[#f4f1ea]/10">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[11px] uppercase tracking-wider text-[#ffc20d]">
                {investigation.region} · {investigation.period}
              </span>
              <span className="font-mono text-[10px] uppercase px-2.5 py-0.5 rounded-full bg-[#1E2B52] text-[#4FB3A9]">
                DATASET: {investigation.datasetStatus.toUpperCase()}
              </span>
            </div>
            <h2 className="mt-1.5 font-display text-[24px] font-semibold">{investigation.title}</h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close investigation workspace"
            className="w-10 h-10 rounded-full bg-[#1E2B52] text-[#f4f1ea] inline-flex items-center justify-center hover:bg-[#f4f1ea] hover:text-[#131D38] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 5-Layer Stepper Navigation */}
        <div className="mt-6 flex flex-wrap gap-2">
          {WORKFLOW_LAYERS.map((layer, idx) => (
            <button
              key={layer.id}
              type="button"
              onClick={() => onUpdateStage(investigation.id, idx)}
              className={`px-4 py-2 rounded-full text-[13px] font-medium transition-colors cursor-pointer ${
                investigation.stageIndex === idx
                  ? 'bg-[#ffc20d] text-[#131D38] font-semibold'
                  : 'bg-[#1E2B52] text-[#A9B1C6] hover:text-[#f4f1ea]'
              }`}
            >
              {layer.number} · {layer.title}
            </button>
          ))}
        </div>

        {/* Active Layer Card */}
        <div className="mt-5 rounded-[24px] bg-[#0B1224] border border-[#f4f1ea]/10 p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display text-[20px] font-semibold">{currentLayer.question}</h3>
            <span className="font-mono text-[11px] text-[#4FB3A9]">{investigation.dataset}</span>
          </div>
          <p className="mt-3 text-[15px] leading-[1.6] text-[#A9B1C6]">
            {currentLayer.explanation}
          </p>

          <div className="mt-5 pt-4 border-t border-[#f4f1ea]/10 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <div className="font-mono text-[10px] uppercase text-[#A9B1C6]">Sen’s slope</div>
              <div className="mt-1 font-mono text-[14px] text-[#f4f1ea] tabular-nums">
                — mm/yr (Placeholder)
              </div>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase text-[#A9B1C6]">Significance</div>
              <div className="mt-1 font-mono text-[14px] text-[#f4f1ea] tabular-nums">
                — (Pending audit)
              </div>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase text-[#A9B1C6]">Coordinates</div>
              <div className="mt-1 font-mono text-[13px] text-[#ffc20d] tabular-nums">
                {investigation.coords}
              </div>
            </div>
          </div>

          {currentLayer.caveat && (
            <p className="mt-4 font-mono text-[11px] uppercase tracking-wider text-[#ffc20d]">
              {currentLayer.caveat}
            </p>
          )}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => onToggleComplete(investigation.id)}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-semibold transition-colors cursor-pointer ${
              investigation.completed
                ? 'bg-[#4FB3A9]/20 text-[#4FB3A9] border border-[#4FB3A9]/40'
                : 'border border-[#f4f1ea]/25 text-[#f4f1ea] hover:bg-[#f4f1ea]/10'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {investigation.completed ? 'Marked completed' : 'Mark investigation completed'}
            </span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-full bg-[#ffc20d] text-[#131D38] text-[14px] font-semibold cursor-pointer"
          >
            Save & return to dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

/* 4. 1-Minute Guided Tour Modal */
export function TourModal({ open, onClose }) {
  const [step, setStep] = useState(0);

  if (!open) return null;

  const steps = [
    {
      title: '1. Start with a study box & NASA variable',
      body: 'Use + New investigation or the prepared Western Sahel case study (10°N–20°N, 18°W–20°E) to align precipitation, moisture, and aerosol grids.',
    },
    {
      title: '2. Follow the five connected layers',
      body: 'Move cleanly from Detect (what is changing) and Investigate (what else is changing) through Explain, Project, and Solve—with conditional scenarios clearly separated from forecasts.',
    },
    {
      title: '3. Audit dataset provenance honestly',
      body: 'Every dataset carries its real audit status (Candidate, Acquired, Verified, or Used) so placeholder metrics are never mistaken for final findings.',
    },
  ];

  const current = steps[step];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B1224]/75 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-[28px] bg-[#131D38] text-[#f4f1ea] border border-[#f4f1ea]/15 p-7 shadow-instrument-dark"
      >
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-[#ffc20d]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>1-Minute Tour · {step + 1} / 3</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close tour"
            className="w-8 h-8 rounded-full bg-[#1E2B52] inline-flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <h3 className="mt-4 font-display text-[20px] font-semibold">{current.title}</h3>
        <p className="mt-2.5 text-[15px] leading-[1.6] text-[#A9B1C6]">{current.body}</p>

        <div className="mt-6 flex items-center justify-between">
          <div className="flex gap-1.5">
            {steps.map((_, i) => (
              <span
                key={i}
                className={`h-2 rounded-full transition-all ${
                  i === step ? 'w-6 bg-[#ffc20d]' : 'w-2 bg-[#1E2B52]'
                }`}
              />
            ))}
          </div>

          {step < steps.length - 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              className="px-5 py-2.5 rounded-full bg-[#ffc20d] text-[#131D38] text-[13px] font-semibold cursor-pointer"
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-full bg-[#ffc20d] text-[#131D38] text-[13px] font-semibold cursor-pointer"
            >
              Got it
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
