'use client';

import { useEffect, useRef } from 'react';
import { geoCircle, geoGraticule10, geoOrthographic, geoPath } from 'd3-geo';
import { feature, mesh } from 'topojson-client';
import world from 'world-atlas/countries-110m.json';

/*
 * A real 3D Earth for the dashboard welcome card.
 *
 * - Real coastlines and borders (Natural Earth 1:110m, from world-atlas)
 * - Orthographic projection on a canvas, so it reads as a sphere
 * - The Sahel study box (10°N–20°N, 18°W–20°E) drawn at its true position
 * - `chapter` (0–4) tells the EarthSignal pipeline as a story: the globe turns
 *   to what each step looks at and draws it (see CHAPTER_FOCUS below)
 * - Drag it to spin the planet; it eases back to the current chapter
 *
 * Colours follow the card: navy ocean, cream land, amber study band, teal rim.
 */

const LAND = feature(world, world.objects.land);
const BORDERS = mesh(world, world.objects.countries, (a, b) => a !== b);
const GRATICULE = geoGraticule10();

// Lat/lon box as a GeoJSON polygon, densified so its edges follow the sphere
function geoBox(south, north, west, east, step = 1) {
  const ring = [];
  for (let x = west; x <= east; x += step) ring.push([x, south]);
  for (let y = south; y <= north; y += step) ring.push([east, y]);
  for (let x = east; x >= west; x -= step) ring.push([x, north]);
  for (let y = north; y >= south; y -= step) ring.push([west, y]);
  ring.push([west, south]);
  // d3-geo treats counter-clockwise rings as "everything outside"; reverse to
  // clockwise so the polygon is the small box itself.
  ring.reverse();
  return { type: 'Feature', geometry: { type: 'Polygon', coordinates: [ring] } };
}

const SAHEL = geoBox(10, 20, -18, 20);

// 02 Investigate: monsoon moisture flowing in from the Gulf of Guinea
const MOISTURE_FLOWS = [
  {
    type: 'LineString',
    coordinates: [
      [-12, 0],
      [-6, 5],
      [0, 9],
      [6, 12],
      [13, 14],
      [20, 15],
    ],
  },
  {
    type: 'LineString',
    coordinates: [
      [-3, -3],
      [3, 3],
      [9, 8],
      [15, 11],
      [21, 12.5],
    ],
  },
];

// 03 Explain: warm tropical Atlantic + Saharan Heat Low
const WARM_ATLANTIC = geoBox(-6, 10, -40, -12, 2);
const HEAT_LOW_CENTER = [2, 24];

// 04 Project: three conditional envelopes around the study box
const ENVELOPES = [0, 2, 4].map((d) => geoBox(10 - d, 20 + d * 0.5, -18 - d, 20 + d));

// 05 Solve: example adaptation sites (half-moon bunds, zaï pits, agroforestry)
const SITES = [
  [-8, 12.6], // Bamako
  [-1.5, 12.4], // Ouagadougou
  [-1.1, 13.1], // Kaya
  [2.1, 13.5], // Niamey
  [5.3, 14.9], // Tahoua
  [7.1, 13.5], // Maradi
  [13.2, 13.1], // Lake Chad shore
].map((center) => geoCircle().center(center).radius(0.9)());

// Where the globe looks for each chapter: [longitude, tilt]
// (the story caption covers the lower part of the disc, so subjects sit above centre)
const CHAPTER_FOCUS = [
  [1, 12], // Detect: the Sahel box
  [-2, 16], // Investigate: Gulf of Guinea -> Sahel
  [-14, 14], // Explain: Atlantic + Sahara
  [1, 12], // Project: envelopes around the box
  [0, 12], // Solve: sites inside the box
];

const SWAY_DEG = 10;
const SWAY_PERIOD_MS = 26000;

export function WelcomeGlobe({ size = 216, chapter = 0 }) {
  const canvasRef = useRef(null);
  const chapterRef = useRef(chapter);

  useEffect(() => {
    chapterRef.current = chapter;
  }, [chapter]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const radius = size * 0.405;
    const cx = size / 2;
    const cy = size / 2;

    const projection = geoOrthographic()
      .scale(radius)
      .translate([cx, cy])
      .clipAngle(90)
      .precision(0.4);
    const path = geoPath(projection, ctx);

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let dragOffset = 0;
    let dragging = false;
    let lastX = 0;
    let raf = 0;
    let [lon, tilt] = CHAPTER_FOCUS[chapterRef.current] ?? CHAPTER_FOCUS[0];
    const start = performance.now();

    const fillShape = (shape, color) => {
      ctx.beginPath();
      path(shape);
      ctx.fillStyle = color;
      ctx.fill();
    };
    const strokeShape = (shape, color, width = 1, dash = [], dashOffset = 0) => {
      ctx.beginPath();
      path(shape);
      ctx.setLineDash(dash);
      ctx.lineDashOffset = dashOffset;
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.stroke();
      ctx.setLineDash([]);
    };

    const draw = (now) => {
      const t = now - start;
      const ch = chapterRef.current;
      const [targetLon, targetTilt] = CHAPTER_FOCUS[ch] ?? CHAPTER_FOCUS[0];

      // ease towards the chapter's viewpoint
      const ease = reduceMotion ? 1 : 0.045;
      lon += (targetLon - lon) * ease;
      tilt += (targetTilt - tilt) * ease;

      const sway = reduceMotion ? 0 : Math.sin((t / SWAY_PERIOD_MS) * Math.PI * 2) * SWAY_DEG;
      if (!dragging) dragOffset *= 0.965;
      projection.rotate([-(lon + sway + dragOffset), tilt, 0]);

      const pulse = reduceMotion ? 0.5 : 0.5 + 0.5 * Math.sin(t / 520);
      const flow = reduceMotion ? 0 : -t / 45;

      ctx.clearRect(0, 0, size, size);

      // ocean sphere
      const ocean = ctx.createRadialGradient(
        cx - radius * 0.35,
        cy - radius * 0.4,
        radius * 0.1,
        cx,
        cy,
        radius * 1.05
      );
      ocean.addColorStop(0, '#26396B');
      ocean.addColorStop(0.65, '#1E2B52');
      ocean.addColorStop(1, '#0B1224');
      fillShape({ type: 'Sphere' }, ocean);

      strokeShape(GRATICULE, 'rgba(244, 241, 234, 0.07)', 0.6);

      // 03 Explain: warm Atlantic under the land
      if (ch === 2) fillShape(WARM_ATLANTIC, `rgba(79, 179, 169, ${0.28 + pulse * 0.22})`);

      fillShape(LAND, 'rgba(244, 241, 234, 0.9)');
      strokeShape(BORDERS, 'rgba(19, 29, 56, 0.22)', 0.5);

      // Sahel study box: solid in Detect, quieter in the other chapters
      if (ch === 0) {
        fillShape(SAHEL, `rgba(255, 194, 13, ${0.5 + pulse * 0.2})`);
        strokeShape(SAHEL, '#ffc20d', 1.4);
      } else {
        fillShape(SAHEL, 'rgba(255, 194, 13, 0.22)');
        strokeShape(SAHEL, '#ffc20d', 1.1, [3, 2]);
      }

      // 02 Investigate: moisture streams
      if (ch === 1) {
        MOISTURE_FLOWS.forEach((line, i) =>
          strokeShape(line, '#4FB3A9', i === 0 ? 2.2 : 1.6, [5, 4], flow)
        );
      }

      // 03 Explain: Saharan Heat Low
      if (ch === 2) {
        const heatLow = geoCircle()
          .center(HEAT_LOW_CENTER)
          .radius(4 + pulse * 2)();
        fillShape(heatLow, `rgba(255, 194, 13, ${0.35 - pulse * 0.15})`);
        strokeShape(heatLow, '#ffc20d', 1.2);
      }

      // 04 Project: conditional envelopes
      if (ch === 3) {
        ENVELOPES.forEach((env, i) =>
          strokeShape(env, `rgba(255, 194, 13, ${0.95 - i * 0.3})`, 1.3, i ? [4, 3] : [])
        );
      }

      // 05 Solve: adaptation sites
      if (ch === 4) {
        SITES.forEach((site) => {
          fillShape(site, `rgba(79, 179, 169, ${0.75 + pulse * 0.25})`);
          strokeShape(site, '#131D38', 0.6);
        });
      }

      // 3D shading: light from the top-left, darker limb
      const shade = ctx.createRadialGradient(
        cx - radius * 0.4,
        cy - radius * 0.45,
        radius * 0.15,
        cx,
        cy,
        radius
      );
      shade.addColorStop(0, 'rgba(255, 255, 255, 0.10)');
      shade.addColorStop(0.55, 'rgba(11, 18, 36, 0)');
      shade.addColorStop(1, 'rgba(11, 18, 36, 0.55)');
      fillShape({ type: 'Sphere' }, shade);

      // teal atmosphere rim
      strokeShape({ type: 'Sphere' }, 'rgba(79, 179, 169, 0.45)', 1.5);

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    const onDown = (e) => {
      dragging = true;
      lastX = e.clientX;
      canvas.setPointerCapture(e.pointerId);
      canvas.style.cursor = 'grabbing';
    };
    const onMove = (e) => {
      if (!dragging) return;
      dragOffset -= (e.clientX - lastX) * 0.45;
      lastX = e.clientX;
    };
    const onUp = (e) => {
      dragging = false;
      if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
      canvas.style.cursor = 'grab';
    };
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);

    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
    };
  }, [size]);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label="3D globe showing the Sahel study box across West and Central Africa"
      className="pointer-events-auto cursor-grab touch-none"
      style={{ width: size, height: size }}
    />
  );
}
