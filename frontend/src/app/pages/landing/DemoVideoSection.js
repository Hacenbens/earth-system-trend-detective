'use client';
// 30-second product demo (screen recording of the live app). Drafted with AI assistance (Claude Code).
import { motion } from 'motion/react';

export function DemoVideoSection() {
  return (
    <section id="demo" className="bg-[#131D38] text-[#f4f1ea] pt-[72px] lg:pt-[110px] pb-4">
      <div className="max-w-[1100px] mx-auto px-5 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-2xl"
        >
          <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-[#A9B1C6]">SEE IT IN 30 SECONDS</p>
          <h2 className="mt-4 font-display text-[clamp(1.85rem,3.4vw,2.75rem)] font-semibold leading-[1.14] tracking-[-0.025em]">
            From a question to{' '}
            <span className="font-editorial-italic text-[#ffc20d] font-normal text-[1.1em]">evidence</span>.
          </h2>
          <p className="mt-3 text-[15px] text-[#A9B1C6] leading-[1.6]">
            Detect a trend, test it, find what moves with the rain, explore scenarios and read a report whose numbers are
            checked against NASA data.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="mt-10 rounded-[28px] overflow-hidden border border-[#f4f1ea]/12 shadow-instrument-dark bg-[#0b1224]"
        >
          <video
            className="w-full h-auto block"
            src="/demo/earthsignal-demo.mp4"
            poster="/demo/earthsignal-demo-poster.jpg"
            controls
            muted
            autoPlay
            loop
            playsInline
            preload="metadata"
            aria-label="30-second demo of EarthSignal: detect, investigate, project and report on Sahel rainfall"
          />
        </motion.div>
        <p className="mt-3 font-mono text-[11px] text-[#A9B1C6]">
          Screen recording of the live app (Eastern Sahel, 1998–2025). AI-assisted production: recording automated and
          captions written with Claude Code.
        </p>
      </div>
    </section>
  );
}
