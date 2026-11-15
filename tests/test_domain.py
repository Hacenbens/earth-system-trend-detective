"""Domain tests: Result pattern and business rules (no I/O)."""
import unittest

from earth_detective.backend.domain import rules
from earth_detective.backend.domain.models import Dataset, DatasetAvailability, TrendStats
from earth_detective.backend.domain.result import AppError, Err, ErrorKind, Ok, collect, partition


def stats(slope, p):
    return TrendStats(28, 1998, 2025, 400.0, slope, slope - 1, slope + 1, 10.0, 50.0, 0.2, p, p, p, slope, p, slope, p, -0.4, -0.4)


class ResultTests(unittest.TestCase):
    def test_ok_map_and_then(self):
        r = Ok(2).map(lambda v: v * 3).and_then(lambda v: Ok(v + 1))
        self.assertTrue(r.is_ok)
        self.assertEqual(r.value, 7)

    def test_err_short_circuits(self):
        e = Err(AppError.not_found("x"))
        self.assertIs(e.map(lambda v: 1 / 0), e)
        self.assertEqual(e.unwrap_or(5), 5)
        self.assertEqual(e.error.kind, ErrorKind.NOT_FOUND)

    def test_collect_and_partition(self):
        self.assertEqual(collect([Ok(1), Ok(2)]).value, [1, 2])
        self.assertFalse(collect([Ok(1), Err(AppError.validation("bad"))]).is_ok)
        oks, errs = partition([Ok(1), Err(AppError.validation("bad")), Ok(3)])
        self.assertEqual((oks, len(errs)), ([1, 3], 1))


class RuleTests(unittest.TestCase):
    def test_wording_follows_significance(self):
        self.assertEqual(rules.judge_trend(stats(1.4, 0.16)).wording, "Increasing tendency, not statistically significant")
        self.assertEqual(rules.judge_trend(stats(1.4, 0.16)).direction, "no_significant_trend")
        self.assertEqual(rules.judge_trend(stats(-0.27, 0.001)).direction, "decreasing")

    def test_evidence_status(self):
        self.assertEqual(rules.evidence_status(0.7, 0.001, rules.expected_sign("TQV", "rain_total")), "supporting")
        self.assertEqual(rules.evidence_status(-0.7, 0.001, rules.expected_sign("TQV", "rain_total")), "contrasting")
        self.assertEqual(rules.evidence_status(-0.6, 0.001, rules.expected_sign("TQV", "CDD")), "supporting")
        self.assertEqual(rules.evidence_status(0.7, 0.2, 1), "unclear")

    def test_ranking_policy_excludes_non_trend_roles(self):
        mk = lambda code, role, n: DatasetAvailability(Dataset(code, "p", code, "v", "a", "k", role), n)  # noqa: E731
        ranked = rules.RoleThenCoveragePolicy().rank([mk("late", "near-real-time", 99), mk("chirps", "check", 28), mk("imerg", "trend", 28),
                                                      mk("ec", "case-study", 4)])
        self.assertEqual([r.dataset.code for r in ranked], ["imerg", "chirps"])

    def test_scenarios(self):
        self.assertEqual(rules.scenario_value("stabilization", 300, 2, -1, 2025, 2035), 300)
        self.assertEqual(rules.scenario_value("trend_continuation", 300, 2, -1, 2025, 2035), 320)
        self.assertEqual(rules.scenario_value("increased_stress", 300, 2, -1, 2025, 2035), 310)
        self.assertIn("not statistically significant", rules.scenario_warnings(False, 0.15)[1])


if __name__ == "__main__":
    unittest.main()
