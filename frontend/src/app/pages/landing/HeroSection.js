'use client';

import { useRef, useState } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { ArrowRight, ChevronDown, Globe2 } from 'lucide-react';
const heroEarthImg = '/images/hero_earth_sahel_1794690705732.jpg';
import { PERIOD_OPTIONS, REGION_OPTIONS, VARIABLE_OPTIONS } from '@/app/api/earthSignalData';

export function HeroSection({ query, onChangeQuery, onLaunchInvestigation }) {
  const heroRef = useRef(null);
  const [imgError, setImgError] = useState(false);

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const bgY = useTransform(scrollYProgress, [0, 1], ['0%', '10%']);

  return (
    <section
      id="hero"
      ref={heroRef}
      className="relative bg-[#131D38] text-[#f4f1ea] pt-32 sm:pt-36 lg:pt-40 pb-36 sm:pb-40 lg:pb-44 overflow-visible"
    >
      {/* Clipped background canvas for Earth & gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {!imgError ? (
          <motion.div style={{ y: bgY }} className="absolute inset-0">
            <img
              src={heroEarthImg}
              alt="Earth seen from orbit with the Sahel study band highlighted in warm amber"
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="w-full h-full object-cover object-right animate-earth-drift opacity-95"
            />
          </motion.div>
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_48%,rgba(79,179,169,0.22),rgba(19,29,56,0.96)_58%)] flex items-center justify-end pr-24">
            <Globe2 className="w-64 h-64 text-[#4FB3A9]/20" />
          </div>
        )}

        {/* Left-to-right navy gradient scrim for crisp editorial legibility */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#131D38] via-[#131D38]/88 to-[#131D38]/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#131D38] via-transparent to-[#131D38]/60" />
      </div>

      {/* Main 12-column container */}
      <div className="relative z-10 max-w-[1200px] mx-auto px-5 sm:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left column: Headline & CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-7"
          >
            

            <h1 className="mt-14 font-display text-[clamp(2.35rem,4.5vw,4rem)] font-semibold leading-[1.08] tracking-[-0.03em] text-[#f4f1ea] max-w-2xl">
                Discover the{' '}
              <span className="font-editorial-italic text-[#ffc20d] font-normal tracking-normal text-[1.08em]">
                signals
              </span>{' '}
              behind a changing Earth.
            </h1>

            <p className="mt-6 text-[17px] sm:text-[18px] leading-[1.6] text-[#A9B1C6] max-w-xl">
              EarthSignal turns NASA observations into investigations: detect a trend, examine the
              physics behind it, and explore what could happen next.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => onLaunchInvestigation(query)}
                className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full bg-[#ffc20d] text-[#131D38] text-[15px] font-semibold hover:bg-[#eab006] transition-all duration-200 whitespace-nowrap shrink-0 cursor-pointer shadow-[0_12px_32px_rgba(255,194,13,0.24)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffc20d]"
              >
                <span>Start an investigation</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <a
                href="#sahel-case-study"
                className="inline-flex items-center px-7 py-3.5 rounded-full border border-[#f4f1ea]/35 text-[#f4f1ea] text-[15px] font-medium hover:bg-[#f4f1ea]/10 hover:border-[#f4f1ea]/65 transition-all duration-200 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f4f1ea]"
              >
                Explore the Sahel case study
              </a>
            </div>
          </motion.div>

          {/* Right column: Floating glass scientific telemetry cards */}
          <div className="lg:col-span-5 relative min-h-[240px] lg:min-h-[340px] flex flex-col justify-end lg:justify-between items-start lg:items-end gap-4">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-[270px] rounded-[28px] bg-[#1E2B52]/75 backdrop-blur-md border border-[#f4f1ea]/15 p-5 shadow-instrument-dark lg:mr-8"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-[13px] font-medium text-[#f4f1ea]">Rainfall trend ↗</span>
                <span className="font-mono text-[11px] uppercase text-[#ffc20d] tabular-nums">
                  JJAS
                </span>
              </div>
              <div className="mt-3 h-12 w-full">
                <svg
                  viewBox="0 0 210 48"
                  className="w-full h-full overflow-visible"
                  aria-hidden="true"
                >
                  <path
                    d="M2 34 L22 30 L42 36 L62 25 L82 28 L102 18 L122 23 L142 15 L162 20 L182 11 L206 8"
                    fill="none"
                    stroke="#4FB3A9"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <line
                    x1="2"
                    y1="35"
                    x2="206"
                    y2="11"
                    stroke="#ffc20d"
                    strokeWidth="1.5"
                    strokeDasharray="4 3"
                  />
                </svg>
              </div>
              <div className="mt-2 font-mono text-[11px] uppercase tracking-wider text-[#A9B1C6]">
                GPM IMERG · SAHEL BELT
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-[270px] rounded-[28px] bg-[#1E2B52]/75 backdrop-blur-md border border-[#f4f1ea]/15 p-5 shadow-instrument-dark lg:self-start"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-[13px] font-medium text-[#f4f1ea]">Atmospheric moisture</span>
                <span className="font-mono text-[11px] uppercase text-[#4FB3A9] tabular-nums">
                  850 hPa
                </span>
              </div>
              <div className="mt-3 h-12 w-full">
                <svg
                  viewBox="0 0 210 48"
                  className="w-full h-full overflow-visible"
                  aria-hidden="true"
                >
                  <defs>
                    <linearGradient id="moistureGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4FB3A9" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#4FB3A9" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M2 38 C30 34, 48 22, 74 26 C100 30, 120 14, 150 18 C176 21, 192 10, 206 9 L206 46 L2 46 Z"
                    fill="url(#moistureGrad)"
                  />
                  <path
                    d="M2 38 C30 34, 48 22, 74 26 C100 30, 120 14, 150 18 C176 21, 192 10, 206 9"
                    fill="none"
                    stroke="#4FB3A9"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <div className="mt-2 font-mono text-[11px] uppercase tracking-wider text-[#A9B1C6]">
                MERRA-2 · COLUMN VAPOR
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Overlapping cream pill investigation bar straddling bottom edge of hero */}
      <div className="relative z-20 max-w-[1120px] mx-auto px-5 sm:px-8 mt-14 lg:mt-16 -mb-52 sm:-mb-52 lg:-mb-56">
        <motion.form
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
          onSubmit={(e) => {
            e.preventDefault();
            onLaunchInvestigation(query);
          }}
          className="rounded-[28px] lg:rounded-full bg-[#f4f1ea] text-[#131D38] border border-[#E6E0D2] p-3 sm:p-4 lg:pl-8 lg:pr-3.5 lg:py-3 shadow-instrument"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-4 items-center">
            {/* Field 1: Region */}
            <div className="lg:col-span-3 flex flex-col px-3 py-1.5 lg:border-r lg:border-[#E6E0D2]">
              <label
                htmlFor="hero-region"
                className="font-mono text-[11px] uppercase tracking-wider text-[#5B6478]"
              >
                Region
              </label>
              <div className="relative flex items-center mt-0.5">
                <select
                  id="hero-region"
                  value={query.region}
                  onChange={(e) => onChangeQuery({ ...query, region: e.target.value })}
                  className="w-full appearance-none bg-transparent pr-6 font-display text-[15px] font-semibold text-[#131D38] focus:outline-none cursor-pointer"
                >
                  {REGION_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.label}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-[#5B6478] pointer-events-none absolute right-0" />
              </div>
            </div>

            {/* Field 2: Variable */}
            <div className="lg:col-span-4 flex flex-col px-3 py-1.5 lg:border-r lg:border-[#E6E0D2]">
              <label
                htmlFor="hero-variable"
                className="font-mono text-[11px] uppercase tracking-wider text-[#5B6478]"
              >
                Variable
              </label>
              <div className="relative flex items-center mt-0.5">
                <select
                  id="hero-variable"
                  value={query.variable}
                  onChange={(e) => onChangeQuery({ ...query, variable: e.target.value })}
                  className="w-full appearance-none bg-transparent pr-6 font-display text-[15px] font-semibold text-[#131D38] focus:outline-none cursor-pointer"
                >
                  {VARIABLE_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.label}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-[#5B6478] pointer-events-none absolute right-0" />
              </div>
            </div>

            {/* Field 3: Period */}
            <div className="lg:col-span-3 flex flex-col px-3 py-1.5">
              <label
                htmlFor="hero-period"
                className="font-mono text-[11px] uppercase tracking-wider text-[#5B6478]"
              >
                Period
              </label>
              <div className="relative flex items-center mt-0.5">
                <select
                  id="hero-period"
                  value={query.period}
                  onChange={(e) => onChangeQuery({ ...query, period: e.target.value })}
                  className="w-full appearance-none bg-transparent pr-6 font-display text-[15px] font-semibold text-[#131D38] tabular-nums focus:outline-none cursor-pointer"
                >
                  {PERIOD_OPTIONS.map((period) => (
                    <option key={period} value={period}>
                      {period}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-[#5B6478] pointer-events-none absolute right-0" />
              </div>
            </div>

            {/* Action CTA */}
            <div className="lg:col-span-2 flex justify-end">
              <button
                type="submit"
                className="w-full lg:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-[#ffc20d] text-[#131D38] text-[15px] font-semibold hover:bg-[#eab006] transition-colors duration-200 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131D38]"
              >
                <span>Investigate</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.form>
      </div>
    </section>
  );
}
