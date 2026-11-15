"""OpenAI-compatible chat-completions client (DeepSeek by default), standard library only.
Drafted with AI assistance (Claude Code). See docs/submission/si_usage.md."""
from __future__ import annotations

import json
import logging
import urllib.error
import urllib.request
from typing import Any

log = logging.getLogger(__name__)


class LlmError(RuntimeError):
    pass


class OpenAICompatibleChatModel:
    """POST {base_url}/chat/completions with tools. The API key is sent only in the Authorization header."""

    def __init__(self, base_url: str, api_key: str, model: str, timeout_s: float = 60.0, temperature: float = 0.2):
        self._url = f"{base_url.rstrip('/')}/chat/completions"
        self._key, self.model_name, self._timeout, self._temperature = api_key, model, timeout_s, temperature

    def complete(self, messages: list[dict[str, Any]], tools: list[dict[str, Any]]) -> dict[str, Any]:
        body = {"model": self.model_name, "messages": messages, "temperature": self._temperature, "stream": False}
        if tools:
            body["tools"], body["tool_choice"] = tools, "auto"
        req = urllib.request.Request(self._url, data=json.dumps(body).encode(), method="POST",
                                     headers={"Content-Type": "application/json", "Authorization": f"Bearer {self._key}"})
        try:
            with urllib.request.urlopen(req, timeout=self._timeout) as r:
                payload = json.loads(r.read())
        except urllib.error.HTTPError as e:
            detail = e.read()[:300].decode(errors="replace")
            raise LlmError(f"LLM provider answered HTTP {e.code}: {detail}") from None
        except (urllib.error.URLError, TimeoutError, OSError) as e:
            raise LlmError(f"LLM provider not reachable: {e}") from None
        try:
            msg = payload["choices"][0]["message"]
        except (KeyError, IndexError, TypeError):
            raise LlmError("unexpected LLM response shape") from None
        usage = payload.get("usage") or {}
        log.info("llm call", extra={"event": "llm.call", "model": self.model_name, "prompt_tokens": usage.get("prompt_tokens"),
                                    "completion_tokens": usage.get("completion_tokens")})
        return {"content": msg.get("content"), "tool_calls": msg.get("tool_calls") or None}
