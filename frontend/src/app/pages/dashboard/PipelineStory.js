'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { WelcomeGlobe } from '@/app/pages/dashboard/WelcomeGlobe';


export const STORY_CHAPTERS = [
  {
    number: '01',
    step: 'Detect',
    line: 'Sahel rain is coming back, but in heavier bursts.',
  },
  {
    number: '02',
    step: 'Investigate',
    line: 'More moisture flows in from the Gulf of Guinea.',
  },
  {
    number: '03',
    step: 'Explain',
    line: 'A warmer Atlantic and a stronger Saharan Heat Low.',
  },
  {
    number: '04',
    step: 'Project',
    line: 'Three possible pathways to 2040, not forecasts.',
  },
  {
    number: '05',
    step: 'Solve',
    line: 'Bunds, zaï pits and trees to catch heavier storms.',
  },
];

const CHAPTER_MS = 5200;

export function PipelineStory() {
  const [chapter, setChapter] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const timer = window.setTimeout(
      () => setChapter((c) => (c + 1) % STORY_CHAPTERS.length),
      CHAPTER_MS
    );
    return () => window.clearTimeout(timer);
  }, [chapter, paused]);

  const current = STORY_CHAPTERS[chapter];

  // The story loops on its own (01 → 05 → 01 …); hovering does not pause it.
  const pause = {};

  return (
    <>
      <div
        className="pointer-events-none hidden sm:block absolute -right-12 -bottom-16 w-[340px] h-[340px] origin-bottom-right xl:max-[1439px]:scale-[0.8]"
        {...pause}
      >
        {/* Orbit ring + satellite (unchanged look) */}
        <svg
          viewBox="0 0 280 280"
          className="w-full h-full animate-earth-spin-60"
          aria-hidden="true"
        >
          <ellipse
            cx="140"
            cy="140"
            rx="124"
            ry="48"
            transform="rotate(-22 140 140)"
            fill="none"
            stroke="#f4f1ea"
            strokeOpacity="0.22"
            strokeWidth="1.2"
            strokeDasharray="4 4"
          />
          <g transform="translate(46, 86)">
            <rect x="-5" y="-3" width="10" height="6" rx="1.5" fill="#f4f1ea" />
            <rect x="-11" y="-1.5" width="5" height="3" rx="0.8" fill="#4FB3A9" />
            <rect x="6" y="-1.5" width="5" height="3" rx="0.8" fill="#4FB3A9" />
          </g>
        </svg>

        {/* Real 3D Earth, turning with the story (drag to spin) */}
        <div className="absolute inset-[38px] w-[264px] h-[264px]">
          <WelcomeGlobe size={264} chapter={chapter} />
        </div>
      </div>
      {/* Story caption */}
      <div
        className="hidden sm:block absolute right-5 bottom-5 z-20 w-[240px] xl:max-[1439px]:w-[192px] xl:max-[1439px]:px-3 xl:max-[1439px]:py-2.5 rounded-[18px] bg-[#1E2B52]/90 backdrop-blur-md border border-[#f4f1ea]/15 px-4 py-3 shadow-md"
        role="group"
        aria-roledescription="story"
        aria-label="EarthSignal pipeline story"
        {...pause}
      >
        <div className="flex items-center justify-between">
          <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#ffc20d]">
            {current.number} · {current.step}
          </span>
          <span className="font-mono text-[9px] uppercase tracking-wider text-[#A9B1C6]">
            Sahel
          </span>
        </div>

        <div className="relative mt-1.5 min-h-[38px]" aria-live="polite">
          <AnimatePresence mode="wait">
            <motion.p
              key={chapter}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.3 }}
              className="text-[13px] xl:max-[1439px]:text-[12px] leading-[1.45] text-[#f4f1ea]"
            >
              {current.line}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Progress: one bar per chapter, click to jump */}
        <div className="mt-2.5 grid grid-cols-5 gap-1.5">
          {STORY_CHAPTERS.map((c, i) => (
            <button
              key={c.step}
              type="button"
              onClick={() => setChapter(i)}
              aria-label={`Chapter ${c.number}: ${c.step}`}
              aria-current={i === chapter ? 'step' : undefined}
              className="relative h-1.5 rounded-full bg-[#f4f1ea]/15 overflow-hidden cursor-pointer"
            >
              {i < chapter && <span className="absolute inset-0 bg-[#ffc20d]/70" />}
              {i === chapter && (
                <motion.span
                  key={`${chapter}-${paused}`}
                  className="absolute inset-y-0 left-0 bg-[#ffc20d]"
                  initial={{ width: paused ? '100%' : '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: paused ? 0 : CHAPTER_MS / 1000, ease: 'linear' }}
                />
              )}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}