/*
 * Geographic helpers for the real study-area maps.
 *
 * Investigations carry their study box either as numeric `bounds`
 * ({ north, south, west, east } in decimal degrees, west/south negative)
 * or only as a label such as "10°N–20°N, 18°W–20°E" (investigations created
 * from the quick-start modal). Both resolve to the same numeric box here.
 */

const DEGREE_TOKEN = /(\d+(?:\.\d+)?)\s*°\s*([NSEW])/gi;

/** "2°S–12°N, 34°E–51°E" -> { north: 12, south: -2, west: 34, east: 51 } */
export function parseCoordsLabel(label) {
  if (!label) return null;
  const lats = [];
  const lons = [];
  for (const [, value, hemi] of label.matchAll(DEGREE_TOKEN)) {
    const n = Number(value);
    const h = hemi.toUpperCase();
    if (h === 'N') lats.push(n);
    if (h === 'S') lats.push(-n);
    if (h === 'E') lons.push(n);
    if (h === 'W') lons.push(-n);
  }
  if (lats.length < 2 || lons.length < 2) return null;
  return {
    north: Math.max(...lats),
    south: Math.min(...lats),
    west: Math.min(...lons),
    east: Math.max(...lons),
  };
}

function isValidBounds(b) {
  return (
    b &&
    [b.north, b.south, b.west, b.east].every((v) => Number.isFinite(Number(v))) &&
    Number(b.north) !== Number(b.south) &&
    Number(b.west) !== Number(b.east)
  );
}

/** Numeric study box for an investigation record (bounds first, then coords label). */
export function getInvestigationBounds(investigation) {
  if (isValidBounds(investigation?.bounds)) {
    const { north, south, west, east } = investigation.bounds;
    return {
      north: Math.max(north, south),
      south: Math.min(north, south),
      west: Math.min(west, east),
      east: Math.max(west, east),
    };
  }
  return parseCoordsLabel(investigation?.coords);
}

/** Leaflet expects [[south, west], [north, east]]. */
export function toLatLngBounds(b) {
  return [
    [b.south, b.west],
    [b.north, b.east],
  ];
}
