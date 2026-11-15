'use client';

import React, { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { EarthSignalLogo } from '@/app/layout/ScientificIcons';

export function Navbar({ onOpenInvestigation, onOpenSignIn, sessionLabel }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 36);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'How it works', href: '#problem' },
    { label: 'Scientific workflow', href: '#workflow' },
    { label: 'About', href: '#data-foundation' },
  ];

  return (
    <header className="fixed top-6 inset-x-0 z-40 px-4 sm:px-6 pointer-events-none">
      <div
        className={`mx-auto pointer-events-auto transition-all duration-500 ease-out rounded-full border border-[#E6E0D2]/90 backdrop-blur-md bg-[#f4f1ea]/90 text-[#131D38] ${
          scrolled
            ? 'max-w-[1060px] px-5 py-2.5 shadow-instrument'
            : 'max-w-[1200px] px-6 py-3.5 shadow-[0_12px_36px_rgba(11,18,36,0.18)]'
        }`}
      >
        <div className="flex items-center justify-between gap-8">
          <a
            href="#hero"
            aria-label="EarthSignal home"
            className="focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#131D38] rounded-full"
          >
            <EarthSignalLogo theme="light" />
          </a>

          <nav
            aria-label="Primary navigation"
            className="hidden md:flex items-center gap-7 text-[15px] font-medium text-[#131D38]"
          >
            {navLinks.map((item, idx) => (
              <React.Fragment key={item.href}>
                {idx > 0 && (
                  <span aria-hidden="true" className="text-[#5B6478]/50 select-none">
                    ·
                  </span>
                )}
                <a
                  href={item.href}
                  className="whitespace-nowrap shrink-0 hover:text-[#1E2B52] underline-offset-4 hover:underline transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#131D38] rounded"
                >
                  {item.label}
                </a>
              </React.Fragment>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-5 shrink-0">
            <button
              type="button"
              onClick={onOpenSignIn}
              className="text-[15px] font-medium text-[#131D38] hover:text-[#5B6478] transition-colors duration-200 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#131D38] rounded"
            >
              {sessionLabel ? sessionLabel : 'Sign in'}
            </button>
            <button
              type="button"
              onClick={onOpenInvestigation}
              className="px-5 py-2.5 rounded-full bg-[#ffc20d] text-[#131D38] text-[14px] font-semibold hover:bg-[#eab006] transition-all duration-200 whitespace-nowrap shrink-0 cursor-pointer shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131D38]"
            >
              Get started
            </button>
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="md:hidden inline-flex items-center justify-center w-11 h-11 rounded-full text-[#131D38] hover:bg-[#E6E0D2]/60 transition-colors cursor-pointer"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden mt-3 mx-auto max-w-[1200px] pointer-events-auto rounded-[28px] bg-[#f4f1ea]/95 backdrop-blur-md border border-[#E6E0D2] p-6 shadow-instrument text-[#131D38]">
          <nav className="flex flex-col gap-4 text-base font-medium">
            {navLinks.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="py-1.5 border-b border-[#E6E0D2]/70"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="mt-5 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                onOpenSignIn();
              }}
              className="w-full py-3 rounded-full border border-[#131D38]/25 text-[#131D38] font-medium text-sm cursor-pointer"
            >
              {sessionLabel ? sessionLabel : 'Sign in'}
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                onOpenInvestigation();
              }}
              className="w-full py-3 rounded-full bg-[#ffc20d] text-[#131D38] font-semibold text-sm cursor-pointer"
            >
              Get started
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
