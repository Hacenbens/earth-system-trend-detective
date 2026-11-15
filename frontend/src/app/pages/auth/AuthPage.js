'use client';

import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Eye,
  EyeOff,
  Globe2,
  Loader2,
  Lock,
  Mail,
  User,
  X,
} from 'lucide-react';
import { EarthSignalLogo } from '@/app/layout/ScientificIcons';
import { AuthEarthDiorama } from '@/app/pages/auth/AuthEarthDiorama';

function getPasswordStrength(password) {
  if (!password) return { score: 0, label: 'Enter a password', pct: 0 };
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 1) return { score: 1, label: 'Weak · Use 8+ characters', pct: 25 };
  if (score === 2) return { score: 2, label: 'Fair · Add numbers or symbols', pct: 55 };
  if (score === 3) return { score: 3, label: 'Good · Almost there', pct: 80 };
  return { score: 4, label: 'Strong password', pct: 100 };
}

export function AuthPage({ onNavigateHome, onAuthComplete }) {
  const [mode, setMode] = useState('signin');

  // Form values
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Researcher');
  const [rememberMe, setRememberMe] = useState(true);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Validation & interaction states
  const [errors, setErrors] = useState({});
  const [shakeField, setShakeField] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [legalModalOpen, setLegalModalOpen] = useState(false);

  const strength = useMemo(() => getPasswordStrength(password), [password]);

  const triggerShake = (field) => {
    setShakeField(field);
    window.setTimeout(() => setShakeField(null), 220);
  };

  const validateEmail = (value) => {
    const trimmed = value.trim();
    if (!trimmed) return 'Enter your institutional or research email';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      return 'Enter a valid email';
    }
    return undefined;
  };

  const validatePassword = (value) => {
    if (!value) return 'Enter your password';
    if (value.length < 8) return 'Password must be at least 8 characters';
    return undefined;
  };

  const validateFullName = (value) => {
    if (!value.trim()) return 'Enter your full name';
    if (value.trim().length < 2) return 'Enter at least 2 characters';
    return undefined;
  };

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setErrors({});
    setResetSent(false);
    setIsSuccess(false);
    setShowPassword(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isLoading || isSuccess) return;

    const nextErrors = {};

    if (mode === 'create') {
      const nameErr = validateFullName(fullName);
      if (nameErr) nextErrors.fullName = nameErr;
    }

    const emailErr = validateEmail(email);
    if (emailErr) nextErrors.email = emailErr;

    if (mode !== 'forgot') {
      const passErr = validatePassword(password);
      if (passErr) nextErrors.password = passErr;
    }

    if (mode === 'create' && !agreeTerms) {
      nextErrors.terms = 'Please agree to the Terms and Privacy Policy';
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      const firstErrKey = Object.keys(nextErrors)[0];
      triggerShake(firstErrKey);
      return;
    }

    setIsLoading(true);

    window.setTimeout(() => {
      setIsLoading(false);

      if (mode === 'forgot') {
        setResetSent(true);
        return;
      }

      setIsSuccess(true);
      window.setTimeout(() => {
        onAuthComplete({
          mode: 'authenticated',
          email: email.trim(),
          name: mode === 'create' ? fullName.trim() : undefined,
          toastMessage:
            mode === 'create'
              ? `Workspace created for ${fullName.trim()}.`
              : `Signed in as ${email.trim()}.`,
        });
      }, 650);
    }, 700);
  };

  const handleGuestContinue = () => {
    onAuthComplete({
      mode: 'guest',
      toastMessage: 'Demo mode: your work is saved on this device.',
    });
  };

  return (
    <div className="relative min-h-screen bg-[#0B1224] text-[#f4f1ea] flex items-center justify-center p-3 sm:p-6 lg:p-10 overflow-hidden">
      {/* Faint blurred background circles (#1E2B52 at 10-20% opacity) */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-24 w-[520px] h-[520px] rounded-full bg-[#1E2B52]/30 blur-[120px]" />
        <div className="absolute -bottom-40 -right-24 w-[620px] h-[620px] rounded-full bg-[#1E2B52]/35 blur-[130px]" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[380px] h-[380px] rounded-full bg-[#4FB3A9]/5 blur-[110px]" />
      </div>

      {/* Main 40px rounded split container (1280 x 820 desktop baseline) */}
      <main className="relative z-10 w-full max-w-[1280px] lg:min-h-[820px] rounded-[32px] lg:rounded-[40px] bg-[#131D38] shadow-[0_40px_80px_rgba(0,0,0,0.35)] overflow-hidden flex flex-col lg:flex-row border border-[#f4f1ea]/10">
        {/* LEFT SIDE: Cream #f4f1ea organic blob (~58% width on desktop, ~280px top banner on <=1024px) */}
        <section
          aria-label="EarthSignal platform overview"
          className="relative w-full lg:w-[58%] bg-[#131D38] shrink-0"
        >
          {/* Cream surface with organic wave divider */}
          <div className="relative h-full bg-[#f4f1ea] text-[#131D38] px-6 pt-6 pb-10 sm:px-10 sm:pt-9 lg:pl-12 lg:pr-20 lg:py-10 flex flex-col justify-between lg:min-h-[820px]">
            {/* Desktop right organic wave edge curving into navy panel */}
            <svg
              aria-hidden="true"
              viewBox="0 0 110 820"
              preserveAspectRatio="none"
              className="hidden lg:block absolute top-0 right-0 h-full w-[92px] translate-x-[1px] pointer-events-none"
            >
              <path
                d="M28,0 C-6,135 96,245 96,410 C96,575 -6,685 28,820 L110,820 L110,0 Z"
                fill="#131D38"
              />
            </svg>

            {/* Mobile / Tablet bottom organic wave edge */}
            <svg
              aria-hidden="true"
              viewBox="0 0 800 44"
              preserveAspectRatio="none"
              className="lg:hidden absolute bottom-0 left-0 w-full h-9 translate-y-[1px] pointer-events-none"
            >
              <path d="M0,18 C220,46 580,-6 800,24 L800,44 L0,44 Z" fill="#131D38" />
            </svg>

            {/* Top-left Logo */}
            <div className="relative z-10 flex items-center justify-between">
              <button
                type="button"
                onClick={onNavigateHome}
                className="inline-flex items-center gap-2 rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#131D38] cursor-pointer group"
                aria-label="Back to EarthSignal landing page"
              >
                <EarthSignalLogo theme="light" />
              </button>

              <button
                type="button"
                onClick={onNavigateHome}
                className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#5B6478] hover:text-[#131D38] transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Home</span>
              </button>
            </div>

            {/* Center 3D Earth Diorama */}
            <div className="relative z-10 my-4 lg:my-2 flex items-center justify-center">
              <div className="hidden lg:block w-full">
                <AuthEarthDiorama />
              </div>
              <div className="lg:hidden flex items-center justify-center h-[195px]">
                <AuthEarthDiorama compact />
              </div>
            </div>

            {/* Bottom of cream blob (desktop full, mobile compact) */}
            <div className="relative z-10 hidden lg:block max-w-md">
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5B6478]">
                EARTH-SYSTEM INVESTIGATION PLATFORM
              </p>
              <p className="mt-2.5 text-[15px] leading-[1.6] text-[#131D38]">
                Detect trends in NASA data, investigate the physics behind them, and explore what
                could happen next.
              </p>
              <p className="mt-6 text-[11px] text-[#5B6478]">
                © 2026 EarthSignal · Built for NASA Space Apps Challenge
              </p>
            </div>
          </div>
        </section>

        {/* RIGHT SIDE: Navy #131D38 Form Panel (~42% width) */}
        <section
          aria-label="Researcher authentication form"
          className="w-full lg:w-[42%] bg-[#131D38] text-[#f4f1ea] px-6 py-9 sm:px-10 lg:px-10 lg:py-10 flex flex-col justify-between"
        >
          <div className="hidden lg:block" aria-hidden="true" />

          {/* Vertically centered 380-420px column sliding up 16px on load */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-[408px] mx-auto my-auto"
          >
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#A9B1C6]">
              RESEARCHER WORKSPACE
            </p>

            {/* Title */}
            <h1 className="mt-2.5 font-display text-[34px] sm:text-[42px] font-semibold leading-[1.1] tracking-[-0.025em] text-[#f4f1ea]">
              {mode === 'signin' && (
                <>
                  Welcome{' '}
                  <span className="font-editorial-italic text-[#ffc20d] font-normal text-[1.08em]">
                    back
                  </span>
                </>
              )}
              {mode === 'create' && (
                <>
                  Start your{' '}
                  <span className="font-editorial-italic text-[#ffc20d] font-normal text-[1.08em]">
                    investigation
                  </span>
                </>
              )}
              {mode === 'forgot' && (
                <>
                  Reset your{' '}
                  <span className="font-editorial-italic text-[#ffc20d] font-normal text-[1.08em]">
                    password
                  </span>
                </>
              )}
            </h1>

            <p className="mt-2 text-[15px] text-[#A9B1C6]">
              {mode === 'signin' && 'Sign in to continue your investigations.'}
              {mode === 'create' && 'Create a researcher workspace to save your study regions.'}
              {mode === 'forgot' && 'Enter your email and we will send a recovery link.'}
            </p>

            {/* Segmented Pill Toggle (Sign in | Create account) */}
            {mode !== 'forgot' && (
              <div
                className="mt-6 p-1 rounded-full bg-[#0B1224] border border-[#f4f1ea]/10 grid grid-cols-2"
                role="tablist"
                aria-label="Authentication mode"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'signin'}
                  onClick={() => switchMode('signin')}
                  className={`py-2.5 rounded-full text-[13px] font-semibold transition-all duration-200 cursor-pointer ${
                    mode === 'signin'
                      ? 'bg-[#ffc20d] text-[#131D38] shadow-sm'
                      : 'text-[#A9B1C6] hover:text-[#f4f1ea]'
                  }`}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'create'}
                  onClick={() => switchMode('create')}
                  className={`py-2.5 rounded-full text-[13px] font-semibold transition-all duration-200 cursor-pointer ${
                    mode === 'create'
                      ? 'bg-[#ffc20d] text-[#131D38] shadow-sm'
                      : 'text-[#A9B1C6] hover:text-[#f4f1ea]'
                  }`}
                >
                  Create account
                </button>
              </div>
            )}

            {/* FORGOT PASSWORD SUCCESS CARD */}
            {mode === 'forgot' && resetSent ? (
              <div className="mt-7 rounded-[24px] bg-[#1E2B52] border border-[#4FB3A9]/40 p-6">
                <div className="flex items-start gap-3.5">
                  <CheckCircle2 className="w-5 h-5 text-[#4FB3A9] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[15px] font-medium text-[#f4f1ea]">
                      If this email exists, a link is on its way.
                    </p>
                    <p className="mt-1.5 text-[13px] text-[#A9B1C6]">
                      Check <span className="text-[#f4f1ea]">{email}</span> for instructions to
                      reset your workspace credentials.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => switchMode('signin')}
                  className="mt-5 inline-flex items-center gap-1.5 text-[14px] font-medium text-[#ffc20d] hover:underline underline-offset-4 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to sign in</span>
                </button>
              </div>
            ) : (
              /* CROSS-FADING FORM (300ms transition) */
              <motion.form
                key={mode}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                onSubmit={handleSubmit}
                noValidate
                className="mt-6 space-y-4"
              >
                {/* Full Name (Create Account only) */}
                {mode === 'create' && (
                  <div
                    className={`group ${shakeField === 'fullName' ? 'animate-field-shake' : ''}`}
                  >
                    <label
                      htmlFor="auth-fullname"
                      className="block text-[14px] font-medium text-[#f4f1ea]/90 group-focus-within:text-[#f4f1ea] mb-1.5 transition-colors"
                    >
                      Full name
                    </label>
                    <div
                      className={`relative flex items-center h-[56px] rounded-full bg-[#0B1224] border transition-all duration-200 ${
                        errors.fullName
                          ? 'border-[#FF7A6B]'
                          : 'border-[#f4f1ea]/12 focus-within:border-[#ffc20d] focus-within:ring-2 focus-within:ring-[#ffc20d] focus-within:shadow-[0_0_0_4px_rgba(255,194,13,0.14)]'
                      }`}
                    >
                      <User className="w-4 h-4 text-[#A9B1C6] ml-5 shrink-0" />
                      <input
                        id="auth-fullname"
                        type="text"
                        autoComplete="name"
                        value={fullName}
                        onChange={(e) => {
                          setFullName(e.target.value);
                          if (errors.fullName) {
                            setErrors((prev) => ({ ...prev, fullName: undefined }));
                          }
                        }}
                        onBlur={() => {
                          const err = validateFullName(fullName);
                          if (err) setErrors((prev) => ({ ...prev, fullName: err }));
                        }}
                        placeholder="Dr. Amina Diallo"
                        className="w-full h-full bg-transparent px-3.5 pr-5 text-[15px] text-[#f4f1ea] placeholder:text-[#5B6478] focus:outline-none rounded-full"
                      />
                    </div>
                    {errors.fullName && (
                      <p className="mt-1.5 ml-4 flex items-center gap-1.5 text-[12px] text-[#FF7A6B]">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{errors.fullName}</span>
                      </p>
                    )}
                  </div>
                )}

                {/* Email Field */}
                <div className={`group ${shakeField === 'email' ? 'animate-field-shake' : ''}`}>
                  <label
                    htmlFor="auth-email"
                    className="block text-[14px] font-medium text-[#f4f1ea]/90 group-focus-within:text-[#f4f1ea] mb-1.5 transition-colors"
                  >
                    Email
                  </label>
                  <div
                    className={`relative flex items-center h-[56px] rounded-full bg-[#0B1224] border transition-all duration-200 ${
                      errors.email
                        ? 'border-[#FF7A6B]'
                        : 'border-[#f4f1ea]/12 focus-within:border-[#ffc20d] focus-within:ring-2 focus-within:ring-[#ffc20d] focus-within:shadow-[0_0_0_4px_rgba(255,194,13,0.14)]'
                    }`}
                  >
                    <Mail className="w-4 h-4 text-[#A9B1C6] ml-5 shrink-0" />
                    <input
                      id="auth-email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (errors.email) {
                          setErrors((prev) => ({ ...prev, email: undefined }));
                        }
                      }}
                      onBlur={() => {
                        const err = validateEmail(email);
                        if (err) setErrors((prev) => ({ ...prev, email: err }));
                      }}
                      placeholder="you@institution.org"
                      className="w-full h-full bg-transparent px-3.5 pr-5 text-[15px] text-[#f4f1ea] placeholder:text-[#5B6478] focus:outline-none rounded-full"
                    />
                  </div>
                  {errors.email && (
                    <p className="mt-1.5 ml-4 flex items-center gap-1.5 text-[12px] text-[#FF7A6B]">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{errors.email}</span>
                    </p>
                  )}
                </div>

                {/* Password Field (Sign in & Create account) */}
                {mode !== 'forgot' && (
                  <div
                    className={`group ${shakeField === 'password' ? 'animate-field-shake' : ''}`}
                  >
                    <label
                      htmlFor="auth-password"
                      className="block text-[14px] font-medium text-[#f4f1ea]/90 group-focus-within:text-[#f4f1ea] mb-1.5 transition-colors"
                    >
                      Password
                    </label>
                    <div
                      className={`relative flex items-center h-[56px] rounded-full bg-[#0B1224] border transition-all duration-200 ${
                        errors.password
                          ? 'border-[#FF7A6B]'
                          : 'border-[#f4f1ea]/12 focus-within:border-[#ffc20d] focus-within:ring-2 focus-within:ring-[#ffc20d] focus-within:shadow-[0_0_0_4px_rgba(255,194,13,0.14)]'
                      }`}
                    >
                      <Lock className="w-4 h-4 text-[#A9B1C6] ml-5 shrink-0" />
                      <input
                        id="auth-password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (errors.password) {
                            setErrors((prev) => ({ ...prev, password: undefined }));
                          }
                        }}
                        onBlur={() => {
                          const err = validatePassword(password);
                          if (err) {
                            setErrors((prev) => ({ ...prev, password: err }));
                          }
                        }}
                        placeholder="Enter your password"
                        className="w-full h-full bg-transparent px-3.5 pr-12 text-[15px] text-[#f4f1ea] placeholder:text-[#5B6478] focus:outline-none rounded-full"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-3 w-9 h-9 rounded-full inline-flex items-center justify-center text-[#A9B1C6] hover:text-[#f4f1ea] transition-colors cursor-pointer"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    {errors.password && (
                      <p className="mt-1.5 ml-4 flex items-center gap-1.5 text-[12px] text-[#FF7A6B]">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{errors.password}</span>
                      </p>
                    )}

                    {/* Thin amber strength bar in Create Account mode */}
                    {mode === 'create' && (
                      <div className="mt-2.5 px-3">
                        <div className="h-1 w-full rounded-full bg-[#0B1224] overflow-hidden">
                          <div
                            className="h-full bg-[#ffc20d] transition-all duration-300"
                            style={{ width: `${strength.pct}%` }}
                          />
                        </div>
                        <p className="mt-1 font-mono text-[11px] text-[#A9B1C6]">
                          {strength.label}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Role / Field of Study Dropdown (Create Account only) */}
                {mode === 'create' && (
                  <div>
                    <label
                      htmlFor="auth-role"
                      className="block text-[14px] font-medium text-[#f4f1ea]/90 mb-1.5"
                    >
                      Role or field of study{' '}
                      <span className="text-[#A9B1C6] font-normal">(optional)</span>
                    </label>
                    <div className="relative flex items-center h-[52px] rounded-full bg-[#0B1224] border border-[#f4f1ea]/12 focus-within:border-[#ffc20d] focus-within:ring-2 focus-within:ring-[#ffc20d]">
                      <select
                        id="auth-role"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className="w-full h-full appearance-none bg-transparent pl-5 pr-10 text-[15px] text-[#f4f1ea] focus:outline-none cursor-pointer rounded-full"
                      >
                        <option value="Researcher" className="bg-[#131D38]">
                          Researcher
                        </option>
                        <option value="Student" className="bg-[#131D38]">
                          Student
                        </option>
                        <option value="Educator" className="bg-[#131D38]">
                          Educator
                        </option>
                        <option value="Other" className="bg-[#131D38]">
                          Other
                        </option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-[#A9B1C6] pointer-events-none absolute right-5" />
                    </div>
                  </div>
                )}

                {/* Remember me + Forgot password (Sign in) */}
                {mode === 'signin' && (
                  <div className="flex items-center justify-between gap-3 pt-1">
                    <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={rememberMe}
                        onClick={() => setRememberMe((prev) => !prev)}
                        className={`w-5 h-5 rounded-[6px] border inline-flex items-center justify-center transition-colors cursor-pointer ${
                          rememberMe
                            ? 'bg-[#ffc20d] border-[#ffc20d] text-[#131D38]'
                            : 'bg-[#0B1224] border-[#f4f1ea]/25 text-transparent'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      </button>
                      <span className="text-[13px] text-[#A9B1C6]">Remember me</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => switchMode('forgot')}
                      className="text-[13px] text-[#A9B1C6] underline underline-offset-4 hover:text-[#ffc20d] transition-colors cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                {/* Terms Agreement Checkbox (Create Account) */}
                {mode === 'create' && (
                  <div className={shakeField === 'terms' ? 'animate-field-shake' : ''}>
                    <label className="inline-flex items-start gap-2.5 cursor-pointer select-none pt-1">
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={agreeTerms}
                        onClick={() => {
                          setAgreeTerms((prev) => !prev);
                          if (errors.terms) {
                            setErrors((prev) => ({ ...prev, terms: undefined }));
                          }
                        }}
                        className={`mt-0.5 w-5 h-5 rounded-[6px] border inline-flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                          agreeTerms
                            ? 'bg-[#ffc20d] border-[#ffc20d] text-[#131D38]'
                            : 'bg-[#0B1224] border-[#f4f1ea]/25 text-transparent'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      </button>
                      <span className="text-[13px] leading-[1.45] text-[#A9B1C6]">
                        I agree to the{' '}
                        <button
                          type="button"
                          onClick={() => setLegalModalOpen(true)}
                          className="text-[#f4f1ea] underline underline-offset-4 hover:text-[#ffc20d] cursor-pointer"
                        >
                          Terms and Privacy Policy
                        </button>
                      </span>
                    </label>
                    {errors.terms && (
                      <p className="mt-1.5 ml-1 flex items-center gap-1.5 text-[12px] text-[#FF7A6B]">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{errors.terms}</span>
                      </p>
                    )}
                  </div>
                )}

                {/* Primary Amber CTA Pill Button (56px height) */}
                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={isLoading || isSuccess}
                    className="w-full h-[56px] rounded-full bg-[#ffc20d] text-[#131D38] text-[15px] font-semibold inline-flex items-center justify-center gap-2.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_32px_rgba(255,194,13,0.28)] disabled:opacity-80 disabled:hover:translate-y-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffc20d]"
                  >
                    {isLoading ? (
                      <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#131D38] text-[#ffc20d] text-[13px] font-medium">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Verifying</span>
                      </span>
                    ) : isSuccess ? (
                      <span className="inline-flex items-center gap-2">
                        <Check className="w-5 h-5 stroke-[2.5]" />
                        <span>Entering workspace</span>
                      </span>
                    ) : (
                      <>
                        <span>
                          {mode === 'signin' && 'Sign in'}
                          {mode === 'create' && 'Create account'}
                          {mode === 'forgot' && 'Send reset link'}
                        </span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>

                {/* Back to sign in link for Forgot Password */}
                {mode === 'forgot' && (
                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => switchMode('signin')}
                      className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#A9B1C6] hover:text-[#ffc20d] transition-colors cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to sign in</span>
                    </button>
                  </div>
                )}
              </motion.form>
            )}

            {/* Divider & Guest Demo Option (always available on Sign in & Create account) */}
            {mode !== 'forgot' && (
              <>
                <div className="my-5 flex items-center gap-3">
                  <div className="h-px flex-1 bg-[#f4f1ea]/12" />
                  <span className="font-mono text-[11px] uppercase tracking-wider text-[#A9B1C6]">
                    or
                  </span>
                  <div className="h-px flex-1 bg-[#f4f1ea]/12" />
                </div>

                <button
                  type="button"
                  onClick={handleGuestContinue}
                  className="w-full h-[52px] rounded-full border border-[#f4f1ea]/35 text-[#f4f1ea] text-[14px] font-medium inline-flex items-center justify-center gap-2.5 hover:bg-[#f4f1ea]/10 hover:border-[#f4f1ea]/65 transition-all duration-200 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f4f1ea]"
                >
                  <Globe2 className="w-4 h-4 text-[#4FB3A9]" />
                  <span>Continue as guest · Explore the Sahel demo</span>
                </button>

                <p className="mt-2.5 text-center text-[12px] text-[#A9B1C6]">
                  No account needed. Investigations are saved locally in this browser.
                </p>

                <p className="mt-4 text-center text-[13px] text-[#A9B1C6]">
                  {mode === 'signin' ? (
                    <>
                      Don’t have an account?{' '}
                      <button
                        type="button"
                        onClick={() => switchMode('create')}
                        className="text-[#f4f1ea] font-medium underline decoration-[#ffc20d] underline-offset-4 hover:text-[#ffc20d] transition-colors cursor-pointer"
                      >
                        Create one
                      </button>
                    </>
                  ) : (
                    <>
                      Already have an account?{' '}
                      <button
                        type="button"
                        onClick={() => switchMode('signin')}
                        className="text-[#f4f1ea] font-medium underline decoration-[#ffc20d] underline-offset-4 hover:text-[#ffc20d] transition-colors cursor-pointer"
                      >
                        Sign in
                      </button>
                    </>
                  )}
                </p>
              </>
            )}
          </motion.div>

          {/* Bottom of Navy Panel: Tiny muted links */}
          <div className="mt-8 pt-4 border-t border-[#f4f1ea]/8 flex flex-wrap items-center justify-between gap-3 text-[12px] text-[#A9B1C6]">
            <button
              type="button"
              onClick={() => setLegalModalOpen(true)}
              className="hover:text-[#ffc20d] transition-colors cursor-pointer"
            >
              Terms & Privacy
            </button>
            <a
              href="mailto:contact@earthsignal.app"
              className="hover:text-[#ffc20d] transition-colors"
            >
              Need help? contact@earthsignal.app
            </a>
          </div>
        </section>
      </main>

      {/* Terms & Privacy Information Modal */}
      {legalModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B1224]/80 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={() => setLegalModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-[28px] bg-[#131D38] text-[#f4f1ea] border border-[#f4f1ea]/15 p-6 sm:p-8 shadow-instrument-dark"
          >
            <div className="flex items-center justify-between gap-4 pb-4 border-b border-[#f4f1ea]/10">
              <h2 className="font-display text-[20px] font-semibold">Terms & Privacy</h2>
              <button
                type="button"
                onClick={() => setLegalModalOpen(false)}
                aria-label="Close terms dialog"
                className="w-9 h-9 rounded-full bg-[#1E2B52] text-[#f4f1ea] inline-flex items-center justify-center hover:bg-[#f4f1ea] hover:text-[#131D38] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-4 space-y-3 text-[14px] leading-[1.6] text-[#A9B1C6]">
              <p>
                EarthSignal is an open scientific investigation prototype built for the NASA Space
                Apps Challenge 2026. It is not an official NASA product.
              </p>
              <p>
                In guest and prototype modes, selected study regions and diagnostic notes are stored
                locally in your browser via localStorage and are never sold or shared with third
                parties.
              </p>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setLegalModalOpen(false)}
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
