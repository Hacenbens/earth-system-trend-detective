'use client';

import { motion } from 'motion/react';
import {
  DisconnectedInsightIcon,
  ScatteredDataIcon,
  TrendVsCauseIcon,
} from '@/app/layout/ScientificIcons';

const PROBLEM_CARDS = [
  {
    title: 'Scattered data',
    body: 'Environmental data lives across many datasets, formats and portals.',
    icon: <ScatteredDataIcon />,
  },
  {
    title: 'Trend ≠ cause',
    body: 'Detecting a change doesn’t explain the physical processes behind it.',
    icon: <TrendVsCauseIcon />,
  },
  {
    title: 'Disconnected insight',
    body: 'Researchers must still link observations, mechanisms and future implications by hand.',
    icon: <DisconnectedInsightIcon />,
  },
];

export function ProblemSection() {
  return (
    <section
      id="problem"
      className="bg-[#f4f1ea] text-[#131D38] pt-36 sm:pt-40 lg:pt-44 pb-[72px] lg:pb-[120px]"
    >
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="text-center max-w-2xl mx-auto"
        >
          <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-[#5B6478]">
            THE PROBLEM
          </p>
          <h2 className="mt-4 font-display text-[clamp(1.85rem,3.4vw,2.75rem)] font-semibold leading-[1.14] tracking-[-0.025em] text-[#131D38]">
            Seeing a <span className="font-editorial-italic font-normal text-[1.1em]">trend</span>{' '}
            is not understanding it.
          </h2>
        </motion.div>

        <div className="relative mt-14 lg:mt-16">
          {/* Thin amber line connecting the three cards horizontally on desktop */}
          <div
            aria-hidden="true"
            className="hidden lg:block absolute top-1/2 left-[12%] right-[12%] h-[1.5px] bg-[#ffc20d] -translate-y-1/2 pointer-events-none"
          />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-7">
            {PROBLEM_CARDS.map((card, index) => (
              <motion.article
                key={card.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{
                  duration: 0.7,
                  delay: index * 0.1,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="rounded-[28px] bg-white border border-[#E6E0D2] p-8 sm:p-9 shadow-[0_24px_60px_rgba(19,29,56,0.07)] flex flex-col"
              >
                <div className="mb-6 inline-flex items-center justify-center w-16 h-16 rounded-[20px] bg-[#f4f1ea]">
                  {card.icon}
                </div>
                <h3 className="font-display text-[20px] font-semibold tracking-tight text-[#131D38]">
                  {card.title}
                </h3>
                <p className="mt-3 text-[16px] leading-[1.6] text-[#5B6478]">{card.body}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
