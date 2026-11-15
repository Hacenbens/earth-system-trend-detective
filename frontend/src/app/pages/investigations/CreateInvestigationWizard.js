'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  CloudRain,
  Layers,
  Loader2,
  MapPin,
  Minus,
  Plus,
  Sparkles,
  Wind,
  X,
} from 'lucide-react';

const STEPS = ['Details', 'Region', 'Period', 'Variables', 'Datasets', 'Review'];

const SUBREGIONS = [
  { id: 'whole', label: 'Whole Sahel', north: 20, south: 10, west: -18, east: 35 },
  { id: 'western', label: 'Western Sahel', north: 20, south: 10, west: -18, east: 0 },
  { id: 'central', label: 'Central Sahel', north: 18, south: 10, west: 0, east: 15 },
  { id: 'eastern', label: 'Eastern Sahel', north: 18, south: 10, west: 15, east: 35 },
];

const MONTH_LABELS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
const WIZARD_DRAFT_KEY = 'earthsignal_wizard_draft_v1';

export function CreateInvestigationWizard({
  datasets,
  isGuest,
  onExit,
  onOpenDatasetDetail,
  onCreateComplete,
}) {
  const [step, setStep] = useState(0);
  const [exitPromptOpen, setExitPromptOpen] = useState(false);
  const [creatingLoader, setCreatingLoader] = useState(false);

  // Step 1: Details
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');
  const [question, setQuestion] = useState('');
  const [description, setDescription] = useState('');

  // Step 2: Region
  const [geoTab, setGeoTab] = useState('preset');
  const [subregion, setSubregion] = useState('Western Sahel');
  const [bounds, setBounds] = useState({ north: 20, south: 10, west: -18, east: 0 });
  const [zoom, setZoom] = useState(1);
  const svgRef = useRef(null);
  const [dragStart, setDragStart] = useState(null);

  // Step 3: Period
  const [startYear, setStartYear] = useState(2001);
  const [endYear, setEndYear] = useState(2025);
  const [seasonPreset, setSeasonPreset] = useState('rainy');
  const [months, setMonths] = useState([5, 6, 7, 8]); // Jun-Sep

  // Step 4: Variables
  const [primaryVar, setPrimaryVar] = useState('Precipitation');
  const [supportingVars, setSupportingVars] = useState([
    'Atmospheric moisture',
    'Vegetation (NDVI)',
  ]);
  const [computeMode, setComputeMode] = useState('totals');

  // Step 5: Datasets
  const [primaryDatasetId, setPrimaryDatasetId] = useState('gpm-imerg-v07');
  const [supportingDatasetIds, setSupportingDatasetIds] = useState([
    'merra2-reanalysis',
    'modis-aod-ndvi',
  ]);

  // Restore autosaved draft on mount
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(WIZARD_DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (d.name) setName(d.name);
      if (d.question) setQuestion(d.question);
      if (d.subregion) setSubregion(d.subregion);
      if (d.bounds) setBounds(d.bounds);
    } catch {
      // Ignore
    }
  }, []);

  // Autosave on changes
  useEffect(() => {
    try {
      window.localStorage.setItem(
        WIZARD_DRAFT_KEY,
        JSON.stringify({ name, question, description, subregion, bounds, startYear, endYear })
      );
    } catch {
      // Ignore
    }
  }, [name, question, description, subregion, bounds, startYear, endYear]);

  const yearsCount = Math.max(1, endYear - startYear + 1);
  const areaMillionKm2 = useMemo(() => {
    const dLat = Math.abs(bounds.north - bounds.south);
    const dLon = Math.abs(bounds.east - bounds.west);
    return ((dLat * 111 * dLon * 107) / 1_000_000).toFixed(1);
  }, [bounds]);

  const commonPeriod = useMemo(() => {
    const selected = [
      datasets.find((d) => d.id === primaryDatasetId),
      ...datasets.filter((d) => supportingDatasetIds.includes(d.id) && d.roleType !== 'case_study'),
    ].filter(Boolean);

    const maxStart = Math.max(startYear, ...selected.map((d) => d.coverageStart));
    const minEnd = Math.min(endYear, ...selected.map((d) => d.coverageEnd));
    // Known MODIS NDVI regional note (2003+)
    const modisAdjusted = supportingDatasetIds.includes('modis-aod-ndvi')
      ? Math.max(maxStart, 2003)
      : maxStart;
    return { start: modisAdjusted, end: minEnd };
  }, [datasets, primaryDatasetId, supportingDatasetIds, startYear, endYear]);

  const applySahelShortcut = () => {
    setName('Sahel Rainfall Study');
    setQuestion('Is rainfall in the Sahel changing in amount and intensity?');
    setDescription(
      'Multi-decadal JJAS precipitation investigation linking moisture transport, aerosols, and convective storm intensity.'
    );
    setSubregion('Whole Sahel');
    setBounds({ north: 20, south: 10, west: -18, east: 20 });
    setStartYear(2001);
    setEndYear(2025);
    setSeasonPreset('rainy');
    setMonths([5, 6, 7, 8]);
    setComputeMode('extremes');
    setNameError('');
  };

  const handleSelectSubregion = (item) => {
    setSubregion(item.label);
    setBounds({
      north: item.north,
      south: item.south,
      west: item.west,
      east: item.east,
    });
  };

  const mapPointToCoords = (clientX, clientY) => {
    const svg = svgRef.current;
    if (!svg) return { lon: 0, lat: 15 };
    const rect = svg.getBoundingClientRect();
    const xPct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const yPct = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    const lon = Math.round(-25 + xPct * 68);
    const lat = Math.round(28 - yPct * 26);
    return { lon, lat };
  };

  const handleContinue = () => {
    if (step === 0 && !name.trim()) {
      setNameError('Enter an investigation name before continuing.');
      return;
    }
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      handleFinish('create');
    }
  };

  const handleFinish = (mode) => {
    const resolvedName = name.trim() || `${subregion} Rainfall Study`;
    const coordsLabel = `${bounds.south}°N–${bounds.north}°N, ${
      bounds.west < 0 ? `${Math.abs(bounds.west)}°W` : `${bounds.west}°E`
    }–${bounds.east < 0 ? `${Math.abs(bounds.east)}°W` : `${bounds.east}°E`}`;

    const primaryDs =
      datasets.find((d) => d.id === primaryDatasetId)?.name ?? 'GPM IMERG Final V07';

    const newInv = {
      id: `inv-${Date.now()}`,
      title: resolvedName,
      description: description.trim() || undefined,
      researchQuestion: question.trim() || undefined,
      region: subregion,
      coords: coordsLabel,
      bounds,
      period: `${startYear}–${endYear}`,
      startYear,
      endYear,
      season:
        seasonPreset === 'rainy'
          ? 'June–September'
          : seasonPreset === 'annual'
            ? 'Annual'
            : 'Custom months',
      months,
      variable: primaryVar,
      supportingVariables: supportingVars,
      extremesEnabled: computeMode === 'extremes',
      dataset: primaryDs,
      supportingDatasets: supportingDatasetIds,
      datasetStatus: 'Candidate',
      stageIndex: 0,
      status: mode === 'draft' ? 'draft' : 'in_progress',
      completed: false,
      updatedLabel: 'Updated just now',
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      exactDate: new Date().toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
      dataGatePassed: false,
    };

    try {
      window.localStorage.removeItem(WIZARD_DRAFT_KEY);
    } catch {
      // Ignore
    }

    if (mode === 'create') {
      setCreatingLoader(true);
      window.setTimeout(() => {
        setCreatingLoader(false);
        onCreateComplete(newInv, 'create');
      }, 650);
    } else {
      onCreateComplete(newInv, 'draft');
    }
  };

  // Helper to project bounds onto 420x260 SVG canvas (-25..43 lon, 2..28 lat)
  const boxX = ((bounds.west - -25) / 68) * 420;
  const boxW = Math.max(18, ((bounds.east - bounds.west) / 68) * 420);
  const boxY = ((28 - bounds.north) / 26) * 260;
  const boxH = Math.max(16, ((bounds.north - bounds.south) / 26) * 260);

  return (
    <div className="min-h-screen bg-[#f4f1ea] text-[#131D38] flex flex-col">
      {/* Top Wizard Header */}
      <header className="px-4 sm:px-8 pt-5 pb-4 flex items-center justify-between gap-4 max-w-[1280px] w-full mx-auto">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5B6478]">
            INVESTIGATIONS / NEW
          </p>
          <p className="mt-0.5 text-[12px] text-[#5B6478]">
            Draft saved · just now {isGuest ? '· Demo mode: saved on this device' : ''}
          </p>
        </div>

        <button
          type="button"
          onClick={() => (name.trim() ? setExitPromptOpen(true) : onExit())}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#E6E0D2] bg-[#FBFAF6] text-[13px] font-medium hover:bg-white cursor-pointer"
        >
          <X className="w-4 h-4" />
          <span>Exit</span>
        </button>
      </header>

      {/* Horizontal 6-Step Stepper */}
      <div className="px-4 sm:px-8 pb-6 max-w-[1280px] w-full mx-auto">
        <div className="hidden sm:flex items-center justify-between relative">
          <div className="absolute left-6 right-6 top-4 h-px bg-[#E6E0D2]" aria-hidden="true" />
          {STEPS.map((label, idx) => {
            const done = idx < step;
            const current = idx === step;
            return (
              <button
                key={label}
                type="button"
                disabled={idx > step}
                aria-current={current ? 'step' : undefined}
                onClick={() => idx < step && setStep(idx)}
                className={`relative z-10 flex flex-col items-center gap-2 ${
                  idx < step ? 'cursor-pointer' : 'cursor-default'
                }`}
              >
                <span
                  className={`w-8 h-8 rounded-full inline-flex items-center justify-center font-mono text-[12px] font-semibold transition-colors ${
                    done
                      ? 'bg-[#ffc20d] text-[#131D38]'
                      : current
                        ? 'bg-[#131D38] text-[#f4f1ea] ring-2 ring-[#ffc20d] ring-offset-2 ring-offset-[#f4f1ea]'
                        : 'bg-[#FBFAF6] border border-[#E6E0D2] text-[#5B6478]'
                  }`}
                >
                  {done ? <Check className="w-4 h-4 stroke-[2.5]" /> : idx + 1}
                </span>
                <span
                  className={`text-[12px] font-medium ${
                    current ? 'text-[#131D38] font-semibold' : 'text-[#5B6478]'
                  }`}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Mobile compact stepper */}
        <div className="sm:hidden">
          <div className="flex items-center justify-between font-mono text-[11px] uppercase text-[#131D38] mb-2">
            <span>
              Step {step + 1} of 6 · {STEPS[step]}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-[#E6E0D2] overflow-hidden">
            <div
              className="h-full bg-[#ffc20d] transition-all duration-300"
              style={{ width: `${((step + 1) / 6) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main 12-Col Body */}
      <main className="flex-1 px-4 sm:px-8 pb-28 max-w-[1280px] w-full mx-auto">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Left 8 Cols: Active Step Card */}
          <motion.section
            key={step}
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="xl:col-span-8 rounded-[28px] bg-[#FBFAF6] border border-[#E6E0D2] p-6 sm:p-10 shadow-[0_20px_50px_rgba(19,29,56,0.08)]"
          >
            {/* STEP 1: DETAILS */}
            {step === 0 && (
              <div className="space-y-6">
                <div>
                  <h1 className="font-display text-[28px] sm:text-[34px] font-semibold leading-tight">
                    Name your{' '}
                    <span className="font-editorial-italic font-normal underline decoration-[#ffc20d] decoration-[3px] underline-offset-6">
                      investigation
                    </span>
                  </h1>
                  <p className="mt-2 text-[15px] text-[#5B6478]">
                    Give your study a clear title and optional research question.
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="wiz-name" className="text-[14px] font-medium">
                      Investigation name <span className="text-[#C24136]">*</span>
                    </label>
                    <span className="font-mono text-[11px] text-[#5B6478] tabular-nums">
                      {name.length}/60
                    </span>
                  </div>
                  <input
                    id="wiz-name"
                    type="text"
                    maxLength={60}
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (nameError) setNameError('');
                    }}
                    onBlur={() => {
                      if (!name.trim()) setNameError('Investigation name is required.');
                    }}
                    placeholder="e.g. Sahel Rainfall Study"
                    className={`w-full h-[52px] rounded-full bg-white border px-5 text-[15px] focus:outline-none ${
                      nameError ? 'border-[#FF7A6B]' : 'border-[#E6E0D2] focus:border-[#131D38]'
                    }`}
                  />
                  {nameError && (
                    <p className="mt-1.5 flex items-center gap-1.5 text-[12px] text-[#C24136]">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>{nameError}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="wiz-question" className="block text-[14px] font-medium mb-1">
                    Scientific research question{' '}
                    <span className="text-[#5B6478] font-normal">(optional)</span>
                  </label>
                  <p className="text-[12px] text-[#5B6478] mb-2">
                    A good question names a variable, a place and a period.
                  </p>
                  <textarea
                    id="wiz-question"
                    rows={2}
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Is rainfall in the Sahel changing in amount and intensity?"
                    className="w-full rounded-[20px] bg-white border border-[#E6E0D2] p-4 text-[14px] focus:outline-none focus:border-[#131D38]"
                  />
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {[
                      'Is rainfall in the Sahel changing in amount and intensity?',
                      'How does 850 hPa moisture co-vary with Sahel storm extremes?',
                      'Do Saharan dust anomalies coincide with dry-spell persistence?',
                    ].map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => setQuestion(q)}
                        className="text-left px-3 py-1.5 rounded-full bg-[#f4f1ea] border border-[#E6E0D2] text-[12px] text-[#131D38] hover:border-[#131D38]/40 cursor-pointer"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="wiz-desc" className="text-[14px] font-medium">
                      Short description{' '}
                      <span className="text-[#5B6478] font-normal">(optional)</span>
                    </label>
                    <span className="font-mono text-[11px] text-[#5B6478] tabular-nums">
                      {description.length}/200
                    </span>
                  </div>
                  <textarea
                    id="wiz-desc"
                    rows={2}
                    maxLength={200}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Scope, sub-basin focus, or hypothesis notes…"
                    className="w-full rounded-[20px] bg-white border border-[#E6E0D2] p-4 text-[14px] focus:outline-none focus:border-[#131D38]"
                  />
                </div>

                <div className="rounded-[20px] bg-[#131D38] text-[#f4f1ea] p-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#ffc20d] text-[#131D38] font-mono text-[10px] font-semibold">
                      SHORTCUT
                    </span>
                    <span className="text-[14px]">
                      Start from the Sahel case study configuration
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={applySahelShortcut}
                    className="px-4 py-2 rounded-full border border-[#f4f1ea]/30 text-[13px] font-medium hover:bg-[#f4f1ea]/10 cursor-pointer"
                  >
                    Prefill Sahel setup
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: GEOGRAPHIC CONFIGURATION */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h1 className="font-display text-[28px] sm:text-[32px] font-semibold">
                    Define study{' '}
                    <span className="font-editorial-italic font-normal underline decoration-[#ffc20d] decoration-[3px] underline-offset-6">
                      region
                    </span>
                  </h1>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Left Controls (5 cols ~40%) */}
                  <div className="lg:col-span-5 space-y-4">
                    <div className="p-1 rounded-full bg-[#f4f1ea] border border-[#E6E0D2] grid grid-cols-4 text-[12px] font-medium">
                      {[
                        { id: 'preset', label: 'Preset' },
                        { id: 'draw', label: 'Draw' },
                        { id: 'coords', label: 'Coords' },
                        { id: 'upload', label: 'Upload' },
                      ].map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          disabled={t.id === 'upload'}
                          title={t.id === 'upload' ? 'GeoJSON upload coming soon' : undefined}
                          onClick={() => setGeoTab(t.id)}
                          className={`py-2 rounded-full transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
                            geoTab === t.id ? 'bg-[#131D38] text-[#f4f1ea]' : 'text-[#5B6478]'
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>

                    {geoTab === 'preset' && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2.5">
                          {SUBREGIONS.map((item) => {
                            const active = subregion === item.label;
                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => handleSelectSubregion(item)}
                                className={`p-3.5 rounded-[18px] border text-left transition-all cursor-pointer ${
                                  active
                                    ? 'bg-[#131D38] text-[#f4f1ea] border-[#131D38]'
                                    : 'bg-white border-[#E6E0D2] text-[#131D38] hover:border-[#131D38]/40'
                                }`}
                              >
                                <div className="text-[13px] font-semibold">{item.label}</div>
                                <div
                                  className={`mt-1 font-mono text-[10px] ${
                                    active ? 'text-[#ffc20d]' : 'text-[#5B6478]'
                                  }`}
                                >
                                  {item.south}°N–{item.north}°N
                                </div>
                              </button>
                            );
                          })}
                        </div>
                        <p className="text-[12px] leading-[1.5] text-[#5B6478]">
                          Provisional study box, final boundary to be verified against a published
                          Sahel definition.
                        </p>
                      </div>
                    )}

                    {geoTab === 'draw' && (
                      <div className="p-4 rounded-[20px] bg-white border border-[#E6E0D2] space-y-2">
                        <div className="text-[14px] font-semibold">Click & drag on the map</div>
                        <p className="text-[13px] text-[#5B6478]">
                          Draw a custom bounding box directly over West & Central Africa.
                          Coordinates sync automatically.
                        </p>
                      </div>
                    )}

                    {geoTab === 'coords' && (
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { key: 'north', label: 'North (°N)' },
                          { key: 'south', label: 'South (°N)' },
                          { key: 'west', label: 'West (°)' },
                          { key: 'east', label: 'East (°)' },
                        ].map((field) => (
                          <div key={field.key}>
                            <label className="block font-mono text-[10px] uppercase text-[#5B6478] mb-1">
                              {field.label}
                            </label>
                            <input
                              type="number"
                              value={bounds[field.key]}
                              onChange={(e) => {
                                setSubregion('Custom region');
                                setBounds((b) => ({
                                  ...b,
                                  [field.key]: Number(e.target.value),
                                }));
                              }}
                              className="w-full h-11 rounded-full bg-white border border-[#E6E0D2] px-4 font-mono text-[13px] tabular-nums"
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {Math.abs(bounds.east - bounds.west) < 4 && (
                      <div className="p-3 rounded-[16px] bg-[#FF7A6B]/15 border border-[#FF7A6B] flex items-center gap-2 text-[12px] text-[#131D38]">
                        <AlertTriangle className="w-4 h-4 text-[#C24136] shrink-0" />
                        <span>Region is very small for MERRA-2 0.5° grid resolution.</span>
                      </div>
                    )}
                  </div>

                  {/* Right Interactive Map (7 cols ~60%) */}
                  <div className="lg:col-span-7 relative rounded-[24px] bg-[#f4f1ea] border border-[#E6E0D2] overflow-hidden p-3">
                    <svg
                      ref={svgRef}
                      viewBox="0 0 420 260"
                      onPointerDown={(e) => {
                        if (geoTab !== 'draw') return;
                        const pt = mapPointToCoords(e.clientX, e.clientY);
                        setDragStart(pt);
                        setSubregion('Custom region');
                      }}
                      onPointerMove={(e) => {
                        if (geoTab !== 'draw' || !dragStart) return;
                        const pt = mapPointToCoords(e.clientX, e.clientY);
                        setBounds({
                          north: Math.max(dragStart.lat, pt.lat),
                          south: Math.min(dragStart.lat, pt.lat),
                          west: Math.min(dragStart.lon, pt.lon),
                          east: Math.max(dragStart.lon, pt.lon),
                        });
                      }}
                      onPointerUp={() => setDragStart(null)}
                      className={`w-full h-auto rounded-[18px] bg-[#FAF8F3] ${
                        geoTab === 'draw' ? 'cursor-crosshair' : ''
                      }`}
                      style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
                    >
                      {/* Lat/Lon Grid */}
                      {[52, 104, 156, 208].map((y) => (
                        <line
                          key={y}
                          x1="0"
                          y1={y}
                          x2="420"
                          y2={y}
                          stroke="#E6E0D2"
                          strokeWidth="1"
                        />
                      ))}
                      {[84, 168, 252, 336].map((x) => (
                        <line
                          key={x}
                          x1={x}
                          y1="0"
                          x2={x}
                          y2="260"
                          stroke="#E6E0D2"
                          strokeWidth="1"
                        />
                      ))}
                      {/* Simplified Africa silhouette */}
                      <path
                        d="M52 24 L370 24 L398 100 L382 238 L250 238 L210 194 L128 198 L62 152 L44 92 Z"
                        fill="#E6E0D2"
                        fillOpacity="0.65"
                        stroke="#131D38"
                        strokeOpacity="0.2"
                      />
                      {/* Animated Amber Study Box */}
                      <rect
                        x={boxX}
                        y={boxY}
                        width={boxW}
                        height={boxH}
                        fill="#ffc20d"
                        fillOpacity="0.18"
                        stroke="#ffc20d"
                        strokeWidth="2.5"
                      />
                    </svg>

                    {/* Floating glass area chip */}
                    <div className="absolute top-5 left-5 rounded-full bg-[#131D38]/90 text-[#f4f1ea] px-3.5 py-1.5 font-mono text-[11px] tabular-nums">
                      ≈ {areaMillionKm2} M km² · {Math.abs(bounds.east - bounds.west)}° ×{' '}
                      {Math.abs(bounds.north - bounds.south)}°
                    </div>

                    {/* Round zoom controls & reset */}
                    <div className="absolute bottom-5 right-5 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setZoom((z) => Math.max(1, Number((z - 0.15).toFixed(2))))}
                        aria-label="Zoom out"
                        className="w-8 h-8 rounded-full bg-white border border-[#E6E0D2] inline-flex items-center justify-center cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setZoom((z) => Math.min(1.45, Number((z + 0.15).toFixed(2))))
                        }
                        aria-label="Zoom in"
                        className="w-8 h-8 rounded-full bg-white border border-[#E6E0D2] inline-flex items-center justify-center cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setZoom(1);
                          handleSelectSubregion(SUBREGIONS[1]);
                        }}
                        className="px-3 h-8 rounded-full bg-white border border-[#E6E0D2] text-[11px] font-medium cursor-pointer"
                      >
                        Reset view
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: TEMPORAL CONFIGURATION */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h1 className="font-display text-[28px] sm:text-[32px] font-semibold">
                    Choose the{' '}
                    <span className="font-editorial-italic font-normal underline decoration-[#ffc20d] decoration-[3px] underline-offset-6">
                      period
                    </span>
                  </h1>
                  <span className="px-4 py-1.5 rounded-full bg-[#131D38] text-[#ffc20d] font-mono text-[12px] tabular-nums">
                    {yearsCount} years
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="wiz-start-yr"
                      className="block font-mono text-[11px] uppercase text-[#5B6478] mb-1.5"
                    >
                      Start year
                    </label>
                    <input
                      id="wiz-start-yr"
                      type="range"
                      min={2000}
                      max={endYear - 1}
                      value={startYear}
                      onChange={(e) => setStartYear(Number(e.target.value))}
                      className="w-full accent-[#131D38]"
                    />
                    <div className="mt-1 font-mono text-[15px] font-semibold tabular-nums">
                      {startYear}
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="wiz-end-yr"
                      className="block font-mono text-[11px] uppercase text-[#5B6478] mb-1.5"
                    >
                      End year
                    </label>
                    <input
                      id="wiz-end-yr"
                      type="range"
                      min={startYear + 1}
                      max={2025}
                      value={endYear}
                      onChange={(e) => setEndYear(Number(e.target.value))}
                      className="w-full accent-[#131D38]"
                    />
                    <div className="mt-1 font-mono text-[15px] font-semibold tabular-nums">
                      {endYear}
                    </div>
                  </div>
                </div>

                {yearsCount < 20 && (
                  <div className="p-3.5 rounded-[16px] bg-[#FF7A6B]/15 border border-[#FF7A6B] flex items-center gap-2.5 text-[13px]">
                    <AlertTriangle className="w-4 h-4 text-[#C24136] shrink-0" />
                    <span>Fewer than 20 years may not be enough for robust trend tests.</span>
                  </div>
                )}

                <div>
                  <div className="font-mono text-[11px] uppercase text-[#5B6478] mb-2.5">
                    Analysis season
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setSeasonPreset('rainy');
                        setMonths([5, 6, 7, 8]);
                      }}
                      className={`p-4 rounded-[20px] border text-left cursor-pointer ${
                        seasonPreset === 'rainy'
                          ? 'bg-[#131D38] text-[#f4f1ea] border-[#131D38]'
                          : 'bg-white border-[#E6E0D2]'
                      }`}
                    >
                      <span className="inline-block px-2 py-0.5 rounded-full bg-[#ffc20d] text-[#131D38] font-mono text-[9px] font-semibold mb-2">
                        RECOMMENDED
                      </span>
                      <div className="text-[14px] font-semibold">Rainy season (Jun–Sep)</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSeasonPreset('annual');
                        setMonths([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
                      }}
                      className={`p-4 rounded-[20px] border text-left cursor-pointer ${
                        seasonPreset === 'annual'
                          ? 'bg-[#131D38] text-[#f4f1ea] border-[#131D38]'
                          : 'bg-white border-[#E6E0D2]'
                      }`}
                    >
                      <div className="text-[14px] font-semibold mt-5">Annual (Jan–Dec)</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSeasonPreset('custom')}
                      className={`p-4 rounded-[20px] border text-left cursor-pointer ${
                        seasonPreset === 'custom'
                          ? 'bg-[#131D38] text-[#f4f1ea] border-[#131D38]'
                          : 'bg-white border-[#E6E0D2]'
                      }`}
                    >
                      <div className="text-[14px] font-semibold mt-5">Custom months</div>
                    </button>
                  </div>
                </div>

                {/* 12 Month Pills */}
                <div>
                  <div className="font-mono text-[11px] uppercase text-[#5B6478] mb-2">
                    Selected months
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {MONTH_LABELS.map((m, idx) => {
                      const active = months.includes(idx);
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setSeasonPreset('custom');
                            setMonths((prev) =>
                              prev.includes(idx)
                                ? prev.length > 1
                                  ? prev.filter((x) => x !== idx)
                                  : prev
                                : [...prev, idx].sort((a, b) => a - b)
                            );
                          }}
                          className={`w-10 h-10 rounded-full font-mono text-[12px] font-semibold transition-colors cursor-pointer ${
                            active
                              ? 'bg-[#131D38] text-[#f4f1ea]'
                              : 'bg-white border border-[#E6E0D2] text-[#5B6478]'
                          }`}
                        >
                          {m}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-3 text-[12px] text-[#5B6478]">
                    Winter seasons crossing year boundaries (e.g. Nov–Feb) are assigned to the year
                    in which they end.
                  </p>
                </div>
              </div>
            )}

            {/* STEP 4: ENVIRONMENTAL VARIABLES */}
            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <h1 className="font-display text-[28px] sm:text-[32px] font-semibold">
                    What will you{' '}
                    <span className="font-editorial-italic font-normal underline decoration-[#ffc20d] decoration-[3px] underline-offset-6">
                      investigate?
                    </span>
                  </h1>
                  <p className="mt-2 text-[14px] text-[#5B6478]">
                    Choose one primary variable. Supporting variables are used as evidence, not as
                    proof.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Primary Variable Card */}
                  <div className="sm:col-span-2 rounded-[24px] bg-[#131D38] text-[#f4f1ea] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <span className="w-12 h-12 rounded-[16px] bg-[#1E2B52] text-[#4FB3A9] inline-flex items-center justify-center">
                        <CloudRain className="w-6 h-6" />
                      </span>
                      <div>
                        <span className="font-mono text-[10px] uppercase tracking-wider text-[#ffc20d]">
                          PRIMARY VARIABLE
                        </span>
                        <div className="font-display text-[18px] font-semibold">Precipitation</div>
                      </div>
                    </div>

                    <div className="p-1 rounded-full bg-[#0B1224] inline-flex text-[12px]">
                      <button
                        type="button"
                        onClick={() => setComputeMode('totals')}
                        className={`px-4 py-1.5 rounded-full cursor-pointer ${
                          computeMode === 'totals'
                            ? 'bg-[#ffc20d] text-[#131D38] font-semibold'
                            : 'text-[#A9B1C6]'
                        }`}
                      >
                        Totals
                      </button>
                      <button
                        type="button"
                        onClick={() => setComputeMode('extremes')}
                        className={`px-4 py-1.5 rounded-full cursor-pointer ${
                          computeMode === 'extremes'
                            ? 'bg-[#ffc20d] text-[#131D38] font-semibold'
                            : 'text-[#A9B1C6]'
                        }`}
                      >
                        Extremes (Rx1day, R95p, SDII, CDD)
                      </button>
                    </div>
                  </div>

                  {computeMode === 'extremes' && (
                    <div className="sm:col-span-2 px-4 py-2.5 rounded-[16px] bg-[#f4f1ea] border border-[#E6E0D2] flex items-center justify-between text-[13px]">
                      <span>
                        Extreme indices (Rx1day, R95p, SDII, CDD) require daily precipitation data.
                      </span>
                      <button
                        type="button"
                        onClick={() => setStep(4)}
                        className="font-semibold underline underline-offset-4 cursor-pointer"
                      >
                        Check datasets →
                      </button>
                    </div>
                  )}

                  {/* Supporting Variables */}
                  {[
                    { name: 'Atmospheric moisture', icon: Layers },
                    { name: 'Aerosols', icon: Wind },
                    { name: 'Vegetation (NDVI)', icon: Sparkles },
                    { name: 'Temperature', icon: Sparkles },
                  ].map((item) => {
                    const selected = supportingVars.includes(item.name);
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() =>
                          setSupportingVars((prev) =>
                            prev.includes(item.name)
                              ? prev.filter((x) => x !== item.name)
                              : [...prev, item.name]
                          )
                        }
                        className={`p-4 rounded-[20px] border text-left flex items-center justify-between gap-3 cursor-pointer transition-all ${
                          selected
                            ? 'bg-white border-[#131D38] shadow-sm'
                            : 'bg-[#f4f1ea]/60 border-[#E6E0D2]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-10 h-10 rounded-[14px] bg-[#f4f1ea] inline-flex items-center justify-center text-[#131D38]">
                            <Icon className="w-4 h-4" />
                          </span>
                          <div>
                            <div className="font-mono text-[10px] uppercase text-[#5B6478]">
                              SUPPORTING
                            </div>
                            <div className="text-[14px] font-semibold">{item.name}</div>
                          </div>
                        </div>
                        <span
                          className={`w-5 h-5 rounded-full border inline-flex items-center justify-center ${
                            selected
                              ? 'bg-[#ffc20d] border-[#ffc20d] text-[#131D38]'
                              : 'border-[#E6E0D2]'
                          }`}
                        >
                          {selected && <Check className="w-3 h-3 stroke-[2.5]" />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STEP 5: DATASET SELECTION */}
            {step === 4 && (
              <div className="space-y-6">
                <div>
                  <h1 className="font-display text-[28px] sm:text-[32px] font-semibold">
                    Pick your{' '}
                    <span className="font-editorial-italic font-normal underline decoration-[#ffc20d] decoration-[3px] underline-offset-6">
                      data
                    </span>
                  </h1>
                </div>

                <div className="space-y-4">
                  {datasets.map((ds) => {
                    const isPrimary = ds.id === primaryDatasetId;
                    const isSupporting = supportingDatasetIds.includes(ds.id);
                    const isEarthCare = ds.agency === 'ESA/JAXA';
                    const active = isPrimary || isSupporting;

                    const leftPct = Math.max(0, ((ds.coverageStart - 2000) / 26) * 100);
                    const widthPct = Math.min(
                      100 - leftPct,
                      ((ds.coverageEnd - ds.coverageStart) / 26) * 100
                    );
                    const selLeftPct = ((startYear - 2000) / 26) * 100;
                    const selWidthPct = ((endYear - startYear) / 26) * 100;

                    return (
                      <div
                        key={ds.id}
                        className={`rounded-[22px] border p-5 transition-all ${
                          active ? 'bg-white border-[#131D38]' : 'bg-[#f4f1ea]/60 border-[#E6E0D2]'
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-display text-[17px] font-semibold">
                                {ds.name}
                              </span>
                              <span className="font-mono text-[10px] uppercase px-2.5 py-0.5 rounded-full bg-[#f4f1ea] border border-[#E6E0D2]">
                                {ds.agency}
                              </span>
                              <span className="font-mono text-[10px] uppercase px-2.5 py-0.5 rounded-full bg-[#131D38] text-[#ffc20d]">
                                {ds.status}
                              </span>
                              {ds.roleType === 'primary' && (
                                <span className="font-mono text-[10px] uppercase px-2.5 py-0.5 rounded-full bg-[#ffc20d] text-[#131D38] font-semibold">
                                  RECOMMENDED FOR PRECIPITATION
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-[13px] text-[#5B6478]">{ds.notes}</p>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => onOpenDatasetDetail(ds)}
                              className="text-[12px] font-semibold underline underline-offset-4 cursor-pointer"
                            >
                              Details
                            </button>
                            {ds.roleType === 'primary' ? (
                              <button
                                type="button"
                                onClick={() => setPrimaryDatasetId(ds.id)}
                                className="px-4 py-1.5 rounded-full bg-[#131D38] text-[#f4f1ea] text-[12px] font-semibold cursor-pointer"
                              >
                                Primary
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  setSupportingDatasetIds((prev) =>
                                    prev.includes(ds.id)
                                      ? prev.filter((x) => x !== ds.id)
                                      : [...prev, ds.id]
                                  )
                                }
                                className={`px-4 py-1.5 rounded-full text-[12px] font-semibold cursor-pointer ${
                                  isSupporting
                                    ? 'bg-[#ffc20d] text-[#131D38]'
                                    : 'border border-[#131D38]/25 text-[#131D38]'
                                }`}
                              >
                                {isSupporting ? 'Included' : 'Include'}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Coverage Bar 2000-2026 */}
                        <div className="mt-4">
                          <div className="relative h-2.5 rounded-full bg-[#E6E0D2] overflow-hidden">
                            <div
                              className="absolute top-0 bottom-0 bg-[#131D38] rounded-full"
                              style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                            />
                            <div
                              className="absolute top-0 bottom-0 border-2 border-[#ffc20d] rounded-sm"
                              style={{ left: `${selLeftPct}%`, width: `${selWidthPct}%` }}
                              title={`Selected period ${startYear}–${endYear}`}
                            />
                          </div>
                        </div>

                        {isEarthCare && (
                          <div className="mt-3 rounded-[14px] bg-[#131D38] text-[#ffc20d] px-3.5 py-2 text-[12px] font-mono">
                            ESA/JAXA · record begins in 2024. Process case study only, it can’t be
                            used for 2001–2025 trends.
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="rounded-[20px] bg-[#131D38] text-[#f4f1ea] p-4 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[14px]">
                    Common period of selected datasets:{' '}
                    <strong className="font-mono text-[#ffc20d] tabular-nums">
                      {commonPeriod.start}–{commonPeriod.end}
                    </strong>
                  </span>
                  {commonPeriod.start > startYear && (
                    <span className="text-[12px] text-[#FF7A6B]">
                      Adjusted by MODIS NDVI regional availability (starts 2003).
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* STEP 6: REVIEW AND CREATE */}
            {step === 5 && (
              <div className="space-y-6">
                <div>
                  <h1 className="font-display text-[28px] sm:text-[32px] font-semibold">
                    Review and{' '}
                    <span className="font-editorial-italic font-normal underline decoration-[#ffc20d] decoration-[3px] underline-offset-6">
                      create
                    </span>
                  </h1>
                </div>

                <div className="divide-y divide-[#E6E0D2] rounded-[22px] bg-white border border-[#E6E0D2]">
                  {[
                    {
                      label: 'Details',
                      val: `${name || `${subregion} Rainfall Study`}`,
                      stepIdx: 0,
                    },
                    {
                      label: 'Region',
                      val: `${subregion} (${bounds.south}°N–${bounds.north}°N, ${bounds.west}°–${bounds.east}°)`,
                      stepIdx: 1,
                    },
                    {
                      label: 'Period',
                      val: `${startYear}–${endYear} · ${months.length} months`,
                      stepIdx: 2,
                    },
                    {
                      label: 'Variables',
                      val: `${primaryVar} (${computeMode}) + ${supportingVars.length} supporting`,
                      stepIdx: 3,
                    },
                    {
                      label: 'Datasets',
                      val: `GPM IMERG Final V07 + ${supportingDatasetIds.length} supporting`,
                      stepIdx: 4,
                    },
                  ].map((row) => (
                    <div key={row.label} className="p-4 flex items-center justify-between gap-4">
                      <div>
                        <div className="font-mono text-[10px] uppercase text-[#5B6478]">
                          {row.label}
                        </div>
                        <div className="text-[14px] font-medium text-[#131D38]">{row.val}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setStep(row.stepIdx)}
                        className="text-[13px] font-semibold underline underline-offset-4 cursor-pointer"
                      >
                        Edit
                      </button>
                    </div>
                  ))}
                </div>

                {/* Data Availability Checklist */}
                <div className="rounded-[20px] bg-[#f4f1ea] border border-[#E6E0D2] p-4 space-y-2 text-[13px]">
                  <div className="flex items-center gap-2 text-[#131D38]">
                    <CheckCircle2 className="w-4 h-4 text-[#4FB3A9]" />
                    <span>
                      GPM IMERG Final V07 covers {startYear}–{endYear}
                    </span>
                  </div>
                  {supportingDatasetIds.includes('modis-aod-ndvi') && (
                    <div className="flex items-center gap-2 text-[#131D38]">
                      <AlertTriangle className="w-4 h-4 text-[#FF7A6B]" />
                      <span>MODIS NDVI partial coverage (unavailable 2001–2002 in region)</span>
                    </div>
                  )}
                </div>

                <p className="font-mono text-[11px] uppercase tracking-wider text-[#5B6478]">
                  What you’ll get: time series · trend test · Sen’s slope · evidence ledger ·
                  scenarios · report
                </p>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleFinish('draft')}
                    className="px-6 py-3 rounded-full border border-[#131D38]/25 text-[14px] font-semibold cursor-pointer"
                  >
                    Save as draft
                  </button>
                  <button
                    type="button"
                    disabled={creatingLoader}
                    onClick={() => handleFinish('create')}
                    className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-[#ffc20d] text-[#131D38] text-[14px] font-semibold cursor-pointer"
                  >
                    {creatingLoader ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Setting up your investigation…</span>
                      </>
                    ) : (
                      <>
                        <span>Create investigation</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </motion.section>

          {/* Right 4 Cols: Sticky Navy Live Summary */}
          <aside className="xl:col-span-4 xl:sticky xl:top-6 rounded-[28px] bg-[#131D38] text-[#f4f1ea] p-6 sm:p-7 shadow-instrument-dark space-y-5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#ffc20d]">
                YOUR INVESTIGATION
              </span>
              <MapPin className="w-4 h-4 text-[#4FB3A9]" />
            </div>

            <div className="h-32 rounded-[18px] bg-[#0B1224] border border-[#f4f1ea]/10 overflow-hidden p-2">
              <svg viewBox="0 0 420 260" className="w-full h-full">
                <path
                  d="M52 24 L370 24 L398 100 L382 238 L250 238 L210 194 L128 198 L62 152 L44 92 Z"
                  fill="#1E2B52"
                />
                <rect
                  x={boxX}
                  y={boxY}
                  width={boxW}
                  height={boxH}
                  fill="#4FB3A9"
                  fillOpacity="0.3"
                  stroke="#ffc20d"
                  strokeWidth="3"
                />
              </svg>
            </div>

            <dl className="divide-y divide-[#f4f1ea]/10 text-[13px]">
              {[
                { label: 'Name', value: name.trim() || '—' },
                { label: 'Region', value: subregion },
                { label: 'Period', value: `${startYear}–${endYear}` },
                { label: 'Season', value: `${months.length} months` },
                { label: 'Variables', value: `${primaryVar} + ${supportingVars.length}` },
                { label: 'Datasets', value: `${1 + supportingDatasetIds.length} selected` },
              ].map((row) => (
                <div key={row.label} className="py-2.5 flex items-center justify-between gap-3">
                  <dt className="text-[#A9B1C6]">{row.label}</dt>
                  <dd className="font-medium text-[#f4f1ea] truncate max-w-[190px] flex items-center gap-1.5">
                    {row.value !== '—' && <Check className="w-3.5 h-3.5 text-[#ffc20d] shrink-0" />}
                    <span>{row.value}</span>
                  </dd>
                </div>
              ))}
            </dl>

            <div className="pt-2">
              <div className="flex items-center justify-between font-mono text-[10px] uppercase text-[#A9B1C6] mb-1.5">
                <span>Readiness</span>
                <span>{step + 1} of 6 steps complete</span>
              </div>
              <div className="h-2 rounded-full bg-[#0B1224] overflow-hidden">
                <div
                  className="h-full bg-hatched-amber transition-all duration-300"
                  style={{ width: `${((step + 1) / 6) * 100}%` }}
                />
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* Sticky Footer Bar */}
      <footer className="fixed bottom-0 inset-x-0 z-30 bg-[#FBFAF6]/95 backdrop-blur-md border-t border-[#E6E0D2] py-3.5 px-4 sm:px-8">
        <div className="max-w-[1280px] mx-auto flex items-center justify-between gap-4">
          <button
            type="button"
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[14px] font-medium text-[#131D38] hover:bg-[#f4f1ea] disabled:opacity-35 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <span className="hidden sm:inline font-mono text-[11px] uppercase tracking-wider text-[#5B6478]">
            STEP {step + 1} OF 6
          </span>

          <button
            type="button"
            onClick={handleContinue}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#ffc20d] text-[#131D38] text-[14px] font-semibold hover:bg-[#eab006] cursor-pointer"
          >
            <span>{step === STEPS.length - 1 ? 'Create investigation' : 'Continue'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </footer>

      {/* Exit Confirmation Modal */}
      {exitPromptOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B1224]/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[28px] bg-[#FBFAF6] border border-[#E6E0D2] p-6 shadow-instrument-dark">
            <h2 className="font-display text-[20px] font-semibold">Save as draft?</h2>
            <p className="mt-2 text-[14px] text-[#5B6478]">
              Your configuration can be saved as a draft in My Investigations or discarded.
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-2.5">
              <button
                type="button"
                onClick={onExit}
                className="px-4 py-2 rounded-full border border-[#E6E0D2] text-[13px] cursor-pointer"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={() => handleFinish('draft')}
                className="px-5 py-2 rounded-full bg-[#ffc20d] text-[#131D38] text-[13px] font-semibold cursor-pointer"
              >
                Save draft
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
