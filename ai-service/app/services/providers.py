from __future__ import annotations

import json
import re
from abc import ABC, abstractmethod
from typing import Any


class BaseProvider(ABC):
    """Single responsibility: call an LLM and return the raw text response."""

    @abstractmethod
    def chat_complete(
        self,
        messages: list[dict[str, str]],
        response_format: dict[str, str] | None = None,
        temperature: float = 0.7,
    ) -> str: ...

    @abstractmethod
    def chat_complete_with_tools(
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]],
    ) -> dict[str, Any]: ...


class OpenAICompatibleProvider(BaseProvider):
    """
    Works with any OpenAI-compatible endpoint.
    Covers: OpenAI, Groq, Together.ai, Ollama, vLLM, LM Studio, Jan.ai, Perplexity, etc.
    """

    def __init__(self, base_url: str, api_key: str, model: str) -> None:
        from openai import OpenAI
        self._client = OpenAI(base_url=base_url, api_key=api_key or "local")
        self._model = model

    def chat_complete(
        self,
        messages: list[dict[str, str]],
        response_format: dict[str, str] | None = None,
        temperature: float = 0.7,
    ) -> str:
        kwargs: dict[str, Any] = dict(
            model=self._model,
            messages=messages,
            temperature=temperature,
        )
        if response_format:
            kwargs["response_format"] = response_format
        resp = self._client.chat.completions.create(**kwargs)
        return resp.choices[0].message.content or ""

    def chat_complete_with_tools(
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]],
    ) -> dict[str, Any]:
        kwargs: dict[str, Any] = dict(model=self._model, messages=messages)
        if tools:
            kwargs["tools"] = tools
            kwargs["tool_choice"] = "auto"
        resp = self._client.chat.completions.create(**kwargs)
        msg = resp.choices[0].message
        if msg.tool_calls:
            tc = msg.tool_calls[0]
            return {
                "type": "tool_call",
                "tool_name": tc.function.name,
                "tool_args": json.loads(tc.function.arguments),
            }
        return {"type": "final_answer", "content": msg.content or ""}


class AnthropicProvider(BaseProvider):
    """Anthropic Claude via the official SDK."""

    def __init__(self, api_key: str, model: str = "claude-3-5-haiku-20241022") -> None:
        import anthropic
        self._client = anthropic.Anthropic(api_key=api_key)
        self._model = model

    def chat_complete(
        self,
        messages: list[dict[str, str]],
        response_format: dict[str, str] | None = None,
        temperature: float = 0.7,
    ) -> str:
        resp = self._client.messages.create(
            model=self._model,
            max_tokens=2048,
            temperature=temperature,
            messages=messages,
        )
        return resp.content[0].text

    def chat_complete_with_tools(
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]],
    ) -> dict[str, Any]:
        anthropic_tools = [
            {
                "name": t.get("function", {}).get("name", ""),
                "description": t.get("function", {}).get("description", ""),
                "input_schema": t.get("function", {}).get("parameters", {}),
            }
            for t in tools
        ]
        system_content = ""
        conv_messages: list[dict[str, Any]] = []
        for m in messages:
            if m["role"] == "system":
                system_content = m.get("content", "")
            else:
                conv_messages.append(m)

        kwargs: dict[str, Any] = dict(
            model=self._model, max_tokens=2048, messages=conv_messages
        )
        if system_content:
            kwargs["system"] = system_content
        if anthropic_tools:
            kwargs["tools"] = anthropic_tools

        resp = self._client.messages.create(**kwargs)
        for block in resp.content:
            if block.type == "tool_use":
                return {"type": "tool_call", "tool_name": block.name, "tool_args": block.input}
        text = next((b.text for b in resp.content if hasattr(b, "text")), "")
        return {"type": "final_answer", "content": text}


# ── Tool call sequence the MockProvider cycles through ────────────────────────
_TOOL_SEQUENCE = [
    "GetStudentPerformance",
    "GetSkillGapAnalysis",
    "RetrieveLearningKnowledge",
    "DraftLearningPlan",
]

_UUID_RE = re.compile(
    r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"
)


class MockProvider(BaseProvider):
    """Offline fallback — platform must work with no API key set."""

    _RESPONSES: dict[str, str] = {
        "generate_question": json.dumps({
            "question_text": "Explain the difference between a stack and a queue, and give a real-world use case for each.",
            "difficulty": "EASY",
            "category": "Data Structures",
        }),
        "evaluate_turn": json.dumps({
            "technical_score": 6.5,
            "communication_score": 7.0,
            "wpm": 130,
            "filler_words": 3,
            "feedback": "Good understanding. Try to use more concrete examples.",
            "strengths": "Clear structure and logical flow.",
            "weaknesses": "Could elaborate more on edge cases.",
            "next_recommended_difficulty": "MEDIUM",
        }),
        "evaluate_listening": json.dumps({
            "score": 7.0,
            "accuracy_level": "MEDIUM",
            "feedback": "You captured the main idea but missed some supporting details.",
            "missed_key_points": ["The timeline mentioned in the story", "The secondary character's role"],
        }),
    }

    def chat_complete(
        self,
        messages: list[dict[str, str]],
        response_format: dict[str, str] | None = None,
        temperature: float = 0.7,
    ) -> str:
        content = messages[-1].get("content", "").lower()
        if "interview question" in content or "generate" in content:
            return self._RESPONSES["generate_question"]
        if "listening" in content:
            return self._RESPONSES["evaluate_listening"]
        return self._RESPONSES["evaluate_turn"]

    def chat_complete_with_tools(
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]],
    ) -> dict[str, Any]:
        # Determine which tools have already been called via tool-role messages
        called: set[str] = {
            m.get("name", "") for m in messages if m.get("role") == "tool" and m.get("name")
        }

        # Extract the first UUID from system/user messages as studentId
        student_id = "00000000-0000-0000-0000-000000000000"
        for m in messages:
            if m.get("role") in ("system", "user"):
                match = _UUID_RE.search(m.get("content", ""))
                if match:
                    student_id = match.group(0)
                    break

        for tool_name in _TOOL_SEQUENCE:
            if tool_name in called:
                continue
            if tool_name == "GetStudentPerformance":
                return {"type": "tool_call", "tool_name": tool_name, "tool_args": {"studentId": student_id}}
            if tool_name == "GetSkillGapAnalysis":
                return {"type": "tool_call", "tool_name": tool_name, "tool_args": {"studentId": student_id}}
            if tool_name == "RetrieveLearningKnowledge":
                return {"type": "tool_call", "tool_name": tool_name, "tool_args": {"categories": ["TECHNICAL"]}}
            if tool_name == "DraftLearningPlan":
                return {
                    "type": "tool_call",
                    "tool_name": tool_name,
                    "tool_args": {"goal": "Improve interview readiness", "weakSkills": [], "durationWeeks": 4},
                }

        return {"type": "final_answer", "content": "Analysis complete. Learning plan has been drafted."}
