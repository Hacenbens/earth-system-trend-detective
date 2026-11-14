"""Render data/app/mechanisms.json (Layer 3 records) as docs/research/evidence_cards.md, so both stay in sync.

Drafted with AI assistance (Claude Code). See docs/submission/si_usage.md.
Usage: .venv/bin/python scripts/render_evidence_cards.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
d = json.loads((ROOT / "data" / "app" / "mechanisms.json").read_text())
ICON = {"consistent": "✅ consistent", "inconsistent": "❌ inconsistent", "unclear": "❔ unclear", "not_tested": "⬜ not tested"}
out = ["# Layer 3 evidence cards (EXPLAIN)", "",
       "Generated from `data/app/mechanisms.json` by `scripts/render_evidence_cards.py`. Edit the JSON, not this file.",
       f"Region: {d['region']} · Period: {d['period']}", "", f"**Detected trend (Layer 1):** {d['detected_trend_summary']}", "",
       "> Interpretations and confidence levels are **drafts written with AI assistance** for the science lead to review. "
       "Evidence IDs point to `docs/research/evidence_ledger.md`. References are still TO-VERIFY. Association is not causation.", "",
       "| Card | Mechanism | Consistent | Inconsistent | Unclear | Not tested | Confidence |", "|---|---|---|---|---|---|---|"]
for m in d["mechanisms"]:
    c = lambda s: sum(e["status"] == s for e in m["expected_observations"])
    out.append(f"| {m['mechanism_id']} | {m['name']} | {c('consistent')} | {c('inconsistent')} | {c('unclear')} | {c('not_tested')} | **{m['confidence']}** |")
for m in d["mechanisms"]:
    out += ["", "---", "", f"## {m['mechanism_id']} · {m['name']}  (confidence: **{m['confidence']}**)", "", m["scientific_description"], "",
            "| Expected if this mechanism matters | What we observe | Status | Evidence |", "|---|---|---|---|"]
    out += [f"| {e['expectation']} | {e['observed']} | {ICON[e['status']]} | {', '.join(e['evidence_ids']) or '–'} |" for e in m["expected_observations"]]
    out += ["", f"**Supporting evidence:** {', '.join(m['supporting_evidence_ids']) or '–'} · **Contradicting:** {', '.join(m['contradictory_evidence_ids']) or '–'}", "",
            "**Alternative explanations**", *[f"- {a}" for a in m["alternative_explanations"]], "",
            f"**Interpretation:** {m['researcher_interpretation']}", "",
            "**Limitations**", *[f"- {x}" for x in m["limitations"]], "", f"**References (TO-VERIFY):** {', '.join(m['references'])}"]
(ROOT / "docs" / "research" / "evidence_cards.md").write_text("\n".join(out) + "\n")
print("wrote docs/research/evidence_cards.md")
