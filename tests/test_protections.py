"""Abuse protections: rate limiter, storage cap and expiry, settings validation, JSON store housekeeping."""
import json
import tempfile
import unittest
from pathlib import Path

from earth_detective.backend.application.commands import CreateInvestigationCommand
from earth_detective.backend.application.investigations import StorageLimits
from earth_detective.backend.core.settings import Settings
from earth_detective.backend.domain.result import ErrorKind
from earth_detective.backend.infrastructure.adapters import JsonInvestigationRepository
from earth_detective.backend.infrastructure.rate_limiter import SlidingWindowRateLimiter
from earth_detective.backend.interfaces.http.container import Container
from earth_detective.backend.interfaces.http.middleware import is_heavy

from .fakes import InMemoryInvestigations, adapters


class ManualClock:
    def __init__(self, t=0.0): self.t = t
    def __call__(self): return self.t


class IsoClock:
    def __init__(self, iso): self.iso = iso
    def now(self): return self.iso


class RateLimiterTests(unittest.TestCase):
    def test_allows_up_to_limit_then_refuses_with_retry_after(self):
        clk = ManualClock()
        rl = SlidingWindowRateLimiter(3, 60, clock=clk)
        self.assertEqual([rl.hit("a")[0] for _ in range(3)], [True] * 3)
        ok, retry = rl.hit("a")
        self.assertFalse(ok)
        self.assertEqual(retry, 60)
        self.assertTrue(rl.hit("b")[0])               # other clients are independent

    def test_window_slides_and_refused_hits_are_not_counted(self):
        clk = ManualClock()
        rl = SlidingWindowRateLimiter(2, 60, clock=clk)
        rl.hit("a"); clk.t = 30; rl.hit("a")
        clk.t = 59; self.assertFalse(rl.hit("a")[0])
        clk.t = 60.5; self.assertTrue(rl.hit("a")[0])  # first hit (t=0) left the window
        self.assertFalse(rl.hit("a")[0])

    def test_idle_keys_are_pruned(self):
        clk = ManualClock()
        rl = SlidingWindowRateLimiter(5, 10, clock=clk, prune_every=10)
        for i in range(9):
            rl.hit(f"ip{i}")
        clk.t = 100
        rl.hit("new")                                   # 10th call triggers pruning
        self.assertEqual(rl.tracked_keys(), 1)

    def test_heavy_endpoints(self):
        self.assertTrue(is_heavy("POST", "/api/v1/investigations"))
        self.assertTrue(is_heavy("POST", "/api/v1/investigations/abc/detect"))
        self.assertFalse(is_heavy("POST", "/api/v1/investigations/abc/solve"))
        self.assertFalse(is_heavy("GET", "/api/v1/investigations"))


class StorageLimitTests(unittest.TestCase):
    def _create(self, c):
        return c.create_investigation.execute(CreateInvestigationCommand("t", "sahel", 1998, 2025))

    def test_capacity_refuses_when_full(self):
        c = Container(adapters(), StorageLimits(max_investigations=2, ttl_days=7))
        self.assertTrue(self._create(c).is_ok)
        self.assertTrue(self._create(c).is_ok)
        r = self._create(c)
        self.assertEqual(r.error.kind, ErrorKind.CAPACITY)
        self.assertEqual(r.error.details["max_investigations"], 2)

    def test_expired_investigations_are_purged_before_the_cap_applies(self):
        store, clock = InMemoryInvestigations(), IsoClock("2026-11-01T00:00:00+00:00")
        c = Container(adapters(store, clock), StorageLimits(max_investigations=1, ttl_days=7))
        self.assertTrue(self._create(c).is_ok)
        clock.iso = "2026-11-05T00:00:00+00:00"
        self.assertEqual(self._create(c).error.kind, ErrorKind.CAPACITY)   # 4 days old: kept, store full
        clock.iso = "2026-11-09T00:00:00+00:00"
        self.assertTrue(self._create(c).is_ok)                              # 8 days old: purged
        self.assertEqual(store.count(), 1)

    def test_validation_errors_do_not_trigger_capacity(self):
        c = Container(adapters(), StorageLimits(max_investigations=1, ttl_days=7))
        self._create(c)
        r = c.create_investigation.execute(CreateInvestigationCommand("t", "sahel", 2020, 2025))
        self.assertEqual(r.error.kind, ErrorKind.VALIDATION)


class JsonStoreHousekeepingTests(unittest.TestCase):
    def test_count_and_purge(self):
        with tempfile.TemporaryDirectory() as d:
            repo = JsonInvestigationRepository(Path(d))
            self.assertEqual(repo.count(), 0)
            for i, (created, updated) in enumerate([("2026-10-01T00:00:00+00:00", None),
                                                    ("2026-10-01T00:00:00+00:00", "2026-11-10T00:00:00+00:00"),
                                                    ("2026-11-12T00:00:00+00:00", None)]):
                (Path(d) / f"{i:012x}.json").write_text(json.dumps({"id": f"{i:012x}", "created_at": created, "updated_at": updated}))
            (Path(d) / "broken.json").write_text("{")
            self.assertEqual(repo.count(), 4)
            self.assertEqual(repo.purge_older_than("2026-11-08T00:00:00+00:00"), 1)   # only the stale, never-updated one
            self.assertEqual(repo.count(), 3)                                         # broken file left alone


class SettingsTests(unittest.TestCase):
    def test_defaults_and_secret_not_described(self):
        s = Settings.from_env({"TEAM_API_KEY": "s3cret"})
        self.assertEqual((s.rate_limit_per_minute, s.rate_limit_heavy_per_minute, s.max_body_bytes), (120, 20, 32768))
        self.assertNotIn("s3cret", json.dumps(s.describe()))
        self.assertTrue(s.describe()["team_api_key_set"])
        self.assertIsNone(Settings.from_env({}).team_api_key)

    def test_env_file_reader(self):
        from earth_detective.backend.core.settings import read_env_file
        with tempfile.TemporaryDirectory() as d:
            f = Path(d) / ".env"
            f.write_text('# comment\n\nTEAM_API_KEY="abc=def"\nexport LOG_LEVEL=DEBUG\nEMPTY=\nnoequals\n')
            self.assertEqual(read_env_file(f), {"TEAM_API_KEY": "abc=def", "LOG_LEVEL": "DEBUG", "EMPTY": ""})
            self.assertEqual(read_env_file(Path(d) / "missing"), {})
            self.assertEqual(read_env_file(None), {})

    def test_rejects_bad_limits(self):
        for bad in ("0", "-5", "abc"):
            with self.assertRaises(ValueError):
                Settings.from_env({"RATE_LIMIT_PER_MINUTE": bad})


if __name__ == "__main__":
    unittest.main()
