'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  Archive,
  ArrowDownUp,
  ArrowRight,
  Check,
  ChevronDown,
  Clock,
  CloudRain,
  Copy,
  Download,
  Filter,
  FolderOpen,
  Globe2,
  LayoutGrid,
  List,
  MapPin,
  MoreHorizontal,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Wind,
  X,
} from 'lucide-react';
import { WORKFLOW_LAYERS } from '@/app/api/earthSignalData';

const PREFS_KEY = 'earthsignal_library_prefs_v1';

function StatusBadge({ status }) {
  switch (status) {
    case 'in_progress':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ffc20d] text-[#131D38] text-[11px] font-semibold whitespace-nowrap">
          <span
            className="w-1.5 h-1.5 rounded-full bg-[#131D38] motion-safe:animate-pulse"
            aria-hidden="true"
          />
          <span>In progress</span>
        </span>
      );
    case 'completed':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#131D38] text-[#f4f1ea] text-[11px] font-semibold whitespace-nowrap">
          <Check className="w-3 h-3 text-[#ffc20d]" aria-hidden="true" />
          <span>Completed</span>
        </span>
      );
    case 'draft':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FBFAF6] border border-[#E6E0D2] text-[#5B6478] text-[11px] font-medium whitespace-nowrap">
          <Clock className="w-3 h-3" aria-hidden="true" />
          <span>Draft</span>
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E6E0D2]/70 text-[#5B6478] text-[11px] font-medium whitespace-nowrap">
          <Archive className="w-3 h-3" aria-hidden="true" />
          <span>Archived</span>
        </span>
      );
  }
}

function ThumbnailMap({ region, variable }) {
  const isWater =
    variable === 'Precipitation' || variable === 'Rainfall' || variable === 'Atmospheric moisture';
  return (
    <svg viewBox="0 0 300 200" className="w-full h-full" aria-label={`Study box map for ${region}`}>
      <rect width="300" height="200" fill="#131D38" />
      <line x1="0" y1="66" x2="300" y2="66" stroke="#f4f1ea" strokeOpacity="0.08" />
      <line x1="0" y1="133" x2="300" y2="133" stroke="#f4f1ea" strokeOpacity="0.08" />
      <line x1="100" y1="0" x2="100" y2="200" stroke="#f4f1ea" strokeOpacity="0.08" />
      <line x1="200" y1="0" x2="200" y2="200" stroke="#f4f1ea" strokeOpacity="0.08" />
      <path
        d="M42 28 L252 26 L276 88 L262 178 L178 174 L142 146 L78 150 L36 116 Z"
        fill="#1E2B52"
        stroke="#f4f1ea"
        strokeOpacity="0.2"
      />
      <rect
        x="58"
        y="74"
        width="184"
        height="52"
        rx="10"
        fill={isWater ? '#4FB3A9' : '#ffc20d'}
        fillOpacity="0.32"
      />
      <rect
        x="58"
        y="74"
        width="184"
        height="52"
        fill="none"
        stroke="#ffc20d"
        strokeWidth="2"
        strokeDasharray="5 4"
      />
    </svg>
  );
}

export function InvestigationsLibraryPage({
  investigations,
  isGuest,
  loading = false,
  highlightId = null,
  onNewInvestigation,
  onOpenInvestigation,
  onDuplicateInvestigation,
  onDeleteInvestigation,
  onRestoreInvestigation,
  onOpenAuth,
  onShowToast,
}) {
  const searchInputRef = useRef(null);

  // Restore saved view & filter state or URL params
  const initialPrefs = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    let saved = {};
    try {
      saved = JSON.parse(window.localStorage.getItem(PREFS_KEY) || '{}');
    } catch {
      saved = {};
    }
    return {
      view: saved.view || 'cards',
      sort: saved.sort || 'updated_desc',
      region: params.get('region') || 'all',
      status: params.get('status') || 'all',
      variable: params.get('variable') || 'all',
    };
  }, []);

  const [rawSearch, setRawSearch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [regionFilter, setRegionFilter] = useState(initialPrefs.region);
  const [variableFilter, setVariableFilter] = useState(initialPrefs.variable);
  const [statusFilter, setStatusFilter] = useState(initialPrefs.status);
  const [sortBy, setSortBy] = useState(initialPrefs.sort);
  const [viewMode, setViewMode] = useState(initialPrefs.view);
  const [pageLimit, setPageLimit] = useState(12);

  // Selection & Menus
  const [selectedIds, setSelectedIds] = useState([]);
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Delete & Export modals
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [exportTarget, setExportTarget] = useState(null);
  const [exportFormats, setExportFormats] = useState({
    pdf: true,
    csv: true,
    json: true,
    png: false,
  });
  const [includeProvenance, setIncludeProvenance] = useState(true);

  // 200ms search debounce
  useEffect(() => {
    const t = window.setTimeout(() => setSearchQuery(rawSearch), 200);
    return () => window.clearTimeout(t);
  }, [rawSearch]);

  // Persist view + sort + URL query params
  useEffect(() => {
    try {
      window.localStorage.setItem(PREFS_KEY, JSON.stringify({ view: viewMode, sort: sortBy }));
    } catch {
      // Ignore
    }
    const params = new URLSearchParams();
    if (regionFilter !== 'all') params.set('region', regionFilter);
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (variableFilter !== 'all') params.set('variable', variableFilter);
    const qs = params.toString();
    const nextUrl = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState(null, '', nextUrl);
  }, [viewMode, sortBy, regionFilter, statusFilter, variableFilter]);

  // Keyboard "/" focuses search, Esc closes modals
  useEffect(() => {
    const onKey = (e) => {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setMenuOpenId(null);
        setDeleteTarget(null);
        setExportTarget(null);
        setMobileFiltersOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Counts by status
  const counts = useMemo(() => {
    return {
      all: investigations.length,
      in_progress: investigations.filter((i) => i.status === 'in_progress').length,
      completed: investigations.filter((i) => i.status === 'completed').length,
      draft: investigations.filter((i) => i.status === 'draft').length,
      archived: investigations.filter((i) => i.status === 'archived').length,
    };
  }, [investigations]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = investigations.filter((inv) => {
      if (q && !inv.title.toLowerCase().includes(q) && !inv.region.toLowerCase().includes(q)) {
        return false;
      }
      if (regionFilter !== 'all') {
        if (regionFilter === 'Custom region') {
          if (['Western Sahel', 'Central Sahel', 'Eastern Sahel'].includes(inv.region)) {
            return false;
          }
        } else if (inv.region !== regionFilter) {
          return false;
        }
      }
      if (variableFilter !== 'all') {
        const normalizedVar = inv.variable === 'Rainfall' ? 'Precipitation' : inv.variable;
        if (normalizedVar !== variableFilter) return false;
      }
      if (statusFilter !== 'all' && inv.status !== statusFilter) {
        return false;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      switch (sortBy) {
        case 'updated_asc':
          return a.updatedAt.localeCompare(b.updatedAt);
        case 'created_desc':
          return b.createdAt.localeCompare(a.createdAt);
        case 'created_asc':
          return a.createdAt.localeCompare(b.createdAt);
        case 'name_asc':
          return a.title.localeCompare(b.title);
        default:
          return b.updatedAt.localeCompare(a.updatedAt);
      }
    });
  }, [investigations, searchQuery, regionFilter, variableFilter, statusFilter, sortBy]);

  const visibleItems = filtered.slice(0, pageLimit);
  const hasFilters =
    searchQuery.trim() !== '' ||
    regionFilter !== 'all' ||
    variableFilter !== 'all' ||
    statusFilter !== 'all';

  const clearAllFilters = () => {
    setRawSearch('');
    setSearchQuery('');
    setRegionFilter('all');
    setVariableFilter('all');
    setStatusFilter('all');
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    const removed = deleteTarget;
    onDeleteInvestigation(removed.id);
    setDeleteTarget(null);
    onShowToast(`Investigation "${removed.title}" deleted`, () => {
      onRestoreInvestigation(removed);
    });
  };

  const handleExportSubmit = () => {
    if (!exportTarget) return;
    if (exportFormats.json) {
      const payload = {
        investigation: exportTarget,
        includeProvenance,
        exportedAt: new Date().toISOString(),
        note:
          exportTarget.status !== 'completed'
            ? 'Partial results — investigation in progress.'
            : 'Complete structure.',
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${exportTarget.id}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (exportFormats.csv) {
      const csv = [
        'title,region,coords,period,variable,dataset,dataset_status,stage',
        `"${exportTarget.title}","${exportTarget.region}","${exportTarget.coords}","${exportTarget.period}","${exportTarget.variable}","${exportTarget.dataset}","${exportTarget.datasetStatus}","${WORKFLOW_LAYERS[exportTarget.stageIndex]?.title ?? 'Detect'}"`,
      ].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${exportTarget.id}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
    setExportTarget(null);
    onShowToast(`Exported "${exportTarget.title}" package.`);
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  return (
    <div className="space-y-6">
      {/* Guest mode slim banner */}
      {isGuest && (
        <div className="rounded-[20px] bg-[#131D38] text-[#f4f1ea] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-[13px]">
          <div className="flex items-center gap-2.5">
            <Globe2 className="w-4 h-4 text-[#4FB3A9] shrink-0" />
            <span>Demo mode: your investigations are saved on this device only.</span>
          </div>
          <button
            type="button"
            onClick={onOpenAuth}
            className="font-semibold text-[#ffc20d] hover:underline underline-offset-4 cursor-pointer"
          >
            Create account to sync →
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[36px] sm:text-[44px] font-semibold leading-[1.08] tracking-[-0.025em] text-[#131D38]">
            My{' '}
            <span className="font-editorial-italic font-normal underline decoration-[#ffc20d] decoration-[3px] underline-offset-8">
              Investigations
            </span>
          </h1>
          <p className="mt-3 text-[16px] text-[#5B6478]">
            Every investigation you’ve started, from first signal to final report.
          </p>
        </div>

        <div className="font-mono text-[12px] uppercase tracking-[0.1em] text-[#5B6478] tabular-nums">
          {counts.all} TOTAL · {counts.in_progress} IN PROGRESS · {counts.completed} COMPLETED
        </div>
      </div>

      {/* Sticky Rounded Toolbar (#FBFAF6, radius 28px) */}
      <div className="sticky top-4 z-20 rounded-[28px] bg-[#FBFAF6] border border-[#E6E0D2] p-4 sm:p-5 shadow-[0_20px_50px_rgba(19,29,56,0.08)] space-y-4">
        {/* Row 1: Search & Filters */}
        <div className="flex flex-wrap lg:flex-nowrap items-center gap-3">
          {/* Search field (52px pill) */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-[#5B6478] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={rawSearch}
              onChange={(e) => setRawSearch(e.target.value)}
              placeholder="Search by investigation name…"
              aria-label="Search by investigation name"
              className="w-full h-[52px] rounded-full bg-[#f4f1ea] border border-[#E6E0D2] pl-11 pr-10 text-[14px] text-[#131D38] placeholder:text-[#5B6478] focus:outline-none focus:border-[#131D38]"
            />
            {rawSearch && (
              <button
                type="button"
                onClick={() => {
                  setRawSearch('');
                  setSearchQuery('');
                }}
                aria-label="Clear search"
                className="w-7 h-7 rounded-full hover:bg-[#E6E0D2] inline-flex items-center justify-center absolute right-3 top-1/2 -translate-y-1/2 text-[#5B6478] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Mobile Filters Trigger */}
          <button
            type="button"
            onClick={() => setMobileFiltersOpen(true)}
            className="sm:hidden inline-flex items-center gap-2 h-[52px] px-5 rounded-full bg-[#f4f1ea] border border-[#E6E0D2] text-[14px] font-medium text-[#131D38] cursor-pointer"
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
          </button>

          {/* Desktop/Tablet Dropdown Pills */}
          <div className="hidden sm:flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <select
                aria-label="Filter by region"
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value)}
                className="appearance-none h-[46px] rounded-full bg-[#f4f1ea] border border-[#E6E0D2] pl-4 pr-9 text-[13px] font-medium text-[#131D38] focus:outline-none cursor-pointer"
              >
                <option value="all">All regions</option>
                <option value="Western Sahel">Western Sahel</option>
                <option value="Central Sahel">Central Sahel</option>
                <option value="Eastern Sahel">Eastern Sahel</option>
                <option value="Custom region">Custom region</option>
              </select>
              <ChevronDown className="w-4 h-4 text-[#5B6478] pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
            </div>

            <div className="relative">
              <select
                aria-label="Filter by variable"
                value={variableFilter}
                onChange={(e) => setVariableFilter(e.target.value)}
                className="appearance-none h-[46px] rounded-full bg-[#f4f1ea] border border-[#E6E0D2] pl-4 pr-9 text-[13px] font-medium text-[#131D38] focus:outline-none cursor-pointer"
              >
                <option value="all">All variables</option>
                <option value="Precipitation">Precipitation</option>
                <option value="Atmospheric moisture">Atmospheric moisture</option>
                <option value="Vegetation (NDVI)">Vegetation (NDVI)</option>
              </select>
              <ChevronDown className="w-4 h-4 text-[#5B6478] pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
            </div>

            <div className="relative">
              <ArrowDownUp className="w-3.5 h-3.5 text-[#5B6478] pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2" />
              <select
                aria-label="Sort investigations"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="appearance-none h-[46px] rounded-full bg-[#f4f1ea] border border-[#E6E0D2] pl-9 pr-9 text-[13px] font-medium text-[#131D38] focus:outline-none cursor-pointer"
              >
                <option value="updated_desc">Last updated (newest)</option>
                <option value="updated_asc">Last updated (oldest)</option>
                <option value="created_desc">Created (newest)</option>
                <option value="created_asc">Created (oldest)</option>
                <option value="name_asc">Name A–Z</option>
              </select>
              <ChevronDown className="w-4 h-4 text-[#5B6478] pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
            </div>

            {/* Cards / Table View Toggle (hidden below 1024px) */}
            <div
              className="hidden lg:inline-flex p-1 rounded-full bg-[#f4f1ea] border border-[#E6E0D2]"
              role="group"
              aria-label="View mode"
            >
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                aria-pressed={viewMode === 'cards'}
                aria-label="Card view"
                className={`w-9 h-9 rounded-full inline-flex items-center justify-center transition-colors cursor-pointer ${
                  viewMode === 'cards'
                    ? 'bg-[#131D38] text-[#f4f1ea]'
                    : 'text-[#5B6478] hover:text-[#131D38]'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                aria-pressed={viewMode === 'table'}
                aria-label="Table view"
                className={`w-9 h-9 rounded-full inline-flex items-center justify-center transition-colors cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-[#131D38] text-[#f4f1ea]'
                    : 'text-[#5B6478] hover:text-[#131D38]'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Row 2: Status Filter Tabs */}
        <div
          className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0"
          role="tablist"
          aria-label="Investigation status filter"
        >
          {[
            { id: 'all', label: 'All', count: counts.all },
            { id: 'in_progress', label: 'In progress', count: counts.in_progress },
            { id: 'completed', label: 'Completed', count: counts.completed },
            { id: 'draft', label: 'Draft', count: counts.draft },
            { id: 'archived', label: 'Archived', count: counts.archived },
          ].map((tab) => {
            const active = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setStatusFilter(tab.id)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-[#131D38] text-[#f4f1ea]'
                    : 'bg-transparent text-[#5B6478] hover:bg-[#f4f1ea] hover:text-[#131D38]'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`font-mono text-[11px] tabular-nums ${
                    active ? 'text-[#ffc20d]' : 'text-[#5B6478]'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Row 3: Active Filter Chips */}
        {hasFilters && (
          <div className="pt-3 border-t border-[#E6E0D2] flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {regionFilter !== 'all' && (
                <button
                  type="button"
                  onClick={() => setRegionFilter('all')}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f4f1ea] border border-[#E6E0D2] text-[12px] text-[#131D38] cursor-pointer"
                >
                  <span>Region: {regionFilter}</span>
                  <X className="w-3 h-3" />
                </button>
              )}
              {variableFilter !== 'all' && (
                <button
                  type="button"
                  onClick={() => setVariableFilter('all')}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f4f1ea] border border-[#E6E0D2] text-[12px] text-[#131D38] cursor-pointer"
                >
                  <span>Variable: {variableFilter}</span>
                  <X className="w-3 h-3" />
                </button>
              )}
              {statusFilter !== 'all' && (
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f4f1ea] border border-[#E6E0D2] text-[12px] text-[#131D38] cursor-pointer"
                >
                  <span>Status: {statusFilter.replace('_', ' ')}</span>
                  <X className="w-3 h-3" />
                </button>
              )}
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setRawSearch('');
                    setSearchQuery('');
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f4f1ea] border border-[#E6E0D2] text-[12px] text-[#131D38] cursor-pointer"
                >
                  <span>Query: “{searchQuery}”</span>
                  <X className="w-3 h-3" />
                </button>
              )}
              <button
                type="button"
                onClick={clearAllFilters}
                className="text-[12px] font-semibold text-[#131D38] underline underline-offset-4 ml-1 cursor-pointer"
              >
                Clear all
              </button>
            </div>

            <span className="font-mono text-[11px] uppercase text-[#5B6478] tabular-nums">
              Showing {filtered.length} of {investigations.length}
            </span>
          </div>
        )}
      </div>

      {/* LOADING STATE */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-[380px] rounded-[28px] skeleton-cream" />
          ))}
        </div>
      ) : investigations.length === 0 ? (
        /* EMPTY STATE (0 investigations) */
        <div className="rounded-[28px] bg-[#FBFAF6] border border-[#E6E0D2] p-12 text-center shadow-[0_20px_50px_rgba(19,29,56,0.06)]">
          <div className="mx-auto w-20 h-20 rounded-full bg-[#f4f1ea] border border-[#E6E0D2] flex items-center justify-center">
            <Globe2 className="w-9 h-9 text-[#4FB3A9]" />
          </div>
          <h2 className="mt-5 font-display text-[22px] font-semibold text-[#131D38]">
            No investigations yet
          </h2>
          <p className="mt-2 text-[15px] text-[#5B6478]">
            Start with the Sahel case study or create your own.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={onNewInvestigation}
              className="px-6 py-3 rounded-full bg-[#ffc20d] text-[#131D38] text-[14px] font-semibold cursor-pointer"
            >
              Create new investigation
            </button>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        /* NO RESULTS STATE */
        <div className="rounded-[28px] bg-[#FBFAF6] border border-[#E6E0D2] p-12 text-center shadow-[0_20px_50px_rgba(19,29,56,0.06)]">
          <div className="mx-auto w-20 h-20 rounded-full bg-[#f4f1ea] border border-[#E6E0D2] flex items-center justify-center relative">
            <Globe2 className="w-8 h-8 text-[#5B6478]/40" />
            <Search className="w-5 h-5 text-[#131D38] absolute bottom-3 right-3" />
          </div>
          <h2 className="mt-5 font-display text-[20px] font-semibold text-[#131D38]">
            No investigations match your filters
          </h2>
          <p className="mt-2 text-[14px] text-[#5B6478]">
            Adjust or clear your active search and filter chips to see all saved studies.
          </p>
          <button
            type="button"
            onClick={clearAllFilters}
            className="mt-6 px-6 py-2.5 rounded-full bg-[#131D38] text-[#f4f1ea] text-[14px] font-semibold cursor-pointer"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <>
          {/* CARD VIEW (Default, and forced <= 1024px) */}
          <div className={viewMode === 'table' ? 'lg:hidden' : ''}>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {visibleItems.map((inv, idx) => {
                const layer = WORKFLOW_LAYERS[inv.stageIndex] ?? WORKFLOW_LAYERS[0];
                const isUnfinished = inv.status === 'in_progress' || inv.status === 'draft';
                const isHighlighted = highlightId === inv.id;

                return (
                  <motion.article
                    key={inv.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.35,
                      delay: Math.min(idx * 0.04, 0.24),
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    onClick={() => onOpenInvestigation(inv, isUnfinished ? 'continue' : 'overview')}
                    className={`relative rounded-[28px] bg-[#FBFAF6] p-4 shadow-[0_20px_50px_rgba(19,29,56,0.07)] hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(19,29,56,0.12)] transition-all duration-200 flex flex-col justify-between cursor-pointer border ${
                      isHighlighted ? 'border-2 border-[#ffc20d]' : 'border-[#E6E0D2]'
                    }`}
                  >
                    <div>
                      {/* 3:2 Map Thumbnail */}
                      <div className="relative aspect-[3/2] rounded-[20px] overflow-hidden border border-[#E6E0D2]">
                        <ThumbnailMap region={inv.region} variable={inv.variable} />
                        <div className="absolute top-3 left-3">
                          <StatusBadge status={inv.status} />
                        </div>
                        <span className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-[#131D38]/90 text-[#4FB3A9] inline-flex items-center justify-center border border-[#f4f1ea]/15">
                          {inv.variable === 'Dust aerosols' ? (
                            <Wind className="w-4 h-4" />
                          ) : (
                            <CloudRain className="w-4 h-4" />
                          )}
                        </span>
                      </div>

                      <div className="px-2 pt-5">
                        {inv.isPrepared && (
                          <span className="inline-block mb-2 px-2.5 py-0.5 rounded-full bg-[#131D38] text-[#f4f1ea] font-mono text-[10px] uppercase tracking-wider">
                            PREPARED CASE STUDY
                          </span>
                        )}

                        <h2 className="font-display text-[18px] font-semibold text-[#131D38] leading-snug">
                          {inv.title}
                        </h2>

                        <div className="mt-3 space-y-2 text-[14px] text-[#5B6478]">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5 shrink-0" />
                            <span>{inv.region}</span>
                          </div>
                          <div className="flex items-center gap-2 tabular-nums">
                            <Clock className="w-3.5 h-3.5 shrink-0" />
                            <span>{inv.period}</span>
                          </div>
                        </div>

                        <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2">
                          <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#4FB3A9]/15 text-[#131D38] text-[12px] font-medium">
                            {inv.variable}
                          </span>

                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1" aria-hidden="true">
                              {WORKFLOW_LAYERS.map((_, dotIdx) => (
                                <span
                                  key={dotIdx}
                                  className={`w-2 h-2 rounded-full ${
                                    dotIdx === inv.stageIndex
                                      ? 'bg-[#ffc20d]'
                                      : dotIdx < inv.stageIndex
                                        ? 'bg-[#131D38]'
                                        : 'bg-[#E6E0D2]'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="font-mono text-[10px] uppercase text-[#5B6478]">
                              LAYER {inv.stageIndex + 1} · {layer.title}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="px-2 pt-5 mt-4 border-t border-[#E6E0D2]">
                      <p title={inv.exactDate} className="text-[12px] text-[#5B6478] mb-3.5">
                        {inv.updatedLabel}
                      </p>

                      <div
                        className="flex items-center justify-between gap-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {isUnfinished ? (
                          <button
                            type="button"
                            onClick={() => onOpenInvestigation(inv, 'continue')}
                            className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-5 rounded-full bg-[#ffc20d] text-[#131D38] text-[13px] font-semibold hover:bg-[#eab006] transition-colors cursor-pointer"
                          >
                            <span>Continue</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onOpenInvestigation(inv, 'overview')}
                            className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-5 rounded-full border border-[#131D38] text-[#131D38] text-[13px] font-semibold hover:bg-[#131D38] hover:text-[#f4f1ea] transition-colors cursor-pointer"
                          >
                            <span>Open</span>
                          </button>
                        )}

                        {/* ⋯ Menu Button */}
                        <div className="relative">
                          <button
                            type="button"
                            aria-label={`Actions for ${inv.title}`}
                            onClick={() => setMenuOpenId(menuOpenId === inv.id ? null : inv.id)}
                            className="w-10 h-10 rounded-full border border-[#E6E0D2] bg-[#f4f1ea] hover:bg-white inline-flex items-center justify-center text-[#131D38] cursor-pointer"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>

                          {menuOpenId === inv.id && (
                            <div className="absolute right-0 bottom-12 w-56 rounded-[20px] bg-white border border-[#E6E0D2] shadow-instrument p-1.5 z-30 text-[13px]">
                              {isUnfinished && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setMenuOpenId(null);
                                    onOpenInvestigation(inv, 'continue');
                                  }}
                                  className="w-full h-10 flex items-center gap-2.5 px-3 rounded-[14px] hover:bg-[#f4f1ea] text-[#131D38] cursor-pointer"
                                >
                                  <ArrowRight className="w-4 h-4" />
                                  <span>Continue</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setMenuOpenId(null);
                                  onOpenInvestigation(inv, 'overview');
                                }}
                                className="w-full h-10 flex items-center gap-2.5 px-3 rounded-[14px] hover:bg-[#f4f1ea] text-[#131D38] cursor-pointer"
                              >
                                <FolderOpen className="w-4 h-4" />
                                <span>Open overview</span>
                              </button>
                              <button
                                type="button"
                                title="Copies setup only, not results."
                                onClick={() => {
                                  setMenuOpenId(null);
                                  const dup = onDuplicateInvestigation(inv.id);
                                  if (dup) {
                                    onShowToast(`Configuration duplicated as ${dup.title}`);
                                  }
                                }}
                                className={`w-full h-10 flex items-center gap-2.5 px-3 rounded-[14px] hover:bg-[#f4f1ea] text-[#131D38] cursor-pointer ${
                                  inv.isPrepared ? 'bg-[#ffc20d]/15 font-medium' : ''
                                }`}
                              >
                                <Copy className="w-4 h-4" />
                                <span>Duplicate configuration</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setMenuOpenId(null);
                                  setExportTarget(inv);
                                }}
                                className="w-full h-10 flex items-center gap-2.5 px-3 rounded-[14px] hover:bg-[#f4f1ea] text-[#131D38] cursor-pointer"
                              >
                                <Download className="w-4 h-4" />
                                <span>Export</span>
                              </button>

                              <div className="my-1 h-px bg-[#E6E0D2]" />

                              {inv.isPrepared ? (
                                <div className="px-3 py-2 text-[11px] text-[#5B6478] flex items-center gap-2 opacity-75">
                                  <Trash2 className="w-3.5 h-3.5 shrink-0" />
                                  <span>Prepared example, can’t be deleted</span>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setMenuOpenId(null);
                                    setDeleteTarget(inv);
                                  }}
                                  className="w-full h-10 flex items-center gap-2.5 px-3 rounded-[14px] hover:bg-[#FF7A6B]/15 text-[#C24136] font-medium cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  <span>Delete</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.article>
                );
              })}

              {/* Dashed New Investigation Card */}
              <button
                type="button"
                onClick={onNewInvestigation}
                className="min-h-[380px] rounded-[28px] border-2 border-dashed border-[#131D38]/20 bg-[#FBFAF6]/50 hover:bg-[#FBFAF6] hover:border-[#131D38]/40 p-8 flex flex-col items-center justify-center text-center gap-3 transition-all cursor-pointer group"
              >
                <span className="w-14 h-14 rounded-full bg-[#ffc20d] text-[#131D38] inline-flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Plus className="w-6 h-6" />
                </span>
                <div className="font-display text-[18px] font-semibold text-[#131D38]">
                  New investigation
                </div>
                <p className="text-[14px] text-[#5B6478] max-w-[220px]">
                  Launch the 6-step setup for a new region and variable.
                </p>
                <span className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-[#5B6478]">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>6-step wizard</span>
                </span>
              </button>
            </div>
          </div>

          {/* TABLE VIEW (Desktop lg+) */}
          {viewMode === 'table' && (
            <div className="hidden lg:block rounded-[28px] bg-[#FBFAF6] border border-[#E6E0D2] overflow-hidden shadow-[0_20px_50px_rgba(19,29,56,0.07)]">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-[#f4f1ea] border-b border-[#E6E0D2] font-mono text-[11px] uppercase tracking-wider text-[#5B6478]">
                    <tr>
                      <th className="py-4 pl-6 pr-2 w-10">
                        <span className="sr-only">Select</span>
                      </th>
                      <th
                        className="py-4 px-3 cursor-pointer hover:text-[#131D38]"
                        aria-sort={sortBy === 'name_asc' ? 'ascending' : 'none'}
                        onClick={() => setSortBy('name_asc')}
                      >
                        Name ↕
                      </th>
                      <th className="py-4 px-3">Region</th>
                      <th className="py-4 px-3">Period</th>
                      <th className="py-4 px-3">Variable</th>
                      <th className="py-4 px-3">Status</th>
                      <th className="py-4 px-3">Current layer</th>
                      <th
                        className="py-4 px-3 cursor-pointer hover:text-[#131D38]"
                        aria-sort={sortBy === 'updated_desc' ? 'descending' : 'none'}
                        onClick={() =>
                          setSortBy(sortBy === 'updated_desc' ? 'updated_asc' : 'updated_desc')
                        }
                      >
                        Updated ↕
                      </th>
                      <th className="py-4 pl-3 pr-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E6E0D2] text-[14px]">
                    {visibleItems.map((inv) => {
                      const layer = WORKFLOW_LAYERS[inv.stageIndex] ?? WORKFLOW_LAYERS[0];
                      const isUnfinished = inv.status === 'in_progress' || inv.status === 'draft';
                      const checked = selectedIds.includes(inv.id);

                      return (
                        <tr
                          key={inv.id}
                          onClick={() =>
                            onOpenInvestigation(inv, isUnfinished ? 'continue' : 'overview')
                          }
                          className="h-[72px] hover:bg-[#f4f1ea] transition-colors cursor-pointer"
                        >
                          <td className="pl-6 pr-2" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleSelect(inv.id)}
                              aria-label={`Select ${inv.title}`}
                              className="w-4 h-4 accent-[#131D38] cursor-pointer"
                            />
                          </td>
                          <td className="px-3">
                            <div className="flex items-center gap-3">
                              <div className="w-11 h-11 rounded-[12px] overflow-hidden border border-[#E6E0D2] shrink-0">
                                <ThumbnailMap region={inv.region} variable={inv.variable} />
                              </div>
                              <div>
                                <div className="font-display text-[15px] font-semibold text-[#131D38]">
                                  {inv.title}
                                </div>
                                {inv.isPrepared && (
                                  <span className="font-mono text-[10px] uppercase text-[#5B6478]">
                                    Prepared case study
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-3 text-[#5B6478]">{inv.region}</td>
                          <td className="px-3 font-mono text-[12px] tabular-nums text-[#131D38]">
                            {inv.period}
                          </td>
                          <td className="px-3">
                            <span className="inline-flex px-2.5 py-1 rounded-full bg-[#4FB3A9]/15 text-[#131D38] text-[12px] font-medium">
                              {inv.variable}
                            </span>
                          </td>
                          <td className="px-3">
                            <StatusBadge status={inv.status} />
                          </td>
                          <td className="px-3">
                            <div className="flex items-center gap-2">
                              <div className="flex gap-1" aria-hidden="true">
                                {WORKFLOW_LAYERS.map((_, i) => (
                                  <span
                                    key={i}
                                    className={`w-1.5 h-1.5 rounded-full ${
                                      i === inv.stageIndex
                                        ? 'bg-[#ffc20d]'
                                        : i < inv.stageIndex
                                          ? 'bg-[#131D38]'
                                          : 'bg-[#E6E0D2]'
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className="font-mono text-[11px] uppercase text-[#5B6478]">
                                {layer.title}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 text-[12px] text-[#5B6478]" title={inv.exactDate}>
                            {inv.updatedLabel}
                          </td>
                          <td className="pl-3 pr-6 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  onOpenInvestigation(inv, isUnfinished ? 'continue' : 'overview')
                                }
                                className={`px-4 py-1.5 rounded-full text-[12px] font-semibold cursor-pointer ${
                                  isUnfinished
                                    ? 'bg-[#ffc20d] text-[#131D38]'
                                    : 'border border-[#131D38] text-[#131D38] hover:bg-[#131D38] hover:text-[#f4f1ea]'
                                }`}
                              >
                                {isUnfinished ? 'Continue' : 'Open'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setExportTarget(inv)}
                                aria-label={`Export ${inv.title}`}
                                className="w-8 h-8 rounded-full hover:bg-[#E6E0D2]/60 inline-flex items-center justify-center text-[#5B6478] cursor-pointer"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {filtered.length > pageLimit && (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={() => setPageLimit((p) => p + 12)}
                className="px-6 py-2.5 rounded-full border border-[#131D38]/25 bg-[#FBFAF6] text-[#131D38] text-[13px] font-semibold hover:bg-white cursor-pointer"
              >
                Load more ({filtered.length - pageLimit} remaining)
              </button>
            </div>
          )}
        </>
      )}

      {/* Floating Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 rounded-full bg-[#131D38] text-[#f4f1ea] px-5 py-2.5 shadow-instrument-dark flex items-center gap-4 border border-[#f4f1ea]/15">
          <span className="font-mono text-[12px] tabular-nums">{selectedIds.length} selected</span>
          <button
            type="button"
            onClick={() => {
              const first = investigations.find((i) => i.id === selectedIds[0]);
              if (first) setExportTarget(first);
            }}
            className="text-[13px] font-medium text-[#ffc20d] hover:underline cursor-pointer"
          >
            Export
          </button>
          <button
            type="button"
            onClick={() => {
              selectedIds.forEach((id) => {
                const inv = investigations.find((i) => i.id === id);
                if (inv && !inv.isPrepared) onDeleteInvestigation(id);
              });
              setSelectedIds([]);
            }}
            className="text-[13px] font-medium text-[#FF7A6B] hover:underline cursor-pointer"
          >
            Delete
          </button>
          <button
            type="button"
            onClick={() => setSelectedIds([])}
            aria-label="Clear selection"
            className="text-[#A9B1C6] hover:text-[#f4f1ea] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Mobile Filters Bottom Sheet */}
      {mobileFiltersOpen && (
        <div
          className="fixed inset-0 z-50 sm:hidden bg-[#0B1224]/70 flex items-end"
          onClick={() => setMobileFiltersOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full rounded-t-[28px] bg-[#FBFAF6] p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-[18px] font-semibold">Filters & Sort</h3>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="w-9 h-9 rounded-full bg-[#f4f1ea] inline-flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <select
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value)}
                className="w-full h-12 rounded-full bg-[#f4f1ea] border border-[#E6E0D2] px-4 text-[14px]"
              >
                <option value="all">All regions</option>
                <option value="Western Sahel">Western Sahel</option>
                <option value="Central Sahel">Central Sahel</option>
                <option value="Eastern Sahel">Eastern Sahel</option>
              </select>
              <select
                value={variableFilter}
                onChange={(e) => setVariableFilter(e.target.value)}
                className="w-full h-12 rounded-full bg-[#f4f1ea] border border-[#E6E0D2] px-4 text-[14px]"
              >
                <option value="all">All variables</option>
                <option value="Precipitation">Precipitation</option>
                <option value="Atmospheric moisture">Atmospheric moisture</option>
                <option value="Vegetation (NDVI)">Vegetation (NDVI)</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full h-12 rounded-full bg-[#f4f1ea] border border-[#E6E0D2] px-4 text-[14px]"
              >
                <option value="updated_desc">Last updated (newest)</option>
                <option value="name_asc">Name A–Z</option>
              </select>
            </div>
            <button
              type="button"
              onClick={() => setMobileFiltersOpen(false)}
              className="w-full py-3 rounded-full bg-[#ffc20d] text-[#131D38] font-semibold text-[15px]"
            >
              Show results ({filtered.length})
            </button>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B1224]/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[440px] rounded-[28px] bg-[#FBFAF6] text-[#131D38] border border-[#E6E0D2] p-7 shadow-instrument-dark"
          >
            <div className="w-12 h-12 rounded-full bg-[#FF7A6B]/18 text-[#C24136] inline-flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </div>
            <h2 className="mt-4 font-display text-[22px] font-semibold">
              Delete {deleteTarget.title}?
            </h2>
            <p className="mt-2 text-[14px] leading-[1.6] text-[#5B6478]">
              This removes the configuration, results and report for this investigation. This can’t
              be undone.
              {isGuest && ' It’s only stored on this device, so it can’t be recovered.'}
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                autoFocus
                onClick={() => setDeleteTarget(null)}
                className="px-5 py-2.5 rounded-full border border-[#131D38]/25 text-[14px] font-semibold text-[#131D38] hover:bg-[#f4f1ea] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2.5 rounded-full bg-[#FF7A6B] text-white text-[14px] font-semibold hover:bg-[#e86354] cursor-pointer"
              >
                Delete investigation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EXPORT MODAL */}
      {exportTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B1224]/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={() => setExportTarget(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-[28px] bg-[#FBFAF6] text-[#131D38] border border-[#E6E0D2] p-7 shadow-instrument-dark"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#E6E0D2]">
              <h2 className="font-display text-[20px] font-semibold">Export investigation</h2>
              <button
                type="button"
                onClick={() => setExportTarget(null)}
                aria-label="Close export modal"
                className="w-8 h-8 rounded-full bg-[#f4f1ea] inline-flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {exportTarget.status !== 'completed' && (
              <div className="mt-4 rounded-[16px] bg-[#ffc20d]/20 border border-[#ffc20d]/50 px-3.5 py-2.5 text-[12px] text-[#131D38]">
                This investigation is in progress, so the export will contain partial results.
              </div>
            )}

            <div className="mt-4 space-y-2.5">
              {[
                {
                  key: 'pdf',
                  label: 'Scientific report (PDF)',
                  available: exportTarget.stageIndex >= 1,
                  reason: 'Report available after the Evidence step',
                },
                { key: 'csv', label: 'Time series data (CSV)', available: true },
                { key: 'json', label: 'Configuration and parameters (JSON)', available: true },
                {
                  key: 'png',
                  label: 'Figures (PNG)',
                  available: exportTarget.stageIndex >= 1,
                  reason: 'Charts available after Detect',
                },
              ].map((opt) => (
                <label
                  key={opt.key}
                  className={`flex items-start gap-3 p-3 rounded-[16px] border ${
                    opt.available
                      ? 'bg-white border-[#E6E0D2] cursor-pointer'
                      : 'bg-[#f4f1ea] border-[#E6E0D2] opacity-60 cursor-not-allowed'
                  }`}
                >
                  <input
                    type="checkbox"
                    disabled={!opt.available}
                    checked={exportFormats[opt.key]}
                    onChange={(e) =>
                      setExportFormats((prev) => ({
                        ...prev,
                        [opt.key]: e.target.checked,
                      }))
                    }
                    className="mt-1 accent-[#131D38]"
                  />
                  <div>
                    <div className="text-[14px] font-medium">{opt.label}</div>
                    {!opt.available && opt.reason && (
                      <div className="text-[11px] text-[#5B6478]">{opt.reason}</div>
                    )}
                  </div>
                </label>
              ))}
            </div>

            <label className="mt-4 flex items-center justify-between gap-3 p-3 rounded-[16px] bg-[#f4f1ea] border border-[#E6E0D2] cursor-pointer">
              <span className="text-[13px] font-medium">
                Include data provenance and limitations
              </span>
              <input
                type="checkbox"
                checked={includeProvenance}
                onChange={(e) => setIncludeProvenance(e.target.checked)}
                className="w-4 h-4 accent-[#131D38]"
              />
            </label>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setExportTarget(null)}
                className="px-5 py-2.5 rounded-full text-[14px] text-[#5B6478] hover:text-[#131D38] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExportSubmit}
                className="px-6 py-2.5 rounded-full bg-[#ffc20d] text-[#131D38] text-[14px] font-semibold hover:bg-[#eab006] cursor-pointer"
              >
                Export
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
