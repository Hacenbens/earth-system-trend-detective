'use client';

import { useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Layers } from 'lucide-react';
import { DISCOVERY_CARDS } from '@/app/api/earthSignalData';

export function DiscoverCarousel({ onSelectCard }) {
  // Desktop shows 3 cards at a time across 5 total -> startIndex 0, 1, or 2
  const [startIndex, setStartIndex] = useState(0);
  const [failedImages, setFailedImages] = useState({});
  const mobileScrollRef = useRef(null);

  const maxStart = DISCOVERY_CARDS.length - 3; // 2 (positions 0, 1, 2)

  const handlePrev = () => {
    setStartIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setStartIndex((prev) => Math.min(maxStart, prev + 1));
  };

  const visibleDesktopCards = DISCOVERY_CARDS.slice(startIndex, startIndex + 3);

  return (
    <section
      id="discover"
      className="bg-[#EDE8DC] text-[#131D38] py-[72px] lg:py-[120px] border-t border-[#E6E0D2]"
    >
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-xl"
          >
            <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-[#5B6478]">
              WHAT RESEARCHERS CAN DISCOVER
            </p>
            <h2 className="mt-4 font-display text-[clamp(1.85rem,3.4vw,2.75rem)] font-semibold leading-[1.14] tracking-[-0.025em] text-[#131D38]">
              From first signal to{' '}
              <span className="font-editorial-italic font-normal text-[1.1em]">possible</span>{' '}
              response.
            </h2>
          </motion.div>

          {/* Desktop Carousel Arrows */}
          <div className="hidden lg:flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handlePrev}
              disabled={startIndex === 0}
              aria-label="Previous capabilities"
              className="w-11 h-11 rounded-full border border-[#131D38]/20 bg-[#f4f1ea] text-[#131D38] inline-flex items-center justify-center hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              disabled={startIndex === maxStart}
              aria-label="Next capabilities"
              className="w-11 h-11 rounded-full border border-[#131D38]/20 bg-[#f4f1ea] text-[#131D38] inline-flex items-center justify-center hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Desktop 3-Card Row */}
        <div className="hidden lg:grid grid-cols-3 gap-7 mt-12">
          {visibleDesktopCards.map((card) => (
            <article
              key={card.id}
              className="rounded-[28px] bg-[#f4f1ea] border border-[#E6E0D2] p-4 shadow-[0_24px_60px_rgba(19,29,56,0.08)] flex flex-col justify-between transition-transform duration-300 hover:-translate-y-1"
            >
              <div>
                <div className="aspect-[4/3] w-full rounded-[24px] overflow-hidden bg-[#131D38]">
                  {!failedImages[card.id] ? (
                    <img
                      src={card.image}
                      alt={card.imageAlt}
                      referrerPolicy="no-referrer"
                      onError={() => setFailedImages((prev) => ({ ...prev, [card.id]: true }))}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-[#131D38] to-[#1E2B52] text-[#f4f1ea]">
                      <Layers className="w-8 h-8 text-[#4FB3A9] mb-2" />
                      <span className="font-display text-sm font-medium">{card.title}</span>
                    </div>
                  )}
                </div>

                <div className="px-3 pt-6">
                  <h3 className="font-display text-[20px] font-semibold tracking-tight text-[#131D38]">
                    {card.title}
                  </h3>
                  <p className="mt-2.5 text-[15px] leading-[1.6] text-[#5B6478] line-clamp-2">
                    {card.description}
                  </p>
                </div>
              </div>

              <div className="px-3 pt-6 pb-3">
                <button
                  type="button"
                  onClick={() => onSelectCard(card)}
                  className="px-5 py-2.5 rounded-full border border-[#131D38]/25 text-[#131D38] text-[14px] font-semibold hover:bg-[#131D38] hover:text-[#f4f1ea] transition-colors cursor-pointer"
                >
                  Learn more
                </button>
              </div>
            </article>
          ))}
        </div>

        {/* Mobile / Tablet Swipe Track */}
        <div
          ref={mobileScrollRef}
          className="lg:hidden mt-10 flex gap-5 overflow-x-auto snap-x snap-mandatory pb-4 -mx-5 px-5"
        >
          {DISCOVERY_CARDS.map((card) => (
            <article
              key={card.id}
              className="snap-start shrink-0 w-[84%] sm:w-[62%] rounded-[28px] bg-[#f4f1ea] border border-[#E6E0D2] p-4 shadow-[0_18px_40px_rgba(19,29,56,0.08)] flex flex-col justify-between"
            >
              <div>
                <div className="aspect-[4/3] w-full rounded-[24px] overflow-hidden bg-[#131D38]">
                  {!failedImages[card.id] ? (
                    <img
                      src={card.image}
                      alt={card.imageAlt}
                      referrerPolicy="no-referrer"
                      onError={() => setFailedImages((prev) => ({ ...prev, [card.id]: true }))}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-[#131D38] text-[#f4f1ea]">
                      <Layers className="w-8 h-8 text-[#4FB3A9] mb-2" />
                      <span className="font-display text-sm">{card.title}</span>
                    </div>
                  )}
                </div>

                <div className="px-2 pt-5">
                  <h3 className="font-display text-[19px] font-semibold text-[#131D38]">
                    {card.title}
                  </h3>
                  <p className="mt-2 text-[15px] leading-[1.55] text-[#5B6478]">
                    {card.description}
                  </p>
                </div>
              </div>

              <div className="px-2 pt-5 pb-2">
                <button
                  type="button"
                  onClick={() => onSelectCard(card)}
                  className="px-5 py-2.5 rounded-full border border-[#131D38]/25 text-[#131D38] text-[14px] font-semibold hover:bg-[#131D38] hover:text-[#f4f1ea] transition-colors cursor-pointer"
                >
                  Learn more
                </button>
              </div>
            </article>
          ))}
        </div>

        {/* Desktop Carousel Dots */}
        <div
          className="hidden lg:flex items-center justify-center gap-2.5 mt-10"
          role="tablist"
          aria-label="Carousel pages"
        >
          {[0, 1, 2].map((idx) => {
            const active = startIndex === idx;
            return (
              <button
                key={idx}
                type="button"
                role="tab"
                aria-selected={active}
                aria-label={`Show capabilities group ${idx + 1}`}
                onClick={() => setStartIndex(idx)}
                className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                  active ? 'w-8 bg-[#131D38]' : 'w-2.5 bg-[#131D38]/25 hover:bg-[#131D38]/45'
                }`}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
