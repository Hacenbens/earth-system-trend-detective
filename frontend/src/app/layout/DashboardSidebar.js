'use client';

import {
  BookOpen,
  Compass,
  FileText,
  Globe2,
  Layers,
  LayoutGrid,
  LifeBuoy,
  LogOut,
  Settings,
  TrendingUp,
  X,
} from 'lucide-react';
const researcherAvatar = '/images/avatar_researcher_1794693908229.jpg';

const PRIMARY_NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
  { id: 'investigations', label: 'Investigations', icon: TrendingUp },
  { id: 'catalogue', label: 'Data catalogue', icon: Layers },
  { id: 'reports', label: 'Reports', icon: FileText },
  { id: 'help', label: 'Help', icon: LifeBuoy },
];

const SECONDARY_NAV = [
  { id: 'methodology', label: 'Methodology', icon: Compass },
  { id: 'references', label: 'References', icon: BookOpen },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function DashboardSidebar({
  activeNav,
  onSelectNav,
  session,
  onGoToAuth,
  onLogout,
  mobileOpen,
  onCloseMobile,
  collapsed = false,
}) {
  const isGuest = !session || session.mode === 'guest';

  const handleNavClick = (id) => {
    onSelectNav(id);
    onCloseMobile();
  };

  const renderNavItem = (item) => {
    const Icon = item.icon;
    const isActive = activeNav === item.id;

    return (
      <li key={item.id} className="relative">
        <button
          type="button"
          onClick={() => handleNavClick(item.id)}
          aria-current={isActive ? 'page' : undefined}
          title={item.label}
          className={`group relative w-full h-[50px] flex items-center gap-3.5 text-[15px] font-medium transition-all duration-300 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#ffc20d]/70 ${
            collapsed
              ? 'justify-center px-0'
              : 'sm:justify-center xl:justify-start sm:px-0 xl:pl-6 xl:pr-5 px-6'
          } ${
            isActive
              ? 'bg-[#f4f1ea] text-[#131D38] rounded-l-[24px] font-semibold'
              : 'text-[#f4f1ea]/85 hover:bg-[#f4f1ea]/[0.08] rounded-l-[24px]'
          }`}
        >
          {/* Inverted concave curves (24px) at top-right and bottom-right of active cream tab */}
          {isActive && (
            <>
              <svg
                aria-hidden="true"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                className="pointer-events-none hidden sm:block absolute -top-6 right-0 w-6 h-6"
              >
                <path d="M24 0V24H0C13.2548 24 24 13.2548 24 0Z" fill="#f4f1ea" />
              </svg>
              <svg
                aria-hidden="true"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                className="pointer-events-none hidden sm:block absolute -bottom-6 right-0 w-6 h-6"
              >
                <path d="M24 24V0H0C13.2548 0 24 10.7452 24 24Z" fill="#f4f1ea" />
              </svg>
            </>
          )}

          {/* Tiny amber dot on left of active tab */}
          {isActive && !collapsed && (
            <span
              aria-hidden="true"
              className="w-2 h-2 rounded-full bg-[#ffc20d] shrink-0 sm:hidden xl:block"
            />
          )}

          <Icon
            className={`w-5 h-5 shrink-0 transition-colors ${
              isActive ? 'text-[#131D38]' : 'text-[#A9B1C6] group-hover:text-[#f4f1ea]'
            }`}
          />

          {!collapsed && (
            <span className="sm:hidden xl:inline whitespace-nowrap">{item.label}</span>
          )}
        </button>
      </li>
    );
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#131D38] text-[#f4f1ea] select-none">
      {/* Top Profile Section */}
      <div
        className={`pt-7 pb-5 flex flex-col items-center ${
          collapsed ? 'px-3 text-center' : 'px-5 xl:px-6 xl:items-start text-center xl:text-left'
        }`}
      >
        {/* Mobile close button */}
        <div className="w-full flex items-center justify-between sm:hidden mb-4">
          <span className="font-mono text-[11px] uppercase tracking-widest text-[#A9B1C6]">
            EARTHSIGNAL
          </span>
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close navigation drawer"
            className="w-10 h-10 rounded-full bg-[#1E2B52] text-[#f4f1ea] inline-flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 72px Double-ring Avatar */}
        <div
          className={`rounded-full border-[1.5px] border-[#ffc20d] p-1 shrink-0 ${
            collapsed ? 'w-12 h-12' : 'w-[72px] h-[72px] sm:w-12 sm:h-12 xl:w-[72px] xl:h-[72px]'
          }`}
        >
          {isGuest ? (
            <div className="w-full h-full rounded-full bg-[#1E2B52] flex items-center justify-center text-[#4FB3A9]">
              <Globe2 className={collapsed ? 'w-5 h-5' : 'w-7 h-7 sm:w-5 sm:h-5 xl:w-7 xl:h-7'} />
            </div>
          ) : (
            <img
              src={researcherAvatar}
              alt="Researcher profile portrait"
              referrerPolicy="no-referrer"
              className="w-full h-full rounded-full object-cover"
            />
          )}
        </div>

        {!collapsed && (
          <div className="mt-3.5 sm:hidden xl:block">
            <div className="font-display text-[16px] font-semibold text-[#f4f1ea] leading-snug">
              {isGuest ? 'Guest researcher' : session?.name || 'Dr. Rania Zebiri'}
            </div>

            {isGuest ? (
              <>
                <button
                  type="button"
                  onClick={onGoToAuth}
                  className="mt-1 text-[12px] font-medium text-[#ffc20d] hover:underline underline-offset-4 cursor-pointer"
                >
                  Create account to sync
                </button>
                <p className="mt-1 text-[11px] text-[#A9B1C6]">Demo mode · saved on this device.</p>
              </>
            ) : (
              <div className="mt-0.5 text-[12px] text-[#A9B1C6] truncate max-w-[200px]">
                {session?.email || 'researcher@earthsignal.app'}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Navigation */}
      <nav
        aria-label="Dashboard navigation"
        // pt-6 / -mt-6 leaves room inside the scroll area for the active tab's
        // top curve (it sits 24px above the first item) without moving the menu
        className={`flex-1 overflow-y-auto overflow-x-hidden pt-6 -mt-6 ${
          collapsed ? 'pl-2' : 'pl-3 sm:pl-2 xl:pl-4'
        }`}
      >
        <ul className="space-y-1">{PRIMARY_NAV.map(renderNavItem)}</ul>

        <div className="my-3.5 mr-4 h-px bg-[#f4f1ea]/12" />

        <ul className="space-y-1">{SECONDARY_NAV.map(renderNavItem)}</ul>
      </nav>

      {/* Bottom Logout & Version */}
      <div className="px-4 xl:px-6 py-4 border-t border-[#f4f1ea]/10 space-y-2.5">
        <button
          type="button"
          onClick={onLogout}
          title="Logout"
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-full text-[14px] font-medium text-[#A9B1C6] hover:text-[#f4f1ea] hover:bg-[#f4f1ea]/[0.08] transition-colors cursor-pointer ${
            collapsed ? 'justify-center' : 'justify-start sm:justify-center xl:justify-start'
          }`}
        >
          <LogOut className="w-[18px] h-[18px] shrink-0" />
          {!collapsed && <span className="sm:hidden xl:inline">Logout</span>}
        </button>

        
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop & Tablet Fixed/Sticky Rail */}
      <aside
        className={`hidden sm:block shrink-0 sticky top-0 h-screen z-30 transition-all duration-200 ${
          collapsed ? 'w-20' : 'w-20 xl:w-[264px]'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Slide-in Drawer (<= 640px) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 sm:hidden flex">
          <div className="fixed inset-0 bg-[#0B1224]/70 backdrop-blur-xs" onClick={onCloseMobile} />
          <aside className="relative z-10 w-[264px] max-w-[82vw] h-full shadow-2xl">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}