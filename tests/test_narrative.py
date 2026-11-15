"""AI narrative use case with a scripted fake model (no network): tool loop, number verification, caps, cache."""
import dataclasses
import json
import unittest

from earth_detective.backend.application.commands import CreateInvestigationCommand, DetectCommand
from earth_detective.backend.application.narrative import NarrativeCommand, NarrativeTools, unverified_numbers
from earth_detective.backend.domain.result import ErrorKind
from earth_detective.backend.interfaces.http.container import Container

from .fakes import adapters


class FakeTrends:
    def trends(self, variable, region, dataset):
        return [{"region": region or "sahel", "variable": variable or "rain_total", "pct_per_decade": 3.0899, "mk_p": 0.1607,
                 "dataset": "imerg_final_monthly", "significant": 0}]


class ScriptedModel:
    """Returns the scripted messages in order; the final one may use numbers read from the tool results."""
    model_name = "fake-llm"

    def __init__(self, final_text_fn, tool_names=("get_trend_results",)):
        self.calls, self.seen_tools, self._final, self._tools = 0, [], final_text_fn, list(tool_names)

    def complete(self, messages, tools):
        self.calls += 1
        self.seen_tools = [t["function"]["name"] for t in tools]
        if self._tools:
            name = self._tools.pop(0)
            return {"content": None, "tool_calls": [{"id": f"c{self.calls}", "type": "function",
                                                     "function": {"name": name, "arguments": "{}"}}]}
        tool_msgs = [json.loads(m["content"]) for m in messages if m["role"] == "tool"]
        return {"content": self._final(tool_msgs), "tool_calls": None}


def container_with(model, cap=200):
    a = dataclasses.replace(adapters(), llm=model, trends=FakeTrends())
    c = Container(a, llm_daily_cap=cap)
    inv = c.create_investigation.execute(CreateInvestigationCommand("t", "sahel", 1998, 2025)).value["id"]
    return c, inv


def honest(tool_msgs):
    r = tool_msgs[0][0]
    return f"Rainfall changed by {r['pct_per_decade']:.1f} %/decade (p = {r['p_value']:.3f}) [E-005] over 28 seasons."


class NarrativeTests(unittest.TestCase):
    def test_not_configured(self):
        c, inv = container_with(None)
        self.assertEqual(c.narrative.execute(NarrativeCommand(inv)).error.kind, ErrorKind.NOT_AVAILABLE)

    def test_needs_detect_first(self):
        c, inv = container_with(ScriptedModel(honest))
        self.assertEqual(c.narrative.execute(NarrativeCommand(inv)).error.kind, ErrorKind.CONFLICT)

    def test_tool_loop_and_numbers_verified(self):
        model = ScriptedModel(honest)
        c, inv = container_with(model)
        c.detect.execute(DetectCommand(inv, metrics=("rain_total",)))
        r = c.narrative.execute(NarrativeCommand(inv, "What changed?"))
        self.assertTrue(r.is_ok, getattr(r, "error", None))
        self.assertEqual(r.value["tools_used"], ["get_trend_results"])
        self.assertTrue(r.value["verified"], r.value["unverified_numbers"])
        self.assertIn("AI-generated", r.value["ai_label"])
        self.assertIn("query_warehouse_trends", model.seen_tools)

    def test_invented_number_is_flagged(self):
        c, inv = container_with(ScriptedModel(lambda m: "Rainfall rose by 12.7 %/decade (p = 0.003)."))
        c.detect.execute(DetectCommand(inv, metrics=("rain_total",)))
        r = c.narrative.execute(NarrativeCommand(inv)).value
        self.assertFalse(r["verified"])
        self.assertEqual(set(r["unverified_numbers"]), {"12.7", "0.003"})

    def test_cache_and_daily_cap(self):
        model = ScriptedModel(honest)
        c, inv = container_with(model, cap=1)
        c.detect.execute(DetectCommand(inv, metrics=("rain_total",)))
        first = c.narrative.execute(NarrativeCommand(inv)).value
        again = c.narrative.execute(NarrativeCommand(inv)).value      # same question: cached, no new call
        self.assertTrue(again["cached"])
        self.assertEqual(again["text"], first["text"])
        r = c.narrative.execute(NarrativeCommand(inv, "another question"))
        self.assertEqual(r.error.kind, ErrorKind.CAPACITY)

    def test_provider_failure_is_not_available(self):
        class Broken:
            model_name = "x"
            def complete(self, messages, tools):
                raise OSError("connection refused")
        c, inv = container_with(Broken())
        c.detect.execute(DetectCommand(inv, metrics=("rain_total",)))
        self.assertEqual(c.narrative.execute(NarrativeCommand(inv)).error.kind, ErrorKind.NOT_AVAILABLE)


class ToolAndVerificationTests(unittest.TestCase):
    def test_unknown_tool_and_bad_arguments_return_errors_not_exceptions(self):
        t = NarrativeTools({"config": {}, "layers": {}}, FakeTrends(), None, None)
        self.assertIn("unknown tool", t.call("drop_table", "{}"))
        self.assertIn("bad arguments", t.call("query_warehouse_trends", "not json"))
        self.assertIn("3.0899", t.call("query_warehouse_trends", '{"region": "east"}'))

    def test_verification_rules(self):
        src = [3.0899, 0.1607, -9.5737]
        self.assertEqual(unverified_numbers("+3.1 %/decade, p = 0.161, dry spells −9.6 % [E-007], 2001-2025, 7 of 12", src), [])
        self.assertEqual(unverified_numbers("+3.2 %/decade", src), ["+3.2"])


if __name__ == "__main__":
    unittest.main()
