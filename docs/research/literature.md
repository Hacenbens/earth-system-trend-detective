# Literature shortlist

Status: `TO-VERIFY` (recalled, not yet opened) → `READ` (key finding noted below).
Do not cite anything that is not `READ`.

| ID | Reference | Why it matters | Status |
|---|---|---|---|
| L-01 | Nicholson (2013), "The West African Sahel: a review of recent studies on the rainfall regime and its interannual variability", ISRN Meteorology | Background on Sahel drought and recovery | TO-VERIFY |
| L-02 | Biasutti (2019), "Rainfall trends in the African Sahel: characteristics, processes, and causes", WIREs Climate Change | Review of trends and mechanisms (greenhouse gases, aerosols, SST) | TO-VERIFY |
| L-03 | Taylor et al. (2017), "Frequency of extreme Sahelian storms tripled since 1982", Nature | Extremes and MCS intensification; benchmark for our result | TO-VERIFY |
| L-04 | Huffman et al., GPM IMERG ATBD / technical documentation (V07) | Dataset validity and known biases | TO-VERIFY |
| L-05 | Gelaro et al. (2017), "The Modern-Era Retrospective Analysis for Research and Applications, Version 2 (MERRA-2)", J. Climate | Reanalysis description and limitations | TO-VERIFY |
| L-06 | Wehr et al. (2023), "The EarthCARE mission – science and system overview", AMT | EarthCARE instruments and products | TO-VERIFY |
| L-07 | Hamed & Rao (1998), modified Mann-Kendall test for autocorrelated data | Statistical method | TO-VERIFY |
| L-08 | Acker, McMahon, Shen, Hearty & Casey (2009), "Time-series analysis of remotely-sensed SeaWiFS chlorophyll in river-influenced coastal regions", *EARSeL eProceedings* 8(2):114–139. [Challenge resource] | Organisers' worked example of a time series + significance test with NASA data: our method template | TO-VERIFY (read first) |
| L-09 | "Statistical test methods to detect trends in time series data" [Challenge resource]. No exact-title match found online, so the URL must be copied from the challenge page. Related candidates: Ali & Abdul Ghani (2024), "A Comparison of the Rank-based and Slope-based Nonparametric Tests for Trend Detection in Climate Time Series", AMCI 13(1):36–51, https://ejournal.unimap.edu.my/index.php/amci/article/view/245 ; funtimes vignette "Tests for trends in time series", https://cran.csiro.au/web/packages/funtimes/vignettes/trendtests.html | Trend-test methodology | URL NOT CONFIRMED |
| L-10 | Statsig, "A Comprehensive Guide to Statistical Significance" (exact title match, very likely the challenge link): https://statsig.com/perspectives/a-comprehensive-guide-to-statistical-significance | Significance explanations for users | URL FOUND, confirm against challenge page |

## Added 2026-11-14 from teammate contributions (`docs/team/contribution/`)

All rows below are `TO-VERIFY`: the details were copied from teammate lists (several of them AI-assisted) and nobody has opened the papers yet. Sources: [T10] = `sahel_weather_climate_top_10_2023_2026.md`, [SRR] = `sahel_research_references.md`, [DOCX] = `EarthSignal_Sahel_Precipitation_Vegetation_Research_Resources.docx`, [R23] = `research_references_2023_2026.md` (no DOIs).

### Layer 1: rainfall trends and extremes (benchmarks)
| ID | Reference | Why it matters | Status |
|---|---|---|---|
| L-11 | Spät, Biasutti & Voigt (2025), "Extreme Sahelian Rainfall Continues to Rise Despite Stable Storm Frequency", GRL 52(16), e2025GL115942. https://doi.org/10.1029/2025GL115942 [T10, SRR, DOCX, R23] | **Main benchmark**: extremes rising while storm frequency is flat; moisture link. Our Rx1day/R95p result should be compared with it | TO-VERIFY (read first) |
| L-12 | Wane, Giannini, Kaplan & Gaye (2025), "An Imminent Return to Drought in the Western Sahel?", Science Advances. https://doi.org/10.1126/sciadv.adu5415 [SRR] | West vs. central/east contrast. Justifies sub-region comparison (D-003b); context for the 2026 dry signal (E-004) | TO-VERIFY |
| L-13 | Chagnaud, Panthou, Vischel & Lebel (2023), "Capturing and Attributing the Rainfall Regime Intensification in the West African Sahel with CMIP6 Models", J. Climate 36(6), 1823–1843. https://doi.org/10.1175/JCLI-D-22-0412.1 [T10] | Attribution context for intensification (wet days, daily extremes) | TO-VERIFY |
| L-14 | Peyrillé, Roehrig & Sanogo (2023), "Tropical Waves Are Key Drivers of Extreme Precipitation Events in the Central Sahel", GRL 50, e2023GL103715. https://doi.org/10.1029/2023GL103715 [T10] | Dynamics behind individual extremes (Layer 3 alternative explanation) | TO-VERIFY |
| L-15 | Rauch, Bliefernicht, Maranan, Fink & Kunstmann (2025), "Interannual Rainfall Variability in West Africa: Reconstruction Based on Atmospheric Circulation Patterns", Int. J. Climatol. https://doi.org/10.1002/joc.70088 [SRR] | Interannual variability vs. trend | TO-VERIFY |
| L-16 | Sanogo, Maranan, Fink, Woodhams & Knippertz (2025/2026), "Dynamics and Model Representation of Two Contrasting Extreme Precipitation Events in the Sahel", QJRMS 152(776), e70084. https://doi.org/10.1002/qj.70084 [T10] | Case-study design for extremes | TO-VERIFY |

### Layers 2–3: physical mechanisms (moisture, convection, aerosol, land)
| ID | Reference | Why it matters | Status |
|---|---|---|---|
| L-17 | Adigun, Arowolo & Balogun (2024), "Investigating the influence of vertical moisture integrated flux convergence on rainfall recovery in the Sahel region of West Africa", Environ. Syst. Res. 13, 60. https://doi.org/10.1186/s40068-024-00375-2 [SRR, DOCX, R23] | Evidence card 1 (moisture) | TO-VERIFY |
| L-18 | Nkrumah, Klein et al. (2023), "Classification of Large-Scale Environments That Drive the Formation of Mesoscale Convective Systems Over Southern West Africa", Weather Clim. Dynam. 4, 773–788. https://doi.org/10.5194/wcd-4-773-2023 [T10, R23] | Evidence card 2 (convection: shear, moisture) | TO-VERIFY |
| L-19 | Taylor, Klein & Harris (2024), "Multiday Soil Moisture Persistence and Atmospheric Predictability Resulting From Sahelian Mesoscale Convective Systems", GRL 51, e2024GL109709. https://doi.org/10.1029/2024GL109709 [T10] | Land–atmosphere feedback; links rain to NDVI add-on | TO-VERIFY |
| L-20 | Barton, Klein, Taylor et al. (2025), "Soil Moisture Gradients Strengthen Mesoscale Convective Systems by Increasing Wind Shear", Nature Geoscience. https://doi.org/10.1038/s41561-025-01666-8 [SRR] | Evidence card 2 (convection) | TO-VERIFY |
| L-21 | Taylor, Klein, Barton et al. (2026), "Wind Shear Enhances Soil Moisture Influence on Rapid Thunderstorm Growth", Nature. https://doi.org/10.1038/s41586-025-10045-7 [SRR] | Evidence card 2 (convection) | TO-VERIFY |
| L-22 | Guo, Xie et al. (2024), "Increased Asian Sulfate Aerosol Emissions Remarkably Enhance Sahel Summer Precipitation", Earth's Future 12(11), e2024EF004745. https://doi.org/10.1029/2024EF004745 [T10, SRR] | Evidence card 3 (aerosol); uses MERRA-2 AOD like us | TO-VERIFY |
| L-23 | Thiam et al. (2024), "Impact of the Sea Surface Temperature in the North-Eastern Tropical Atlantic on Precipitation Over Senegal", JGR Atmospheres 129, e2023JD040513. https://doi.org/10.1029/2023JD040513 [T10] | Alternative explanation (SST) for west-Sahel variability | TO-VERIFY |
| L-24 | Monerie, Mohino et al. (2025), "Exploring Uncertainty in Dynamical Future Changes in Sahel Precipitation: The Extratropical Influence", Clim. Dyn. 63, 353. https://doi.org/10.1007/s00382-025-07835-0 [T10] | Dynamic vs. thermodynamic decomposition (Layer 3) | TO-VERIFY |
| L-25 | Maybee et al. (2025), "How Sensitive Are Sahelian Mesoscale Convective Systems to Cold-Pool Suppression?", QJRMS. https://doi.org/10.1002/qj.5032 [SRR] | MCS process background | TO-VERIFY |

### Data quality and product choice
| ID | Reference | Why it matters | Status |
|---|---|---|---|
| L-26 | Muhammad, Wu, Gebresellase, Ibrahim & Badji (2026), "Multi-Criteria Framework for Evaluating Gridded Precipitation Climate Products in the Sahel Region", J. Hydrol. Reg. Stud. 64, 103240. https://doi.org/10.1016/j.ejrh.2026.103240 [T10] | Justifies IMERG + CHIRPS choice (D-013) | TO-VERIFY |
| L-27 | "Evaluation of IMERG climate trends over land in the TRMM and GPM eras" (2024). Authors/DOI to find. [R23] | **Directly supports our 2014 TRMM→GPM break test** (D-006) | TO-VERIFY (find citation) |
| L-28 | "Comparison of GPM IMERG Version 06 Final Run Products and Its Latest Version 07…" (2023). Authors/DOI to find. [R23] | V07 vs V06 differences | TO-VERIFY (find citation) |
| L-29 | "Evaluation of Gridded Rainfall Products in Three West African Basins" (2024). Authors/DOI to find. [R23] | West African product validation | TO-VERIFY (find citation) |
| L-30 | Kumah & Sutton (2026), "Evaluating the Performance of GPM IMERG Products for Precipitation Estimation in the Volta River Basin of Ghana", J. Hydrometeorol. https://doi.org/10.1175/JHM-D-25-0104.1 [DOCX] | IMERG in West Africa (not Sahel) | TO-VERIFY |
| L-31 | "GPCP Version 3.3: A Refined Global View of Precipitation from Satellite and Gauge Observations" (2026). Authors/DOI to find. [R23] | GPCP V3.3 cross-check (D-006) | TO-VERIFY (find citation) |

### Statistics
| ID | Reference | Why it matters | Status |
|---|---|---|---|
| L-32 | Sheoran, Dumka, Tiwari & Hooda (2024), "An Improved Version of the Prewhitening Method for Trend Analysis in the Autocorrelated Time Series", Atmosphere 15, 1159. https://doi.org/10.3390/atmos15101159 [SRR] | Autocorrelation handling (D-007) | TO-VERIFY |
| L-33 | Gamot, Thibeau-Sutre & Van Dooren (2026), "On the Gaussian Distribution of the Mann-Kendall Tau in the Case of Autocorrelated Data", PLOS ONE. https://doi.org/10.1371/journal.pone.0333224 [SRR] | MK significance under autocorrelation | TO-VERIFY |
| L-34 | Then & Abdul Halim (2025/2026), "Modified Mann-Kendall with Higher-Order Statistics for Trend Analysis", Sci. Rep. https://doi.org/10.1038/s41598-025-30034-0 [SRR] | MK variant | TO-VERIFY |
| L-35 | Yaméogo (2025), "Annual rainfall trends in the Burkina Faso Sahel: a comparative analysis between Mann–Kendall and innovative trend method (ITM)", Discover Applied Sciences 7, 221. https://doi.org/10.1007/s42452-025-06675-1 [DOCX] | Worked Sahel MK example (CHIRPS) | TO-VERIFY |

### NDVI add-on (D-011)
| ID | Reference | Why it matters | Status |
|---|---|---|---|
| L-36 | Gaye (2026), "Rainfall variability, vegetation dynamics, and the rainfall-NDVI relationship in the Sahel (1990–2022)…", Environ. Res. Commun. 8, 061009. https://doi.org/10.1088/2515-7620/ae7ceb [DOCX, SRR] | Template for the rainfall–NDVI association | TO-VERIFY |
| L-37 | Souleymane, Aboubacar, Garba, Badamassi & Nguyen (2026), "Interannual MODIS NDVI Dynamics of the Grazing Areas Under Variable Precipitation in Northern Sahel", Afr. J. Ecol. 64, e70191. https://doi.org/10.1111/aje.70191 [DOCX] | MODIS NDVI + MK workflow | TO-VERIFY |
| L-38 | Yamashita, Uda & Yoshimura (2026), "Quantifying Vegetation Responses to Rainfall Extremes in Sub-Saharan Africa Using CHIRPS Precipitation and MODIS NDVI", Remote Sensing 18(5), 768. https://doi.org/10.3390/rs18050768 [DOCX] | Extremes (not only totals) vs. vegetation | TO-VERIFY |
| L-39 | Lu, Zhang, Abel, Horion, Brandt, Huang & Fensholt (2024), "Changes in vegetation-water response in the Sahel-Sudan during recent decades", J. Hydrol. Reg. Stud. 52, 101672. https://doi.org/10.1016/j.ejrh.2024.101672 [DOCX] | Why rain alone may not explain NDVI | TO-VERIFY |

Not carried over: the EarthCARE product papers in `africa_climate_research_references.md` overlap with L-06 and will be added when Layer 2 starts. Off-region validation studies (Iran, Nepal, China, Ethiopia) were also left out. Lower-priority items stay in the teammate files.
