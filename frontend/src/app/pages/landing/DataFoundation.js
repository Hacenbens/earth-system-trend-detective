'use client';

import { motion } from 'motion/react';
import { ShieldCheck } from 'lucide-react';
import { DATA_FOUNDATION } from '@/app/api/earthSignalData';
import { MissionEmblem } from '@/app/layout/ScientificIcons';

export function DataFoundation({ onOpenProvenance }) {
  return (
    <section
      id="data-foundation"
      className="bg-[#131D38] text-[#f4f1ea] pt-[72px] lg:pt-[120px] pb-16 lg:pb-20"
    >
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-2xl"
        >
          <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-[#A9B1C6]">
            DATA AND SCIENTIFIC FOUNDATION
          </p>
          <h2 className="mt-4 font-display text-[clamp(1.85rem,3.4vw,2.75rem)] font-semibold leading-[1.14] tracking-[-0.025em] text-[#f4f1ea]">
            Built on open{' '}
            <span className="font-editorial-italic text-[#ffc20d] font-normal text-[1.1em]">
              NASA
            </span>{' '}
            science.
          </h2>
        </motion.div>

        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {DATA_FOUNDATION.map((item, idx) => (
            <motion.article
              key={item.id}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{
                duration: 0.7,
                delay: idx * 0.08,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="rounded-[28px] bg-[#1E2B52]/75 backdrop-blur-md border border-[#f4f1ea]/12 p-7 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-3">
                  <MissionEmblem id={item.id} />
                  <span className="font-mono text-[11px] uppercase tracking-wider text-[#A9B1C6]">
                    {item.agency}
                  </span>
                </div>

                <h3 className="mt-6 font-display text-[19px] font-semibold text-[#f4f1ea]">
                  {item.name}
                </h3>
                <p className="mt-1 font-mono text-[12px] uppercase tracking-wider text-[#ffc20d]">
                  {item.role}
                </p>
                <p className="mt-3 text-[14px] leading-[1.6] text-[#A9B1C6]">{item.detail}</p>
              </div>

              <div className="mt-5 pt-4 border-t border-[#f4f1ea]/10 font-mono text-[11px] text-[#A9B1C6] tabular-nums">
                {item.spec}
              </div>
            </motion.article>
          ))}
        </div>

        <div className="mt-10 pt-8 border-t border-[#f4f1ea]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-[15px] text-[#f4f1ea]/90">
            <ShieldCheck className="w-5 h-5 text-[#4FB3A9] shrink-0" />
            <span>Every chart shows its dataset, version, method and limitations.</span>
          </div>

          <button
            type="button"
            onClick={onOpenProvenance}
            className="self-start sm:self-auto font-mono text-[12px] uppercase tracking-wider text-[#ffc20d] hover:underline underline-offset-4 cursor-pointer whitespace-nowrap"
          >
            Inspect provenance standards →
          </button>
        </div>
      </div>
    </section>
  );
}
