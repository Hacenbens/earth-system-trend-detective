'use client';

import 'leaflet/dist/leaflet.css';
import { useEffect, useState } from 'react';
import {
  AttributionControl,
  MapContainer,
  Rectangle,
  TileLayer,
  Tooltip,
  ZoomControl,
  useMap,
} from 'react-leaflet';
import { toLatLngBounds } from '@/app/api/regionBounds';

/*
 * Real, pannable map of an investigation's study box.
 *
 * Basemaps (no API key needed):
 *  - "Map": Esri Dark Gray Canvas (+ country/place labels), matching the navy palette
 *  - "Satellite": Esri World Imagery, for checking the real land surface
 *
 * Each box keeps the visual language of the old SVG preview: teal fill,
 * amber dashed boundary, JetBrains Mono labels.
 */

const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services';

// Each basemap is a stack of tile layers (base + optional labels on top).
const BASEMAPS = {
  map: [
    {
      url: `${ESRI}/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}`,
      attribution: 'Tiles &copy; Esri, &copy; OpenStreetMap contributors',
      maxNativeZoom: 16,
    },
    {
      url: `${ESRI}/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}`,
      attribution: '',
      maxNativeZoom: 16,
    },
  ],
  satellite: [
    {
      url: `${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`,
      attribution: 'Imagery &copy; Esri',
      maxNativeZoom: 19,
    },
  ],
};

function unionBounds(boxes) {
  return boxes.reduce(
    (acc, { bounds: b }) => ({
      north: Math.max(acc.north, b.north),
      south: Math.min(acc.south, b.south),
      west: Math.min(acc.west, b.west),
      east: Math.max(acc.east, b.east),
    }),
    { north: -90, south: 90, west: 180, east: -180 }
  );
}

// Keeps the camera on the study area when the box changes or the card resizes
// (sidebar collapse, responsive grid changes).
function FitToStudyArea({ focus }) {
  const map = useMap();
  const key = `${focus.north},${focus.south},${focus.west},${focus.east}`;

  useEffect(() => {
    map.fitBounds(toLatLngBounds(focus), { padding: [22, 22] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key]);

  useEffect(() => {
    const el = map.getContainer();
    const ro = new ResizeObserver(() => {
      map.invalidateSize();
      map.fitBounds(toLatLngBounds(focus), { padding: [22, 22], animate: false });
    });
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key]);

  return null;
}

export default function StudyAreaMapLeaflet({
  boxes,
  label,
  aspect = '320 / 190',
  showZoom = true,
}) {
  const [basemap, setBasemap] = useState('map');
  const focus = unionBounds(boxes);
  const layers = BASEMAPS[basemap];

  return (
    <div
      className="es-map relative isolate overflow-hidden rounded-[14px]"
      style={{ aspectRatio: aspect }}
    >
      <MapContainer
        bounds={toLatLngBounds(focus)}
        boundsOptions={{ padding: [22, 22] }}
        zoomControl={false}
        scrollWheelZoom={false}
        worldCopyJump
        zoomSnap={0.25}
        zoomDelta={0.5}
        minZoom={2}
        maxZoom={12}
        attributionControl={false}
        className="absolute inset-0 h-full w-full"
      >
        {layers.map((layer, i) => (
          <TileLayer
            key={`${basemap}-${i}`}
            url={layer.url}
            attribution={layer.attribution}
            maxNativeZoom={layer.maxNativeZoom}
          />
        ))}

        {boxes.map((box) => (
          <Rectangle
            key={box.id}
            bounds={toLatLngBounds(box.bounds)}
            pathOptions={{
              color: box.stroke ?? '#ffc20d',
              weight: box.weight ?? 2,
              dashArray: box.dashArray,
              fillColor: box.fill ?? '#4FB3A9',
              fillOpacity: box.fillOpacity ?? 0.34,
            }}
            eventHandlers={box.onClick ? { click: box.onClick } : undefined}
          >
            {box.label && (
              <Tooltip permanent direction="center" className="es-map-label" interactive={false}>
                {box.label}
              </Tooltip>
            )}
          </Rectangle>
        ))}

        <AttributionControl
          position="bottomright"
          prefix='<a href="https://leafletjs.com">Leaflet</a>'
        />
        {showZoom && <ZoomControl position="bottomright" />}

        <FitToStudyArea focus={focus} />
      </MapContainer>

      {label && (
        <div className="pointer-events-none absolute left-2.5 top-2.5 z-[1100] max-w-[calc(100%-20px)] truncate rounded-full bg-[#0B1224]/75 px-2.5 py-1 font-mono text-[10px] text-[#ffc20d] backdrop-blur-sm">
          {label}
        </div>
      )}

      <div className="absolute left-2.5 bottom-2.5 z-[1100] inline-flex rounded-full border border-[#f4f1ea]/15 bg-[#0B1224]/75 p-0.5 backdrop-blur-sm">
        {[
          { id: 'map', text: 'Map' },
          { id: 'satellite', text: 'Satellite' },
        ].map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setBasemap(opt.id)}
            aria-pressed={basemap === opt.id}
            className={`px-2.5 py-0.5 rounded-full font-mono text-[10px] uppercase tracking-wider cursor-pointer transition-colors ${
              basemap === opt.id
                ? 'bg-[#ffc20d] text-[#131D38]'
                : 'text-[#A9B1C6] hover:text-[#f4f1ea]'
            }`}
          >
            {opt.text}
          </button>
        ))}
      </div>
    </div>
  );
}
