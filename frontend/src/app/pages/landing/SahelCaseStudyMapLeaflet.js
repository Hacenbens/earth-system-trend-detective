'use client';

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import {
  AttributionControl,
  MapContainer,
  Polyline,
  Rectangle,
  TileLayer,
  Tooltip,
  ZoomControl,
} from 'react-leaflet';

/*
 * Real satellite map for the landing-page Sahel case study.
 *
 * Basemap: NASA Blue Marble (shaded relief + bathymetry) from NASA GIBS.
 * Esri World Imagery sits underneath as a fallback if a GIBS tile fails.
 *
 * The three boxes use the same sub-region definitions as the
 * Regional comparison screen, so each one sits on its real region.
 */

// West / Central / East Sahel study boxes (decimal degrees, W and S negative)
export const SAHEL_BOXES = [
  {
    id: 'west',
    name: 'Western Sahel',
    coords: '10°N–20°N, 18°W–0°E',
    bounds: [
      [10, -18],
      [20, 0],
    ],
    color: '#4FB3A9',
  },
  {
    id: 'central',
    name: 'Central Sahel',
    coords: '10°N–18°N, 0°E–15°E',
    bounds: [
      [10, 0],
      [18, 15],
    ],
    color: '#ffc20d',
  },
  {
    id: 'east',
    name: 'Eastern Sahel',
    coords: '10°N–18°N, 15°E–35°E',
    bounds: [
      [10, 15],
      [18, 35],
    ],
    color: '#f4f1ea',
  },
];

// What the camera shows: North & West Africa with the Sahel belt in the middle
const VIEW_BOUNDS = [
  [-1, -24],
  [33, 42],
];

// Overlays for the Rainfall / Moisture / Aerosols switch (same ideas as the old SVG)
// Rainfall layer: each box tinted teal by its (placeholder) JJAS intensity
const RAIN_INTENSITY = { west: 0.3, central: 0.42, east: 0.34 };

const MOISTURE_FLOWS = [
  {
    positions: [
      [1, -16],
      [5, -8],
      [8.5, 0],
      [11, 8],
      [12.5, 17],
      [13.5, 27],
    ],
    dashArray: undefined,
    weight: 3,
  },
  {
    positions: [
      [-1, -9],
      [3, -1],
      [6.5, 7],
      [9.5, 15],
      [11, 22],
    ],
    dashArray: '6 5',
    weight: 2,
  },
];

const DUST_BANDS = [
  {
    bounds: [
      [14, -18],
      [26, 35],
    ],
    opacity: 0.16,
  },
  {
    bounds: [
      [16, -12],
      [23, 28],
    ],
    opacity: 0.2,
  },
];

const isTouch = typeof window !== 'undefined' && L.Browser.mobile;

export default function SahelCaseStudyMapLeaflet({ layer = 'rainfall' }) {
  return (
    <div
      className="es-map relative isolate overflow-hidden rounded-[16px]"
      style={{ aspectRatio: '460 / 290' }}
    >
      <MapContainer
        bounds={VIEW_BOUNDS}
        zoomSnap={0.25}
        zoomDelta={0.5}
        minZoom={1}
        maxZoom={9}
        zoomControl={false}
        attributionControl={false}
        scrollWheelZoom={false}
        dragging={!isTouch}
        worldCopyJump
        className="absolute inset-0 h-full w-full"
      >
        {/* Fallback satellite imagery */}
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          attribution="Esri"
        />
        {/* NASA Blue Marble */}
        <TileLayer
          url="https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_ShadedRelief_Bathymetry/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg"
          attribution='<a href="https://earthdata.nasa.gov/gibs">NASA Blue Marble</a>'
          maxNativeZoom={8}
          bounds={[
            [-85, -180],
            [85, 180],
          ]}
        />

        {/* Active scientific layer */}
        {layer === 'moisture' &&
          MOISTURE_FLOWS.map((flow, i) => (
            <Polyline
              key={`flow-${i}`}
              positions={flow.positions}
              interactive={false}
              pathOptions={{
                color: '#4FB3A9',
                weight: flow.weight,
                dashArray: flow.dashArray,
                lineCap: 'round',
                opacity: 0.95,
              }}
            />
          ))}

        {layer === 'aerosols' &&
          DUST_BANDS.map((band, i) => (
            <Rectangle
              key={`dust-${i}`}
              bounds={band.bounds}
              interactive={false}
              pathOptions={{ stroke: false, fillColor: '#ffc20d', fillOpacity: band.opacity }}
            />
          ))}

        {/* West / Central / East Sahel boxes, each on its real region */}
        {SAHEL_BOXES.map((box) => (
          <Rectangle
            key={box.id}
            bounds={box.bounds}
            pathOptions={{
              color: box.color,
              weight: 2.5,
              fillColor: layer === 'rainfall' ? '#4FB3A9' : '#f4f1ea',
              fillOpacity: layer === 'rainfall' ? RAIN_INTENSITY[box.id] : 0.12,
            }}
          >
            <Tooltip direction="top" sticky className="es-map-tip">
              <span className="font-semibold">{box.name}</span>
              <br />
              <span className="font-mono text-[10px]">{box.coords}</span>
            </Tooltip>
          </Rectangle>
        ))}

        <AttributionControl position="bottomleft" prefix={false} />
        <ZoomControl position="topright" />
      </MapContainer>

      {/* Legend */}
      <div className="pointer-events-none absolute left-2.5 top-2.5 z-[1100] flex flex-wrap items-center gap-x-3 gap-y-1 rounded-full bg-[#0B1224]/75 px-3 py-1.5 backdrop-blur-sm">
        {SAHEL_BOXES.map((box) => (
          <span key={box.id} className="inline-flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-[3px] border-2"
              style={{ borderColor: box.color }}
            />
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#f4f1ea]">
              {box.id}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}