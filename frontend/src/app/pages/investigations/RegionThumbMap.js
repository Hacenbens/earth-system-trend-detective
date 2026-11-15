'use client';

import dynamic from 'next/dynamic';

// Leaflet needs `window`, so the thumbnail loads in the browser only.
export const RegionThumbMap = dynamic(() => import('./RegionThumbMapLeaflet'), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-[#131D38]" />,
});
