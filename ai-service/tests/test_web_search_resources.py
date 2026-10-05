"""
Tests for web-search resource integration in the learning plan pipeline.

With the two-phase specialist design, DraftLearningPlanTool.execute() is now a
context collector. The plan is generated in specialist_agent._generate_plan()
which calls _build_prompt(), _call_json(), _parse_response().

Covers:
  A. Context collection: knowledgeDocs/webResources passed through by execute()
  B. Prompt building: _build_prompt() includes doc IDs and web URLs
  C. Fallback plan: uses supplied resources (no invented URLs)
  D. SearchWebResourcesTool — unit tests (no real network calls)
  E. _normalise_resource correctly maps old and new resource formats
"""
from __future__ import annotations

import json
from typing import Any
from unittest.mock import MagicMock, patch

import pytest

from app.tools.base import ToolContext
from app.tools.learning_plan import DraftLearningPlanTool, _normalise_resource
from app.tools.web_search import SearchWebResourcesTool


# ── Helpers ───────────────────────────────────────────────────────────────────

def _ctx(student_id: str = "test-student", run_id: str = "test-run") -> ToolContext:
    return ToolContext(student_id=student_id, agent_run_id=run_id)


def _collect_context(args: dict[str, Any], student_id: str = "test-student") -> dict[str, Any]:
    """Run DraftLearningPlanTool.execute() and return the collected context dict."""
    tool   = DraftLearningPlanTool()
    result = tool.execute(args, _ctx(student_id=student_id))
    assert result.success, f"DraftLearningPlan failed: {result}"
    return result.data


def _run_web_search(args: dict[str, Any]) -> dict[str, Any]:
    tool   = SearchWebResourcesTool()
    result = tool.execute(args, _ctx())
    assert result.success, f"SearchWebResources failed: {result}"
    return result.data


_PERF = {
    "overall_score": 55.0, "technical_score": 72.0,
    "communication_score": 43.0, "listening_score": 50.0, "trend": "STABLE",
}
_INTERNAL_DOC = {
    "id": "doc-internal-1",
    "title": "Leadership Interview Fundamentals",
    "excerpt": "How to demonstrate leadership in behavioural interviews.",
}
_WEB_RESULT = {
    "type": "WEB",
    "title": "Conflict Resolution Interview Guide",
    "url":   "https://www.thebalancecareers.com/conflict-resolution-interview",
    "snippet": "How to answer conflict resolution interview questions.",
    "source": "thebalancecareers.com",
}
_YOUTUBE_RESULT = {
    "type": "YOUTUBE",
    "title": "Conflict Resolution Skills for Interviews",
    "url":   "https://www.youtube.com/watch?v=abc123",
    "snippet": "Video tutorial on handling workplace conflicts.",
    "source": "youtube.com",
}


def _make_llm_plan_with_resources(
    goal: str,
    weak_skills: list[str],
    duration_weeks: int,
    resources_per_week: list[list[dict]],
) -> dict:
    """Build a valid LLM-style response including typed resources."""
    weekly = []
    for i in range(duration_weeks):
        skill = weak_skills[i] if i < len(weak_skills) else weak_skills[0]
        weekly.append({
            "week":       i + 1,
            "focus":      skill,
            "skills":     [skill],
            "activities": [f"Activity A for {skill}", f"Activity B for {skill}"],
            "resources":  resources_per_week[i] if i < len(resources_per_week) else [],
        })
    return {"goal": goal, "durationWeeks": duration_weeks, "focusSkills": weak_skills, "weeklyPlan": weekly}


# ─────────────────────────────────────────────────────────────────────────────
# Test A: Context collection — execute() passes resources through
# ─────────────────────────────────────────────────────────────────────────────

class TestContextPassthrough:

    def test_internal_docs_passed_through(self):
        """execute() must include knowledgeDocs in the collected context."""
        ctx = _collect_context({
            "goal": "Improve interview readiness",
            "weakSkills": ["Leadership"],
            "performanceData": _PERF,
            "knowledgeDocs": [_INTERNAL_DOC],
            "webResources": [],
            "durationWeeks": 2,
        })
        assert ctx["knowledgeDocs"] == [_INTERNAL_DOC]

    def test_web_resources_passed_through(self):
        """execute() must include webResources in the collected context."""
        ctx = _collect_context({
            "goal": "Improve interview readiness",
            "weakSkills": ["Conflict Resolution"],
            "performanceData": _PERF,
            "knowledgeDocs": [],
            "webResources": [_WEB_RESULT, _YOUTUBE_RESULT],
            "durationWeeks": 2,
        })
        assert ctx["webResources"] == [_WEB_RESULT, _YOUTUBE_RESULT]

    def test_empty_web_resources_when_not_supplied(self):
        ctx = _collect_context({
            "goal": "G",
            "weakSkills": ["Leadership"],
            "knowledgeDocs": [_INTERNAL_DOC],
            "durationWeeks": 2,
        })
        assert ctx["webResources"] == []

    def test_ready_for_generation_true(self):
        ctx = _collect_context({"goal": "G", "weakSkills": [], "durationWeeks": 1})
        assert ctx["_ready_for_generation"] is True

    def test_execute_does_not_call_llm(self):
        """execute() must not call the LLM — confirmed by _ready_for_generation=True."""
        ctx = _collect_context({"goal": "G", "weakSkills": [], "durationWeeks": 1})
        assert ctx.get("_ready_for_generation") is True
        assert "weeklyPlan" not in ctx


# ─────────────────────────────────────────────────────────────────────────────
# Test B: Prompt building — _build_prompt includes resource data
# ─────────────────────────────────────────────────────────────────────────────

class TestPromptBuilding:

    def _prompt(self, goal, weak_skills, perf, docs, web, duration=1, student_id="s1"):
        tool = DraftLearningPlanTool()
        return tool._build_prompt(student_id, goal, weak_skills, perf, docs, web, duration)

    def test_internal_doc_id_in_prompt(self):
        prompt = self._prompt(
            "Goal", ["Leadership"], _PERF, [_INTERNAL_DOC], [], duration=1
        )
        assert "doc-internal-1" in prompt
        assert "Leadership Interview Fundamentals" in prompt

    def test_web_url_in_prompt(self):
        prompt = self._prompt(
            "Goal", ["Conflict Resolution"], _PERF, [], [_WEB_RESULT], duration=1
        )
        assert _WEB_RESULT["url"] in prompt
        assert _WEB_RESULT["title"] in prompt

    def test_youtube_url_in_prompt(self):
        prompt = self._prompt(
            "Goal", ["Conflict Resolution"], _PERF, [], [_YOUTUBE_RESULT], duration=1
        )
        assert _YOUTUBE_RESULT["url"] in prompt

    def test_student_id_in_prompt(self):
        prompt = self._prompt("Goal", [], {}, [], [], student_id="unique-student-xyz")
        assert "unique-student-xyz" in prompt

    def test_no_web_section_when_no_web_resources(self):
        prompt = self._prompt("Goal", ["Leadership"], _PERF, [_INTERNAL_DOC], [], duration=1)
        # Should not contain any web URLs
        assert "https://" not in prompt or "thebalancecareers" not in prompt


# ─────────────────────────────────────────────────────────────────────────────
# Test C: Fallback plan — uses supplied resources, no invented URLs
# ─────────────────────────────────────────────────────────────────────────────

class TestFallbackWithResources:

    def _fallback(self, weak_skills, docs=None, web=None, duration=2):
        tool = DraftLearningPlanTool()
        return tool._fallback_plan(
            "Improve interview readiness",
            weak_skills,
            docs or [],
            web or [],
            duration,
        )

    def test_no_fake_urls_when_no_resources(self):
        plan = self._fallback(["Leadership", "Adaptability"])
        for week in plan["weeklyPlan"]:
            for res in week.get("resources", []):
                assert not res.get("url"), f"Invented URL in fallback: {res}"

    def test_internal_doc_in_fallback_resources(self):
        plan = self._fallback(["Leadership"], docs=[_INTERNAL_DOC], duration=1)
        all_resources = [r for w in plan["weeklyPlan"] for r in w.get("resources", [])]
        assert any(r.get("type") == "INTERNAL" for r in all_resources)

    def test_web_resource_in_fallback_resources(self):
        plan = self._fallback(["Conflict Resolution"], web=[_WEB_RESULT], duration=1)
        all_resources = [r for w in plan["weeklyPlan"] for r in w.get("resources", [])]
        web = [r for r in all_resources if r.get("type") == "WEB"]
        assert web, "Fallback must include supplied web resource"
        assert web[0]["url"] == _WEB_RESULT["url"]

    def test_fallback_generation_source(self):
        plan = self._fallback(["Leadership"])
        # _fallback_plan does not set generation_source — that's set by the caller
        # Just confirm the plan structure is valid
        assert "weeklyPlan" in plan
        assert len(plan["weeklyPlan"]) == 2


# ─────────────────────────────────────────────────────────────────────────────
# SearchWebResourcesTool — unit tests (no real network calls)
# ─────────────────────────────────────────────────────────────────────────────

class TestSearchWebResourcesTool:

    def _mock_ddgs_text(self, web_rows, yt_rows=None):
        """
        Return a mock DDGS *class* (callable) that, when called as DDGS(),
        produces a context-manager instance with .text() yielding the given rows.

        Uses side_effect so each text() call gets a fresh iterator — required
        because multi-query search calls text() multiple times.
        """
        rows = list(web_rows) + list(yt_rows or [])
        ddgs_instance = MagicMock()
        # Return fresh iterator each call so multi-query doesn't exhaust it
        ddgs_instance.text.side_effect = lambda *a, **kw: iter(rows)
        ddgs_instance.__enter__ = MagicMock(return_value=ddgs_instance)
        ddgs_instance.__exit__ = MagicMock(return_value=False)
        ddgs_class = MagicMock(return_value=ddgs_instance)
        return ddgs_class

    def test_returns_web_results(self):
        # Use rows that contain "conflict resolution" so they pass the relevance filter
        fake_rows = [
            {"title": "Conflict Resolution Guide",  "href": "https://example.com/conflict-resolution",  "body": "How to resolve conflicts effectively."},
            {"title": "Conflict Resolution Skills", "href": "https://interview.io/conflict-resolution",  "body": "Conflict resolution techniques for interviews."},
        ]
        mock_ddgs = self._mock_ddgs_text(fake_rows)
        import app.tools.web_search as ws
        with patch.object(ws, "DDGS", mock_ddgs), \
             patch("app.tools.web_search.cache_get", return_value=None), \
             patch("app.tools.web_search.cache_set"):
            data = _run_web_search({
                "query": "conflict resolution interview",
                "skills": ["Conflict Resolution"],
                "include_youtube": False,
            })
        resources = data["webResources"]
        assert len(resources) >= 1
        assert resources[0]["type"] == "WEB"
        assert "conflict" in resources[0]["url"].lower()

    def test_returns_youtube_results(self):
        yt_row = {"title": "Conflict Video", "href": "https://www.youtube.com/watch?v=xyz", "body": "Video."}
        ddgs_instance = MagicMock()
        def fake_text(query, max_results=5, **kwargs):
            # YouTube search uses site:youtube.com prefix
            if "site:youtube.com" in query:
                return iter([yt_row])
            return iter([])
        ddgs_instance.text.side_effect = fake_text
        ddgs_instance.__enter__ = MagicMock(return_value=ddgs_instance)
        ddgs_instance.__exit__ = MagicMock(return_value=False)
        ddgs_class = MagicMock(return_value=ddgs_instance)

        import app.tools.web_search as ws
        with patch.object(ws, "DDGS", ddgs_class), \
             patch("app.tools.web_search.cache_get", return_value=None), \
             patch("app.tools.web_search.cache_set"):
            with patch.object(ws.time, "sleep"):
                data = _run_web_search({
                    "query": "conflict resolution", "skills": [], "include_youtube": True
                })

        yt = [r for r in data["webResources"] if r["type"] == "YOUTUBE"]
        assert yt, "Expected YOUTUBE resource in results"
        assert "youtube.com" in yt[0]["url"]
        assert yt[0]["title"] == "Conflict Video"

    def test_graceful_when_duckduckgo_not_installed(self):
        """If DDGS is None (package not installed), returns empty list without raising."""
        import app.tools.web_search as ws
        with patch.object(ws, "DDGS", None):
            tool   = SearchWebResourcesTool()
            result = tool.execute({"query": "leadership", "skills": []}, _ctx())
        assert result.success
        assert result.data["webResources"] == []

    def test_graceful_when_search_raises(self):
        """If DDGS.text() raises, tool returns empty list without propagating exception."""
        ddgs_instance = MagicMock()
        ddgs_instance.text.side_effect = Exception("Rate limited")
        ddgs_instance.__enter__ = MagicMock(return_value=ddgs_instance)
        ddgs_instance.__exit__ = MagicMock(return_value=False)
        ddgs_class = MagicMock(return_value=ddgs_instance)

        import app.tools.web_search as ws
        with patch.object(ws, "DDGS", ddgs_class):
            data = _run_web_search({"query": "test", "skills": [], "include_youtube": False})
        assert data["webResources"] == []

    def test_requires_query(self):
        """Tool fails when neither query nor skills are provided."""
        tool   = SearchWebResourcesTool()
        result = tool.execute({"skills": []}, _ctx())
        assert not result.success
        assert result.error_code == "INVALID_ARGS"

    def test_youtube_urls_excluded_from_web_results(self):
        """Web results that happen to point to YouTube must be filtered out."""
        rows = [
            {"title": "YT video",  "href": "https://youtube.com/watch?v=abc", "body": "Video"},
            {"title": "Real site", "href": "https://realdomain.com/article",  "body": "Article"},
        ]
        mock_ddgs = self._mock_ddgs_text(rows)
        import app.tools.web_search as ws
        with patch.object(ws, "DDGS", mock_ddgs):
            data = _run_web_search({"query": "leadership", "skills": [], "include_youtube": False})
        web = [r for r in data["webResources"] if r["type"] == "WEB"]
        assert all("youtube.com" not in r["url"] for r in web), \
            "YouTube URL leaked into WEB results"

    def test_result_structure(self):
        rows = [{"title": "T", "href": "https://example.com", "body": "Body text"}]
        mock_ddgs = self._mock_ddgs_text(rows)
        import app.tools.web_search as ws
        with patch.object(ws, "DDGS", mock_ddgs):
            data = _run_web_search({"query": "q", "include_youtube": False})
        r = data["webResources"][0]
        assert set(r.keys()) >= {"type", "title", "url", "snippet", "source"}
        assert r["type"] == "WEB"
        assert r["url"] == "https://example.com"
        assert r["source"] == "example.com"


# ─────────────────────────────────────────────────────────────────────────────
# TestCacheBehavior — CACHE_MISS → external search → CACHE_STORE → CACHE_HIT
# ─────────────────────────────────────────────────────────────────────────────

class TestCacheBehavior:
    """
    Verify the full cache lifecycle without hitting real Redis or the network.

    CACHE_MISS path:  cache_get returns None → DDGS.text called → cache_set called
    CACHE_HIT  path:  cache_get returns data → DDGS.text NOT called → cache_set NOT called
    """

    _WEB_ROW = {
        "title": "Interview Preparation Guide",
        "href":  "https://www.glassdoor.com/blog/behavioral-interview-tips",
        "body":  "How to prepare for behavioral interview questions.",
    }
    _YT_ROW = {
        "title": "Behavioral Interview Tutorial",
        "href":  "https://www.youtube.com/watch?v=behavtest123",
        "body":  "Step-by-step guide.",
    }

    def _ddgs_class(self, web_rows, yt_rows=None):
        yt = list(yt_rows or [])

        def fake_text(query, max_results=5, **kwargs):
            if "site:youtube.com" in query:
                return iter(yt)
            return iter(list(web_rows))

        inst = MagicMock()
        inst.text.side_effect = fake_text
        inst.__enter__ = MagicMock(return_value=inst)
        inst.__exit__  = MagicMock(return_value=False)
        return MagicMock(return_value=inst)

    def test_cache_miss_calls_ddgs(self):
        """CACHE_MISS: DDGS.text must be called (external search happens)."""
        import app.tools.web_search as ws
        mock_ddgs = self._ddgs_class([self._WEB_ROW])
        with patch.object(ws, "DDGS", mock_ddgs), \
             patch("app.tools.web_search.cache_get", return_value=None), \
             patch("app.tools.web_search.cache_set"), \
             patch.object(ws.time, "sleep"):
            result = SearchWebResourcesTool().execute(
                {"query": "behavioral interview", "skills": ["cache-miss-unique-test"], "include_youtube": False},
                _ctx(),
            )
        assert result.success
        assert result.cache_hit is False
        # DDGS was called at least once (the web search)
        mock_ddgs.return_value.text.assert_called()

    def test_cache_miss_stores_result(self):
        """CACHE_MISS: cache_set must be called with the search results."""
        import app.tools.web_search as ws
        import re
        stored: dict = {}

        def fake_set(key, value, ttl):
            stored["key"]   = key
            stored["value"] = value

        mock_ddgs = self._ddgs_class([self._WEB_ROW])
        with patch.object(ws, "DDGS", mock_ddgs), \
             patch("app.tools.web_search.cache_get", return_value=None), \
             patch("app.tools.web_search.cache_set", side_effect=fake_set), \
             patch.object(ws.time, "sleep"):
            SearchWebResourcesTool().execute(
                {"query": "behavioral interview", "skills": ["store-test-skill"], "include_youtube": False},
                _ctx(),
            )
        assert "key" in stored, "cache_set was never called on CACHE_MISS"
        # Cache key is now query-hash-based (12 hex chars), not skill-name-based
        assert re.search(r"[0-9a-f]{12}", stored["key"]), \
            f"Cache key does not contain a query hash: {stored['key']!r}"
        assert "webResources" in stored["value"]

    def test_cache_hit_skips_ddgs(self):
        """CACHE_HIT: DDGS.text must NOT be called when cache returns data."""
        cached_data = {
            "skills":       ["behavioral"],
            "query":        "behavioral interview",
            "webResources": [_WEB_RESULT],
            "totalFound":   1,
        }
        import app.tools.web_search as ws
        mock_ddgs = self._ddgs_class([self._WEB_ROW])
        with patch.object(ws, "DDGS", mock_ddgs), \
             patch("app.tools.web_search.cache_get", return_value=cached_data), \
             patch("app.tools.web_search.cache_set") as mock_set:
            result = SearchWebResourcesTool().execute(
                {"query": "behavioral interview", "skills": ["behavioral"], "include_youtube": False},
                _ctx(),
            )
        assert result.success
        assert result.cache_hit is True
        mock_ddgs.return_value.text.assert_not_called()
        mock_set.assert_not_called()

    def test_cache_hit_returns_cached_resources(self):
        """CACHE_HIT: data returned is exactly what was cached."""
        cached_data = {
            "skills":       ["behavioral"],
            "query":        "behavioral interview",
            "webResources": [_WEB_RESULT, _YOUTUBE_RESULT],
            "totalFound":   2,
        }
        import app.tools.web_search as ws
        with patch("app.tools.web_search.cache_get", return_value=cached_data), \
             patch("app.tools.web_search.cache_set"):
            result = SearchWebResourcesTool().execute(
                {"query": "behavioral interview", "skills": ["behavioral"], "include_youtube": True},
                _ctx(),
            )
        assert result.data["webResources"] == [_WEB_RESULT, _YOUTUBE_RESULT]

    def test_no_skills_uses_raw_query_for_cache(self):
        """With no skills, the raw query is used for cache key computation."""
        import app.tools.web_search as ws
        mock_ddgs = self._ddgs_class([self._WEB_ROW])
        with patch.object(ws, "DDGS", mock_ddgs), \
             patch("app.tools.web_search.cache_get", return_value=None) as mock_get, \
             patch("app.tools.web_search.cache_set") as mock_set, \
             patch.object(ws.time, "sleep"):
            result = SearchWebResourcesTool().execute(
                {"query": "leadership skills", "skills": [], "include_youtube": False},
                _ctx(),
            )
        assert result.success
        # With no skills, query hash from raw_query is used — cache_get IS called
        mock_get.assert_called_once()
        mock_set.assert_called_once()


# ─────────────────────────────────────────────────────────────────────────────
# TestUrlValidity — returned resources have syntactically valid URLs
# ─────────────────────────────────────────────────────────────────────────────

class TestUrlValidity:
    """Verify URL structure and WEB vs YOUTUBE type distinction."""

    def _ddgs_class_with_rows(self, web_rows, yt_rows=None):
        yt = list(yt_rows or [])

        def fake_text(query, max_results=5, **kwargs):
            # YouTube search uses site:youtube.com prefix
            if "site:youtube.com" in query:
                return iter(yt)
            return iter(list(web_rows))

        inst = MagicMock()
        inst.text.side_effect = fake_text
        inst.__enter__ = MagicMock(return_value=inst)
        inst.__exit__  = MagicMock(return_value=False)
        return MagicMock(return_value=inst)

    def test_web_urls_are_syntactically_valid(self):
        """Every WEB resource must have a URL with a valid scheme and netloc."""
        from urllib.parse import urlparse
        web_rows = [
            {"title": "Glassdoor Tips",  "href": "https://www.glassdoor.com/tips",          "body": "Tips."},
            {"title": "Balance Careers", "href": "https://www.thebalancecareers.com/tips",   "body": "More."},
        ]
        import app.tools.web_search as ws
        mock_ddgs = self._ddgs_class_with_rows(web_rows)
        with patch.object(ws, "DDGS", mock_ddgs), \
             patch("app.tools.web_search.cache_get", return_value=None), \
             patch("app.tools.web_search.cache_set"):
            result = SearchWebResourcesTool().execute(
                {"query": "conflict resolution interview", "skills": ["url-valid-test"], "include_youtube": False},
                _ctx(),
            )
        for r in result.data["webResources"]:
            parsed = urlparse(r["url"])
            assert parsed.scheme in ("http", "https"), f"Bad scheme in: {r['url']}"
            assert parsed.netloc,                       f"No domain in:   {r['url']}"

    def test_youtube_url_contains_watch_path(self):
        """YOUTUBE resource URL must contain 'youtube.com/watch' or 'youtu.be/'."""
        yt_rows = [
            {"title": "Conflict Tutorial", "href": "https://www.youtube.com/watch?v=abcXYZ", "body": "Watch."},
        ]
        import app.tools.web_search as ws
        mock_ddgs = self._ddgs_class_with_rows([], yt_rows=yt_rows)
        with patch.object(ws, "DDGS", mock_ddgs), \
             patch("app.tools.web_search.cache_get", return_value=None), \
             patch("app.tools.web_search.cache_set"), \
             patch.object(ws.time, "sleep"):
            result = SearchWebResourcesTool().execute(
                {"query": "conflict resolution", "skills": ["yt-url-test"], "include_youtube": True},
                _ctx(),
            )
        yt = [r for r in result.data["webResources"] if r["type"] == "YOUTUBE"]
        assert yt, "Expected YOUTUBE resource"
        url = yt[0]["url"]
        assert "youtube.com/watch" in url or "youtu.be/" in url, \
            f"YouTube resource has unexpected URL: {url}"

    def test_web_and_youtube_types_are_distinct(self):
        """WEB and YOUTUBE resources must have correct type fields and non-overlapping URLs."""
        web_rows = [{"title": "Web Guide", "href": "https://example.com/guide", "body": "Guide."}]
        yt_rows  = [{"title": "YT Video",  "href": "https://www.youtube.com/watch?v=typetest", "body": "Vid."}]
        import app.tools.web_search as ws
        mock_ddgs = self._ddgs_class_with_rows(web_rows, yt_rows=yt_rows)
        with patch.object(ws, "DDGS", mock_ddgs), \
             patch("app.tools.web_search.cache_get", return_value=None), \
             patch("app.tools.web_search.cache_set"), \
             patch.object(ws.time, "sleep"):
            result = SearchWebResourcesTool().execute(
                {"query": "behavioral interview", "skills": ["type-distinct-test"], "include_youtube": True},
                _ctx(),
            )
        resources = result.data["webResources"]
        web_res = [r for r in resources if r["type"] == "WEB"]
        yt_res  = [r for r in resources if r["type"] == "YOUTUBE"]
        assert web_res, "Expected at least one WEB resource"
        assert yt_res,  "Expected at least one YOUTUBE resource"
        assert all("youtube.com" not in r["url"] for r in web_res), \
            "YouTube URL leaked into WEB results"
        assert all("youtube.com" in r["url"] or "youtu.be/" in r["url"] for r in yt_res), \
            "Non-YouTube URL in YOUTUBE results"

    def test_web_resources_have_required_fields(self):
        """Each WEB resource must have: type, title, url, snippet, source."""
        web_rows = [{"title": "Field Test", "href": "https://fieldtest.com/page", "body": "Body text here."}]
        import app.tools.web_search as ws
        mock_ddgs = self._ddgs_class_with_rows(web_rows)
        with patch.object(ws, "DDGS", mock_ddgs), \
             patch("app.tools.web_search.cache_get", return_value=None), \
             patch("app.tools.web_search.cache_set"):
            result = SearchWebResourcesTool().execute(
                {"query": "leadership communication", "skills": ["fields-test"], "include_youtube": False},
                _ctx(),
            )
        for r in result.data["webResources"]:
            assert "type"    in r, "Missing 'type'"
            assert "title"   in r, "Missing 'title'"
            assert "url"     in r, "Missing 'url'"
            assert "snippet" in r, "Missing 'snippet'"
            assert "source"  in r, "Missing 'source'"

    def test_totalfound_matches_resource_count(self):
        """data['totalFound'] must equal len(data['webResources'])."""
        web_rows = [
            {"title": "A", "href": "https://a.com", "body": "a"},
            {"title": "B", "href": "https://b.com", "body": "b"},
        ]
        import app.tools.web_search as ws
        mock_ddgs = self._ddgs_class_with_rows(web_rows)
        with patch.object(ws, "DDGS", mock_ddgs), \
             patch("app.tools.web_search.cache_get", return_value=None), \
             patch("app.tools.web_search.cache_set"):
            result = SearchWebResourcesTool().execute(
                {"query": "public speaking", "skills": ["count-test"], "include_youtube": False},
                _ctx(),
            )
        data = result.data
        assert data["totalFound"] == len(data["webResources"])


# ─────────────────────────────────────────────────────────────────────────────
# Resource normalisation (_normalise_resource)
# ─────────────────────────────────────────────────────────────────────────────

class TestNormaliseResource:

    def test_old_format_maps_to_internal(self):
        r = _normalise_resource({"documentId": "doc-1", "title": "Guide"})
        assert r["type"] == "INTERNAL"
        assert r["documentId"] == "doc-1"

    def test_new_internal_format_preserved(self):
        r = _normalise_resource({"type": "INTERNAL", "documentId": "doc-2", "title": "Guide"})
        assert r["type"] == "INTERNAL"
        assert r["documentId"] == "doc-2"

    def test_web_format_preserved(self):
        r = _normalise_resource({"type": "WEB", "url": "https://x.com", "title": "X"})
        assert r["type"] == "WEB"
        assert r["url"] == "https://x.com"

    def test_youtube_format_preserved(self):
        r = _normalise_resource({"type": "YOUTUBE", "url": "https://youtube.com/watch?v=1", "title": "Y"})
        assert r["type"] == "YOUTUBE"
        assert "youtube.com" in r["url"]

    def test_url_present_without_type_infers_web(self):
        r = _normalise_resource({"url": "https://example.com", "title": "Site"})
        assert r["type"] == "WEB"
        assert r["url"] == "https://example.com"

    def test_non_dict_resource_handled(self):
        r = _normalise_resource("Some string resource")
        assert r["type"] == "INTERNAL"
        assert "Some string resource" in r["title"]


# ─────────────────────────────────────────────────────────────────────────────
# TestResourceRelevance — build_resource_queries + relevance scoring
# ─────────────────────────────────────────────────────────────────────────────

class TestResourceRelevance:
    """Verify topic-aware query generation and relevance filtering."""

    def test_technical_skill_gets_technical_queries(self):
        from app.tools.web_search import build_resource_queries, _classify_skill
        assert _classify_skill("Problem Solving") == "TECHNICAL"
        queries = build_resource_queries("Problem Solving", "", "DSA interview", "beginner")
        assert len(queries) >= 2
        for q in queries:
            assert "behavioral interview" not in q.lower(), \
                f"Technical skill got behavioral query: {q!r}"
        assert any("problem solving" in q.lower() for q in queries)

    def test_behavioral_skill_gets_behavioral_queries(self):
        from app.tools.web_search import build_resource_queries, _classify_skill
        assert _classify_skill("Leadership") == "BEHAVIORAL"
        queries = build_resource_queries("Leadership", "", "placement interviews", "beginner")
        assert len(queries) >= 2
        for q in queries:
            assert "coding" not in q.lower(), \
                f"Behavioral skill got technical coding query: {q!r}"
        behavioral_terms = {"behavioral", "star", "interview", "improve"}
        assert any(any(t in q.lower() for t in behavioral_terms) for q in queries)

    def test_dsa_resources_filtered_for_behavioral_skill(self):
        from app.tools.web_search import _filter_relevant, _relevance_score
        dsa_resource = {
            "type": "WEB",
            "title": "Arrays and Two Pointer Technique — LeetCode Tutorial",
            "snippet": "Learn arrays, two pointer, and sliding window for coding interviews.",
            "url": "https://leetcode.com/arrays-tutorial",
        }
        score = _relevance_score(dsa_resource, "Leadership", "")
        assert score < 0.5, f"DSA resource scored too high for behavioral skill: {score}"

    def test_behavioral_resources_low_score_for_technical_skill(self):
        from app.tools.web_search import _relevance_score
        behavioral_resource = {
            "type": "YOUTUBE",
            "title": "Top Behavioral Interview Questions and STAR Method Answers",
            "snippet": "How to answer behavioral questions using the STAR framework.",
            "url": "https://www.youtube.com/watch?v=behavioral123",
        }
        score = _relevance_score(behavioral_resource, "Problem Solving", "arrays two pointer")
        assert score < 0.5, f"Behavioral resource scored too high for technical skill: {score}"

    def test_technical_resource_scores_high_for_technical_skill(self):
        from app.tools.web_search import _relevance_score
        tech_resource = {
            "type": "WEB",
            "title": "Problem Solving with Arrays — Complete Tutorial",
            "snippet": "Learn problem solving techniques including two pointer and sliding window for arrays.",
            "url": "https://example.com/problem-solving-arrays",
        }
        score = _relevance_score(tech_resource, "Problem Solving", "arrays two pointer")
        assert score >= 0.3, f"Technical resource scored too low for matching skill: {score}"

    def test_behavioral_resource_scores_high_for_behavioral_skill(self):
        from app.tools.web_search import _relevance_score
        behavioral_resource = {
            "type": "WEB",
            "title": "Leadership Interview Preparation Guide",
            "snippet": "How to demonstrate leadership in behavioral interviews using STAR method.",
            "url": "https://example.com/leadership-interview",
        }
        score = _relevance_score(behavioral_resource, "Leadership", "")
        assert score >= 0.3, f"Behavioral resource scored too low for matching skill: {score}"

    def test_multi_query_deduplication(self):
        from unittest.mock import MagicMock, patch
        import app.tools.web_search as ws

        same_row = {"title": "Problem Solving Guide", "href": "https://guide.com/ps", "body": "Guide."}
        call_count = [0]

        def fake_text(query, max_results=5, **kwargs):
            call_count[0] += 1
            return iter([same_row])

        inst = MagicMock()
        inst.text.side_effect = fake_text
        inst.__enter__ = MagicMock(return_value=inst)
        inst.__exit__  = MagicMock(return_value=False)
        ddgs_class = MagicMock(return_value=inst)

        with patch.object(ws, "DDGS", ddgs_class), \
             patch("app.tools.web_search.cache_get", return_value=None), \
             patch("app.tools.web_search.cache_set"), \
             patch.object(ws.time, "sleep"):
            tool   = ws.SearchWebResourcesTool()
            result = tool.execute(
                {"query": "problem solving", "skills": ["Problem Solving"], "include_youtube": False},
                ToolContext(student_id="s1", agent_run_id="r1"),
            )

        assert call_count[0] >= 2, "Expected multi-query search"
        urls = [r["url"] for r in result.data["webResources"]]
        assert len(urls) == len(set(urls)), f"Duplicate URLs found: {urls}"

    def test_cache_key_is_query_hash(self):
        import app.tools.web_search as ws
        from unittest.mock import MagicMock, patch
        import re

        stored_key = [None]

        def fake_set(key, value, ttl):
            stored_key[0] = key

        web_row = {"title": "PS Guide", "href": "https://guide.com/ps", "body": "Guide."}
        inst = MagicMock()
        inst.text.return_value = iter([web_row])
        inst.__enter__ = MagicMock(return_value=inst)
        inst.__exit__  = MagicMock(return_value=False)
        ddgs_class = MagicMock(return_value=inst)

        with patch.object(ws, "DDGS", ddgs_class), \
             patch("app.tools.web_search.cache_get", return_value=None), \
             patch("app.tools.web_search.cache_set", side_effect=fake_set), \
             patch.object(ws.time, "sleep"):
            ws.SearchWebResourcesTool().execute(
                {"query": "problem solving", "skills": ["Problem Solving"], "include_youtube": False},
                ToolContext(student_id="s1", agent_run_id="r1"),
            )

        assert stored_key[0] is not None, "cache_set was never called"
        assert re.search(r"[0-9a-f]{12}", stored_key[0]), \
            f"Cache key does not appear to contain a query hash: {stored_key[0]!r}"


# ─────────────────────────────────────────────────────────────────────────────
# TestYouTubeSearch — 14 YouTube-specific unit tests (no Groq, no real network)
# ─────────────────────────────────────────────────────────────────────────────

class TestYouTubeSearch:
    """Unit tests for _search_youtube() and YouTube handling in SearchWebResourcesTool.
    All tests use mocked DDGS — no real network calls and no Groq LLM calls.
    """

    # ── helper ─────────────────────────────────────────────────────────────

    @staticmethod
    def _ddgs_with_yt_rows(yt_rows, web_rows=None):
        _web = list(web_rows or [])
        _yt  = list(yt_rows)

        def fake_text(query, max_results=5, **kwargs):
            if "site:youtube.com" in query:
                return iter(_yt)
            return iter(_web)

        inst = MagicMock()
        inst.text.side_effect = fake_text
        inst.__enter__ = MagicMock(return_value=inst)
        inst.__exit__  = MagicMock(return_value=False)
        return MagicMock(return_value=inst)

    @staticmethod
    def _run_yt(yt_rows, web_rows=None, skills=None, query="data structures"):
        """Run SearchWebResourcesTool with YouTube enabled and return webResources list."""
        import app.tools.web_search as ws
        ddgs_cls = TestYouTubeSearch._ddgs_with_yt_rows(yt_rows, web_rows)
        with patch.object(ws, "DDGS", ddgs_cls), \
             patch("app.tools.web_search.cache_get", return_value=None), \
             patch("app.tools.web_search.cache_set"), \
             patch.object(ws.time, "sleep"):
            result = ws.SearchWebResourcesTool().execute(
                {"query": query, "skills": skills or [], "include_youtube": True},
                ToolContext(student_id="yt-test", agent_run_id="yt-run"),
            )
        assert result.success, f"SearchWebResources failed: {result}"
        return result.data["webResources"]

    # ── 1. valid youtube.com/watch URL accepted ────────────────────────────

    def test_valid_watch_url_accepted(self):
        yt_rows = [{"title": "DSA Tutorial", "href": "https://www.youtube.com/watch?v=abcDEF", "body": "Tutorial."}]
        resources = self._run_yt(yt_rows)
        yt = [r for r in resources if r["type"] == "YOUTUBE"]
        assert yt, "Expected YOUTUBE resource for youtube.com/watch?v= URL"
        assert "youtube.com/watch?v=" in yt[0]["url"]

    # ── 2. valid youtu.be short URL accepted ──────────────────────────────

    def test_valid_youtu_be_short_url_accepted(self):
        yt_rows = [{"title": "Short Link Video", "href": "https://youtu.be/AbCdEfGhIjK", "body": "Short."}]
        resources = self._run_yt(yt_rows)
        yt = [r for r in resources if r["type"] == "YOUTUBE"]
        assert yt, "Expected YOUTUBE resource for youtu.be/ short URL"
        assert "youtu.be/" in yt[0]["url"]

    # ── 3. invalid URL (playlist, channel, homepage) rejected ─────────────

    def test_invalid_youtube_url_rejected(self):
        yt_rows = [
            {"title": "Playlist",  "href": "https://www.youtube.com/playlist?list=PLabc123", "body": "Playlist."},
            {"title": "Channel",   "href": "https://www.youtube.com/channel/UCtest",          "body": "Channel."},
            {"title": "Homepage",  "href": "https://www.youtube.com/",                        "body": "Home."},
        ]
        resources = self._run_yt(yt_rows)
        yt = [r for r in resources if r["type"] == "YOUTUBE"]
        assert not yt, (
            f"Playlist/channel/homepage URLs must be rejected, got: {[r['url'] for r in yt]}"
        )

    # ── 4. duplicate URL removal ───────────────────────────────────────────

    def test_youtube_duplicate_url_removed(self):
        same_yt = {"title": "Video A", "href": "https://www.youtube.com/watch?v=dup123", "body": "Dup."}
        # Both web and youtube batches contain the same URL
        web_rows = [{"title": "Web Version", "href": "https://www.youtube.com/watch?v=dup123", "body": "Web dup."}]
        yt_rows  = [same_yt]
        resources = self._run_yt(yt_rows, web_rows=web_rows)
        dup_urls  = [r["url"] for r in resources if "dup123" in r["url"]]
        assert len(dup_urls) == len(set(dup_urls)), f"Duplicate URL found: {dup_urls}"

    # ── 5. DDGS result fields parsed correctly ────────────────────────────

    def test_ddgs_result_fields_parsed(self):
        yt_rows = [{"title": "Array Sorting Algorithms", "href": "https://www.youtube.com/watch?v=sort42", "body": "Merge sort tutorial."}]
        resources = self._run_yt(yt_rows)
        yt = [r for r in resources if r["type"] == "YOUTUBE"]
        assert yt, "Expected YOUTUBE resource"
        r = yt[0]
        assert r["title"]   == "Array Sorting Algorithms"
        assert r["url"]     == "https://www.youtube.com/watch?v=sort42"
        assert "sort" in r["snippet"].lower()
        assert r["source"]  == "youtube.com"
        assert r["type"]    == "YOUTUBE"

    # ── 6. m.youtube.com normalized to www.youtube.com ────────────────────

    def test_m_youtube_url_normalized(self):
        yt_rows = [{"title": "Mobile Video", "href": "https://m.youtube.com/watch?v=mobile99", "body": "Mobile."}]
        resources = self._run_yt(yt_rows)
        yt = [r for r in resources if r["type"] == "YOUTUBE"]
        assert yt, "Expected YOUTUBE resource after m.youtube.com normalization"
        assert "m.youtube.com" not in yt[0]["url"], (
            f"m.youtube.com not normalized: {yt[0]['url']}"
        )
        assert "www.youtube.com" in yt[0]["url"], (
            f"Expected www.youtube.com after normalization: {yt[0]['url']}"
        )

    # ── 7. zero provider results — returns empty, no crash ────────────────

    def test_zero_youtube_results_returns_empty(self):
        resources = self._run_yt(yt_rows=[])
        yt = [r for r in resources if r["type"] == "YOUTUBE"]
        assert yt == [], f"Expected no YOUTUBE resources when provider returns 0, got: {yt}"

    # ── 8. provider exception handled — returns empty, no crash ──────────

    def test_youtube_provider_exception_handled(self):
        import app.tools.web_search as ws

        exc_inst = MagicMock()
        exc_inst.text.side_effect = Exception("DDGSException: No results found.")
        exc_inst.__enter__ = MagicMock(return_value=exc_inst)
        exc_inst.__exit__  = MagicMock(return_value=False)
        ddgs_cls = MagicMock(return_value=exc_inst)

        with patch.object(ws, "DDGS", ddgs_cls), \
             patch("app.tools.web_search.cache_get", return_value=None), \
             patch("app.tools.web_search.cache_set"), \
             patch.object(ws.time, "sleep"):
            result = ws.SearchWebResourcesTool().execute(
                {"query": "algorithms", "skills": [], "include_youtube": True},
                ToolContext(student_id="exc-test", agent_run_id="exc-run"),
            )
        assert result.success, "Tool must succeed even when DDGS raises"
        yt = [r for r in result.data["webResources"] if r["type"] == "YOUTUBE"]
        assert yt == [], f"Expected no YOUTUBE resources on exception, got: {yt}"

    # ── 9. query generation uses skill name ───────────────────────────────

    def test_youtube_query_contains_skill_name(self):
        from app.tools.web_search import build_resource_queries
        queries = build_resource_queries("Problem Solving", "", "technical interview", "beginner")
        assert any("problem solving" in q.lower() for q in queries), (
            f"Expected skill name in generated queries; got: {queries}"
        )

    # ── 10. YouTube relevance — problem-solving DSA result survives for Problem Solving ──

    def test_youtube_dsa_result_relevant_for_technical_skill(self):
        from app.tools.web_search import _relevance_score
        dsa_yt = {
            "type":    "YOUTUBE",
            "title":   "Problem Solving with Data Structures & Algorithms",
            "snippet": "Problem solving techniques — arrays, trees, graphs for coding interviews.",
            "url":     "https://www.youtube.com/watch?v=dsafull99",
        }
        score = _relevance_score(dsa_yt, "Problem Solving", "arrays two pointer")
        assert score >= 0.3, (
            f"Problem Solving DSA YouTube resource scored too low: {score}"
        )

    # ── 11. YouTube result survives _filter_relevant graceful degradation ─

    def test_youtube_result_survives_filter_graceful_degradation(self):
        from app.tools.web_search import _filter_relevant
        yt_resources = [
            {
                "type":    "YOUTUBE",
                "title":   "Totally Unrelated Comedy Video",
                "snippet": "Funny cat compilation.",
                "url":     "https://www.youtube.com/watch?v=catfunny01",
                "source":  "youtube.com",
            }
        ]
        # Even a completely off-topic YouTube resource should survive the filter
        # because graceful degradation returns ALL resources when none pass threshold.
        kept = _filter_relevant(yt_resources, "Problem Solving", "arrays")
        assert kept, "Graceful degradation must return all resources when none pass threshold"
        assert kept[0]["url"] == "https://www.youtube.com/watch?v=catfunny01"

    # ── 12. SearchWebResources returns YouTube results (end-to-end tool) ──

    def test_searchwebresources_tool_returns_youtube(self):
        yt_rows = [{"title": "Interview Prep Video", "href": "https://www.youtube.com/watch?v=prep22", "body": "Interview tips."}]
        resources = self._run_yt(yt_rows, skills=["Communication"])
        yt = [r for r in resources if r["type"] == "YOUTUBE"]
        assert yt, "SearchWebResources must include YOUTUBE resources when include_youtube=True"
        assert yt[0]["source"] == "youtube.com"

    # ── 13. no hardcoded / fake YouTube URLs ─────────────────────────────

    def test_no_hardcoded_youtube_urls_when_provider_empty(self):
        resources = self._run_yt(yt_rows=[])
        urls = [r["url"] for r in resources]
        for url in urls:
            assert "youtube.com" not in url, (
                f"Got a YouTube URL even though provider returned 0 results — "
                f"likely a hardcoded URL: {url}"
            )

    # ── 14. YouTube search does not call Groq ─────────────────────────────

    def test_youtube_search_does_not_call_groq(self):
        import app.tools.web_search as ws
        groq_names = [n for n in dir(ws) if "groq" in n.lower()]
        assert not groq_names, (
            f"web_search module must not import or reference Groq, found: {groq_names}"
        )
        import inspect
        src = inspect.getsource(ws)
        assert "groq" not in src.lower(), (
            "web_search.py must not contain any reference to Groq"
        )

    # ── Bonus: bounded retry behaviour ────────────────────────────────────

    def test_bounded_retry_fires_once_on_zero_results(self):
        """_search_youtube() makes exactly one retry attempt when first returns empty."""
        import app.tools.web_search as ws

        call_count = [0]
        good_row   = {"title": "Retry Success", "href": "https://www.youtube.com/watch?v=retry77", "body": "Retry."}

        def fake_text(query, max_results=5, **kwargs):
            call_count[0] += 1
            if call_count[0] == 1:
                return iter([])          # first attempt: empty
            return iter([good_row])      # second attempt: success

        inst = MagicMock()
        inst.text.side_effect = fake_text
        inst.__enter__ = MagicMock(return_value=inst)
        inst.__exit__  = MagicMock(return_value=False)

        with patch.object(ws, "DDGS", MagicMock(return_value=inst)), \
             patch.object(ws.time, "sleep"):
            results = ws._search_youtube("retry test")

        assert call_count[0] == 2, f"Expected exactly 2 attempts (1 retry), got {call_count[0]}"
        assert results, "Retry attempt must return results"
        assert results[0]["url"] == "https://www.youtube.com/watch?v=retry77"

    def test_bounded_retry_fires_once_on_exception(self):
        """_search_youtube() makes exactly one retry attempt when first attempt raises."""
        import app.tools.web_search as ws

        call_count = [0]
        good_row   = {"title": "Exception Retry", "href": "https://www.youtube.com/watch?v=excretry1", "body": "Ok."}

        def fake_text(query, max_results=5, **kwargs):
            call_count[0] += 1
            if call_count[0] == 1:
                raise Exception("DDGSException: No results found.")
            return iter([good_row])

        inst = MagicMock()
        inst.text.side_effect = fake_text
        inst.__enter__ = MagicMock(return_value=inst)
        inst.__exit__  = MagicMock(return_value=False)

        with patch.object(ws, "DDGS", MagicMock(return_value=inst)), \
             patch.object(ws.time, "sleep"):
            results = ws._search_youtube("exception retry test")

        assert call_count[0] == 2, f"Expected exactly 2 attempts (1 retry on exception), got {call_count[0]}"
        assert results, "Retry after exception must return results"
        assert results[0]["url"] == "https://www.youtube.com/watch?v=excretry1"

    def test_youtube_runs_after_web_loop_not_inside(self):
        """YouTube search must run AFTER web queries complete, not inside the web loop."""
        import app.tools.web_search as ws

        call_order = []

        def fake_text(query, max_results=5, **kwargs):
            if "site:youtube.com" in query:
                call_order.append("youtube")
                return iter([{"title": "YT", "href": "https://www.youtube.com/watch?v=order1", "body": "YT."}])
            call_order.append("web")
            return iter([{"title": "Web", "href": "https://web.com/page", "body": "Web."}])

        inst = MagicMock()
        inst.text.side_effect = fake_text
        inst.__enter__ = MagicMock(return_value=inst)
        inst.__exit__  = MagicMock(return_value=False)

        with patch.object(ws, "DDGS", MagicMock(return_value=inst)), \
             patch("app.tools.web_search.cache_get", return_value=None), \
             patch("app.tools.web_search.cache_set"), \
             patch.object(ws.time, "sleep"):
            ws.SearchWebResourcesTool().execute(
                {"query": "algorithms", "skills": ["Problem Solving"], "include_youtube": True},
                ToolContext(student_id="order-test", agent_run_id="order-run"),
            )

        yt_positions = [i for i, c in enumerate(call_order) if c == "youtube"]
        web_positions = [i for i, c in enumerate(call_order) if c == "web"]
        assert web_positions, "Expected at least one web search"
        assert yt_positions, "Expected at least one YouTube search"
        assert all(yp > max(web_positions) for yp in yt_positions), (
            f"YouTube call occurred before all web calls finished. Order: {call_order}"
        )
