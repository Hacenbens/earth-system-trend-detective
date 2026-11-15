'use client';

import { EarthSignalLogo } from '@/app/layout/ScientificIcons';

export function Footer({ onOpenMethodology, onOpenProvenance, onOpenContact }) {
  return (
    <footer className="bg-[#0B1224] text-[#f4f1ea] border-t border-[#f4f1ea]/10">
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8 py-14 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Left: Logo & one-line mission */}
          <div className="lg:col-span-5">
            <EarthSignalLogo theme="dark" />
            <p className="mt-4 text-[15px] leading-[1.6] text-[#A9B1C6] max-w-sm">
              Turning open satellite observations into transparent physical investigations.
            </p>
          </div>

          {/* Right: Five clean columns/links */}
          <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-5 gap-6 text-[14px]">
            <div>
              <h3 className="font-mono text-[11px] uppercase tracking-wider text-[#A9B1C6] mb-3">
                About
              </h3>
              <ul className="space-y-2.5 text-[#f4f1ea]/85">
                <li>
                  <a href="#problem" className="hover:text-[#ffc20d] transition-colors">
                    The problem
                  </a>
                </li>
                <li>
                  <a href="#workflow" className="hover:text-[#ffc20d] transition-colors">
                    Five layers
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-mono text-[11px] uppercase tracking-wider text-[#A9B1C6] mb-3">
                Data sources
              </h3>
              <ul className="space-y-2.5 text-[#f4f1ea]/85">
                <li>
                  <a href="#data-foundation" className="hover:text-[#ffc20d] transition-colors">
                    GPM IMERG
                  </a>
                </li>
                <li>
                  <a href="#data-foundation" className="hover:text-[#ffc20d] transition-colors">
                    MERRA-2 & MODIS
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-mono text-[11px] uppercase tracking-wider text-[#A9B1C6] mb-3">
                Methodology
              </h3>
              <ul className="space-y-2.5 text-[#f4f1ea]/85">
                <li>
                  <button
                    type="button"
                    onClick={onOpenMethodology}
                    className="hover:text-[#ffc20d] transition-colors text-left cursor-pointer"
                  >
                    Scientific method
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={onOpenProvenance}
                    className="hover:text-[#ffc20d] transition-colors text-left cursor-pointer"
                  >
                    Provenance
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-mono text-[11px] uppercase tracking-wider text-[#A9B1C6] mb-3">
                References
              </h3>
              <ul className="space-y-2.5 text-[#f4f1ea]/85">
                <li>
                  <a href="#sahel-case-study" className="hover:text-[#ffc20d] transition-colors">
                    Sahel 10°N–20°N
                  </a>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={onOpenMethodology}
                    className="hover:text-[#ffc20d] transition-colors text-left cursor-pointer"
                  >
                    Citations
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-mono text-[11px] uppercase tracking-wider text-[#A9B1C6] mb-3">
                Contact
              </h3>
              <ul className="space-y-2.5 text-[#f4f1ea]/85">
                <li>
                  <button
                    type="button"
                    onClick={onOpenContact}
                    className="hover:text-[#ffc20d] transition-colors text-left cursor-pointer"
                  >
                    Team access
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-[#f4f1ea]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono text-[12px] text-[#A9B1C6]">
          <span>Built for NASA Space Apps Challenge 2026</span>
    
        </div>
      </div>
    </footer>
  );
}
