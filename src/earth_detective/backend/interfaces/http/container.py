"""Composition root: the only place that knows the concrete classes. Swap an adapter here (e.g. PostgreSQL instead of
SQLite, an in-memory store for tests) without touching any use case."""
from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from ...application import catalogue as cat
from ...application import investigations as invs
from ...application import layers, report
from ...application.services import InvestigationLoader, RegionValidator, SeriesSelector, TrendAssessor
from ...domain.ports import (AssociationAnalyzer, BuildInfoReader, CaseStudyReader, CatalogueReader, Clock, DatasetReferenceReader,
                             InterventionCatalogue, InvestigationRepository, MechanismReader, ObservationReader,
                             PrecomputedTrendReader, TrendAnalyzer)
from ...infrastructure.adapters import (DetrendedSpearmanAnalyzer, JsonInvestigationRepository, MannKendallTrendAnalyzer,
                                        StaticInterventionCatalogue, SystemClock)
from ...infrastructure.sqlite_repositories import (SqliteBuildInfoRepository, SqliteCaseStudyRepository, SqliteCatalogueRepository,
                                                   SqliteDatasetReferenceRepository, SqliteMechanismRepository,
                                                   SqliteObservationRepository, SqlitePrecomputedTrendRepository, SqliteWarehouse)

ROOT = Path(__file__).resolve().parents[5]


@dataclass(frozen=True)
class Adapters:
    catalogue: CatalogueReader
    observations: ObservationReader
    trends: PrecomputedTrendReader
    mechanisms: MechanismReader
    cases: CaseStudyReader
    build: BuildInfoReader
    references: DatasetReferenceReader
    interventions: InterventionCatalogue
    investigations: InvestigationRepository
    trend_analyzer: TrendAnalyzer
    association: AssociationAnalyzer
    clock: Clock


def production_adapters() -> Adapters:
    db = SqliteWarehouse(Path(os.environ.get("TREND_DETECTIVE_DB", ROOT / "data" / "warehouse" / "trend_detective.sqlite")))
    store_dir = Path(os.environ.get("TREND_DETECTIVE_STORE", ROOT / "data" / "app" / "investigations"))
    return Adapters(SqliteCatalogueRepository(db), SqliteObservationRepository(db), SqlitePrecomputedTrendRepository(db),
                    SqliteMechanismRepository(db), SqliteCaseStudyRepository(db), SqliteBuildInfoRepository(db),
                    SqliteDatasetReferenceRepository(db), StaticInterventionCatalogue(), JsonInvestigationRepository(store_dir),
                    MannKendallTrendAnalyzer(), DetrendedSpearmanAnalyzer(), SystemClock())


class Container:
    """Builds every use case from a set of adapters (dependency injection by constructor)."""

    def __init__(self, a: Adapters):
        regions = RegionValidator(a.catalogue)
        loader = InvestigationLoader(a.investigations)
        selector = SeriesSelector(a.catalogue, a.observations)
        assessor = TrendAssessor(a.catalogue, selector, a.trend_analyzer)
        # catalogue
        self.list_regions = cat.ListRegions(a.catalogue)
        self.list_datasets = cat.ListDatasets(a.catalogue)
        self.list_variables = cat.ListVariables(a.catalogue)
        self.get_series = cat.GetSeries(a.catalogue, a.observations, regions, selector)
        self.list_trends = cat.ListPrecomputedTrends(a.trends)
        self.list_mechanisms = cat.ListMechanisms(a.mechanisms)
        self.list_interventions = cat.ListInterventions(a.interventions)
        self.build_info = cat.GetBuildInfo(a.build)
        # investigations
        self.create_investigation = invs.CreateInvestigation(a.investigations, regions, selector, a.clock)
        self.get_investigation = invs.GetInvestigation(loader)
        self.list_investigations = invs.ListInvestigations(a.investigations)
        # layers
        self.detect = layers.DetectTrends(loader, regions, assessor, selector, a.observations, a.investigations, a.clock)
        self.investigate = layers.InvestigateEvidence(loader, regions, selector, a.trend_analyzer, a.association, a.cases,
                                                      a.investigations, a.clock)
        self.explain = layers.ExplainMechanism(loader, a.mechanisms, a.investigations, a.clock)
        self.project = layers.ProjectScenarios(loader, regions, assessor, a.investigations, a.clock)
        self.solve = layers.CompareInterventions(loader, a.interventions, a.investigations, a.clock)
        # report
        self.report = report.BuildReport(loader, a.references, a.build)
        self.report_csv = report.ExportReportCsv(loader)


@lru_cache(maxsize=1)
def get_container() -> Container:
    return Container(production_adapters())
