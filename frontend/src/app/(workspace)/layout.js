import { Suspense } from 'react';
import { WorkspaceShell } from '@/app/layout/WorkspaceShell';

export default function WorkspaceLayout({ children }) {
  return (
    <Suspense fallback={null}>
      <WorkspaceShell />
      {children}
    </Suspense>
  );
}
