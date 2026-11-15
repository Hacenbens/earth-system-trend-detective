"""Fixed values of the method and the API (not configurable at run time: changing one changes the science or the
contract, so it goes through a decision in docs/decisions/DECISIONS.md)."""

# ---- statistics
ALPHA = 0.05                        # significance level (Mann-Kendall, correlations)
MIN_SEASONS = 15                    # shortest series that may carry a trend test
SENSITIVITY_SPAN = 12               # start-year sensitivity: first year .. first year + 12
UNUSUAL_SEASON_SD = 1.5             # |anomaly| above this many standard deviations = unusual season
PCT_EPSILON = 1e-12                 # below this |mean|, % per decade is undefined

# ---- record and season (decision D-006)
FIRST_YEAR, LAST_YEAR = 1998, 2025  # IMERG V07 Final record used for trends
SEASON_MONTHS = (6, 7, 8, 9)        # JJAS, the Sahel rainy season
SEASON_NAME = "JJAS"
RECENT_FROM_YEAR = 2024             # "recent conditions" strip (shown apart, never used for trends)
DEFAULT_REGION = "sahel"

# ---- extreme-rainfall indices requested by `extremes: true` (daily data, box only)
EXTREME_METRICS = ("PRCPTOT", "wet_days", "SDII", "Rx1day", "R95p", "CDD")
ETCCDI_METRICS = ("PRCPTOT", "wet_days", "SDII", "Rx1day", "Rx5day", "R10mm", "R20mm", "R95p", "R95pTOT", "CDD")

# ---- identifiers
INVESTIGATION_ID_LENGTH = 12        # hex characters
REQUEST_ID_LENGTH = 12
REQUEST_ID_MAX_LENGTH = 64          # cap on an incoming X-Request-ID header

# ---- HTTP
API_PREFIX = "/api/v1"
REQUEST_ID_HEADER = "X-Request-ID"

# ---- logging
LOG_FILE_MAX_BYTES = 5_000_000
LOG_FILE_BACKUPS = 5

# ---- wording reused in several places
SCENARIO_DISCLAIMER = "Scenario, not a forecast."
ASSOCIATION_DISCLAIMER = "Associations, not causes."
AI_USE_NOTE = "Analysis code and text drafted with AI assistance (Claude Code); see docs/submission/si_usage.md"
