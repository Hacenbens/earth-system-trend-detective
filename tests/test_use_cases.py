"""Use-case tests against in-memory adapters: no SQLite, no FastAPI (the container is built from fakes)."""
import unittest

from earth_detective.backend.application.commands import (CreateInvestigationCommand, DetectCommand, ExplainCommand, InvestigateCommand,
                                                          ProjectCommand, SolveCommand)
from earth_detective.backend.domain.result import ErrorKind
from earth_detective.backend.interfaces.http.container import Container

from .fakes import adapters


class UseCaseTests(unittest.TestCase):
    def setUp(self):
        self.c = Container(adapters())
        r = self.c.create_investigation.execute(CreateInvestigationCommand("t", "sahel", 1998, 2025))
        self.assertTrue(r.is_ok, getattr(r, "error", None))
        self.inv_id = r.value["id"]

    def test_create_rejects_short_period_and_unknown_region(self):
        r = self.c.create_investigation.execute(CreateInvestigationCommand("t", "sahel", 2020, 2025))
        self.assertEqual(r.error.kind, ErrorKind.VALIDATION)
        r = self.c.create_investigation.execute(CreateInvestigationCommand("t", "mars", 1998, 2025))
        self.assertEqual(r.error.kind, ErrorKind.VALIDATION)
        self.assertEqual(r.error.details["unknown"], ["mars"])

    def test_detect_finds_trend_with_independent_check_and_never_uses_near_real_time(self):
        r = self.c.detect.execute(DetectCommand(self.inv_id, metrics=("rain_total",)))
        self.assertTrue(r.is_ok)
        res = r.value["results"][0]
        self.assertEqual(res["dataset"], "imerg")                  # trend dataset chosen, not the near-real-time one
        self.assertEqual(res["direction"], "increasing")
        self.assertAlmostEqual(res["sen_slope"], 3.0, delta=0.6)
        self.assertEqual(res["independent_check"]["dataset"], "chirps")
        self.assertTrue(res["independent_check"]["agrees_in_sign"])
        self.assertGreater(len(res["start_year_sensitivity"]), 5)
        self.assertIn("detect", self.c.get_investigation.execute(self.inv_id).value["layers"])

    def test_detect_reports_unknown_metric_as_skipped_and_unknown_investigation_as_not_found(self):
        r = self.c.detect.execute(DetectCommand(self.inv_id, metrics=("rain_total", "nope")))
        self.assertTrue(r.is_ok)
        self.assertEqual(r.value["skipped"][0]["kind"], "not_found")
        self.assertEqual(self.c.detect.execute(DetectCommand("000000000999")).error.kind, ErrorKind.NOT_FOUND)

    def test_investigate_statuses(self):
        r = self.c.investigate.execute(InvestigateCommand(self.inv_id, ("east",), ("moisture", "dust", "storm_structure")))
        self.assertTrue(r.is_ok)
        by = {c["variable"]: c for c in r.value["comparisons"]}
        self.assertEqual(by["TQV"]["status"], "supporting")
        self.assertEqual(by["DUEXTTAU"]["status"], "unclear")
        self.assertEqual(len(r.value["case_studies"]), 1)

    def test_explain_requires_reviewer_and_known_evidence(self):
        self.assertEqual(self.c.explain.execute(ExplainCommand(self.inv_id, "M-01", " ")).error.kind, ErrorKind.VALIDATION)
        self.assertEqual(self.c.explain.execute(ExplainCommand(self.inv_id, "M-01", "lead", supporting_evidence_ids=("E-999",))).error.kind,
                         ErrorKind.VALIDATION)
        ok = self.c.explain.execute(ExplainCommand(self.inv_id, "M-01", "lead", status_overrides={1: "unclear"}))
        self.assertEqual(ok.value["expected_observations"][0]["status"], "unclear")

    def test_project_warns_and_solve_refuses_numeric(self):
        p = self.c.project.execute(ProjectCommand(self.inv_id, start_year=2025, end_year=2030))
        self.assertTrue(p.is_ok)
        self.assertEqual(p.value["warnings"][0], "Scenario, not a forecast.")
        self.assertEqual(self.c.solve.execute(SolveCommand(self.inv_id, numeric=True)).error.kind, ErrorKind.NOT_AVAILABLE)
        self.assertEqual(self.c.solve.execute(SolveCommand(self.inv_id, ("unknown",))).error.kind, ErrorKind.VALIDATION)

    def test_report_csv_needs_detect_first(self):
        self.assertEqual(self.c.report_csv.execute(self.inv_id).error.kind, ErrorKind.CONFLICT)
        self.c.detect.execute(DetectCommand(self.inv_id))
        self.assertTrue(self.c.report_csv.execute(self.inv_id).value.startswith("region,metric"))


if __name__ == "__main__":
    unittest.main()
