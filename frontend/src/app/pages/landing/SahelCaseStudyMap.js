
'use client';

import dynamic from 'next/dynamic';

// Leaflet needs `window`, so the map loads in the browser only.
export const SahelCaseStudyMap = dynamic(() => import('./SahelCaseStudyMapLeaflet'), {
  ssr: false,
  loading: () => (
    <div
      className="relative overflow-hidden rounded-[16px] bg-[#0B1224]"
      style={{ aspectRatio: '460 / 290' }}
    >
      <span className="absolute left-3 top-3 font-mono text-[10px] uppercase tracking-wider text-[#A9B1C6]">
        Loading satellite map…
      </span>
    </div>
  ),
});
