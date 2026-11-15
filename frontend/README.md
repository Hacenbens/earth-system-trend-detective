# EarthSignal — frontend_earth_system

EarthSignal turns NASA Earth observations into scientific investigations:
detect a trend, examine the physics behind it, and explore conditional futures.

This is the Next.js (JavaScript) version of the original Vite + React/TypeScript app,
with the same screens and design, plus a real map of each investigation's study area.

## Run

```bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm start
```

## Structure

```
src/app/
  layout.js            root layout: fonts, metadata, <AppProvider>
  page.js              /            landing
  auth/page.js         /auth
  (workspace)/         /dashboard, /investigations/..., /datasets/..., /methodology, /references
    layout.js          mounts the persistent workspace shell (sidebar + screens)
    */page.js          route entries (the shell renders the screen for the URL)
  not-found.js         unknown URLs fall back to the landing page
  globals.css          Tailwind v4 theme + EarthSignal styles + map styles

  api/                 data layer
    earthSignalData.js   regions, variables, workflow layers, discovery cards
    dashboardData.js     investigations, datasets, reports, references
    regionBounds.js      study-box helpers for the maps

  layout/              app-wide pieces
    AppProvider.js       session, toast, navigation (was App.tsx)
    WorkspaceShell.js    URL -> workspace screen
    Navbar.js, Footer.js, DashboardSidebar.js, ScientificIcons.js

  pages/               screens and their sections
    landing/  auth/  dashboard/  investigations/  datasets/  methodology/
```

Images live in `public/images/`.

## Study-area map

`pages/investigations/StudyAreaMap.js` shows the investigation's exact bounding box
(`bounds`, or parsed from the `coords` label such as `2°S–12°N, 34°E–51°E`) on a real
Leaflet map, with Map (CARTO Dark Matter) and Satellite (Esri World Imagery) basemaps.
It appears on the investigation overview (Study area boundary) and on the
regional comparison screen (West / Central / East boxes; click a box to toggle it).
No API key is needed.
