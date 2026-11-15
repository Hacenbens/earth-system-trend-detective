'use client';

import { useApp } from '@/app/layout/AppProvider';
import { AuthPage } from '@/app/pages/auth/AuthPage';

export function AuthView() {
  const { navigateTo, handleAuthComplete } = useApp();
  return <AuthPage onNavigateHome={() => navigateTo('/')} onAuthComplete={handleAuthComplete} />;
}
