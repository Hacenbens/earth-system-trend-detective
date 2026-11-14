# Decision log

Format: each decision has an ID, status (PROPOSED / ACCEPTED / REJECTED / SUPERSEDED), date, the decision, why, and the alternatives we considered.
Never edit an accepted decision. Supersede it with a new entry.

---

## D-001 — Product = general trend tool + flagship case study
- **Status:** ACCEPTED · 2026-11-13
- **Decision:** The deliverable is an app where *any* user picks variable → region → period → gets a time series → gets a significance test (the 5 required steps). Our scientific investigation is a showcase run through that app, extended with layers 2–3.
- **Why:** The challenge text says "Your app should be able to do this: 1–5". A one-off study alone would fail *Relevance* and *Validity (usability)*.

## D-002 — NASA data carries the trend layer
- **Status:** ACCEPTED · 2026-11-13
- **Decision:** All Layer-1 trends come from NASA datasets. EarthCARE (ESA/JAXA) is used only in Layer 2 as a complement and is labelled as non-NASA.
- **Why:** Global Award requires NASA data, and *Relevance* scores NASA data being "integral, not superficial". EarthCARE's record (launched May 2024) is too short for trends anyway (rule 5).

## D-003 — Region: Sahel (within the North Africa framing)
- **Status:** ACCEPTED · 2026-11-13 (exact bounding box still open → D-003b)
- **Proposal:** Sahel band ≈ 10°N–20°N, 18°W–20°E (exact box TBD in D-003b). North Africa / Sahara and the Mediterranean are kept as comparison regions in the app.
- **Why:**
  - *Science:* Sahara precipitation is close to zero, so a precipitation trend there is mostly noise and dominated by rare events. The Sahel has a strong, well-documented signal: 1970s–80s drought, partial rainfall recovery, and reported intensification of extreme convective storms. That gives us a known reference to validate our pipeline against (*Validity*).
  - *Layer 2 fit:* Sahelian rain comes mostly from mesoscale convective systems. EarthCARE CPR Doppler can observe their convective cores, and ATLID can observe the Saharan dust layer above them (aerosol–cloud question).
  - *Impact:* rainfed agriculture, food security and water for a population of over 100 million (figure to verify, E-ledger).
- **Alternatives:** whole North Africa (signal diluted by the desert), Mediterranean (good drying signal but weaker Layer-2 story), global (too broad for 7 slides).

## D-004 — Flagship investigation: precipitation + extremes, dust as second track
- **Status:** ACCEPTED · 2026-11-13
- **Proposal:** Q1: "Is Sahel rainfall changing in *amount* and in *intensity / extremes*, and are the cloud and convection structures we observe consistent with that?" Backup track: dust AOD trend (MODIS/MERRA-2) and its vertical structure (ATLID).
- **Why:** Changes in extremes are the more novel and impactful angle (*Creativity / Impact*). Precipitation ties moisture, convection, aerosols and radiation into one system.

## D-005 — MVP scope and stack
- **Status:** ACCEPTED · 2026-11-13 (UI: FastAPI backend + light JS front-end)
- **Proposal:** Python core library (`src/earth_detective`: fetch, harmonise, trend stats) + notebooks + one lightweight web UI. Defer PostGIS, React, Docker and object storage until the MVP works.
- **Why:** The time box of a hackathon. Judges see a ≤7-slide or ≤30-second demo plus a public link. A working, honest tool beats a half-built platform.
- **Resolved:** FastAPI + light JS front-end (team choice, for polish). Still deferred: PostGIS, React, Docker.

## D-006 — Time period
- **Status:** ACCEPTED (rev. 1, 1998–2025) · confirmed by team lead 2026-11-14. The 2001–2025 period in Team Briefing v0.2 is not adopted.
- **Proposal (rev. 1):** The main trend period is the Sahel rainy season (June–September) for **1998–2025, 28 seasons**, from IMERG Final **V07B**. GPCP V3.3 (1983–2025) provides independent long-term context and a cross-check. MERRA-2 (1980–2026) covers the moisture and dynamics drivers. EarthCARE covers 2024–2025 only, for Layer 2.
- **Why the revision:** The NASA metadata catalogue shows IMERG V07 starting in Jan 1998, not June 2000, and ending in Sept 2025 because of the V08 transition. GPCP V3 starts in 1983, not 1979. See `docs/research/dataset_inventory.md`.
- **Added check:** a break test around 2014, when the IMERG input satellites changed from the TRMM era to the GPM era, plus an IMERG vs GPCP comparison.
- *Original proposal (superseded):* 2001–2025, with IMERG thought to start in June 2000 and GPCP in 1979.
- **Caveat:** The choice of start year strongly affects Sahel trends because of the drought-and-recovery cycle. We must show sensitivity to the start year and must not cherry-pick.

---

## D-009 — Use of the official challenge resources
- **Status:** PROPOSED · 2026-11-13
- **Proposal:** Giovanni is the official validation reference for our Layer-1 series, not the app's backend, since its API reportedly serves points only. Hydrology Data Rods is a candidate for the app's point mode. NOAA CDO stations provide ground truth for IMERG. KNMI Climate Explorer is a second cross-check. The Acker et al. (2009) article is our method template. AppEEARS NDVI is a stretch goal for impact. The CSA resources are out of scope.
- **Why:** Relevance (visible use of the organisers' resources) and Validity (three independent checks). Details in `docs/challenge/official_resources.md`.

---

## D-010 — Layers 2 and 3 are the core added value (kept in the 48-hour scope)
- **Status:** ACCEPTED · 2026-11-13 (team lead)
- **Decision:** Trend detection alone is what every team will submit. Our differentiator is Layer 2 (vertical structure) plus Layer 3 (physical interpretation), so both stay in the minimum deliverable, each in a reduced but complete form:
  - **Layer 2 MVP:**
    - (a) MERRA-2 vertical profiles (OMEGA, QV, T on pressure levels) over the Sahel for 1998–2025. These are allowed to show change over time because the reanalysis record is long, and they are labelled as reanalysis.
    - (b) A small set of EarthCARE CPR + ATLID overpasses of Sahel storms (rainy seasons 2024–2025), showing echo-top height, Doppler vertical velocity and the dust layer relative to the cloud. These describe today's atmosphere and are never used to infer trends.
  - **Layer 3 MVP:** three "evidence cards", each with data, numbers, literature, alternatives and a confidence level:
    1. Moisture: the TQV trend vs the rainfall trend, including a Clausius–Clapeyron scaling check (about 7 % per °C) for the extremes.
    2. Convection: the MERRA-2 vertical-motion trend plus the EarthCARE storm structure.
    3. Dust and aerosol: the dust AOD trend plus the ATLID dust layer vs cloud level.
- **Consequence for planning:** EarthCARE access is the highest technical risk, so it starts **at the beginning** in parallel with the IMERG trend, not at the end. Fallback if EarthCARE fails: CloudSat/CALIPSO (NASA, 2006–2023) for storm structure.
- **Supersedes** the suggestion (in chat, 2026-11-13) to treat EarthCARE as optional under time pressure.


---

## D-011 — Scope: rainfall + atmosphere, with NDVI as a small impact add-on
- **Status:** ACCEPTED · 2026-11-14 (team lead, after review of `docs/team/contribution/`)
- **Decision:** The main question stays as D-004 / D-010: Sahel rainfall amount and extremes (Layer 1) plus atmospheric vertical structure and physical interpretation (Layers 2–3). Vegetation (MODIS NDVI) is added as **one small impact indicator**: JJAS rainfall anomaly vs. growing-season NDVI anomaly, with "associated with" language only. It is not a second research question.
- **Why:** Teammate contributions proposed three framings (rain + atmosphere; rain + vegetation; clouds/MCS + rain). Rain + vegetation would drop Layers 2–3, which contradicts D-010. NDVI adds a concrete *Impact* link (Gaye 2026; Souleymane et al. 2026; Yamashita et al. 2026) at low cost.
- **Rejected alternatives:** rainfall + vegetation as the main question (`EarthSignal_..._Resources.docx`); making cloud properties the main question (top-10 list).

## D-012 — Project name
- **Status:** ACCEPTED · 2026-11-14 (team lead)
- **Decision:** Keep **"Earth System Trend Detective"**. The name "EarthSignal" (Team Briefing v0.2) is not adopted.

## D-013 — CHIRPS v3.0 as the independent (non-NASA) rainfall cross-check
- **Status:** ACCEPTED · 2026-11-14
- **Decision:** CHIRPS v3.0 (UCSB Climate Hazards Center, 0.05°, gauge-blended, released 2025-01) is used only as an independent check on IMERG, never as the trend dataset (D-002 stands). The first use is to check the 2026 Late Run dry signal (evidence ledger E-004).
- **Why:** The `.docx` pack proposed CHIRPS as the primary dataset; that would break D-002. As a cross-check it adds *Validity*, and it covers 2026, which IMERG Final does not.

---

## Open questions (need answers from the team)
- [ ] Submission deadline and team size / roles? The official 2026 participant FAQ gives the event dates as **14–15 November 2026**. Confirm the local event dates and the submission cut-off.
- [ ] NASA Earthdata Login: NOT yet. The credentials we had are ESA (EarthCARE) ones; register at urs.earthdata.nasa.gov.
- [x] ESA EarthCARE access: team has it. Still to check which L2 products and processing baseline are available.
- [x] D-003 region = Sahel, D-004 flagship = precipitation amount + extremes.
- [ ] D-003b exact Sahel bounding box (and comparison boxes: Sahara, Mediterranean).
- [ ] D-007 extreme-precipitation indices (e.g. R95p, Rx1day, wet-day intensity) and trend-test variant (seasonal / modified MK).
- [ ] Use CloudSat/CALIPSO (NASA) alongside EarthCARE for vertical structure?
