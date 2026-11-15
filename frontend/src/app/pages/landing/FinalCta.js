'use client';

import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';

export function FinalCta({ onStartInvestigation }) {
  return (
    <section className="bg-[#131D38] pt-8 pb-[72px] lg:pb-[120px]">
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
          className="relative overflow-hidden rounded-[28px] bg-[#f4f1ea] text-[#131D38] px-7 py-12 sm:px-12 sm:py-16 lg:px-16 lg:py-20 shadow-instrument-dark"
        >
          {/* Faint Earth-arc scientific illustration on the right */}
          <svg
            aria-hidden="true"
            viewBox="0 0 420 360"
            className="pointer-events-none absolute -right-12 -bottom-16 w-[320px] sm:w-[400px] lg:w-[460px] h-auto opacity-30"
          >
            <circle cx="280" cy="280" r="220" fill="none" stroke="#131D38" strokeWidth="1.2" />
            <circle
              cx="280"
              cy="280"
              r="185"
              fill="none"
              stroke="#131D38"
              strokeWidth="1"
              strokeDasharray="4 5"
            />
            <ellipse
              cx="280"
              cy="280"
              rx="220"
              ry="84"
              transform="rotate(-18 280 280)"
              fill="none"
              stroke="#4FB3A9"
              strokeWidth="1.5"
            />
            <ellipse
              cx="280"
              cy="280"
              rx="245"
              ry="110"
              transform="rotate(-18 280 280)"
              fill="none"
              stroke="#ffc20d"
              strokeWidth="1.8"
            />
            <circle cx="152" cy="140" r="5" fill="#131D38" />
          </svg>

          <div className="relative z-10 max-w-2xl">
            <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-[#5B6478]">
              OPEN INVESTIGATION WORKSPACE
            </p>
            <h2 className="mt-4 font-display text-[clamp(1.85rem,3.6vw,2.85rem)] font-semibold leading-[1.12] tracking-[-0.025em] text-[#131D38]">
              Start investigating{' '}
              <span className="font-editorial-italic font-normal text-[1.1em]">Earth-system</span>{' '}
              changes.
            </h2>
            <p className="mt-4 text-[17px] leading-[1.6] text-[#5B6478] max-w-xl">
              Launch an investigation from a region and variable, inspect every physical assumption,
              and keep uncertainty explicit at every step.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-6">
              <button
                type="button"
                onClick={onStartInvestigation}
                className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full bg-[#ffc20d] text-[#131D38] text-[15px] font-semibold hover:bg-[#eab006] transition-colors cursor-pointer whitespace-nowrap shadow-[0_12px_28px_rgba(19,29,56,0.12)]"
              >
                <span>Start an investigation</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <a
                href="#sahel-case-study"
                className="text-[15px] font-semibold text-[#131D38] hover:text-[#5B6478] underline-offset-4 hover:underline transition-colors whitespace-nowrap"
              >
                Explore the Sahel case study
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
