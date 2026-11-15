# How to read the evidence cards

A guide for the science lead reviewing `docs/research/evidence_cards.md` (Layer 3, EXPLAIN). It explains every statistical term and every kind of percentage used in the cards, with worked examples from our own numbers.
Drafted with AI assistance (Claude Code). See `docs/submission/si_usage.md`.

---

## 1. What a card is

Each card tests one **candidate physical mechanism** that could explain the rainfall changes we detected. The logic is the one in the team's layer contracts:

1. *If* this mechanism mattered, *what should we see* in the data? These are the **expected observations**, one row each.
2. *What do we actually see?* That is the **observed** column, with numbers.
3. Does the observation match? That is the **status**.
4. Taking all rows together, how much do we trust the mechanism? That is the **confidence**.

A card never proves a cause. It says whether the observations are **consistent with** a mechanism, which observations **contradict** it, and which **alternative explanations** remain.

### Status of each expected observation
| Status | Meaning |
|---|---|
| ✅ consistent | The data show what the mechanism predicts, with a statistically clear result (usually p < 0.05) or a robust description |
| ❌ inconsistent | The data show the opposite, or clearly no effect where the mechanism needs one |
| ❔ unclear | Mixed or weak evidence, a result we cannot trust (e.g. a data artefact), or a test that cannot separate cause from effect |
| ⬜ not tested | No data yet |

### Confidence levels (draft, to be confirmed by you)
The levels were assigned with this rubric. Please confirm or change it.
| Level | Rule used |
|---|---|
| **medium** | Most expected observations consistent, none inconsistent, results robust to sensitivity tests and/or confirmed by a second independent dataset |
| **low-medium** | Several consistent observations, but at least one key test inconsistent or impossible (e.g. data artefact) |
| **low** | As many inconsistent/unclear rows as consistent ones, or the evidence is circular (the variable is partly built from rainfall) |
| **not assessed** | Most rows not tested |

"High" is not used anywhere: with 28 years of data, one reanalysis and no independent check of the atmospheric variables, nothing reaches it.

### Evidence IDs (E-xxx) and statuses
Every number in a card comes from one row of `docs/research/evidence_ledger.md` (E-001 … E-014). The ledger row gives the dataset, period, region, the exact output file, the limitations, and a status:
- **VERIFIED (computed):** the number was produced by our code and checked, but it describes data and is not yet confirmed by a second source.
- **VERIFIED (two products):** reproduced by an independent dataset (e.g. IMERG and CHIRPS).
- **TO-VERIFY:** computed, but with a known open issue (artefact risk, single source, circular test).

References (L-xx) are in `docs/research/literature.md`. **All are still TO-VERIFY (not yet read)**, so do not cite them before reading.

---

## 2. The setting behind every number

| Term | Meaning |
|---|---|
| **JJAS** | June–July–August–September, the Sahel rainy season. All seasonal values are JJAS unless stated otherwise |
| **Box** | 10–20°N, 18°W–20°E (provisional Sahel, decision D-003b) |
| **Sub-regions** | West 18°W–5°W, Central 5°W–10°E, East 10°E–20°E, all 10–20°N (provisional) |
| **Period** | 1998–2025 = **28 seasons** (n = 28). Every trend and correlation uses 28 values, one per year |
| **Area mean** | Average over all grid cells, weighted by cos(latitude) (true area). Extreme-rain indices are computed in each 0.1° cell first, then averaged |
| **Datasets** | IMERG V07 Final (NASA satellite rainfall, the trend dataset); CHIRPS v3 (independent gauge-blended rainfall, check only); MERRA-2 (NASA **reanalysis**: a weather model constrained by observations, not a direct measurement); EarthCARE (ESA–JAXA radar + lidar, 2024–2025 case studies only) |

---

## 3. Trend numbers

### Sen's slope (the size of a trend)
The median of the slopes between every pair of years. It is robust to one extreme year, unlike an ordinary regression line. It is given in the variable's units **per decade**:
- "+1.67 kg/m² per decade" = column water vapour rises by 1.67 kg/m² every 10 years. 1 kg/m² of water vapour = 1 mm of water if it all condensed.
- "−0.29 °C per decade" = the eastern rainy season got 0.29 °C cooler every 10 years.
- "+0.15 m/s per decade" = the southerly wind got 0.15 m/s stronger every 10 years.
- "+0.027 per decade" for soil wetness or evaporative fraction: these variables run from 0 to 1, so this is a change of 0.027 on that 0–1 scale.

### "% per decade" (the most common percentage in the cards)
**% per decade = 10 × Sen's slope ÷ the variable's 1998–2025 average × 100.**
It says how fast the variable changes **relative to its own normal level**. It is **not** a percentage of cells, years or probability.

Worked examples:
- Season total "+3.3 %/decade": the box average is ≈ 434 mm, so the slope is ≈ +14 mm per decade, or ≈ +9 % over the 28 years.
- East "+8.7 %/decade" on an average of ≈ 293 mm: ≈ +25 mm per decade.
- Longest dry spell "−9.6 %/decade" on an average of ≈ 28.6 days: ≈ −2.7 days per decade.
- Soil wetness east "+11 %/decade": +0.032 per decade on an average of 0.29.
- Water vapour "+4.1 %/decade": +1.67 kg/m² on an average of 40.7 kg/m².

**Caution:** in dry areas a small change in mm gives a large percentage (e.g. the north-east fringe +24 %/decade on very little rain). Always look at the absolute value too.

### p-value from the Mann–Kendall test (is the trend real?)
The Mann–Kendall test checks whether values tend to go up (or down) over time, using ranks only.
**p = the probability of seeing a trend at least this strong if there were in fact no trend.**
- p < 0.05: conventionally "significant". It would happen by chance less than 1 time in 20.
- p = 0.055 or 0.07: close but not significant. We write "tendency".
- p ≤ 0.004: very unlikely by chance.
- p is **not** the probability that the mechanism is true, and a non-significant result does not prove "no change".

We ran three versions (original, Hamed–Rao, Yue–Wang) because consecutive years can depend on each other. In our data they agree or the original is the most cautious. Significance in the cards comes from the original test unless stated.

### Robustness tests (wording such as "p ≤ 0.004 in every test")
A trend is only called robust if it survives all of these:
- **Leave-one-year-out:** recompute 28 times, each time dropping one year (no single year drives it).
- **Without 2024:** 2024 was the wettest season on record.
- **Border shifts:** the eastern border moved to 8, 9, 11 or 12°E.
- **Lake Chad masked:** satellite rain is unreliable over open water.
- **Independent dataset:** the same trend in CHIRPS.

---

## 4. Relationship numbers

### Spearman correlation ρ ("rho")
A measure from −1 to +1 of how two variables move together, based on ranks (robust to outliers).
- ρ = +0.74: in years when one is high, the other is usually high too.
- ρ = −0.65: when one is high, the other is usually low.
- Rough reading: |ρ| < 0.3 weak, 0.3–0.5 moderate, 0.5–0.7 strong, > 0.7 very strong. With 28 years, |ρ| ≳ 0.38 is needed for p < 0.05.

### "Detrended" correlation
Before correlating, the long-term linear trend is removed from both series. Two variables that both simply rise over time would otherwise look correlated even if unrelated. A detrended ρ answers: **in a wetter-than-usual year, is the other variable also higher than usual?** This is the year-to-year coupling that physical mechanisms predict.

### "One of many tests"
We computed dozens of correlations. At p < 0.05, about 1 in 20 tests will look significant by chance alone. A single significant result among many (e.g. the African Easterly Jet vs wettest day, p = 0.008) is flagged as a possible false positive until it is confirmed another way.

---

## 5. Anomalies and other scales

| Term | Meaning | Example |
|---|---|---|
| **σ (sigma) / z-score** | How far a year is from the 1998–2025 average, in standard deviations. About 95 % of years fall within ±2σ | 2024 water vapour "+2.7σ" is exceptionally high; 2025 dust "−4σ" is far outside the normal range (likely data artefact) |
| **% per K** | Percentage change of water vapour per 1 °C (= 1 K) of temperature, from a regression of log(vapour) on temperature | Physics predicts ≈ +7 %/K if warming drives moistening; we found −4.6 %/K, so wetter years are cooler |
| **Evaporative fraction (EF)** | LH / (LH + SH): the share of the surface's turbulent energy used to evaporate water (LH = latent heat) rather than to heat the air (SH = sensible heat). 0–1 | EF rising means a wetter, cooler-running surface |
| **Soil wetness** | MERRA-2 GWETTOP / GWETROOT: 0 = completely dry, 1 = saturated (topsoil / root zone) | Average 0.29–0.49 depending on sub-region |
| **mm/day of moisture convergence** | Water vapour brought into the region by the winds, per day, expressed as millimetres of water | +0.35 mm/day per decade |
| **Rx1day, R95p, SDII, CDD** | Standard ETCCDI rain indices: wettest single day (mm); rain falling on very wet days above each cell's 95th percentile (mm); average rain per wet day (mm/day); longest run of dry days < 1 mm (days) | |

---

## 6. EarthCARE percentages (cards M-03, M-04)

EarthCARE measures a vertical "curtain" along its ground track. A **profile** is one vertical column (about every 1 km along the track); the box contains ≈ 1,080 profiles per pass.
- **"% of profiles with rain / dust"** = share of those columns in which the radar–lidar classification finds rain (or dust) at any height. "Dust over 96 % of the box" means 96 % of the columns along the track contained dust somewhere below 8 km.
- **"Dust and rain in the same profile < 1 %"** = columns containing both. A low value means the dust sits **beside** the storms, not inside them (with the caveat that the lidar cannot see through thick storm cloud).
- **"Radar echo top 95th percentile = 16.9 km"** = among rainy columns, 95 % have their highest radar-detected cloud/precipitation below 16.9 km. It describes how tall the storms are while ignoring the few tallest outliers.
- **"Median dust height 3.0–3.5 km"**: half of the dust pixels lie below that height.
- **Updraft "up to 9 m/s"**: estimated vertical air speed from the radar Doppler after removing the particles' fall speed. Positive = rising air.
- These are **4 snapshots (2024–2025)**. They describe how storms work today, never a trend.

---

## 7. Common traps when reading the cards

1. **% per decade is relative to the variable's own average**, so dry places show big percentages for small changes.
2. **Significant ≠ important, and not significant ≠ no change.** Read the slope and its interval, not only p.
3. **Correlation ≠ cause.** Detrending removes shared trends but not common causes (both variables could respond to the same monsoon).
4. **Circular evidence:** MERRA-2 soil moisture is driven by observed rainfall, so soil/rain correlations are partly built in (card M-05).
5. **Reanalysis ≠ observation:** MERRA-2 trends can shift when the assimilated observations change (e.g. its 2025 dust value).
6. **The daily extreme-rain data change character at 2014** (satellite era change), so extreme-rain trends stay inconclusive (E-006).

## 8. What we need from you
For each card: confirm or edit the **status** of each row, the **confidence**, and the **interpretation** (all marked DRAFT) directly in `data/app/mechanisms.json`, then run `.venv/bin/python scripts/render_evidence_cards.py` to regenerate the cards. Please also confirm or change the confidence rubric in section 1.
