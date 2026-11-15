"""Enumerations shared across layers. StrEnum members compare equal to their string values, so they serialise to
plain strings in JSON and work as dictionary keys alongside strings."""
from enum import StrEnum


class ErrorKind(StrEnum):
    NOT_FOUND = "not_found"            # a requested entity does not exist
    VALIDATION = "validation"          # the request breaks a business rule
    CONFLICT = "conflict"              # a required previous step has not been done
    NOT_AVAILABLE = "not_available"    # valid request, but the data or feature is not available
    UNAUTHORIZED = "unauthorized"      # missing or wrong credentials for a protected endpoint
    PAYLOAD_TOO_LARGE = "payload_too_large"  # request body above the configured limit
    RATE_LIMITED = "rate_limited"      # too many requests from one client
    CAPACITY = "capacity"              # the server refuses new work because a storage cap is reached
    UNEXPECTED = "unexpected"          # fault outside the business rules


class DatasetRole(StrEnum):
    TREND = "trend"
    CHECK = "check"
    SUPPORTING = "supporting"
    NEAR_REAL_TIME = "near-real-time"
    CASE_STUDY = "case-study"


class DatasetKind(StrEnum):
    SATELLITE = "satellite"
    GAUGE_BLENDED = "gauge-blended"
    REANALYSIS = "reanalysis"
    RADAR_LIDAR = "radar-lidar"
    DERIVED = "derived"


class QualityFlag(StrEnum):
    OK = "ok"
    PARTIAL = "partial"
    SUSPECT = "suspect"


class Grain(StrEnum):
    MONTH = "month"
    SEASON = "season"


class TrendDirection(StrEnum):
    INCREASING = "increasing"
    DECREASING = "decreasing"
    FLAT = "flat"
    NO_SIGNIFICANT_TREND = "no_significant_trend"


class EvidenceCategory(StrEnum):
    MOISTURE = "moisture"
    CIRCULATION = "circulation"
    DUST = "dust"
    LAND = "land"
    STORM_STRUCTURE = "storm_structure"
    VEGETATION = "vegetation"


class EvidenceStatus(StrEnum):
    """Layer 2: association of a supporting variable with rainfall."""
    SUPPORTING = "supporting"
    CONTRASTING = "contrasting"
    UNCLEAR = "unclear"


class ExpectationStatus(StrEnum):
    """Layer 3: status of one expected observation of a mechanism."""
    CONSISTENT = "consistent"
    INCONSISTENT = "inconsistent"
    UNCLEAR = "unclear"
    NOT_TESTED = "not_tested"


class Confidence(StrEnum):
    LOW = "low"
    LOW_MEDIUM = "low-medium"
    MEDIUM = "medium"
    MEDIUM_HIGH = "medium-high"
    HIGH = "high"
    NOT_ASSESSED = "not_assessed"


class ScenarioKind(StrEnum):
    STABILIZATION = "stabilization"
    TREND_CONTINUATION = "trend_continuation"
    INCREASED_STRESS = "increased_stress"


class RainfallMetric(StrEnum):
    """Rainfall series a supporting variable can be compared with."""
    RAIN_TOTAL = "rain_total"
    CDD = "CDD"


class Layer(StrEnum):
    DETECT = "detect"
    INVESTIGATE = "investigate"
    EXPLAIN = "explain"
    PROJECT = "project"
    SOLVE = "solve"


class LogFormat(StrEnum):
    JSON = "json"
    TEXT = "text"
