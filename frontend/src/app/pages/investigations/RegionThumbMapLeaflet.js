'use client';

import 'leaflet/dist/leaflet.css';
import { MapContainer, Rectangle, TileLayer } from 'react-leaflet';
import { toLatLngBounds } from '@/app/api/regionBounds';

/*
 * Small, static satellite thumbnail of one investigation's study box.
 * Same imagery as the landing-page case study (NASA Blue Marble, with Esri
 * World Imagery underneath as a fallback). No zoom, drag or controls: the
 * thumbnail is part of a clickable card, so clicks pass through to the card.
 */

const ESRI_IMAGERY =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const BLUE_MARBLE =
  'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_ShadedRelief_Bathymetry/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg';

// Show the box with some of its surroundings (coastlines, neighbours)
function withContext(b, ratio = 0.22, minDeg = 3) {
  const dLat = Math.max((b.north - b.south) * ratio, minDeg);
  const dLon = Math.max((b.east - b.west) * ratio, minDeg);
  return {
    north: Math.min(b.north + dLat, 80),
    south: Math.max(b.south - dLat, -80),
    west: b.west - dLon,
    east: b.east + dLon,
  };
}

export default function RegionThumbMapLeaflet({ bounds, fill = '#4FB3A9', padding = 6 }) {
  const box = toLatLngBounds(bounds);
  const view = toLatLngBounds(withContext(bounds));

  return (
    <div className="es-map pointer-events-none relative isolate h-full w-full">
      <MapContainer
        bounds={view}
        boundsOptions={{ padding: [padding, padding] }}
        zoomSnap={0.25}
        zoomControl={false}
        attributionControl={false}
        dragging={false}
        touchZoom={false}
        doubleClickZoom={false}
        scrollWheelZoom={false}
        boxZoom={false}
        keyboard={false}
        className="absolute inset-0 h-full w-full"
      >
        <TileLayer url={ESRI_IMAGERY} />
        <TileLayer
          url={BLUE_MARBLE}
          maxNativeZoom={8}
          bounds={[
            [-85, -180],
            [85, 180],
          ]}
        />
        <Rectangle
          bounds={box}
          interactive={false}
          pathOptions={{
            color: '#ffc20d',
            weight: 1.5,
            dashArray: '4 3',
            fillColor: fill,
            fillOpacity: 0.3,
          }}
        />
      </MapContainer>
    </div>
  );
}
