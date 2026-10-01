from __future__ import annotations

import asyncio
import json
import os
import threading
from typing import Any, AsyncGenerator

from app.services.providers import BaseProvider, MockProvider, OpenAICompatibleProvider

# ── Provider presets ───────────────────────────────────────────────────────────
# LLM_BASE_URL overrides these. Add any OpenAI-compatible endpoint here.

PROVIDER_PRESETS: dict[str, str] = {
    "groq":       "https://api.groq.com/openai/v1",
    "openai":     "https://api.openai.com/v1",
    "together":   "https://api.together.xyz/v1",
    "perplexity": "https://api.perplexity.ai",
    "ollama":     "http://localhost:11434/v1",
    "lmstudio":   "http://localhost:1234/v1",
    "vllm":       "http://localhost:8000/v1",
}

DEFAULT_MODELS: dict[str, str] = {
    "groq":       "llama-3.3-70b-versatile",
    "openai":     "gpt-4o-mini",
    "together":   "meta-llama/Llama-3-70b-chat-hf",
    "perplexity": "llama-3.1-sonar-small-128k-online",
    "ollama":     "llama3.3",
    "lmstudio":   "local-model",
    "vllm":       "local-model",
}

# Providers that work without an API key
_LOCAL_PROVIDERS = {"ollama", "lmstudio", "vllm"}


def _build_provider() -> BaseProvider:
    from app.config import settings
    # Prefer settings (populated from .env by pydantic_settings) over bare os.getenv
    provider_name = (settings.llm_provider or os.getenv("LLM_PROVIDER", "groq")).lower()

    if provider_name == "mock":
        return MockProvider()

    if provider_name == "anthropic":
        from app.services.providers import AnthropicProvider
        api_key = settings.llm_api_key or os.getenv("ANTHROPIC_API_KEY", "")
        model = settings.llm_model or "claude-3-5-haiku-20241022"
        return AnthropicProvider(api_key=api_key, model=model) if api_key else MockProvider()

    # All others (groq, openai, together, ollama, lmstudio, vllm, custom) share the
    # OpenAI-compatible interface. LLM_BASE_URL takes priority over preset.
    base_url = settings.llm_base_url or PROVIDER_PRESETS.get(provider_name, "")
    api_key = settings.llm_api_key or settings.groq_api_key
    model = settings.llm_model or settings.groq_model or DEFAULT_MODELS.get(provider_name, "")

    if not base_url:
        return MockProvider()  # unrecognised provider name → safe offline fallback

    if not api_key and provider_name not in _LOCAL_PROVIDERS:
        return MockProvider()  # cloud provider with no key → offline fallback

    return OpenAICompatibleProvider(base_url=base_url, api_key=api_key, model=model)


# ── High-level client ─────────────────────────────────────────────────────────

class LLMClient:
    """
    Task-specific interface consumed by routers.
    All actual LLM I/O is delegated to the injected BaseProvider.
    Prompt building, JSON parsing, and validation live here — not in routers.
    """

    def __init__(self, provider: BaseProvider) -> None:
        self._provider = provider

    @property
    def provider_name(self) -> str:
        return type(self._provider).__name__

    def _call_json(self, prompt: str) -> dict[str, Any]:
        raw = self._provider.chat_complete(
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
        )
        return json.loads(raw)

    def generate_question(self, prompt: str) -> dict[str, Any]:
        return self._call_json(prompt)

    def evaluate_turn(self, prompt: str) -> dict[str, Any]:
        return self._call_json(prompt)

    def evaluate_listening(self, prompt: str) -> dict[str, Any]:
        return self._call_json(prompt)

    def _build_interview_messages(
        self,
        transcript: str,
        meta: "EvaluateResponseMetadata",
        long_term_chunks: list[str],
    ) -> list[dict[str, str]]:
        state = meta.interview_state
        resume = meta.resume

        skills_str = ", ".join(
            resume.skills.languages + resume.skills.frameworks + resume.skills.databases
        ) or "not specified"
        projects_str = "\n".join(
            f"  - {p.title}: {', '.join(p.tech_stack)}"
            for p in resume.projects
        ) or "  None listed"

        stc_block = (
            "\n".join(f"Turn {i+1}: {s}" for i, s in enumerate(meta.short_term_context[-10:]))
            if meta.short_term_context
            else "No prior turns yet."
        )

        ltm_block = (
            "\n".join(f"- {chunk}" for chunk in long_term_chunks)
            if long_term_chunks
            else "No semantically relevant past context."
        )

        rubric_block = (
            json.dumps(meta.current_rubric.model_dump(), indent=2)
            if meta.current_rubric
            else '{"note": "No rubric for first question — evaluate holistically."}'
        )

        dna_list = (
            "\n".join(f"  - {item}" for item in state.do_not_ask_or_repeat)
            if state.do_not_ask_or_repeat
            else "  (none yet)"
        )

        system_prompt = f"""You are an elite AI Technical Interviewer for a campus placement program.
In a SINGLE response you must:
  1. Evaluate the candidate's last answer against the rubric.
  2. Generate the next interview question with its rubric.

== BEHAVIORAL RULES ==
- Stay strictly on the active_topic until it is marked complete.
- NEVER ask or reference anything in the do_not_ask_or_repeat list. Hard constraint.
- Ground questions in the candidate's actual resume — no generic textbook questions.
- Adjust difficulty based on candidate_performance_trend.
- When active_topic_question_count reaches max_questions_per_topic, mark topic complete
  and advance to the next in topic_curriculum.
- context_summary is stored internally, NOT shown to the candidate — capture key claims,
  technologies named, and examples given.
- technical_score strictly follows rubric scoring_bands. Vague answers with no examples ≤ 4.
- conversational_response is spoken aloud — natural, ≤ 3 sentences, end with the question.
- next_question_text is the clean question only (no framing), for DB storage.

== CANDIDATE PROFILE ==
Name: {resume.name or 'Candidate'}
Experience: {resume.experience_level}
Skills: {skills_str}
Projects:
{projects_str}

== INTERVIEW STATE ==
Active topic: {state.active_topic}
Questions on this topic so far: {state.active_topic_question_count} / {state.max_questions_per_topic}
Completed topics: {', '.join(state.completed_topics) or 'none'}
Remaining curriculum: {', '.join(t for t in state.topic_curriculum if t not in state.completed_topics)}
Current difficulty: {state.current_difficulty}
Turn: {state.current_turn} / {state.max_turns}
Performance trend: {state.candidate_performance_trend}

== DO NOT ASK OR REPEAT ==
{dna_list}

== SHORT-TERM CONTEXT (last 10 turn summaries) ==
{stc_block}

== LONG-TERM SEMANTIC RETRIEVAL ==
{ltm_block}

== RUBRIC FOR CURRENT QUESTION ==
{rubric_block}

== CURRENT QUESTION ==
[{meta.difficulty}] {meta.question_text}

== CANDIDATE'S TRANSCRIPT ==
{transcript or "(no speech detected)"}

Return ONLY valid JSON — no prose outside the JSON:
{{
  "analysis": "brief internal evaluation reasoning",
  "update_state": {{
    "mark_topic_completed": null,
    "add_to_do_not_ask": "exact question asked this turn"
  }},
  "conversational_response": "natural spoken response + next question (≤3 sentences)",
  "next_question_text": "clean question text only",
  "rubric_for_next_question": {{
    "key_concepts": ["...", "..."],
    "strong_indicators": ["...", "..."],
    "weak_indicators": ["...", "..."],
    "scoring_bands": {{
      "high": "8-10: ...",
      "mid": "5-7: ...",
      "low": "0-4: ..."
    }},
    "follow_up_probes": ["If they miss X: '...'"]
  }},
  "context_summary": "2-3 line digest of what candidate said",
  "technical_score": 0.0,
  "feedback": "...",
  "strengths": "...",
  "weaknesses": "...",
  "next_recommended_difficulty": "EASY|MEDIUM|ADVANCED"
}}"""

        return [{"role": "user", "content": system_prompt}]

    def conduct_interview(
        self,
        transcript: str,
        meta: "EvaluateResponseMetadata",
        long_term_chunks: list[str],
    ) -> dict[str, Any]:
        messages = self._build_interview_messages(transcript, meta, long_term_chunks)
        raw = self._provider.chat_complete(
            messages=messages,
            response_format={"type": "json_object"},
        )
        return json.loads(raw)

    async def conduct_interview_stream(
        self,
        transcript: str,
        meta: "EvaluateResponseMetadata",
        long_term_chunks: list[str],
    ) -> AsyncGenerator[str, None]:
        messages = self._build_interview_messages(transcript, meta, long_term_chunks)
        loop = asyncio.get_running_loop()
        queue: asyncio.Queue[str | None] = asyncio.Queue()
        error_holder: list[Exception] = []

        def _produce() -> None:
            try:
                for chunk in self._provider.chat_complete_stream(
                    messages=messages,
                    response_format={"type": "json_object"},
                ):
                    asyncio.run_coroutine_threadsafe(queue.put(chunk), loop)
            except Exception as exc:
                error_holder.append(exc)
            finally:
                asyncio.run_coroutine_threadsafe(queue.put(None), loop)

        threading.Thread(target=_produce, daemon=True).start()

        while True:
            chunk = await queue.get()
            if chunk is None:
                break
            yield chunk

        if error_holder:
            raise error_holder[0]


# ── Singleton ─────────────────────────────────────────────────────────────────

_client: LLMClient | None = None


def get_llm_client() -> LLMClient:
    global _client
    if _client is None:
        _client = LLMClient(_build_provider())
    return _client


def update_llm_config(
    provider: str | None = None,
    base_url: str | None = None,
    api_key: str | None = None,
    model: str | None = None,
) -> str:
    """Rebuild the singleton at runtime — called by POST /ai/config.

    MULTI-WORKER LIMITATION: This function mutates os.environ and the module-level
    _client singleton in the current process only. Under a multi-worker Uvicorn
    deployment (--workers N, N > 1) each worker has its own copy of os.environ and
    _client, so POST /ai/config updates only the worker that handles the request;
    other workers continue using their previous configuration non-deterministically.

    For /ai/config to work reliably, run with --workers 1 (the default in development).
    A shared-state solution (e.g. Redis-backed config) is required before multi-worker
    production deployment.
    """
    global _client
    if provider is not None:
        os.environ["LLM_PROVIDER"] = provider
    if base_url is not None:
        os.environ["LLM_BASE_URL"] = base_url
    if api_key is not None:
        os.environ["LLM_API_KEY"] = api_key
        os.environ["GROQ_API_KEY"] = api_key  # backward compat
    if model is not None:
        os.environ["LLM_MODEL"] = model
    _client = LLMClient(_build_provider())
    return _client.provider_name


# Backward-compat shim for any code that imported update_groq_config
def update_groq_config(
    api_key: str | None = None,
    model: str | None = None,
    provider: str | None = None,
) -> str:
    return update_llm_config(provider=provider, api_key=api_key, model=model)
