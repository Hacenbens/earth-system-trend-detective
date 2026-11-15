'use client';

import dynamic from 'next/dynamic';

/*
 * Leaflet touches `window` as soon as it is imported, so the real map is
 * loaded only in the browser. While it loads, a navy placeholder with the
 * same aspect ratio holds the space so the card does not jump.
 */
export const StudyAreaMap = dynamic(() => import('./StudyAreaMapLeaflet'), {
  ssr: false,
  loading: () => (
    <div
      className="relative overflow-hidden rounded-[14px] bg-[#0B1224]"
      style={{ aspectRatio: '320 / 190' }}
    >
      <div className="absolute inset-0 skeleton-cream opacity-[0.06]" />
      <span className="absolute left-3 top-3 font-mono text-[10px] uppercase tracking-wider text-[#A9B1C6]">
        Loading map…
      </span>
    </div>
  ),
});
