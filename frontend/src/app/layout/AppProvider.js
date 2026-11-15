'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
} from 'react';
import { useRouter } from 'next/navigation';
import { MotionConfig } from 'motion/react';
import { CheckCircle2, RotateCcw, X } from 'lucide-react';

/*
 * AppProvider holds the app-wide state that used to live in App.tsx
 * (session, toast, landing query) and exposes the same handlers
 * (navigateTo, showToast, handleAuthComplete, handleLogout) to every route.
 *
 * It sits in the root layout, so it survives navigation between routes
 * exactly like the single <App /> component did in the Vite version.
 */

const SESSION_KEY = 'earthsignal_session';

const AppContext = createContext(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}

function loadSavedSession() {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// The original project was a browser-only SPA: much of its state is read from
// localStorage on first render. Rendering only after mount keeps that behaviour
// identical and avoids server/client hydration mismatches.
const subscribe = () => () => {};
function useIsClient() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
}

export function AppProvider({ children }) {
  const router = useRouter();
  const isClient = useIsClient();

  const [session, setSession] = useState(loadSavedSession);
  const [toast, setToast] = useState(null);

  const [query, setQuery] = useState({
    region: 'Sahel',
    variable: 'Rainfall',
    period: '2001–2025',
  });

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 6000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const navigateTo = useCallback(
    (nextPath) => {
      const targetPath = nextPath.startsWith('/') ? nextPath : `/${nextPath}`;
      if (window.location.pathname + window.location.search !== targetPath) {
        router.push(targetPath, { scroll: false });
      }
      window.scrollTo({ top: 0, behavior: 'auto' });
    },
    [router]
  );

  const showToast = useCallback((message, undoAction) => {
    setToast({ message, undoAction });
  }, []);

  const handleAuthComplete = (payload) => {
    const nextSession = {
      mode: payload.mode,
      email: payload.email,
      name: payload.name,
    };
    setSession(nextSession);
    try {
      window.localStorage.setItem(SESSION_KEY, JSON.stringify(nextSession));
    } catch {
      // Ignore storage failures
    }

    showToast(payload.toastMessage);
    navigateTo('/dashboard');
  };

  const handleLogout = () => {
    setSession(null);
    try {
      window.localStorage.removeItem(SESSION_KEY);
    } catch {
      // Ignore
    }
    showToast('Signed out of workspace.');
    navigateTo('/auth');
  };

  const sessionLabel = session
    ? session.mode === 'guest'
      ? 'Dashboard'
      : session.name?.split(' ')[0] || 'Dashboard'
    : null;

  const value = {
    session,
    sessionLabel,
    query,
    setQuery,
    navigateTo,
    showToast,
    handleAuthComplete,
    handleLogout,
  };

  if (!isClient) return null;

  return (
    <AppContext.Provider value={value}>
      <MotionConfig reducedMotion="user">
        {children}

        {/* Calm scientific toast with optional Undo button */}
        {toast && (
          <div
            role="status"
            aria-live="polite"
            className="fixed bottom-6 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-6 z-50 flex items-center gap-3 rounded-full bg-[#1E2B52] text-[#f4f1ea] border border-[#f4f1ea]/20 pl-4 pr-3 py-2.5 shadow-instrument-dark max-w-[92vw] print:hidden"
          >
            <CheckCircle2 className="w-4 h-4 text-[#4FB3A9] shrink-0" />
            <span className="text-[13px] font-medium truncate">{toast.message}</span>
            {toast.undoAction && (
              <button
                type="button"
                onClick={() => {
                  toast.undoAction?.();
                  setToast(null);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#ffc20d] text-[#131D38] text-[11px] font-semibold cursor-pointer shrink-0"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Undo</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setToast(null)}
              aria-label="Dismiss notification"
              className="w-7 h-7 rounded-full hover:bg-[#f4f1ea]/10 inline-flex items-center justify-center text-[#A9B1C6] hover:text-[#f4f1ea] cursor-pointer shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </MotionConfig>
    </AppContext.Provider>
  );
}
