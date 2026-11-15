const discoverTrendsImg = '/images/discover_trends_1794690706086.jpg';
const discoverEvidenceImg = '/images/discover_evidence_1794690707022.jpg';
const discoverMechanismsImg = '/images/discover_mechanisms_1794690707340.jpg';
const discoverScenariosImg = '/images/discover_scenarios_1794690708301.jpg';
const discoverAdaptationImg = '/images/discover_adaptation_1794690708755.jpg';

export const REGION_OPTIONS = [
  { id: 'sahel', label: 'Sahel', coords: '10°N–20°N, 18°W–20°E' },
  { id: 'horn', label: 'Horn of Africa', coords: '2°S–12°N, 34°E–51°E' },
  { id: 'indus', label: 'Indus Basin', coords: '24°N–36°N, 66°E–78°E' },
  { id: 'amazon', label: 'Southern Amazon', coords: '4°S–16°S, 48°W–68°W' },
];

export const VARIABLE_OPTIONS = [
  { id: 'rainfall', label: 'Rainfall', dataset: 'NASA GPM IMERG v07B' },
  { id: 'moisture', label: 'Atmospheric moisture', dataset: 'MERRA-2 Reanalysis' },
  { id: 'aerosols', label: 'Dust aerosols', dataset: 'MODIS Terra / Aqua' },
  { id: 'vegetation', label: 'Vegetation cover', dataset: 'MODIS NDVI' },
];

export const PERIOD_OPTIONS = ['2001–2025', '2001–2015', '2015–2025'];

export const WORKFLOW_LAYERS = [
  {
    id: 'detect',
    number: '01',
    title: 'Detect',
    question: 'What is changing?',
    output: 'Sen’s slope & trend significance',
    explanation:
      'Isolate multi-decadal shifts in seasonal totals, extreme daily bursts, and dry-spell persistence using non-parametric Theil-Sen slopes and Mann-Kendall tests.',
    methodTag: 'Theil-Sen slope · Mann-Kendall α = 0.05',
    datasetTag: 'NASA GPM IMERG v07B · JJAS',
  },
  {
    id: 'investigate',
    number: '02',
    title: 'Investigate',
    question: 'What else is changing?',
    output: 'Co-varying atmospheric evidence',
    explanation:
      'Cross-examine precipitable water vapor, Saharan mineral dust optical depth, and convective cloud-top cooling across matching spatial grids and seasonal windows.',
    methodTag: 'Cross-correlation · Anomaly decomposition',
    datasetTag: 'MERRA-2 · MODIS Aerosol Optical Depth',
  },
  {
    id: 'explain',
    number: '03',
    title: 'Explain',
    question: 'Why is it happening?',
    output: 'Candidate physical mechanisms',
    explanation:
      'Synthesize evidence into structured physical hypotheses—such as Atlantic warming gradients intensifying monsoon moisture convergence—with explicit confidence levels.',
    methodTag: 'Causal attribution · Confidence rubric',
    datasetTag: 'MERRA-2 Wind Shear · EarthCARE Profiles',
  },
  {
    id: 'project',
    number: '04',
    title: 'Project',
    question: 'What could happen next?',
    output: 'Conditional scenario envelopes',
    explanation:
      'Explore branching pathways—stabilization, trend continuation, or compounding dry-wet stress—grounded in observed physical sensitivities rather than single-point claims.',
    methodTag: 'Sensitivity envelopes · Multi-pathway',
    datasetTag: 'Baseline 2001–2025 · Conditional 2040',
    caveat: 'Conditional scenarios, never forecasts.',
  },
  {
    id: 'solve',
    number: '05',
    title: 'Solve',
    question: 'What responses make sense?',
    output: 'Physics-guided water strategies',
    explanation:
      'Compare how watershed interventions—half-moon bunds, zaï infiltration pits, and agroforestry canopy—alter soil moisture retention under intense rainfall regimes.',
    methodTag: 'Water-balance sensitivity comparison',
    datasetTag: 'SMAP Root-Zone · Basin Runoff Model',
    caveat: 'Conditional scenarios, never forecasts.',
  },
];

export const DISCOVERY_CARDS = [
  {
    id: 'trends',
    layerId: 'detect',
    title: 'Environmental trends',
    description:
      'Time series, Sen’s slope, and non-parametric significance across regional study boxes.',
    image: discoverTrendsImg,
    imageAlt: 'Satellite precipitation radar contours sweeping across the Sahel landscape',
    detailHeadline: 'Separate real climate shifts from year-to-year noise.',
    detailBody:
      'EarthSignal computes robust Theil-Sen slopes and seasonal quantiles over 25 years of satellite grids, surfacing both mean recovery and extreme storm intensification without assuming normal distributions.',
    metrics: [
      { label: 'Estimator', value: 'Theil-Sen median slope' },
      { label: 'Significance', value: 'Mann-Kendall (p-value)' },
      { label: 'Resolution', value: '0.1° × 0.1° grid' },
    ],
    provenance: 'NASA GPM IMERG Final Run v07B (2001–2025)',
  },
  {
    id: 'evidence',
    layerId: 'investigate',
    title: 'Supporting evidence',
    description:
      'Column moisture, Saharan mineral aerosols, and convective storm structure in context.',
    image: discoverEvidenceImg,
    imageAlt: 'Atmospheric cross-section showing water vapor plumes and Saharan dust layers',
    detailHeadline: 'Inspect the atmospheric column alongside surface rainfall.',
    detailBody:
      'A precipitation curve alone leaves out the air mass feeding it. EarthSignal aligns column water vapor, low-level monsoon inflow, and mineral dust loading on the exact same temporal axis.',
    metrics: [
      { label: 'Moisture', value: '850 hPa specific humidity' },
      { label: 'Aerosols', value: '550 nm optical depth' },
      { label: 'Storms', value: 'Mesoscale convective index' },
    ],
    provenance: 'MERRA-2 Reanalysis & MODIS Collection 6.1',
  },
  {
    id: 'mechanisms',
    layerId: 'explain',
    title: 'Physical mechanisms',
    description:
      'Candidate physical explanations ranked with transparent scientific confidence labels.',
    image: discoverMechanismsImg,
    imageAlt: '3D ceramic globe model with teal ocean currents and amber circulation arcs',
    detailHeadline: 'Connect statistical trends to atmospheric dynamics.',
    detailBody:
      'Each candidate mechanism documents its physical pathway, supporting variables, contradicting observations, and an explicit confidence rating so researchers can audit the reasoning.',
    metrics: [
      { label: 'Driver 01', value: 'Tropical Atlantic SST gradient' },
      { label: 'Driver 02', value: 'Saharan Heat Low intensification' },
      { label: 'Confidence', value: 'Explicit rubric labels' },
    ],
    provenance: 'Coupled Reanalysis Diagnostics & Literature Synthesis',
  },
  {
    id: 'scenarios',
    layerId: 'project',
    title: 'Future scenarios',
    description:
      'Conditional pathways exploring stabilization, trend continuation, and compounding stress.',
    image: discoverScenariosImg,
    imageAlt: 'Branching climate trajectory bands emerging from a single observation node',
    detailHeadline: 'Explore conditional envelopes—never deterministic forecasts.',
    detailBody:
      'Rather than projecting a single misleading line, EarthSignal maps three bounded physical regimes showing how extreme rainfall intensity and dry-spell duration diverge under shifting moisture states.',
    metrics: [
      { label: 'Regime A', value: 'Moisture stabilization' },
      { label: 'Regime B', value: 'Observed trend continuation' },
      { label: 'Regime C', value: 'Compounding thermal stress' },
    ],
    provenance: 'Conditional Sensitivity Envelopes (Non-predictive)',
  },
  {
    id: 'adaptation',
    layerId: 'solve',
    title: 'Adaptation strategies',
    description: 'Transparent, physics-guided comparisons of watershed and land-surface responses.',
    image: discoverAdaptationImg,
    imageAlt: 'Aerial view of Sahelian rainwater harvesting half-moon bunds and regenerated trees',
    detailHeadline: 'Test land and water strategies against storm intensity.',
    detailBody:
      'When rainfall concentrates into fewer, heavier convective bursts, surface runoff surges. Compare how physical soil-water interventions shift infiltration versus evaporative loss.',
    metrics: [
      { label: 'Half-moon bunds', value: 'Runoff capture & infiltration' },
      { label: 'Zaï basins', value: 'Root-zone moisture retention' },
      { label: 'Tree canopy', value: 'Microclimate & evaporation control' },
    ],
    provenance: 'Water-Balance Sensitivity Framework · Sahel Case Study',
  },
];

export const DATA_FOUNDATION = [
  {
    id: 'gpm',
    name: 'NASA GPM IMERG',
    agency: 'NASA',
    role: 'Precipitation',
    spec: 'v07B · 0.1° Gridded',
    detail:
      'Multi-satellite calibrated precipitation estimates capturing seasonal totals and intense convective bursts.',
  },
  {
    id: 'merra2',
    name: 'MERRA-2',
    agency: 'NASA',
    role: 'Atmospheric reanalysis',
    spec: '0.5° × 0.625° · 1980–Present',
    detail:
      'Integrated Earth-system reanalysis providing 850 hPa moisture transport, wind shear, and surface energy fluxes.',
  },
  {
    id: 'modis',
    name: 'MODIS',
    agency: 'NASA',
    role: 'Aerosols, vegetation',
    spec: 'Terra & Aqua · Col. 6.1',
    detail:
      'Daily aerosol optical depth and 16-day vegetation greenness tracking Saharan dust and Sahel land response.',
  },
  {
    id: 'earthcare',
    name: 'EarthCARE',
    agency: 'ESA / JAXA',
    role: 'Case studies',
    spec: 'Cloud & Aerosol Profiles',
    detail:
      'Vertical radar-lidar cloud microphysics and aerosol profiles used to validate convective storm structure case studies.',
  },
];
