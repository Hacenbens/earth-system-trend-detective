# Layer 3 evidence cards (EXPLAIN)

Generated from `data/app/mechanisms.json` by `scripts/render_evidence_cards.py`. Edit the JSON, not this file.
**New to these cards? Read [How to read the evidence cards](how_to_read_evidence_cards.md) first:** statuses, confidence levels, % per decade, p-values, ρ, σ and the EarthCARE percentages.

Region: Sahel box 10-20N, 18W-20E, with provisional W/C/E sub-regions (D-003b) · Period: JJAS 1998-2025

**Detected trend (Layer 1):** Season totals (box): wetting tendency, +3.3 %/decade (p = 0.15). East sub-region: +8.7 %/decade in IMERG (p = 0.055), confirmed by CHIRPS (+7.9 %/decade, p = 0.026); west and central flat in both. Longest dry spell: shortening, robust in the east (-9.6 %/decade, p = 0.001). Extremes: inconclusive (2014 satellite-era change in the daily tail). Spatial PCA finds the same east-west contrast objectively: an east-west see-saw mode trending toward wet-east/dry-west (p = 0.014; E-015).

> Interpretations and confidence levels are **drafts written with AI assistance** for the science lead to review. Evidence IDs point to `docs/research/evidence_ledger.md`. References are still TO-VERIFY. Association is not causation.

| Card | Mechanism | Consistent | Inconsistent | Unclear | Not tested | Confidence |
|---|---|---|---|---|---|---|
| M-01 | West African Monsoon circulation (dynamic moisture supply) | 6 | 0 | 1 | 0 | **medium** |
| M-02 | Atmospheric moisture availability (thermodynamic, Clausius-Clapeyron) | 2 | 2 | 1 | 0 | **low** |
| M-03 | Organized convection (mesoscale convective systems) | 3 | 1 | 1 | 0 | **low-medium** |
| M-04 | Dust and aerosol interactions | 2 | 2 | 1 | 0 | **low** |
| M-05 | Soil moisture and surface energy balance | 3 | 0 | 1 | 1 | **low** |

---

## M-01 · West African Monsoon circulation (dynamic moisture supply)  (confidence: **medium**)

A stronger or more northward-reaching monsoon brings more moist air from the Gulf of Guinea, increases low-level moisture convergence and large-scale rising motion, and so produces more rain days and shorter dry spells, independently of local warming.

| Expected if this mechanism matters | What we observe | Status | Evidence |
|---|---|---|---|
| Stronger southerly monsoon inflow at 850 hPa | V850 +0.15 m/s per decade, p < 0.001 (all sub-regions) | ✅ consistent | E-008 |
| Stronger low-level westerlies (monsoon flow) | Year to year: yes. Wet seasons have stronger westerly monsoon inflow along 10-13N (+0.4 m/s, p = 0.04; west p = 0.007; E-016). Over time: no significant trend (box p = 0.28). Strongly positive in 2024 (+3.1 sigma) | ❔ unclear | E-008, E-011, E-016 |
| More moisture convergence | +0.35 mm/day per decade, p = 0.002; detrended rho with rainfall 0.73 | ✅ consistent | E-008 |
| More large-scale rising motion | rising motion at 500 hPa up, p = 0.02; rho with rainfall 0.72 | ✅ consistent | E-008 |
| Rain days up and dry spells shorter | Dry spells shorter in the east (robust, p <= 0.004 in every test); wet days +1.5 %/decade, not significant | ✅ consistent | E-006, E-007 |
| Moistening not explained by local warming | JJAS T2M flat (box) or cooling (east, -0.29 C/decade); water vapour vs T2M -4.6 %/K | ✅ consistent | E-009 |
| Wet seasons show the whole monsoon package together (moisture, inflow, convergence, ascent) | Wet minus dry seasons (detrended selection): water vapour +6.5 % (p = 0.011), rising motion p = 0.001, moisture convergence p = 0.006, westerly inflow p = 0.04, cooler and wetter surface; dust not different (p = 0.42) | ✅ consistent | E-016 |

**Supporting evidence:** E-005, E-007, E-008, E-009, E-011, E-015, E-016 · **Contradicting:** –

**Alternative explanations**
- Remote ocean forcing (Atlantic Multidecadal Variability, north-east Atlantic SST) driving the monsoon change: an upstream cause rather than a competitor (L-23; research_references 2026 #2)
- Changes in aerosol forcing, e.g. Asian sulfate emissions (L-22)
- Natural decadal variability over a short (28-year) record
- Reanalysis artefact: MERRA-2 circulation trends can follow changes in assimilated observations

**Interpretation:** DRAFT for review: the strongest-supported mechanism. Every circulation indicator except the zonal wind moves in the expected direction and tracks rainfall year to year. It explains why dry spells shorten without local warming.

**Limitations**
- MERRA-2 is a reanalysis (model-constrained)
- Box-mean winds mix monsoon (south) and Saharan (north) regimes
- No second reanalysis or observed humidity product yet

**References (TO-VERIFY):** L-02, L-11, L-17, L-18, L-24

---

## M-02 · Atmospheric moisture availability (thermodynamic, Clausius-Clapeyron)  (confidence: **low**)

Warmer air can hold about 7 % more water vapour per kelvin. If local warming drives the moistening, water vapour should rise with temperature and heavy-rain intensity should rise faster than totals.

| Expected if this mechanism matters | What we observe | Status | Evidence |
|---|---|---|---|
| Column water vapour increases | +1.67 kg/m2 per decade (+4.1 %/decade), p = 0.001 | ✅ consistent | E-008 |
| Local near-surface warming in the rainy season | No warming (box -0.13 C/decade, p = 0.21; east -0.29, p = 0.02) | ❌ inconsistent | E-009 |
| Water vapour scales with temperature at about +7 %/K | -4.6 %/K year to year (wetter years are cooler) | ❌ inconsistent | E-009 |
| Heavy-rain indices track moisture | Detrended rho of Rx1day 0.70, R95p 0.78 with water vapour (p < 0.001) | ✅ consistent | E-006, E-008 |
| Heavy-rain intensity increases over time | Rx1day no trend (p = 0.42); SDII +2.3 %/decade but mostly a step at 2014 | ❔ unclear | E-006 |

**Supporting evidence:** E-008 · **Contradicting:** E-009

**Alternative explanations**
- Moisture rise supplied by circulation (M-01) rather than local temperature
- Global/ocean warming raising moisture upstream, which local land temperature cannot show

**Interpretation:** DRAFT for review: the moisture increase is real in MERRA-2, but local temperature does not explain it. The thermodynamic pathway may act through ocean or global warming upstream, which we have not tested. Extremes respond to moisture year to year, so the missing extreme-rain trend is more likely a data problem (2014 tail) than an absence of effect.

**Limitations**
- Local T2M is cooled by rain and cloud, so it is a weak test
- A proper scaling test uses event-scale extremes vs temperature or dew point
- Daily extremes not homogeneous across 2014

**References (TO-VERIFY):** L-11, Africa-pack 1.3-1.6 (scaling papers, citations to find)

---

## M-03 · Organized convection (mesoscale convective systems)  (confidence: **low-medium**)

Most Sahel rain falls from organized storm systems. More moisture and instability, and stronger wind shear, make them rain harder; extremes can rise even when storm numbers stay stable.

| Expected if this mechanism matters | What we observe | Status | Evidence |
|---|---|---|---|
| Stronger mid-level rising motion | Up, p = 0.02 | ✅ consistent | E-008 |
| Extreme rain tracks ascent year to year | Detrended rho: Rx1day 0.73, R95p 0.76 with ascent | ✅ consistent | E-006, E-008 |
| Rain per event and extremes increase | Rx1day no trend; SDII up but possibly a satellite-era artefact | ❔ unclear | E-006 |
| Deep convective cores with strong Doppler updrafts in recent storms | EarthCARE CPR, 3 storms (W/C/E): radar echo tops 15.5-17.2 km (95th pct of rainy profiles), up to 18 km (tropopause); air-motion updrafts up to 6-9 m/s at 4-10 km; heavy rain below the 4.7 km melting level. Snapshots of present-day storms, not a trend | ✅ consistent | E-012 |
| Stronger wind shear (L-20, L-21) | MERRA-2 zonal shear 925-600 hPa (mean ~11 m/s, African Easterly Jet ~ -10 m/s at 600 hPa): no significant trend in any sub-region (central -0.24 m/s per decade, p = 0.07); not associated with rainfall, Rx1day, R95p or SDII year to year (|rho| <= 0.32, n.s.). One exception: a weaker easterly jet goes with larger Rx1day (rho 0.49, p = 0.008; one of many tests) | ❌ inconsistent | E-013 |

**Supporting evidence:** E-008, E-012 · **Contradicting:** E-013

**Alternative explanations**
- Changes in storm frequency rather than intensity
- Satellite-era changes in how IMERG resolves convective peaks (E-006)
- Shear-driven storm intensification (L-20, L-21, L-03) is not supported for 1998-2025 in MERRA-2: shear did not increase

**Interpretation:** DRAFT for review: EarthCARE shows that today's Sahel rain comes from deep organized systems reaching the tropopause with strong updrafts, which is the storm type through which more moisture would produce heavier rain. Whether these storms have become more intense over time cannot be shown by EarthCARE (2024 onwards); that test still depends on the daily rain-gauge check of extremes.

**Limitations**
- AC-TC labels thin layers near the tropopause as dust: treated as an artefact (only dust below 8 km used)
- EarthCARE covers 2024-2025 only: process illustration, never a trend
- EarthCARE: 4 overpasses, 2024-2025: process illustration only
- Needs daily rain-gauge check of extremes

**References (TO-VERIFY):** L-03, L-11, L-18, L-20, L-21, L-25

---

## M-04 · Dust and aerosol interactions  (confidence: **low**)

Saharan dust absorbs and scatters sunlight and can change cloud formation, which may suppress or shift rainfall. Its effect depends on altitude, particle type and cloud regime.

| Expected if this mechanism matters | What we observe | Status | Evidence |
|---|---|---|---|
| Dust load changes over time | Dust optical depth -0.03 per decade (-8 %/decade), p < 0.001 | ✅ consistent | E-010 |
| Dustier seasons are drier (same season) | Detrended rho with JJAS rainfall -0.12, p = 0.54; wet vs dry season composites: dust not different (p = 0.42) | ❌ inconsistent | E-010, E-016 |
| Dust before the season (MAM) precedes drier JJAS | Detrended rho -0.07, p = 0.72 | ❌ inconsistent | – |
| Dust layer sits at or above cloud level in storms | EarthCARE AC-TC: dust (Saharan Air Layer) at 1-6 km, median 3.0-3.5 km; dry June case: dust over 96 % of the box. In storm cases dust lies BESIDE the storms (dust and rain in the same profile < 1 %). The lidar is blocked under thick storm cloud, so dust inside storms cannot be seen | ❔ unclear | E-012 |
| Extreme dry vs wet years differ in dust | 2002 +1.5 sigma, 2024 -0.8 sigma | ✅ consistent | E-011 |

**Supporting evidence:** E-011 · **Contradicting:** E-010, E-016

**Alternative explanations**
- Reverse causality: wetter, greener seasons emit less dust
- Assimilation artefact in MERRA-2 aerosols (MODIS AOD assimilated; 2025 anomaly -4 sigma)
- Remote aerosol forcing (Asian sulfate, L-22) acting through circulation

**Interpretation:** DRAFT for review: the dust decline is a trend in the reanalysis, but it does not track rainfall from year to year. At most a secondary player, and possibly a consequence of wetter conditions. EarthCARE confirms a deep Saharan dust layer (1-6 km) next to and north of the storms, but cannot see inside them, so the dust-storm interaction itself stays untested.

**Limitations**
- 2025 MERRA-2 dust value -4 sigma (likely artefact; trend holds without 2025)
- AC-TC labels thin layers near the tropopause as dust: treated as an artefact (only dust below 8 km used)
- Column AOD says nothing about dust altitude
- EarthCARE: 4 overpasses, 2024-2025: process illustration only
- Not yet checked against MODIS AOD directly

**References (TO-VERIFY):** L-22, Africa-pack 2.1-2.7 (citations to find)

---

## M-05 · Soil moisture and surface energy balance  (confidence: **low**)

Wet soils evaporate more and stay cooler, which can feed moisture back to the atmosphere and change where new storms form; soil-moisture contrasts can strengthen storm systems through wind shear.

| Expected if this mechanism matters | What we observe | Status | Evidence |
|---|---|---|---|
| Cooler surface in wetter seasons/regions | Wetter years cooler (rho -0.53); east cooling -0.29 C/decade | ✅ consistent | E-009 |
| Shorter dry spells where soils stay moist | Wetter-soil seasons have shorter dry spells (east rho -0.59, p = 0.001), but soil wetness follows rainfall by construction; June soil moisture does NOT foreshadow July-September rain (rho 0.17, p = 0.40) | ❔ unclear | E-007, E-014 |
| Soil moisture increases in the rainy season | MERRA-2 topsoil wetness +0.027 per decade (box, p = 0.001), east +0.032 (+11 %/decade, p < 0.001); root zone also up everywhere. Partly by construction: MERRA-2 land is forced by observation-corrected rainfall | ✅ consistent | E-014 |
| Greener vegetation (NDVI add-on, D-011) | Not fetched | ⬜ not tested | – |
| More energy goes into evaporation, cooling the surface | Evaporative fraction rises (box +0.027 per decade, p = 0.002; east +0.040, p < 0.001) and is strongly anti-correlated with near-surface temperature (rho -0.65 to -0.86, p < 0.001): wetter land evaporates more and stays cooler | ✅ consistent | E-014, E-009 |

**Supporting evidence:** E-009, E-014 · **Contradicting:** –

**Alternative explanations**
- Surface cooling from clouds and rain, not soil moisture
- Land-use and vegetation change

**Interpretation:** DRAFT for review: the land surface responds as expected to a wetter rainy season: wetter soils, more evaporation, cooler surface. This explains the surface cooling in the east (E-009) without local warming. Whether the land feeds rain back (a feedback) is not shown: MERRA-2 soil moisture is driven by observed rainfall, and early-season soil moisture does not predict later rain.

**Limitations**
- MERRA-2 land is forced by observation-corrected precipitation, so soil-rain links are partly circular
- MERRA-2 LAI is a prescribed climatology (no trend information)
- Box/sub-region means hide the soil-moisture gradients that matter for storms (L-20)
- NDVI not yet fetched

**References (TO-VERIFY):** L-19, L-20, L-21, L-36, L-39
