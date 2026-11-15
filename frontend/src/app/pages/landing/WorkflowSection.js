'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'motion/react';
import { WORKFLOW_LAYERS } from '@/app/api/earthSignalData';
import { WorkflowNodeIcon } from '@/app/layout/ScientificIcons';
import { ArrowRight } from 'lucide-react';

function LayerMiniVisual({ layerId }) {
  switch (layerId) {
    case 'detect':
      return (
        <div className="w-full">
          <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-[#A9B1C6] mb-3">
            <span>JJAS Seasonal Rainfall Anomaly (2001–2025)</span>
            <span className="text-[#ffc20d]">Sen’s slope + Mann-Kendall</span>
          </div>
          <svg
            viewBox="0 0 420 170"
            className="w-full h-44"
            role="img"
            aria-label="Time series trend chart with teal seasonal rainfall and amber Sen slope line"
          >
            <line x1="32" y1="20" x2="32" y2="140" stroke="#f4f1ea" strokeOpacity="0.14" />
            <line x1="32" y1="140" x2="404" y2="140" stroke="#f4f1ea" strokeOpacity="0.14" />
            <line
              x1="32"
              y1="80"
              x2="404"
              y2="80"
              stroke="#f4f1ea"
              strokeOpacity="0.08"
              strokeDasharray="3 4"
            />
            {/* Rainfall bars */}
            {[112, 98, 105, 86, 94, 78, 88, 72, 82, 69, 90, 65, 74, 62, 79, 55, 67, 50].map(
              (y, i) => {
                const x = 44 + i * 20;
                return (
                  <rect
                    key={i}
                    x={x}
                    y={y}
                    width="10"
                    height={140 - y}
                    rx="3"
                    fill="#4FB3A9"
                    fillOpacity={i > 12 ? 0.85 : 0.45}
                  />
                );
              }
            )}
            {/* Sen's slope line */}
            <line
              x1="44"
              y1="106"
              x2="392"
              y2="54"
              stroke="#ffc20d"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <circle cx="392" cy="54" r="4.5" fill="#ffc20d" />
            <text
              x="44"
              y="158"
              fill="#A9B1C6"
              fontSize="10"
              fontFamily="JetBrains Mono, monospace"
            >
              2001
            </text>
            <text
              x="210"
              y="158"
              fill="#A9B1C6"
              fontSize="10"
              fontFamily="JetBrains Mono, monospace"
            >
              2013
            </text>
            <text
              x="372"
              y="158"
              fill="#A9B1C6"
              fontSize="10"
              fontFamily="JetBrains Mono, monospace"
            >
              2025
            </text>
          </svg>
        </div>
      );

    case 'investigate':
      return (
        <div className="w-full">
          <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-[#A9B1C6] mb-3">
            <span>Co-varying Column Moisture & Aerosol Loading</span>
            <span className="text-[#4FB3A9]">MERRA-2 + MODIS</span>
          </div>
          <svg
            viewBox="0 0 420 170"
            className="w-full h-44"
            role="img"
            aria-label="Layered chart showing moisture vapor in teal and dust aerosols in amber"
          >
            <line x1="32" y1="20" x2="32" y2="140" stroke="#f4f1ea" strokeOpacity="0.14" />
            <line x1="32" y1="140" x2="404" y2="140" stroke="#f4f1ea" strokeOpacity="0.14" />
            <path
              d="M36 112 C80 105, 110 86, 155 92 C205 98, 240 62, 290 68 C335 74, 365 44, 400 40 L400 140 L36 140 Z"
              fill="#4FB3A9"
              fillOpacity="0.18"
            />
            <path
              d="M36 112 C80 105, 110 86, 155 92 C205 98, 240 62, 290 68 C335 74, 365 44, 400 40"
              fill="none"
              stroke="#4FB3A9"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
            <path
              d="M36 62 C85 68, 125 94, 175 82 C225 70, 265 104, 315 96 C350 90, 375 108, 400 102"
              fill="none"
              stroke="#ffc20d"
              strokeWidth="2.2"
              strokeDasharray="5 4"
              strokeLinecap="round"
            />
            <text x="40" y="34" fill="#4FB3A9" fontSize="10" fontFamily="JetBrains Mono, monospace">
              ─ 850 hPa Moisture Vapor
            </text>
            <text
              x="230"
              y="34"
              fill="#ffc20d"
              fontSize="10"
              fontFamily="JetBrains Mono, monospace"
            >
              -- Dust Optical Depth
            </text>
          </svg>
        </div>
      );

    case 'explain':
      return (
        <div className="w-full">
          <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-[#A9B1C6] mb-3">
            <span>Physical Causal Chain</span>
            <span className="text-[#ffc20d]">Confidence-Labeled</span>
          </div>
          <svg
            viewBox="0 0 420 170"
            className="w-full h-44"
            role="img"
            aria-label="Causal mechanism diagram linking Atlantic warming, moisture transport, and convective storms"
          >
            {/* Node 1 */}
            <rect
              x="16"
              y="36"
              width="114"
              height="52"
              rx="14"
              fill="#131D38"
              stroke="#4FB3A9"
              strokeWidth="1.4"
            />
            <text x="73" y="59" textAnchor="middle" fill="#f4f1ea" fontSize="11" fontWeight="600">
              Atlantic SST
            </text>
            <text
              x="73"
              y="75"
              textAnchor="middle"
              fill="#4FB3A9"
              fontSize="10"
              fontFamily="JetBrains Mono, monospace"
            >
              HIGH CONF.
            </text>

            {/* Arrow 1 */}
            <path d="M134 62 H158" stroke="#ffc20d" strokeWidth="1.8" strokeLinecap="round" />
            <polygon points="158,58 165,62 158,66" fill="#ffc20d" />

            {/* Node 2 */}
            <rect
              x="167"
              y="36"
              width="118"
              height="52"
              rx="14"
              fill="#131D38"
              stroke="#f4f1ea"
              strokeOpacity="0.35"
              strokeWidth="1.4"
            />
            <text x="226" y="59" textAnchor="middle" fill="#f4f1ea" fontSize="11" fontWeight="600">
              Monsoon Inflow
            </text>
            <text
              x="226"
              y="75"
              textAnchor="middle"
              fill="#A9B1C6"
              fontSize="10"
              fontFamily="JetBrains Mono, monospace"
            >
              850 hPa FLUX
            </text>

            {/* Arrow 2 */}
            <path d="M289 62 H310" stroke="#ffc20d" strokeWidth="1.8" strokeLinecap="round" />
            <polygon points="310,58 317,62 310,66" fill="#ffc20d" />

            {/* Node 3 */}
            <rect
              x="319"
              y="36"
              width="88"
              height="52"
              rx="14"
              fill="#ffc20d"
              fillOpacity="0.16"
              stroke="#ffc20d"
              strokeWidth="1.5"
            />
            <text x="363" y="59" textAnchor="middle" fill="#f4f1ea" fontSize="11" fontWeight="600">
              MCS Storms
            </text>
            <text
              x="363"
              y="75"
              textAnchor="middle"
              fill="#ffc20d"
              fontSize="10"
              fontFamily="JetBrains Mono, monospace"
            >
              INTENSITY
            </text>

            {/* Bottom feedback */}
            <rect
              x="120"
              y="112"
              width="180"
              height="36"
              rx="12"
              fill="#131D38"
              stroke="#f4f1ea"
              strokeOpacity="0.2"
            />
            <text
              x="210"
              y="134"
              textAnchor="middle"
              fill="#A9B1C6"
              fontSize="10"
              fontFamily="JetBrains Mono, monospace"
            >
              LAND-ATMOSPHERE FEEDBACK · MODERATE
            </text>
          </svg>
        </div>
      );

    case 'project':
      return (
        <div className="w-full">
          <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-[#A9B1C6] mb-3">
            <span>Branching Scenario Envelopes</span>
            <span className="text-[#ffc20d]">Non-predictive</span>
          </div>
          <svg
            viewBox="0 0 420 170"
            className="w-full h-44"
            role="img"
            aria-label="Branching conditional climate scenario pathways"
          >
            <line x1="32" y1="20" x2="32" y2="140" stroke="#f4f1ea" strokeOpacity="0.14" />
            <line x1="32" y1="140" x2="404" y2="140" stroke="#f4f1ea" strokeOpacity="0.14" />
            {/* Historical baseline */}
            <path
              d="M36 96 L105 90 L170 84"
              stroke="#f4f1ea"
              strokeWidth="2.4"
              fill="none"
              strokeLinecap="round"
            />
            <circle cx="170" cy="84" r="4.5" fill="#ffc20d" />
            {/* Stabilization */}
            <path
              d="M170 84 C235 80, 305 74, 388 72"
              stroke="#4FB3A9"
              strokeWidth="2.4"
              fill="none"
              strokeLinecap="round"
            />
            {/* Trend continuation */}
            <path
              d="M170 84 C235 72, 305 56, 388 44"
              stroke="#ffc20d"
              strokeWidth="2.2"
              strokeDasharray="5 3"
              fill="none"
              strokeLinecap="round"
            />
            {/* Stress */}
            <path
              d="M170 84 C235 98, 305 114, 388 122"
              stroke="#A9B1C6"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
            />
            <text
              x="275"
              y="38"
              fill="#ffc20d"
              fontSize="10"
              fontFamily="JetBrains Mono, monospace"
            >
              Trend continuation
            </text>
            <text
              x="295"
              y="66"
              fill="#4FB3A9"
              fontSize="10"
              fontFamily="JetBrains Mono, monospace"
            >
              Stabilization
            </text>
            <text
              x="275"
              y="134"
              fill="#A9B1C6"
              fontSize="10"
              fontFamily="JetBrains Mono, monospace"
            >
              Compounding stress
            </text>
          </svg>
        </div>
      );

    default:
      return (
        <div className="w-full">
          <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-[#A9B1C6] mb-3">
            <span>Water-Balance Retention Comparison</span>
            <span className="text-[#4FB3A9]">Infiltration vs Runoff</span>
          </div>
          <svg
            viewBox="0 0 420 170"
            className="w-full h-44"
            role="img"
            aria-label="Water-balance adaptation comparison bars"
          >
            {[
              { label: 'Bare crust', inf: 65, run: 210, y: 28 },
              { label: 'Half-moon bunds', inf: 195, run: 80, y: 66 },
              { label: 'Zaï + agroforestry', inf: 235, run: 40, y: 104 },
            ].map((row) => (
              <g key={row.label}>
                <text x="12" y={row.y + 15} fill="#f4f1ea" fontSize="11" fontWeight="500">
                  {row.label}
                </text>
                <rect x="135" y={row.y} width={row.inf} height="22" rx="6" fill="#4FB3A9" />
                <rect
                  x={135 + row.inf + 6}
                  y={row.y}
                  width={row.run}
                  height="22"
                  rx="6"
                  fill="#ffc20d"
                  fillOpacity="0.45"
                />
              </g>
            ))}
            <text
              x="135"
              y="156"
              fill="#4FB3A9"
              fontSize="10"
              fontFamily="JetBrains Mono, monospace"
            >
              ■ Root-zone infiltration
            </text>
            <text
              x="285"
              y="156"
              fill="#ffc20d"
              fontSize="10"
              fontFamily="JetBrains Mono, monospace"
            >
              ■ Surface runoff
            </text>
          </svg>
        </div>
      );
  }
}

export function WorkflowSection({ onExploreLayer }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [hasInteracted, setHasInteracted] = useState(false);
  const sectionRef = useRef(null);
  const inView = useInView(sectionRef, { once: true, amount: 0.35 });

  // Gentle initial scroll-guided progression across nodes unless user hovers/clicks
  useEffect(() => {
    if (!inView || hasInteracted) return;
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % WORKFLOW_LAYERS.length);
    }, 3600);
    return () => window.clearInterval(timer);
  }, [inView, hasInteracted]);

  const activeLayer = WORKFLOW_LAYERS[activeIndex];
  const progressPct = (activeIndex / (WORKFLOW_LAYERS.length - 1)) * 100;

  return (
    <section
      id="workflow"
      ref={sectionRef}
      className="bg-[#131D38] text-[#f4f1ea] py-[72px] lg:py-[120px]"
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
            HOW EARTHSIGNAL WORKS
          </p>
          <h2 className="mt-4 font-display text-[clamp(1.85rem,3.4vw,2.75rem)] font-semibold leading-[1.14] tracking-[-0.025em] text-[#f4f1ea]">
            Five connected{' '}
            <span className="font-editorial-italic text-[#ffc20d] font-normal text-[1.1em]">
              layers.
            </span>{' '}
            One investigation.
          </h2>
        </motion.div>

        {/* Desktop horizontal timeline */}
        <div className="hidden lg:block mt-14 relative">
          {/* Background track + animated amber progress line */}
          <div className="absolute top-[52px] left-[8%] right-[8%] h-[2px] bg-[#f4f1ea]/15 rounded-full overflow-hidden pointer-events-none">
            <div
              className="h-full bg-[#ffc20d] transition-all duration-700 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <div className="relative z-10 grid grid-cols-5 gap-4">
            {WORKFLOW_LAYERS.map((layer, index) => {
              const isActive = index === activeIndex;
              return (
                <button
                  key={layer.id}
                  type="button"
                  onMouseEnter={() => {
                    setHasInteracted(true);
                    setActiveIndex(index);
                  }}
                  onClick={() => {
                    setHasInteracted(true);
                    setActiveIndex(index);
                  }}
                  aria-pressed={isActive}
                  className={`text-left rounded-[28px] p-6 transition-all duration-300 cursor-pointer border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffc20d] ${
                    isActive
                      ? 'bg-[#1E2B52] border-[#ffc20d] shadow-instrument-dark -translate-y-1'
                      : 'bg-[#1E2B52]/75 border-[#f4f1ea]/10 hover:border-[#f4f1ea]/30'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <WorkflowNodeIcon id={layer.id} active={isActive} />
                    <span
                      className={`font-mono text-[12px] tabular-nums ${
                        isActive ? 'text-[#ffc20d]' : 'text-[#A9B1C6]'
                      }`}
                    >
                      {layer.number}
                    </span>
                  </div>

                  <h3 className="mt-5 font-display text-[18px] font-semibold text-[#f4f1ea]">
                    {layer.title}
                  </h3>
                  <p className="mt-1.5 text-[14px] font-medium text-[#f4f1ea]/90">
                    {layer.question}
                  </p>
                  <p className="mt-2 text-[13px] leading-[1.45] text-[#A9B1C6]">{layer.output}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Mobile vertical stepper */}
        <div className="lg:hidden mt-10 flex flex-col gap-3">
          {WORKFLOW_LAYERS.map((layer, index) => {
            const isActive = index === activeIndex;
            return (
              <div
                key={layer.id}
                className={`rounded-[24px] border transition-colors ${
                  isActive ? 'bg-[#1E2B52] border-[#ffc20d]' : 'bg-[#1E2B52]/65 border-[#f4f1ea]/10'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setHasInteracted(true);
                    setActiveIndex(index);
                  }}
                  aria-expanded={isActive}
                  className="w-full text-left p-5 flex items-center justify-between gap-4 cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <WorkflowNodeIcon id={layer.id} active={isActive} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] text-[#ffc20d] tabular-nums">
                          {layer.number}
                        </span>
                        <h3 className="font-display text-[17px] font-semibold text-[#f4f1ea]">
                          {layer.title}
                        </h3>
                      </div>
                      <p className="text-[14px] text-[#A9B1C6] mt-0.5">{layer.question}</p>
                    </div>
                  </div>
                </button>

                {isActive && (
                  <div className="px-5 pb-6 pt-2 border-t border-[#f4f1ea]/10">
                    <p className="text-[15px] leading-[1.6] text-[#f4f1ea]/90">
                      {layer.explanation}
                    </p>
                    <div className="mt-4 rounded-[20px] bg-[#131D38] p-4 border border-[#f4f1ea]/10">
                      <LayerMiniVisual layerId={layer.id} />
                    </div>
                    {layer.caveat && (
                      <p className="mt-3 font-mono text-[11px] uppercase tracking-wider text-[#ffc20d]">
                        {layer.caveat}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Desktop Expanded Interactive Panel */}
        <motion.div
          key={activeLayer.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="hidden lg:grid mt-8 rounded-[28px] bg-[#1E2B52] border border-[#f4f1ea]/12 p-8 lg:p-10 grid-cols-12 gap-10 items-center shadow-instrument-dark"
        >
          <div className="col-span-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 font-mono text-[12px] uppercase tracking-wider text-[#ffc20d]">
                <span>Layer {activeLayer.number}</span>
                <span aria-hidden="true">·</span>
                <span>{activeLayer.title}</span>
              </div>
              <h3 className="mt-3 font-display text-[24px] font-semibold text-[#f4f1ea]">
                {activeLayer.question}
              </h3>
              <p className="mt-3 text-[16px] leading-[1.6] text-[#A9B1C6]">
                {activeLayer.explanation}
              </p>
            </div>

            <div className="mt-6 pt-5 border-t border-[#f4f1ea]/10 space-y-2">
              <div className="font-mono text-[11px] uppercase tracking-wider text-[#f4f1ea]/80">
                {activeLayer.methodTag}
              </div>
              <div className="font-mono text-[11px] uppercase tracking-wider text-[#4FB3A9]">
                {activeLayer.datasetTag}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => onExploreLayer(activeLayer.id)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#ffc20d] text-[#131D38] text-[14px] font-semibold hover:bg-[#eab006] transition-colors cursor-pointer"
              >
                <span>Open {activeLayer.title.toLowerCase()} layer</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {activeLayer.caveat && (
                <span className="font-mono text-[11px] text-[#ffc20d]">{activeLayer.caveat}</span>
              )}
            </div>
          </div>

          <div className="col-span-7 rounded-[24px] bg-[#131D38] border border-[#f4f1ea]/10 p-6">
            <LayerMiniVisual layerId={activeLayer.id} />
          </div>
        </motion.div>

        {/* Explicit caveat visible under the workflow for Project & Solve scientific honesty */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 text-[13px] text-[#A9B1C6]">
          <span className="font-mono text-[11px] uppercase tracking-wider">
            Project & Solve layers: Conditional scenarios, never forecasts.
          </span>
          
        </div>
      </div>
    </section>
  );
}
