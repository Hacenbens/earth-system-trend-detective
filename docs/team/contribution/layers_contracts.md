# **1\. Global inputs — before the five layers**

These are the settings the researcher provides to start an investigation.

**A. Investigation configuration**

| Input field | Type | Example |
| ----- | ----- | ----- |
| Investigation name | Text | Sahel Rainfall Study |
| Study region | Geographic selection | African Sahel |
| Subregion | Dropdown / map selection | Western Sahel |
| Latitude bounds | Numeric range | 10°N–20°N (provisional study box) |
| Longitude bounds | Numeric range | 18°W–20°E (provisional study box) |
| Start year | Year | 2001 |
| End year | Year | 2025 |
| Main variable | Dropdown | Precipitation |
| Analysis season | Month selection | June–September |

**B. Dataset selection**

| Dataset | Role in the application |
| ----- | ----- |
| GPM IMERG Final V07 | Precipitation amount and extremes |
| MERRA-2 | Humidity, temperature, winds, vertical motion and aerosols |
| MODIS | Aerosol/cloud products and vegetation NDVI |
| EarthCARE CPR / ATLID | Contemporary radar and lidar vertical structure |

GPM is the core trend dataset. EarthCARE is an extension for contemporary process investigation, not a historical 2001–2025 trend source. EarthCARE is an ESA/JAXA mission.

**C. Data preparation output**

The backend creates a prepared dataset containing:

* Selected region and spatial coordinates.  
* Selected period and actual available dates.  
* Variable names and units.  
* Time resolution.  
* Missing-value information.  
* Quality-control status.  
* Dataset name, version and source.  
* Spatial coverage and common period with other datasets.

**This prepared dataset is the input to Layer 1\.** Supporting datasets are also made available to Layer 2, with their own time coverage and quality information.

# **2\. Layer 01 — DETECT**

What is changing?

**Purpose:** Detect changes in rainfall amount and intensity over time.

## **User inputs**

| Input field | UI component | Example |
| ----- | ----- | ----- |
| Region | Map / dropdown | Western Sahel |
| Dataset | Dropdown | GPM IMERG Final V07 |
| Variable | Dropdown | Precipitation |
| Start date | Date/year selector | 2001 |
| End date | Date/year selector | 2025 |
| Temporal resolution | Dropdown | Monthly / seasonal |
| Season | Month selector | June–September |
| Trend method | Dropdown | Mann–Kendall |
| Slope method | Dropdown | Sen's slope |
| Extreme analysis | Toggle | Enabled / disabled |
| Comparison regions | Multi-select | Western, Central, Eastern Sahel |

## **Dataset inputs**

The backend receives actual precipitation observations:

| Field | Data type | Example |
| ----- | ----- | ----- |
| Date/time | DateTime | 2001-06-01 |
| Latitude | Float | 15.5 |
| Longitude | Float | \-5.2 |
| Precipitation | Float | Measured value |
| Unit | String | Product-specific unit |
| Quality flag | Integer / categorical | Product-specific flag |

These are conceptual fields: the application must map the actual file variables and metadata to them.

## **Processing**

1. Extract the selected region.  
2. Apply quality checks.  
3. Aggregate daily data into monthly or seasonal values as appropriate.  
4. Calculate rainfall totals and selected intensity indices.  
5. Build the time series.  
6. Run Mann–Kendall trend testing.  
7. Calculate Sen's slope.  
8. Inspect autocorrelation and report the method used to handle it.

Extreme indices such as Rx1day, R95p, SDII and CDD require daily precipitation data. They should not be calculated from monthly data. 

nasa(4).pdf  
nasa(4).pdf

## **Exact outputs**

**Output 1 — Trend result**

| Output field | Type |
| ----- | ----- |
| Trend direction | Increasing / decreasing / no significant trend |
| Sen's slope | Numeric |
| Slope unit | String |
| Mann–Kendall statistic | Numeric |
| p-value | Numeric |
| Significance status | Boolean / categorical |
| Uncertainty interval | Numeric range, if calculated |
| Sample count | Integer |

**Output 2 — Time-series data**

| Field | Type |
| ----- | ----- |
| Date | Date |
| Rainfall value | Float |
| Anomaly | Float, if calculated |
| Missing-data indicator | Boolean |

**Output 3 — Extreme indices**

* Rx1day: maximum one-day rainfall.  
* R95p: accumulated rainfall on very wet days.  
* SDII: mean rainfall on wet days.  
* CDD: maximum consecutive dry days.

**What the application displays**

* Rainfall time-series line chart.  
* Trend line.  
* Trend statistics panel.  
* Regional trend map.  
* Extreme precipitation indicators, when daily data are available.  
* Data quality and uncertainty information.

## **Handoff to Layer 2**

Layer 1 passes this structured result:

**Layer 1 → Layer 2**

* Selected region and coordinates.  
* Detected trend direction and magnitude.  
* Analysis period and season.  
* Rainfall anomalies and unusual periods.  
* Selected rainfall metrics.  
* Statistical significance and uncertainty.

**Why?** Layer 2 needs to know which environmental patterns, locations and periods to investigate using independent supporting datasets.

# **3\. Layer 02 — INVESTIGATE**

What else is changing?

**Purpose:** Investigate whether other environmental observations show patterns related to the detected rainfall changes.

## **User inputs**

| Input field | UI component | Example |
| ----- | ----- | ----- |
| Investigation area | Inherited from Layer 1 / editable map | Western Sahel |
| Reference rainfall result | Selected Layer 1 result | Detected rainfall trend |
| Supporting dataset | Multi-select | MERRA-2, MODIS, EarthCARE |
| Evidence category | Multi-select | Moisture, circulation, dust, storm structure, vegetation |
| Supporting variable | Dropdown | Specific humidity |
| Analysis period | Date range | Common available period |
| Comparison mode | Dropdown | Time-series / spatial / seasonal |
| Lag period | Numeric selection | 0–3 months, if testing lagged association |

The user should not have to enter the same region and period again. These should be inherited from Layer 1 and editable when necessary.

## **Dataset inputs**

The application loads the actual observations for the selected supporting variables.

| Dataset | Exact variable types to support | Data type |
| ----- | ----- | ----- |
| MERRA-2 | Specific humidity, total-column water vapour, temperature, low-level winds, vertical motion, moisture convergence where available | Numeric gridded data |
| MODIS | NDVI, aerosol optical depth, cloud properties where available | Numeric gridded / product data |
| EarthCARE CPR | Radar reflectivity, cloud vertical structure, precipitation-related echoes, Doppler velocity where available | Vertical profile / observation data |
| EarthCARE ATLID | Aerosol extinction, backscatter and vertical distribution | Vertical profile / observation data |

Note: these are candidate variable types from the scientific blueprint. Exact variable names, units, file availability and product-specific quality flags need verification. 

nasa(4).pdf  
nasa(4).pdf

## **Processing**

1. Load the selected supporting observations.  
2. Check their quality and available time coverage.  
3. Extract the selected study region.  
4. Calculate monthly or seasonal values where appropriate.  
5. Calculate anomalies where a suitable climatological baseline exists.  
6. Compare supporting observations with rainfall trends and anomalies.  
7. Identify associations and differences.  
8. Record which datasets overlap in time and which do not.

## **Exact outputs**

**Output 1 — Supporting variable records**

| Field | Type |
| ----- | ----- |
| Variable name | String |
| Dataset | String |
| Date | Date |
| Region | String / geographic ID |
| Observed value | Float |
| Unit | String |
| Anomaly | Float, if calculated |
| Quality status | Categorical |

**Output 2 — Evidence comparison**

| Field | Type |
| ----- | ----- |
| Rainfall metric | String |
| Supporting variable | String |
| Comparison period | Date range |
| Relationship | Numeric / categorical |
| Statistical result | Numeric, if tested |
| Data overlap | Date range |
| Evidence status | Supporting / contrasting / unclear |

**Output 3 — Process evidence**

* Atmospheric moisture time series.  
* Wind and circulation maps.  
* Dust / aerosol maps and profiles.  
* Cloud and radar profile visualizations.  
* Vegetation anomaly maps.  
* Rainfall versus supporting-variable comparisons.

**What the application displays**

* Environmental variable selector.  
* Supporting time-series charts.  
* Side-by-side rainfall and atmospheric charts.  
* Geographic maps.  
* Vertical profile visualizations for suitable EarthCARE observations.  
* Evidence comparison table.

## **Handoff to Layer 3**

**Layer 2 → Layer 3**

Layer 2 passes:

* Supporting observations.  
* Related or contrasting patterns.  
* Rainfall-variable comparisons.  
* Statistical associations, if tested.  
* Temporal and geographic coverage.  
* Quality and data limitations.

**Why?** Layer 3 needs these observations to evaluate whether proposed physical mechanisms are consistent with the actual evidence.

# **4\. Layer 03 — EXPLAIN**

What could explain the observations?

**Purpose:** Help researchers evaluate candidate physical mechanisms, rather than automatically declaring a cause.

## **User inputs**

| Input field | UI component | Example |
| ----- | ----- | ----- |
| Investigation | Select previous investigation | Sahel rainfall study |
| Detected trend | Inherited result | Decreasing rainfall |
| Supporting evidence | Multi-select | Moisture, winds, vegetation |
| Candidate mechanism | Multi-select | West African Monsoon / ITCZ |
| Alternative mechanism | Multi-select / text | Other circulation changes |
| Researcher notes | Text area | Interpretation or comments |
| Evidence assessment | Select | Supports / contradicts / unclear |
| Confidence | Select | Low / medium / high |

Candidate mechanisms to make available:

* West African Monsoon and ITCZ.  
* Atmospheric moisture availability.  
* Organized convection.  
* Dust and aerosol interactions.  
* Soil moisture and surface energy balance.

The application can suggest relevant mechanisms based on the selected variables, but the researcher must be able to review and edit the interpretation.

## **Dataset and scientific inputs**

This layer does not need to download another independent primary dataset by default.

It receives:

1. Layer 1 trend results.  
2. Layer 2 supporting evidence.  
3. Scientific mechanism descriptions and expected observations.  
4. Researcher interpretation and assessment.

## **Processing**

1. Select a candidate mechanism.  
2. Define the observations expected if the mechanism is relevant.  
3. Match expected observations with Layer 2 evidence.  
4. Identify supporting evidence.  
5. Identify contradictory evidence.  
6. Record alternative explanations.  
7. Record methodological limitations.  
8. Assign an evidence-based confidence assessment.

## **Exact outputs**

**Output — Evidence Ledger**

Each mechanism should generate one structured record:

| Field | Type |
| ----- | ----- |
| Mechanism ID | Unique ID |
| Mechanism name | String |
| Scientific description | Text |
| Expected observations | List of strings |
| Supporting evidence IDs | List of IDs |
| Contradictory evidence IDs | List of IDs |
| Alternative explanations | List of strings |
| Researcher interpretation | Text |
| Confidence | Low / medium / high |
| Limitations | List of strings |
| References | List of source references |

**What the application displays**

* Mechanism cards.  
* Expected versus observed evidence.  
* Supporting / contradictory evidence panels.  
* Alternative explanation list.  
* Confidence indicator.  
* Evidence ledger report.

## **Handoff to Layer 4**

**Layer 3 → Layer 4**

Layer 3 passes:

* Confirmed historical trend results (from Layer 1).  
* Selected environmental indicators.  
* Candidate physical mechanisms.  
* Evidence assessment.  
* Relevant impact pathways.  
* Uncertainty and limitations.

**Why?** Layer 4 needs to know which observed variables and potential impact pathways are worth exploring under future scenarios.

Important: the actual numerical trend and baseline values come from Layer 1\. Layer 3 provides interpretation, not replacement numerical data.

# **5\. Layer 04 — PROJECT**

What could happen next?

**Purpose:** Allow researchers to explore possible future environmental conditions under different assumptions.

This is a scenario simulator, not a climate forecasting engine.

## **User inputs**

| Input field | UI component | Example |
| ----- | ----- | ----- |
| Investigation | Select previous investigation | Sahel rainfall study |
| Variable to project | Dropdown | Seasonal rainfall |
| Baseline period | Date range | 2001–2025 |
| Baseline value | Numeric / calculated | Derived from historical observations |
| Historical trend | Numeric / inherited | Sen's slope from Layer 1 |
| Projection start year | Year selector | 2025 |
| Projection end year | Year selector | 2035 |
| Scenario | Radio selection | Stabilization |
| Additional stress | Numeric input | User-defined perturbation |
| Scenario assumptions | Text area | Historical trend continues |

## **Scenario choices**

**1\. Stabilization**

Scenario type

Assume no additional trend after the selected baseline.

\\\[ X(t)=X\_0 \\\]

**2\. Trend continuation**

Scenario type

Assume the historical trend continues.

\\\[ X(t)=X\_0+\\beta(t-t\_0) \\\]

**3\. Increased stress**

Scenario type

Apply an additional user-defined adverse perturbation for sensitivity analysis.

\\\[ X(t)=X\_0+\\beta(t-t\_0)+\\delta(t) \\\]

Here, δ(t) represents the explicitly defined stress perturbation.

The equation is a simple trend-continuation model. \\(X\_0\\) is the baseline value, \\(\\beta\\) the historical trend, and \\(t\_0\\)the baseline year. 

nasa(4).pdf

## **Processing**

1. Retrieve historical values and trend statistics from Layer 1\.  
2. Define the baseline.  
3. Retrieve the selected scenario assumptions.  
4. Calculate the scenario values for each future time step.  
5. Calculate selected impact indicators where the required data and methods are available.  
6. Display the differences between scenarios.  
7. Record assumptions and uncertainty.

## **Exact outputs**

**Output 1 — Scenario data**

| Field | Type |
| ----- | ----- |
| Scenario ID | Unique ID |
| Scenario name | String |
| Variable | String |
| Year | Integer |
| Projected value | Float |
| Unit | String |
| Baseline value | Float |
| Assumed slope | Float |
| Stress perturbation | Float, if applicable |

**Output 2 — Scenario comparison**

* Baseline scenario values.  
* Trend-continuation values.  
* Increased-stress values.  
* Difference between scenarios.  
* Percentage difference, if mathematically appropriate.

**Output 3 — Impact indicators**

Potential indicators include:

* Rainfall conditions.  
* Dry-spell exposure, only if a suitable daily-data model is available.  
* Potential water-stress indicators.  
* Possible agricultural or ecosystem exposure pathways.

These must be clearly labelled as calculated indicators or qualitative pathways, not measured social or economic impacts.

**What the application displays**

* Future scenario line chart.  
* Scenario comparison table.  
* Impact indicator cards.  
* Scenario assumptions panel.  
* Uncertainty and limitation notes.

## **Handoff to Layer 5**

**Layer 4 → Layer 5**

Layer 4 passes:

* Baseline environmental conditions.  
* Selected future scenario values.  
* Precipitation time series.  
* Scenario period.  
* Scenario assumptions.  
* Relevant impact indicators.

**Why?** Layer 5 uses the environmental conditions to compare potential interventions under different scenarios.

# **6\. Layer 05 — SOLVE**

Which responses could reduce vulnerability?

**Purpose:** Compare possible interventions using a simplified soil-water balance.

## **User inputs**

| Input field | UI component | Example |
| ----- | ----- | ----- |
| Investigation | Select previous investigation | Sahel rainfall study |
| Scenario | Dropdown | Trend continuation |
| Intervention | Multi-select | Rainwater harvesting |
| Initial soil-water storage | Numeric input | Researcher-defined value |
| Soil-water storage capacity | Numeric input | Researcher-defined value |
| Time step | Dropdown | Daily / monthly, depending on model |
| Evapotranspiration | Dataset value / model input | ET |
| Runoff | Dataset value / model input | Q |
| Deep drainage | Dataset value / model input | D |
| Intervention parameters | Numeric / range inputs | Documented parameter assumptions |
| Parameter uncertainty | Range / sensitivity input | Low–high values |

Important: these numerical parameters must come from defensible data, literature or documented assumptions. The application must not invent intervention effectiveness.

## **Intervention choices**

| Environmental problem | Intervention | Model representation |
| ----- | ----- | ----- |
| Runoff / low infiltration | Rainwater harvesting | Change assumed runoff/infiltration partition |
| Soil-moisture stress | Mulching and soil conservation | Modify assumed evaporation or storage-loss parameters |
| Vegetation degradation | Agroforestry / restoration | Clearly labelled vegetation-response scenario |
| Erosion exposure | Soil and water conservation | Qualitative risk-reduction matrix |

These model representations follow the solution-model section of the project document. 

nasa(4).pdf

## **Processing**

Use the simplified water balance:

\\\[ \\Delta S=P-ET-Q-D \\\]

Where:

* \\(S\\): soil-water storage.  
* \\(P\\): precipitation.  
* \\(ET\\): evapotranspiration.  
* \\(Q\\): surface runoff.  
* \\(D\\): deep drainage.

Then:

1. Load baseline environmental conditions.  
2. Load the selected Layer 4 scenario.  
3. Configure the baseline water balance.  
4. Apply the selected intervention's documented parameter changes.  
5. Run the model for each scenario.  
6. Compare the resulting water-balance values.  
7. Test sensitivity to uncertain parameters.

## **Exact outputs**

**Output 1 — Water-balance results**

| Field | Type |
| ----- | ----- |
| Scenario ID | Unique ID |
| Intervention ID | Unique ID |
| Time step | Date |
| Precipitation (P) | Float |
| Evapotranspiration (ET) | Float |
| Runoff (Q) | Float |
| Deep drainage (D) | Float |
| Change in storage (ΔS) | Float |
| Storage value (S) | Float, if modelled |
| Unit | String |

**Output 2 — Intervention comparison**

* Baseline results.  
* No-additional-intervention results.  
* Intervention results.  
* Difference in water-balance indicators.  
* Sensitivity to intervention parameters.  
* Data and modelling limitations.

**Output 3 — Qualitative comparison**

If reliable numerical parameters are unavailable:

* Intervention name.  
* Environmental problem addressed.  
* Expected physical effect.  
* Evidence or reference.  
* Unknowns and limitations.

**What the application displays**

* Water-balance chart.  
* Baseline versus intervention comparison.  
* Intervention comparison table.  
* Sensitivity chart.  
* Assumptions and limitations panel.

## **Final handoff — Scientific Investigation Report**

Layer 5 does not just produce a recommendation. It provides the final intervention analysis to combine with all previous results.

# **7\. Final output — Scientific Investigation Report**

The application should automatically collect the outputs of all five layers into one investigation report.

## **Report structure**

| Section | Exact content |
| ----- | ----- |
| 1\. Investigation overview | Name, region, variables, period and datasets |
| 2\. Trend detection | Time series, trend direction, Sen's slope, p-value and uncertainty |
| 3\. Environmental investigation | Moisture, circulation, dust, storm and vegetation observations |
| 4\. Physical explanation | Candidate mechanisms, supporting evidence, contradictory evidence and confidence |
| 5\. Future scenarios | Scenario curves, projected values, assumptions and limitations |
| 6\. Solution comparison | Water-balance results, interventions and sensitivity |
| 7\. Scientific limitations | Data coverage, quality, missing data, uncertainty and methodology |
| 8\. References | Dataset sources, product versions, scientific references and methods |

**Report export formats:**

* PDF — full scientific investigation.  
* CSV — numerical time-series and comparison results.  
* JSON — structured investigation results for reuse.  
* PNG — individual charts and maps.

# **8\. What the backend should actually store**

This is important for your development team. The outputs of each layer should not exist only as charts on the frontend. They should be saved as structured records.

I recommend these main database entities:

| Entity | What it stores |
| ----- | ----- |
| Investigation | Name, region, period, user configuration |
| Dataset | Dataset source, version, variables, units, coverage |
| PreparedData | Cleaned observations and quality information |
| TrendResult | Statistical trend results |
| EvidenceResult | Supporting environmental observations and comparisons |
| MechanismAssessment | Evidence ledger and researcher interpretation |
| Scenario | Scenario configuration and calculated values |
| Intervention | Intervention configuration and parameters |
| ModelResult | Water-balance results and sensitivity |
| InvestigationReport | Combined results and references |

## **Data formats between the backend and frontend**

Use these formats:

| Data | Recommended format | Why |
| ----- | ----- | ----- |
| Original satellite/reanalysis files | NetCDF / HDF5 / GeoTIFF as supplied | Preserve scientific source data |
| Prepared gridded observations | NetCDF / Zarr or suitable arrays | Efficient scientific processing |
| Tabular observations | CSV / Parquet | Time-series and numerical data |
| API requests and responses | JSON | Frontend/backend communication |
| Geographic boundaries and features | GeoJSON | Interactive maps |
| Charts | JSON series | Plotly or another chart library |
| Scientific reports | PDF | Downloadable final report |

