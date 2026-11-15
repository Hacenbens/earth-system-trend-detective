# Slide content draft (≤ 7 slides)

Draft for the design lead (task T-29). Written with AI assistance (Claude Code): the team reviews and owns the final wording (logged in `si_usage.md`).
Rules (`docs/challenge/CHALLENGE_SUMMARY.md`): **≤ 7 slides including title and intro**, or a ≤ 30 s video; public link, no login. Judges look for **one strong story and one hero chart**.

**The story in one sentence:** *Since 1998 the eastern Sahel (Niger–Chad) has had wetter, more regular rainy seasons, and NASA data show why: the monsoon brings in more Atlantic moisture. It is not local warming, wind shear or dust.*

Every number below comes from the evidence ledger (E-xxx). **Do not round them up or drop the caveats**: they are part of the *Validity* score.

---

## Slide 1 · Title
**Headline:** Earth System Trend Detective
**Sub-headline:** Is the Sahel getting wetter? Where, and why?
**Visual:** a full-width background, ideally the 2024 wet-season anomaly map or the EOF2 east–west see-saw map (`outputs/figures/eof_rainfall.png`, middle-left panel), with no axes.
**On slide:** team name · NASA Space Apps 2026 · "Earth Science Data Trend Detective" · data logos as **text only** (NASA GPM IMERG · NASA MERRA-2 · ESA–JAXA EarthCARE · CHIRPS). No NASA logo or flags (SI policy).
**Speaker notes (10 s):** "We built a tool that detects environmental trends in NASA data and then asks *why*. We tested it on one of the most climate-sensitive places on Earth: the Sahel."

---

## Slide 2 · Why it matters (intro)
**Headline:** In the Sahel, the rainy season decides the year
**Visual:** a simple map of the study box (10–20°N, 18°W–20°E), from Senegal to Chad, with the west / centre / east strips; one photo-style icon set (farming, livestock, water) drawn by the team (no AI images, or watermark them).
**On slide (≤ 25 words):** Almost all rain falls June–September. Farming, herding and water supply depend on it. After the 1970s–80s droughts, is rainfall recovering, and is it becoming more regular?
**Speaker notes (35 s):** The Sahel lives on four months of rain. Rain-fed agriculture and pastoralism depend on both *how much* rain falls and *how evenly*: one long dry spell in August can ruin a harvest. Scientists report a partial recovery since the great droughts (literature, to verify before citing). We asked a precise question: over the satellite era, 1998–2025, what changed, where, and why?
**Do not say:** a population number. E-003 (population) is still TO-VERIFY.

---

## Slide 3 · Our solution
**Headline:** From "is it changing?" to "why?" in one workflow
**Visual:** the five-layer workflow as a horizontal strip: **Detect → Investigate → Explain → Project → Solve**. Under it, a **screenshot of the app** (region picker + trend result). *Placeholder until the app exists (T-25/T-26).*
**On slide:** Pick a variable, region and period → time series + trend test (Mann–Kendall, Sen's slope) → atmospheric evidence → mechanism cards with confidence levels. Validated against NASA Giovanni and an independent rainfall dataset.
**Speaker notes (40 s):** Any user can pick a variable, a region and a period; the tool builds the time series and tests whether the trend is real. What makes it different is what comes next. It pulls in independent atmospheric data, tests candidate physical mechanisms, and writes an evidence card for each one, with what supports it, what contradicts it, and a confidence level. Before trusting any number, we checked that our pipeline reproduces NASA's own Giovanni tool exactly, and agrees with an independent rain-gauge-based product (year-to-year correlation 0.95).
**Sources:** validation checks (E-005; evidence page); app (T-25).

---

## Slide 4 · Discovery (HERO CHART)
**Headline:** The eastern Sahel got wetter, and its rainy season more regular
**Visual (hero):** a three-bar chart, one bar per sub-region, of the season-total trend (% per decade) with IMERG and CHIRPS side by side, plus a small inset of the **EOF2 east–west see-saw map**. Data: `outputs/chirps_subregion_check.csv`, `outputs/eof_summary.csv`. Alternative hero: `outputs/figures/eof_rainfall.png` (mode 2).
| Sub-region | IMERG (NASA) | CHIRPS (independent) |
|---|---|---|
| West | +1.9 %/decade (p = 0.37) | +1.4 % (p = 0.51) |
| Central | +1.2 % (p = 0.42) | +3.8 % (p = 0.16) |
| **East** | **+8.7 % (p = 0.055)** | **+7.9 % (p = 0.026)** |
**On slide:** East: rainfall ≈ +8 %/decade in two independent datasets · longest dry spell −10 %/decade (p ≤ 0.004 in every robustness test) · west and centre: no clear change.
**Speaker notes (50 s):** Averaged over the whole Sahel, rainfall shows only a weak upward tendency. That alone would be a dead end. The regional view is what matters: the east, Niger and Chad, is getting wetter by about 8 percent per decade, in NASA's satellite record and in an independent gauge-based dataset. Even more robust, the longest dry spell inside the rainy season is shortening by about 10 percent per decade, whichever year we remove and wherever we draw the border. A spatial PCA with no borders at all finds the same east–west see-saw shifting toward the east (p = 0.014).
**Must say:** "tendency" for the Sahel-wide total (p = 0.15); the east is partly driven by the exceptional 2024 season (without 2024: +7.0 %, p = 0.067 in CHIRPS).
**Sources:** E-005, E-007, E-015.

---

## Slide 5 · Why: the atmosphere
**Headline:** More Atlantic moisture, not local warming, wind shear or dust
**Visual:** `outputs/figures/composites_wet_dry.png`, the **water-vapour panel with moisture-transport arrows** (wet minus dry seasons), plus a 5-row "mechanism scoreboard":
| Mechanism | Verdict |
|---|---|
| Monsoon moisture supply | **Best supported** (7 consistent, 0 against) |
| Organized storms | Present (EarthCARE), intensity trend unresolved |
| Local warming | Not supported: no rainy-season warming |
| Wind shear | Not supported: no shear trend |
| Dust | Not supported: no link with rainfall |
**On slide:** Water vapour explains ~50 % of year-to-year rainfall (tested on unseen years). Moisture rose +4 %/decade; the eastern surface cooled.
**Speaker notes (50 s):** For each candidate cause we wrote down what it predicts and checked it in NASA's MERRA-2 reanalysis. One mechanism passes every test: the monsoon. Wet seasons bring stronger westerly inflow of Atlantic moisture along the southern Sahel, more convergence and more rising air. Moisture alone explains half of the year-to-year rainfall, even on years the model has never seen. Over 1998–2025 water vapour rose about 4 percent per decade. The alternatives fail: the rainy season did not warm (the east even cooled, because wetter land evaporates more), wind shear did not increase, and dust shows no link with rainfall.
**Must say:** these are associations from a reanalysis, not proof of cause.
**Sources:** E-008, E-009, E-010, E-013, E-016, E-017, E-018; cards M-01 to M-05.

---

## Slide 6 · Inside the storms
**Headline:** Looking inside Sahel storms from space
**Visual:** `outputs/earthcare/cross_section_2024-09-02_1495A.png` (eastern storm, 2 Sep 2024), the top classification panel, cropped, with three labels: *heavy-rain core* · *anvil to 16 km* · *Saharan dust layer beside the storm*.
**On slide:** ESA–JAXA EarthCARE radar + lidar · storm tops 16–18 km (tropopause) · updrafts up to 6–9 m/s · dust layer at 1–6 km sits *beside* the storms, not in them.
**Speaker notes (40 s):** Trends tell us *what* changed; EarthCARE shows *how* the rain is made today. Its radar and lidar slice through the atmosphere: a deep storm reaching the tropopause, heavy rain below the melting level at 4.7 km, strong updrafts, and the Saharan dust layer between 1 and 6 km lying next to the storm, not inside it. That is consistent with what the 28-year data say: dust is not what makes seasons wet or dry. EarthCARE started in 2024, so we use it to illustrate processes, never as a trend.
**Sources:** E-012. Note: EarthCARE is ESA–JAXA, not NASA.

---

## Slide 7 · Impact and transparency
**Headline:** What this means, and how far you can trust it
**Visual:** two columns.
- **Left, "What it means":** East: more regular seasons favour rain-fed farming, but year-to-year swings remain large (2024 wettest in 29 years, +20 %; 2026 dry, −10 %). West: no recovery, consistent with literature warning of western drying (to verify before citing). The tool lets anyone repeat this for any region and variable.
- **Right, "Transparency":** every claim is in a public evidence ledger · validated against Giovanni and CHIRPS · known limits: 28 years, a reanalysis, and daily extremes affected by the 2014 satellite change · AI use logged.
**Footer:** public project link (repo / app) · data: NASA GPM IMERG V07, NASA MERRA-2, ESA–JAXA EarthCARE, CHC CHIRPS v3.
**Speaker notes (35 s):** The eastern Sahel's rainy season has become wetter and more regular, a hopeful signal for farmers in Niger and Chad. But the west is not recovering, and single years still swing hard: 2024 was the wettest season in our record and 2026 was dry. We are explicit about our limits: twenty-eight years is short, the atmospheric data come from a reanalysis, and the heaviest-rain records changed with the 2014 satellite upgrade, so we make no claim about extremes. Everything is open: the code, the data checks, and an evidence ledger behind every number.
**Sources:** E-004, E-007; limitations from E-005, E-006, E-008.

---

## 30-second video alternative (if the team chooses video)
| Time | Image | Voice-over |
|---|---|---|
| 0–5 s | Sahel map, rainy-season animation | "In the Sahel, four months of rain decide the year." |
| 5–12 s | Sub-region trend bars + EOF see-saw | "With NASA data, our tool shows the eastern Sahel got wetter and its dry spells shorter since 1998, confirmed by two independent datasets." |
| 12–20 s | Moisture-transport map | "The reason: more Atlantic moisture carried in by the monsoon, not local warming, not dust." |
| 20–26 s | EarthCARE storm cross-section | "And EarthCARE lets us look inside the storms that deliver it." |
| 26–30 s | App screenshot + link | "Earth System Trend Detective: detect the trend, then find out why." |

## Before publishing: checklist
- [ ] App screenshot for slide 3 (needs T-25/T-26)
- [ ] Final numbers re-checked against the ledger on the day (E-IDs above)
- [ ] Literature claims (recovery since the 1980s, western drying) only if the paper has been read (status READ in `literature.md`)
- [ ] No population figure unless E-003 is verified
- [ ] AI-assisted figures carry a visible note ("analysis code drafted with AI assistance"); no AI-generated imagery, or watermark it
- [ ] No NASA logos or flags; mission names as text
- [ ] Public link works without login (repo public, app deployed)
