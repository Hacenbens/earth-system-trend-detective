'use client';

import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  FileText,
  Globe2,
  HelpCircle,
  Menu,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import {
  DATASETS_STORAGE_KEY,
  INITIAL_DATASETS,
  INITIAL_INVESTIGATIONS,
  INITIAL_REPORTS,
  INVESTIGATIONS_STORAGE_KEY,
  TOUR_DISMISSED_KEY,
} from '@/app/api/dashboardData';

import { DashboardSidebar } from '@/app/layout/DashboardSidebar';
import { DashboardBento } from '@/app/pages/dashboard/DashboardBento';
import { CommandPaletteModal, TourModal } from '@/app/pages/dashboard/DashboardModals';
import { InvestigationsLibraryPage } from '@/app/pages/investigations/InvestigationsLibraryPage';
import { CreateInvestigationWizard } from '@/app/pages/investigations/CreateInvestigationWizard';
import { DatasetCataloguePage } from '@/app/pages/datasets/DatasetCataloguePage';
import { useLiveCatalogue } from '@/lib/liveLayers';
import { DataPrepPage } from '@/app/pages/investigations/DataPrepPage';
import {
  InvestigationHeader,
  InvestigationOverviewPage,
  RegionalComparisonPage,
} from '@/app/pages/investigations/InvestigationShell';
import {
  DetectLayerPage,
  ExplainLayerPage,
  InvestigateLayerPage,
  ProjectLayerPage,
  SolveLayerPage,
} from '@/app/pages/investigations/InvestigationLayers';
import {
  ReportExportPage,
  ScientificReportPage,
} from '@/app/pages/investigations/InvestigationReportExport';
import {
  MethodologyPage,
  ReferencesPage,
} from '@/app/pages/methodology/MethodologyReferencesPages';

function loadList(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

const STAGE_TO_SUBVIEW = ['detect', 'investigate', 'explain', 'project', 'solve'];

export function DashboardPage({
  workspaceRoute,
  session,
  onNavigatePath,
  onNavigateHome,
  onNavigateAuth,
  onLogout,
  onShowToast,
}) {
  const [localTab, setLocalTab] = useState(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [highlightId, setHighlightId] = useState(null);

  const [investigations, setInvestigations] = useState(() =>
    loadList(INVESTIGATIONS_STORAGE_KEY, INITIAL_INVESTIGATIONS)
  );
  const [datasets, setDatasets] = useState(() => loadList(DATASETS_STORAGE_KEY, INITIAL_DATASETS));
  // Warehouse facts from the backend API (src/lib/liveLayers.js); the stored list above is unchanged.
  const liveDatasets = useLiveCatalogue(datasets);
  const [reports] = useState(INITIAL_REPORTS);

  const [tourDismissed, setTourDismissed] = useState(() => {
    try {
      return window.localStorage.getItem(TOUR_DISMISSED_KEY) === '1';
    } catch {
      return false;
    }
  });

  // Modals & popovers
  const [searchOpen, setSearchOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [methodOpen, setMethodOpen] = useState(false);

  const isGuest = !session || session.mode === 'guest';

  // Brief initial skeleton hydration (~180ms)
  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 180);
    return () => window.clearTimeout(timer);
  }, []);

  // Clear local overlay tab whenever route changes cleanly
  useEffect(() => {
    setLocalTab(null);
  }, [workspaceRoute]);

  // Persist investigations & datasets locally
  useEffect(() => {
    try {
      window.localStorage.setItem(INVESTIGATIONS_STORAGE_KEY, JSON.stringify(investigations));
    } catch {
      // Ignore storage errors
    }
  }, [investigations]);

  useEffect(() => {
    try {
      window.localStorage.setItem(DATASETS_STORAGE_KEY, JSON.stringify(datasets));
    } catch {
      // Ignore storage errors
    }
  }, [datasets]);

  // ⌘K / Ctrl+K shortcut for Command Palette
  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setNotifOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const dismissTourBanner = () => {
    setTourDismissed(true);
    try {
      window.localStorage.setItem(TOUR_DISMISSED_KEY, '1');
    } catch {
      // Ignore
    }
  };

  const activeNav = (() => {
    if (localTab) return localTab;
    switch (workspaceRoute.kind) {
      case 'dashboard':
        return 'dashboard';
      case 'investigations':
      case 'new_investigation':
      case 'investigation_detail':
        return 'investigations';
      case 'datasets':
        return 'catalogue';
      case 'methodology':
        return 'methodology';
      case 'references':
        return 'references';
    }
  })();

  const handleSelectSidebarNav = (nav) => {
    setLocalTab(null);
    switch (nav) {
      case 'dashboard':
        onNavigatePath('/dashboard');
        break;
      case 'investigations':
        onNavigatePath('/investigations');
        break;
      case 'catalogue':
        onNavigatePath('/datasets');
        break;
      case 'methodology':
        onNavigatePath('/methodology');
        break;
      case 'references':
        onNavigatePath('/references');
        break;
      case 'reports':
      case 'help':
      case 'settings':
        setLocalTab(nav);
        break;
    }
  };

  const openInvestigationTarget = (inv, target = 'continue') => {
    if (target === 'overview') {
      onNavigatePath(`/investigations/${inv.id}`);
      return;
    }
    if (!inv.dataGatePassed) {
      onNavigatePath(`/investigations/${inv.id}/data`);
      return;
    }
    const sub = STAGE_TO_SUBVIEW[inv.stageIndex] ?? 'detect';
    onNavigatePath(`/investigations/${inv.id}/${sub}`);
  };

  const handleRenameInvestigation = (id, nextTitle) => {
    setInvestigations((prev) =>
      prev.map((inv) =>
        inv.id === id
          ? {
              ...inv,
              title: nextTitle,
              updatedLabel: 'Updated just now',
              updatedAt: new Date().toISOString(),
            }
          : inv
      )
    );
  };

  const handleDuplicateInvestigation = (id) => {
    const source = investigations.find((i) => i.id === id);
    if (!source) return null;
    const nowIso = new Date().toISOString();
    const copy = {
      ...source,
      id: `inv-${Date.now()}`,
      title: `${source.title} (Copy)`,
      isFeatured: false,
      isPrepared: false,
      updatedLabel: 'Updated just now',
      updatedAt: nowIso,
      createdAt: nowIso,
    };
    setInvestigations((prev) => [copy, ...prev]);
    setHighlightId(copy.id);
    window.setTimeout(() => setHighlightId(null), 2600);
    onShowToast(`Duplicated "${source.title}".`);
    return copy;
  };

  const handleDeleteInvestigation = (id) => {
    const deleted = investigations.find((i) => i.id === id);
    setInvestigations((prev) => prev.filter((i) => i.id !== id));
    if (deleted) {
      onShowToast(`Deleted "${deleted.title}".`, () => {
        setInvestigations((prev) => [deleted, ...prev]);
      });
    } else {
      onShowToast('Investigation removed.');
    }
  };

  const handleRestoreInvestigation = (inv) => {
    setInvestigations((prev) => (prev.some((i) => i.id === inv.id) ? prev : [inv, ...prev]));
    onShowToast(`Restored "${inv.title}".`);
  };

  const handleUpdateInvestigation = (id, patch) => {
    setInvestigations((prev) =>
      prev.map((inv) =>
        inv.id === id
          ? {
              ...inv,
              ...patch,
              updatedAt: new Date().toISOString(),
              updatedLabel: 'Updated just now',
            }
          : inv
      )
    );
  };

  const handleLoadSahelCaseStudy = () => {
    const sahel = INITIAL_INVESTIGATIONS[0];
    setInvestigations((prev) => {
      if (prev.some((i) => i.id === sahel.id)) return prev;
      return [sahel, ...prev];
    });
    openInvestigationTarget(sahel, 'continue');
  };

  const handleUpdateDatasetStatus = (id, status) => {
    const dateStr = new Date().toISOString().slice(0, 10);
    setDatasets((prev) =>
      prev.map((d) =>
        d.id === id
          ? {
              ...d,
              status,
              verificationLog: [
                ...d.verificationLog,
                {
                  status,
                  date: dateStr,
                  by: isGuest ? 'Guest researcher' : session?.name || 'Researcher',
                },
              ],
            }
          : d
      )
    );
    onShowToast(`Dataset audit status updated to ${status}.`);
  };

  const handleResetDemo = () => {
    setInvestigations(INITIAL_INVESTIGATIONS);
    setDatasets(INITIAL_DATASETS);
    onShowToast('Demo workspace restored to initial Sahel case study.');
  };

  const isWizard = workspaceRoute.kind === 'new_investigation' && !localTab;

  const breadcrumbLabel = (() => {
    if (localTab) return `WORKSPACE / ${localTab.toUpperCase()}`;
    switch (workspaceRoute.kind) {
      case 'dashboard':
        return 'WORKSPACE / DASHBOARD';
      case 'investigations':
        return 'WORKSPACE / MY INVESTIGATIONS';
      case 'new_investigation':
        return 'WORKSPACE / NEW INVESTIGATION WIZARD';
      case 'datasets':
        return 'WORKSPACE / DATA CATALOGUE';
      case 'methodology':
        return 'WORKSPACE / SCIENTIFIC METHODOLOGY';
      case 'references':
        return 'WORKSPACE / SCIENTIFIC REFERENCES';
      case 'investigation_detail':
        return `INVESTIGATIONS / ${workspaceRoute.subView.toUpperCase()}`;
    }
  })();

  const activeInvDetail =
    workspaceRoute.kind === 'investigation_detail'
      ? (investigations.find((i) => i.id === workspaceRoute.id) ??
        investigations[0] ??
        INITIAL_INVESTIGATIONS[0])
      : null;

  const activeDatasetDetailId =
    workspaceRoute.kind === 'datasets' && workspaceRoute.slug
      ? (liveDatasets.find((d) => d.slug === workspaceRoute.slug || d.id === workspaceRoute.slug)?.id ??
        null)
      : null;

  return (
    <div className="min-h-screen flex bg-[#f4f1ea] text-[#131D38]">
      {/* Navy Left Sidebar (collapses cleanly during Wizard) */}
      <DashboardSidebar
        activeNav={activeNav}
        onSelectNav={handleSelectSidebarNav}
        session={session}
        onGoToAuth={onNavigateAuth}
        onLogout={onLogout}
        mobileOpen={mobileDrawerOpen}
        onCloseMobile={() => setMobileDrawerOpen(false)}
        collapsed={isWizard}
      />

      {/* Main Cream Workspace */}
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-8 pt-5 pb-24 sm:pb-12">
          {/* Top Bar (72px) */}
          <header className="h-[72px] flex items-center justify-between gap-4 print:hidden">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {/* Mobile hamburger (< 640px) */}
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(true)}
                aria-label="Open navigation menu"
                className="sm:hidden w-11 h-11 rounded-full bg-[#FBFAF6] border border-[#E6E0D2] text-[#131D38] inline-flex items-center justify-center shrink-0 cursor-pointer"
              >
                <Menu className="w-5 h-5" />
              </button>

              {workspaceRoute.kind === 'dashboard' && !localTab ? (
                <button
                  type="button"
                  onClick={() => setSearchOpen(true)}
                  aria-label="Search investigations, datasets, and reports"
                  className="sm:w-full sm:max-w-[440px] h-11 sm:h-[52px] w-11 sm:px-5 rounded-full sm:rounded-[20px] bg-[#FBFAF6] border border-[#E6E0D2] flex items-center justify-center sm:justify-between gap-3 text-[#5B6478] hover:border-[#131D38]/30 transition-colors cursor-pointer shadow-[0_8px_24px_rgba(19,29,56,0.04)]"
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <Search className="w-[18px] h-[18px] text-[#131D38] shrink-0" />
                    <span className="hidden sm:inline text-[14px] truncate">
                      Search investigations, datasets, reports…
                    </span>
                  </span>
                  <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md bg-[#f4f1ea] border border-[#E6E0D2] font-mono text-[11px] text-[#5B6478] shrink-0">
                    ⌘K
                  </kbd>
                </button>
              ) : (
                <div className="flex items-center gap-3 min-w-0">
                  {workspaceRoute.kind === 'investigation_detail' && (
                    <button
                      type="button"
                      onClick={() => onNavigatePath('/investigations')}
                      aria-label="Back to My Investigations"
                      className="w-9 h-9 rounded-full bg-[#FBFAF6] border border-[#E6E0D2] inline-flex items-center justify-center text-[#131D38] hover:bg-white cursor-pointer shrink-0"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                  )}
                  <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5B6478] truncate">
                    {breadcrumbLabel}
                  </span>
                </div>
              )}
            </div>

            {/* Right action cluster */}
            <div className="flex items-center gap-3 shrink-0 relative">
              {workspaceRoute.kind !== 'dashboard' && (
                <button
                  type="button"
                  onClick={() => setSearchOpen(true)}
                  aria-label="Quick search (Cmd+K)"
                  className="w-11 h-11 rounded-full bg-[#FBFAF6] border border-[#E6E0D2] text-[#131D38] inline-flex items-center justify-center hover:bg-white transition-colors cursor-pointer"
                >
                  <Search className="w-[18px] h-[18px]" />
                </button>
              )}

              <button
                type="button"
                onClick={() => setNotifOpen((prev) => !prev)}
                aria-label="Notifications"
                className="relative w-11 h-11 rounded-full bg-[#FBFAF6] border border-[#E6E0D2] text-[#131D38] inline-flex items-center justify-center hover:bg-white transition-colors cursor-pointer"
              >
                <Bell className="w-[18px] h-[18px]" />
                <span
                  aria-hidden="true"
                  className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-[#ffc20d]"
                />
              </button>

              {notifOpen && (
                <div className="absolute right-0 top-14 w-80 rounded-[24px] bg-[#FBFAF6] border border-[#E6E0D2] p-4 shadow-instrument z-40">
                  <div className="flex items-center justify-between pb-2.5 border-b border-[#E6E0D2]">
                    <span className="font-mono text-[11px] uppercase tracking-wider text-[#5B6478]">
                      Workspace notices
                    </span>
                    <button
                      type="button"
                      onClick={() => setNotifOpen(false)}
                      className="text-[12px] text-[#5B6478] hover:text-[#131D38] cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                  <div className="mt-3 space-y-2.5 text-[13px]">
                    <div className="p-3 rounded-[16px] bg-[#f4f1ea] border border-[#E6E0D2]">
                      <p className="font-medium text-[#131D38]">Sahel case study prepared</p>
                      <p className="mt-0.5 text-[12px] text-[#5B6478]">
                        Sen’s slope &amp; Mann-Kendall values remain placeholder until GPM IMERG
                        v07B audit is verified.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => setLocalTab('help')}
                aria-label="Open Help"
                className="w-11 h-11 rounded-full bg-[#FBFAF6] border border-[#E6E0D2] text-[#131D38] inline-flex items-center justify-center hover:bg-white transition-colors cursor-pointer"
              >
                <HelpCircle className="w-[18px] h-[18px]" />
              </button>

              {!isWizard && (
                <button
                  type="button"
                  onClick={() => onNavigatePath('/investigations/new')}
                  className="hidden sm:inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[#ffc20d] text-[#131D38] text-[14px] font-semibold hover:bg-[#eab006] transition-colors cursor-pointer whitespace-nowrap shadow-[0_8px_24px_rgba(255,194,13,0.25)]"
                >
                  <Plus className="w-4 h-4" />
                  <span>New investigation</span>
                </button>
              )}
            </div>
          </header>

          {/* Subtle Guest Demo Banner + First-Visit Tour Banner (Dashboard only) */}
          {!isWizard && (
            <div className="mt-2 space-y-3 mb-6 print:hidden">
              {isGuest && workspaceRoute.kind === 'dashboard' && !localTab && (
                <div className="rounded-[20px] bg-[#131D38] text-[#f4f1ea] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-[13px]">
                  <div className="flex items-center gap-2.5">
                    <Globe2 className="w-4 h-4 text-[#4FB3A9] shrink-0" />
                    <span>Demo mode: your work is saved on this device.</span>
                  </div>
                  <button
                    type="button"
                    onClick={onNavigateAuth}
                    className="font-semibold text-[#ffc20d] hover:underline underline-offset-4 cursor-pointer"
                  >
                    Create account →
                  </button>
                </div>
              )}

              {!tourDismissed && workspaceRoute.kind === 'dashboard' && !localTab && (
                <div className="rounded-[20px] bg-[#FBFAF6] border border-[#E6E0D2] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-[13px]">
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="w-4 h-4 text-[#131D38] shrink-0" />
                    <span>
                      New here?{' '}
                      <button
                        type="button"
                        onClick={() => setTourOpen(true)}
                        className="font-semibold underline underline-offset-4 hover:text-[#5B6478] cursor-pointer"
                      >
                        Take the 1-minute tour.
                      </button>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={dismissTourBanner}
                    aria-label="Dismiss tour banner"
                    className="w-7 h-7 rounded-full hover:bg-[#f4f1ea] inline-flex items-center justify-center text-[#5B6478] cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ROUTE / VIEW DISPATCH */}
          {localTab === 'reports' ? (
            <section className="space-y-6">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5B6478]">
                  SCIENTIFIC MEMOS
                </p>
                <h1 className="mt-1 font-display text-[28px] font-semibold text-[#131D38]">
                  Reports
                </h1>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {reports.map((rep) => (
                  <article
                    key={rep.id}
                    className="rounded-[28px] bg-[#FBFAF6] border border-[#E6E0D2] p-6 shadow-[0_20px_50px_rgba(19,29,56,0.06)] flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase text-[#5B6478]">
                          <FileText className="w-3.5 h-3.5" />
                          <span>{rep.status}</span>
                        </span>
                        <span className="text-[12px] text-[#5B6478]">{rep.updatedLabel}</span>
                      </div>
                      <h2 className="mt-3 font-display text-[19px] font-semibold text-[#131D38]">
                        {rep.title}
                      </h2>
                      <p className="mt-2 text-[14px] leading-[1.6] text-[#5B6478]">{rep.summary}</p>
                    </div>
                    <div className="mt-5 pt-4 border-t border-[#E6E0D2]">
                      <button
                        type="button"
                        onClick={() =>
                          onNavigatePath(`/investigations/${rep.investigationId}/report`)
                        }
                        className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#131D38] hover:underline underline-offset-4 cursor-pointer"
                      >
                        <span>Open scientific report</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : localTab === 'help' ? (
            <section className="space-y-6">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5B6478]">
                  DOCUMENTATION &amp; TOUR
                </p>
                <h1 className="mt-1 font-display text-[28px] font-semibold text-[#131D38]">
                  Help &amp; scientific methodology
                </h1>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="rounded-[28px] bg-[#FBFAF6] border border-[#E6E0D2] p-7">
                  <h2 className="font-display text-[19px] font-semibold">
                    1-minute workspace tour
                  </h2>
                  <p className="mt-2 text-[14px] leading-[1.6] text-[#5B6478]">
                    Walk through study-box selection, the five connected layers, and dataset
                    provenance auditing.
                  </p>
                  <button
                    type="button"
                    onClick={() => setTourOpen(true)}
                    className="mt-5 px-6 py-2.5 rounded-full bg-[#ffc20d] text-[#131D38] text-[14px] font-semibold cursor-pointer"
                  >
                    Launch tour
                  </button>
                </div>

                <div className="rounded-[28px] bg-[#FBFAF6] border border-[#E6E0D2] p-7">
                  <h2 className="font-display text-[19px] font-semibold">Full methodology</h2>
                  <p className="mt-2 text-[14px] leading-[1.6] text-[#5B6478]">
                    Read the NaN preservation policy, Mann-Kendall &amp; Sen’s slope specs, and
                    EarthCARE 2024+ limits.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setLocalTab(null);
                      onNavigatePath('/methodology');
                    }}
                    className="mt-5 px-6 py-2.5 rounded-full bg-[#131D38] text-[#f4f1ea] text-[14px] font-semibold cursor-pointer"
                  >
                    Open methodology
                  </button>
                </div>

                <div className="rounded-[28px] bg-[#FBFAF6] border border-[#E6E0D2] p-7">
                  <h2 className="font-display text-[19px] font-semibold">
                    Return to landing overview
                  </h2>
                  <p className="mt-2 text-[14px] leading-[1.6] text-[#5B6478]">
                    Review the public EarthSignal overview, Sahel case study framing, and NASA Space
                    Apps 2026 mission statement.
                  </p>
                  <button
                    type="button"
                    onClick={onNavigateHome}
                    className="mt-5 px-6 py-2.5 rounded-full border border-[#131D38] text-[#131D38] text-[14px] font-semibold hover:bg-[#131D38] hover:text-[#f4f1ea] transition-colors cursor-pointer"
                  >
                    Go to landing page
                  </button>
                </div>
              </div>
            </section>
          ) : localTab === 'settings' ? (
            <section className="space-y-6 max-w-2xl">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5B6478]">
                  WORKSPACE PREFERENCES
                </p>
                <h1 className="mt-1 font-display text-[28px] font-semibold text-[#131D38]">
                  Settings
                </h1>
              </div>

              <div className="rounded-[28px] bg-[#FBFAF6] border border-[#E6E0D2] p-7 space-y-5">
                <div className="flex items-center justify-between gap-4 pb-4 border-b border-[#E6E0D2]">
                  <div>
                    <div className="font-display text-[16px] font-semibold">Session mode</div>
                    <div className="text-[13px] text-[#5B6478]">
                      {isGuest
                        ? 'Guest researcher · saved locally in this browser'
                        : `Authenticated as ${session?.email}`}
                    </div>
                  </div>
                  {isGuest && (
                    <button
                      type="button"
                      onClick={onNavigateAuth}
                      className="px-5 py-2 rounded-full bg-[#ffc20d] text-[#131D38] text-[13px] font-semibold cursor-pointer"
                    >
                      Sign in / Create account
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="font-display text-[16px] font-semibold">
                      Reset local demo workspace
                    </div>
                    <div className="text-[13px] text-[#5B6478]">
                      Restore initial Sahel investigations and candidate dataset statuses.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetDemo}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#131D38]/25 text-[13px] font-medium hover:bg-[#f4f1ea] cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Restore defaults</span>
                  </button>
                </div>
              </div>
            </section>
          ) : workspaceRoute.kind === 'dashboard' ? (
            <DashboardBento
              isFirstVisit={!tourDismissed}
              investigations={investigations}
              datasets={liveDatasets}
              loading={loading}
              onNewInvestigation={() => onNavigatePath('/investigations/new')}
              onStartTour={() => setTourOpen(true)}
              onBrowseDatasets={() => onNavigatePath('/datasets')}
              onViewReports={() => setLocalTab('reports')}
              onViewAllInvestigations={() => onNavigatePath('/investigations')}
              onOpenInvestigation={(inv) => openInvestigationTarget(inv, 'continue')}
              onReadMethod={() => onNavigatePath('/methodology')}
              onRenameInvestigation={handleRenameInvestigation}
              onDuplicateInvestigation={handleDuplicateInvestigation}
              onDeleteInvestigation={handleDeleteInvestigation}
              onLoadSahelCaseStudy={handleLoadSahelCaseStudy}
            />
          ) : workspaceRoute.kind === 'investigations' ? (
            <InvestigationsLibraryPage
              investigations={investigations}
              isGuest={isGuest}
              loading={loading}
              highlightId={highlightId}
              onNewInvestigation={() => onNavigatePath('/investigations/new')}
              onOpenInvestigation={openInvestigationTarget}
              onDuplicateInvestigation={handleDuplicateInvestigation}
              onDeleteInvestigation={handleDeleteInvestigation}
              onRestoreInvestigation={handleRestoreInvestigation}
              onRenameInvestigation={handleRenameInvestigation}
              onOpenAuth={onNavigateAuth}
              onShowToast={onShowToast}
            />
          ) : workspaceRoute.kind === 'new_investigation' ? (
            <CreateInvestigationWizard
              datasets={liveDatasets}
              isGuest={isGuest}
              onExit={() => onNavigatePath('/investigations')}
              onOpenDatasetDetail={(ds) => onNavigatePath(`/datasets/${ds.slug}`)}
              onCreateComplete={(inv, mode) => {
                setInvestigations((prev) => [inv, ...prev]);
                setHighlightId(inv.id);
                if (mode === 'draft') {
                  onShowToast(`Saved "${inv.title}" as draft.`);
                  onNavigatePath('/investigations');
                } else {
                  onShowToast(
                    `Created "${inv.title}". Complete Data Preparation gate before Detect.`
                  );
                  onNavigatePath(`/investigations/${inv.id}/data`);
                }
              }}
            />
          ) : workspaceRoute.kind === 'datasets' ? (
            <DatasetCataloguePage
              datasets={liveDatasets}
              initialDetailId={activeDatasetDetailId}
              onUpdateStatus={handleUpdateDatasetStatus}
              onUseInInvestigation={(ds) => {
                onShowToast(`Pre-selected ${ds.name} in Create Investigation Wizard.`);
                onNavigatePath('/investigations/new');
              }}
              onShowToast={(msg) => onShowToast(msg)}
            />
          ) : workspaceRoute.kind === 'methodology' ? (
            <MethodologyPage datasets={liveDatasets} />
          ) : workspaceRoute.kind === 'references' ? (
            <ReferencesPage />
          ) : workspaceRoute.kind === 'investigation_detail' && activeInvDetail ? (
            <div className="space-y-6">
              <InvestigationHeader
                investigation={activeInvDetail}
                activeSubView={workspaceRoute.subView}
                onSelectSubView={(sub) =>
                  onNavigatePath(
                    sub === 'overview'
                      ? `/investigations/${activeInvDetail.id}`
                      : `/investigations/${activeInvDetail.id}/${sub}`
                  )
                }
                onShowToast={(msg) => onShowToast(msg)}
              />

              {workspaceRoute.subView === 'overview' && (
                <InvestigationOverviewPage
                  investigation={activeInvDetail}
                  onSelectSubView={(sub) =>
                    onNavigatePath(
                      sub === 'overview'
                        ? `/investigations/${activeInvDetail.id}`
                        : `/investigations/${activeInvDetail.id}/${sub}`
                    )
                  }
                />
              )}

              {workspaceRoute.subView === 'data' && (
                <DataPrepPage
                  investigation={activeInvDetail}
                  datasets={liveDatasets}
                  onUpdateInvestigation={(patch) =>
                    handleUpdateInvestigation(activeInvDetail.id, patch)
                  }
                  onUpdateDatasetStatus={handleUpdateDatasetStatus}
                  onOpenDatasetDetail={(ds) => onNavigatePath(`/datasets/${ds.slug}`)}
                  onContinueToDetect={() =>
                    onNavigatePath(`/investigations/${activeInvDetail.id}/detect`)
                  }
                  onShowToast={(msg) => onShowToast(msg)}
                />
              )}

              {workspaceRoute.subView === 'detect' && (
                <DetectLayerPage
                  investigation={activeInvDetail}
                  onUpdateInvestigation={(patch) =>
                    handleUpdateInvestigation(activeInvDetail.id, patch)
                  }
                  onNextLayer={() =>
                    onNavigatePath(`/investigations/${activeInvDetail.id}/investigate`)
                  }
                  onShowToast={(msg) => onShowToast(msg)}
                />
              )}

              {workspaceRoute.subView === 'regions' && (
                <RegionalComparisonPage
                  investigation={activeInvDetail}
                  onSelectSubView={(sub) =>
                    onNavigatePath(
                      sub === 'overview'
                        ? `/investigations/${activeInvDetail.id}`
                        : `/investigations/${activeInvDetail.id}/${sub}`
                    )
                  }
                />
              )}

              {workspaceRoute.subView === 'investigate' && (
                <InvestigateLayerPage
                  investigation={activeInvDetail}
                  onUpdateInvestigation={(patch) =>
                    handleUpdateInvestigation(activeInvDetail.id, patch)
                  }
                  onNextLayer={() =>
                    onNavigatePath(`/investigations/${activeInvDetail.id}/explain`)
                  }
                  onShowToast={(msg) => onShowToast(msg)}
                />
              )}

              {workspaceRoute.subView === 'explain' && (
                <ExplainLayerPage
                  investigation={activeInvDetail}
                  onUpdateInvestigation={(patch) =>
                    handleUpdateInvestigation(activeInvDetail.id, patch)
                  }
                  onNextLayer={() =>
                    onNavigatePath(`/investigations/${activeInvDetail.id}/project`)
                  }
                  onShowToast={(msg) => onShowToast(msg)}
                />
              )}

              {workspaceRoute.subView === 'project' && (
                <ProjectLayerPage
                  investigation={activeInvDetail}
                  onUpdateInvestigation={(patch) =>
                    handleUpdateInvestigation(activeInvDetail.id, patch)
                  }
                  onNextLayer={() => onNavigatePath(`/investigations/${activeInvDetail.id}/solve`)}
                  onShowToast={(msg) => onShowToast(msg)}
                />
              )}

              {workspaceRoute.subView === 'solve' && (
                <SolveLayerPage
                  investigation={activeInvDetail}
                  onUpdateInvestigation={(patch) =>
                    handleUpdateInvestigation(activeInvDetail.id, patch)
                  }
                  onNextLayer={() => onNavigatePath(`/investigations/${activeInvDetail.id}/report`)}
                  onShowToast={(msg) => onShowToast(msg)}
                />
              )}

              {workspaceRoute.subView === 'report' && (
                <ScientificReportPage
                  investigation={activeInvDetail}
                  datasets={liveDatasets}
                  onGoToExport={() =>
                    onNavigatePath(`/investigations/${activeInvDetail.id}/export`)
                  }
                  onShowToast={(msg) => onShowToast(msg)}
                />
              )}

              {workspaceRoute.subView === 'export' && (
                <ReportExportPage
                  investigation={activeInvDetail}
                  datasets={liveDatasets}
                  onShowToast={(msg) => onShowToast(msg)}
                />
              )}
            </div>
          ) : null}
        </div>
      </div>

      {/* Mobile Floating Amber "+" FAB (<= 640px) */}
      {!isWizard && (
        <button
          type="button"
          onClick={() => onNavigatePath('/investigations/new')}
          aria-label="New investigation"
          className="sm:hidden fixed bottom-6 right-5 z-40 w-14 h-14 rounded-full bg-[#ffc20d] text-[#131D38] shadow-[0_14px_34px_rgba(19,29,56,0.28)] inline-flex items-center justify-center cursor-pointer print:hidden"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      {/* Command Palette & Tour Modals */}
      <CommandPaletteModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        investigations={investigations}
        datasets={liveDatasets}
        reports={reports}
        onSelectInvestigation={(inv) => openInvestigationTarget(inv, 'continue')}
        onSelectDataset={() => onNavigatePath('/datasets')}
        onSelectReport={() => setLocalTab('reports')}
      />

      <TourModal open={tourOpen} onClose={() => setTourOpen(false)} />

      {/* Method Dialog */}
      {methodOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B1224]/75 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={() => setMethodOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-[28px] bg-[#131D38] text-[#f4f1ea] border border-[#f4f1ea]/15 p-7 shadow-instrument-dark"
          >
            <div className="flex items-center justify-between pb-4 border-b border-[#f4f1ea]/10">
              <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase text-[#4FB3A9]">
                <ShieldCheck className="w-4 h-4" />
                <span>Method · GPM IMERG Final V07</span>
              </span>
              <button
                type="button"
                onClick={() => setMethodOpen(false)}
                aria-label="Close method dialog"
                className="w-8 h-8 rounded-full bg-[#1E2B52] inline-flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <h2 className="mt-4 font-display text-[20px] font-semibold">
              Theil-Sen slope &amp; Mann-Kendall verification
            </h2>
            <p className="mt-2.5 text-[14px] leading-[1.6] text-[#A9B1C6]">
              Seasonal June–September rainfall grids over 10°N–20°N, 18°W–20°E are evaluated using
              non-parametric Theil-Sen slopes. Results remain marked as placeholders until dataset
              provenance reaches Verified status.
            </p>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setMethodOpen(false)}
                className="px-6 py-2.5 rounded-full bg-[#ffc20d] text-[#131D38] text-[14px] font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
