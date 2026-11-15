"""Regression: concurrent requests used one shared sqlite3 connection and failed with InterfaceError."""
import unittest
from concurrent.futures import ThreadPoolExecutor

from earth_detective.backend.core.settings import Settings
from earth_detective.backend.infrastructure.sqlite_repositories import SqliteCatalogueRepository, SqliteWarehouse


class WarehouseConcurrencyTests(unittest.TestCase):
    def test_parallel_reads_from_many_threads(self):
        path = Settings.from_env({}).warehouse_path
        if not path.exists():
            self.skipTest("warehouse not built (make warehouse)")
        repo = SqliteCatalogueRepository(SqliteWarehouse(path))
        codes = [v.code for v in repo.variables()] * 20
        with ThreadPoolExecutor(max_workers=16) as pool:
            got = list(pool.map(lambda c: repo.variable(c).code, codes))
        self.assertEqual(got, codes)


if __name__ == "__main__":
    unittest.main()
