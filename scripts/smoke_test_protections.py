"""Live test of the API abuse protections (standard library only). Starts its OWN server on a free port with low limits
and a throwaway team key, checks 413 / 401 / 429 / 503 and the security headers, then stops it.

Drafted with AI assistance (Claude Code). See docs/submission/si_usage.md.
Usage:  make smoke-protections      (needs the warehouse; does not touch data/app/investigations)
"""
import json
import os
import secrets
import socket
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
results: list[tuple[str, bool, str]] = []


def free_port() -> int:
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def call(method, url, body=None, headers=None, raw=None):
    data = raw if raw is not None else (json.dumps(body).encode() if body is not None else None)
    req = urllib.request.Request(url, data=data, method=method, headers={"Content-Type": "application/json", **(headers or {})})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            out, status, hdrs = r.read(), r.status, {k.lower(): v for k, v in r.headers.items()}
    except urllib.error.HTTPError as e:
        out, status, hdrs = e.read(), e.code, {k.lower(): v for k, v in e.headers.items()}
    try:
        payload = json.loads(out)
    except ValueError:
        payload = out.decode()
    return status, payload, hdrs


def check(name, cond, info=""):
    results.append((name, bool(cond), info))


def kind(payload):
    return payload.get("error", {}).get("kind") if isinstance(payload, dict) else None


port, key = free_port(), secrets.token_urlsafe(24)
base, store = f"http://127.0.0.1:{port}", tempfile.mkdtemp(prefix="inv-protect-")
env = {**os.environ, "TREND_DETECTIVE_STORE": store, "LOG_LEVEL": "WARNING", "TEAM_API_KEY": key,
       "RATE_LIMIT_PER_MINUTE": "40", "RATE_LIMIT_HEAVY_PER_MINUTE": "6", "MAX_BODY_BYTES": "2048", "MAX_INVESTIGATIONS": "3"}
server = subprocess.Popen([sys.executable, "-m", "uvicorn", "earth_detective.backend.interfaces.http.app:app", "--app-dir", "src",
                           "--host", "127.0.0.1", "--port", str(port)], cwd=ROOT, env=env,
                          stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
try:
    for _ in range(100):
        try:
            urllib.request.urlopen(base + "/health", timeout=1)
            break
        except OSError:
            time.sleep(0.2)
    api = base + "/api/v1"
    body = {"name": "protect", "region_id": "sahel", "start_year": 1998, "end_year": 2025}

    s, p, h = call("GET", base + "/health")
    check("security headers present", s == 200 and h.get("x-content-type-options") == "nosniff"
          and h.get("x-frame-options") == "DENY" and h.get("cache-control") == "no-store")

    s, p, h = call("POST", api + "/investigations", raw=b"{" + b" " * 4000 + b"}")
    check("body above MAX_BODY_BYTES -> 413 payload_too_large", s == 413 and kind(p) == "payload_too_large", s)

    ids = []
    for _ in range(3):
        s, p, _ = call("POST", api + "/investigations", body)
        ids.append(p.get("id") if s == 201 else None)
    check("3 investigations created (cap = 3)", all(ids))
    s, p, _ = call("POST", api + "/investigations", body)
    check("4th investigation -> 503 capacity", s == 503 and kind(p) == "capacity", s)

    exp = {"mechanism_id": "M-01", "reviewer": "protection test"}
    s, p, h = call("POST", f"{api}/investigations/{ids[0]}/explain", exp)
    check("explain without key -> 401 unauthorized", s == 401 and kind(p) == "unauthorized" and "request_id" in p["error"], s)
    s, p, _ = call("POST", f"{api}/investigations/{ids[0]}/explain", exp, headers={"X-API-Key": "wrong"})
    check("explain with wrong key -> 401", s == 401, s)
    s, p, _ = call("POST", f"{api}/investigations/{ids[0]}/explain", exp, headers={"X-API-Key": key})
    check("explain with team key passes the gate (not 401)", s != 401, s)

    # heavy limit = 6/min: 4 creates were heavy already; detects push it over
    statuses = [call("POST", f"{api}/investigations/{ids[0]}/detect", {"metrics": ["rain_total"]})[0] for _ in range(4)]
    s, p, h = call("POST", f"{api}/investigations/{ids[0]}/detect", {"metrics": ["rain_total"]})
    check("heavy limit -> 429 rate_limited with Retry-After", s == 429 and kind(p) == "rate_limited" and p["error"]["details"]["scope"] == "heavy"
          and int(h.get("retry-after", "0")) > 0, f"{statuses} then {s}")
    s, _, _ = call("GET", api + "/regions")
    check("light endpoints still served while heavy is limited", s == 200, s)
    codes = [call("GET", api + "/regions")[0] for _ in range(45)]
    check("general limit -> 429 after RATE_LIMIT_PER_MINUTE", 429 in codes, codes.count(429))
finally:
    server.terminate()
    server.wait(timeout=10)

failed = [r for r in results if not r[1]]
for name, ok, info in results:
    print(f"{'PASS' if ok else 'FAIL'}  {name}" + (f"   ({info})" if not ok and info != "" else ""))
print(f"\n{len(results) - len(failed)}/{len(results)} protection checks passed")
sys.exit(1 if failed else 0)
