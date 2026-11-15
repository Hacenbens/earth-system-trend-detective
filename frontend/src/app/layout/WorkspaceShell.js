'use client';

import { usePathname } from 'next/navigation';
import { useApp } from '@/app/layout/AppProvider';
import { DashboardPage } from '@/app/pages/dashboard/DashboardPage';

/*
 * The workspace (dashboard, investigations, datasets, methodology, references)
 * is one persistent shell: sidebar, modals, loaded lists and the skeleton
 * state must survive moving between its URLs. WorkspaceShell lives in the
 * (workspace) route-group layout, reads the URL and hands DashboardPage the
 * same `workspaceRoute` object the original App.tsx router produced.
 */

const VALID_SUBVIEWS = [
  'overview',
  'data',
  'detect',
  'regions',
  'investigate',
  'explain',
  'project',
  'solve',
  'report',
  'export',
];

export function parseWorkspacePath(pathname) {
  const clean = pathname.replace(/\/+$/, '') || '/';
  if (clean === '/dashboard') return { kind: 'dashboard' };
  if (clean === '/investigations') return { kind: 'investigations' };
  if (clean === '/investigations/new') return { kind: 'new_investigation' };
  if (clean.startsWith('/investigations/')) {
    const parts = clean.slice('/investigations/'.length).split('/');
    const id = decodeURIComponent(parts[0] || '');
    const maybeSub = parts[1] || 'overview';
    const subView = VALID_SUBVIEWS.includes(maybeSub) ? maybeSub : 'overview';
    return { kind: 'investigation_detail', id, subView };
  }
  if (clean === '/datasets') return { kind: 'datasets' };
  if (clean.startsWith('/datasets/')) {
    const slug = decodeURIComponent(clean.slice('/datasets/'.length));
    return { kind: 'datasets', slug };
  }
  if (clean === '/methodology') return { kind: 'methodology' };
  if (clean === '/references') return { kind: 'references' };
  return { kind: 'dashboard' };
}

export function WorkspaceShell() {
  const pathname = usePathname();
  const { session, query, navigateTo, showToast, handleLogout } = useApp();

  return (
    <DashboardPage
      workspaceRoute={parseWorkspacePath(pathname)}
      session={session}
      initialQuery={query}
      onNavigatePath={navigateTo}
      onNavigateHome={() => navigateTo('/')}
      onNavigateAuth={() => navigateTo('/auth')}
      onLogout={handleLogout}
      onShowToast={showToast}
    />
  );
}
