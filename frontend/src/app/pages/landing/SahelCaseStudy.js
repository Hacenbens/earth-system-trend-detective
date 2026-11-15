'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Compass } from 'lucide-react';
import { SahelCaseStudyMap } from '@/app/pages/landing/SahelCaseStudyMap';

export function SahelCaseStudy({ onExploreInvestigation, onReadMethod }) {
  const [layer, setLayer] = useState('rainfall');

  const layerDescriptions = {
    rainfall: 'GPM IMERG JJAS seasonal intensity field (10°N–20°N, 18°W–20°E)',
    moisture: 'MERRA-2 850 hPa monsoon moisture flux corridor',
    aerosols: 'MODIS Saharan mineral dust optical depth gradient',
  };

  return (
    <section id="sahel-case-study" className="bg-[#f4f1ea] text-[#131D38] py-[72px] lg:py-[120px]">
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
          {/* Left: Framed Sahel Study Box Map Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-6 relative"
          >
            {/* Overlapping circular navy Case Study badge */}
            <div className="absolute -top-5 -left-3 sm:-left-5 z-20 w-24 h-24 rounded-full bg-[#131D38] text-[#f4f1ea] border-4 border-[#f4f1ea] shadow-instrument flex flex-col items-center justify-center text-center p-2">
              <Compass className="w-5 h-5 text-[#ffc20d] mb-1" />
              <span className="font-mono text-[10px] uppercase tracking-wider leading-tight">
                Case study
              </span>
            </div>

            <div className="rounded-[28px] bg-white border border-[#E6E0D2] p-4 sm:p-5 shadow-instrument">
              {/* Interactive scientific map frame */}
              <div className="relative rounded-[24px] bg-[#131D38] overflow-hidden p-4 sm:p-5">
                {/* Layer control bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pl-16 sm:pl-14">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-[#A9B1C6]">
                    10°N–20°N · 18°W–20°E
                  </span>
                  <div className="inline-flex items-center gap-1 p-1 rounded-full bg-[#1E2B52] border border-[#f4f1ea]/10">
                    {[
                      { id: 'rainfall', label: 'Rainfall' },
                      { id: 'moisture', label: 'Moisture' },
                      { id: 'aerosols', label: 'Aerosols' },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setLayer(item.id)}
                        className={`px-3 py-1 rounded-full text-[11px] font-mono transition-colors cursor-pointer whitespace-nowrap ${
                          layer === item.id
                            ? 'bg-[#ffc20d] text-[#131D38] font-medium'
                            : 'text-[#A9B1C6] hover:text-[#f4f1ea]'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Real satellite map: West, Central & East Sahel boxes on their regions */}
                <SahelCaseStudyMap layer={layer} />

                <p className="mt-2.5 font-mono text-[11px] text-[#A9B1C6]">
                  {layerDescriptions[layer]}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Right: Editorial case study summary */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.75, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-6"
          >
            <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-[#5B6478]">
              FLAGSHIP INVESTIGATION
            </p>

            <h2 className="mt-4 font-display text-[clamp(1.85rem,3.4vw,2.75rem)] font-semibold leading-[1.14] tracking-[-0.025em] text-[#131D38]">
              Is Sahel rainfall changing in{' '}
              <span className="font-editorial-italic font-normal text-[1.1em]">amount</span> and
              intensity?
            </h2>

            <p className="mt-5 text-[17px] leading-[1.6] text-[#5B6478] max-w-xl">
              Across the Sahel, seasonal rain totals appear to be recovering from late-century
              drought—yet farmers report heavier downpours and sharper dry spells. We trace the
              physical drivers linking both.
            </p>

            {/* Three mini facts */}
            <dl className="mt-8 pt-6 border-t border-[#E6E0D2] grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <dt className="font-mono text-[11px] uppercase tracking-wider text-[#5B6478]">
                  Region
                </dt>
                <dd className="mt-1 font-display text-[15px] font-semibold text-[#131D38] tabular-nums">
                  10°N–20°N, 18°W–20°E
                </dd>
              </div>
              <div>
                <dt className="font-mono text-[11px] uppercase tracking-wider text-[#5B6478]">
                  Period
                </dt>
                <dd className="mt-1 font-display text-[15px] font-semibold text-[#131D38] tabular-nums">
                  2001–2025
                </dd>
              </div>
              <div>
                <dt className="font-mono text-[11px] uppercase tracking-wider text-[#5B6478]">
                  Data
                </dt>
                <dd className="mt-1 font-display text-[15px] font-semibold text-[#131D38]">
                  NASA GPM IMERG
                </dd>
              </div>
            </dl>

            <div className="mt-9 flex flex-wrap items-center gap-6">
              <button
                type="button"
                onClick={onExploreInvestigation}
                className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full bg-[#ffc20d] text-[#131D38] text-[15px] font-semibold hover:bg-[#eab006] transition-colors cursor-pointer whitespace-nowrap shadow-[0_12px_28px_rgba(19,29,56,0.1)]"
              >
                <span>Explore the investigation</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={onReadMethod}
                className="inline-flex items-center gap-1.5 text-[15px] font-semibold text-[#131D38] hover:text-[#5B6478] underline-offset-4 hover:underline transition-colors cursor-pointer whitespace-nowrap"
              >
                <span>Read the method →</span>
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}