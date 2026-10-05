"""
SearchWebResourcesTool — web + YouTube resource discovery.

Called by the specialist agent when the internal knowledge base does not
contain sufficient resources for one or more weak skills.

Design rules:
- NEVER invents URLs; all URLs come from real search results.
- Graceful degradation: if duckduckgo_search is not installed or the
  network call fails, returns an empty list without raising.
- Stateless: no student data stored or shared between calls.
- Redis-cached by query hash so topic-aware queries produce distinct entries.
- build_resource_queries() generates topic-aware queries so technical skills
  receive coding/algorithm results and behavioral skills receive STAR-method
  / interview resources — never cross-contaminated.
"""
from __future__ import annotations

import hashlib
import time
from typing import Any
from urllib.parse import urlparse

from app.cache.cache_keys import CacheKeys
from app.cache.cache_service import cache_get, cache_set
from app.config import settings
from app.tools.base import ToolContext, ToolDefinition, ToolResult

_MAX_WEB_RESULTS     = 3
_MAX_YOUTUBE_RESULTS = 1
_MAX_SNIPPET_CHARS   = 200

# Module-level import so tests can patch `app.tools.web_search.DDGS`.
try:
    from ddgs import DDGS  # type: ignore[import]
except ImportError:
    DDGS = None  # type: ignore[assignment,misc]


# ── Skill classification ───────────────────────────────────────────────────────

_TECHNICAL_SKILL_TERMS = frozenset({
    "problem solving", "problem-solving", "coding", "algorithm", "data structure",
    "arrays", "array", "linked list", "tree", "graph", "dynamic programming",
    "recursion", "sorting", "searching", "binary search", "hash map", "stack",
    "queue", "heap", "two pointer", "sliding window", "dsa", "leetcode",
    "competitive programming", "technical", "debugging", "system design",
    "programming", "software", "developer",
})

_BEHAVIORAL_SKILL_TERMS = frozenset({
    "leadership", "adaptability", "teamwork", "conflict resolution", "communication",
    "listening", "empathy", "collaboration", "presentation", "public speaking",
    "negotiation", "time management", "emotional intelligence", "behavioral",
    "interpersonal", "mentoring", "motivation",
})

_QUERY_STOP_WORDS = frozenset({
    "with", "that", "this", "from", "have", "will", "your", "what",
    "each", "they", "them", "then", "than", "when", "also", "into",
    "using", "about", "some", "very", "just", "more", "most",
})


def _classify_skill(skill_name: str) -> str:
    """Return 'TECHNICAL', 'BEHAVIORAL', or 'GENERAL' for a skill name."""
    lower = skill_name.lower().strip()
    words = set(lower.split())
    tech_hits  = sum(1 for t in _TECHNICAL_SKILL_TERMS  if t in lower) + len(words & _TECHNICAL_SKILL_TERMS)
    behav_hits = sum(1 for t in _BEHAVIORAL_SKILL_TERMS if t in lower) + len(words & _BEHAVIORAL_SKILL_TERMS)
    if tech_hits > behav_hits:
        return "TECHNICAL"
    if behav_hits > tech_hits:
        return "BEHAVIORAL"
    return "GENERAL"


def build_resource_queries(
    skill: str,
    activity: str,
    student_goal: str,
    proficiency_level: str,
) -> list[str]:
    """
    Generate 2-4 topic-aware search queries for a given skill and activity.

    Technical skills → coding/algorithm queries (no behavioral interview phrasing).
    Behavioral skills → STAR-method / interview preparation queries.
    General skills → generic learning queries.

    Deterministic from inputs — never hardcoded URL lists.
    """
    skill_lower    = (skill or "").lower().strip()
    activity_lower = (activity or "").lower().strip()
    goal_lower     = (student_goal or "").lower().strip()
    level          = (proficiency_level or "beginner").lower().strip()
    skill_type     = _classify_skill(skill_lower)

    activity_terms = [
        w for w in activity_lower.split()
        if len(w) > 3 and w not in _QUERY_STOP_WORDS
    ][:3]

    queries: list[str] = []

    if skill_type == "TECHNICAL":
        queries.append(f"{skill_lower} {level} tutorial")
        queries.append(f"{skill_lower} practice problems")
        if activity_terms:
            queries.append(f"{' '.join(activity_terms[:2])} {skill_lower} tutorial")
        if any(sig in goal_lower for sig in ("interview", "placement", "job")):
            queries.append(f"{skill_lower} coding interview preparation")

    elif skill_type == "BEHAVIORAL":
        queries.append(f"{skill_lower} behavioral interview")
        queries.append(f"{skill_lower} STAR method practice")
        if activity_terms:
            queries.append(f"{' '.join(activity_terms[:2])} {skill_lower}")
        queries.append(f"improve {skill_lower} skills")

    else:
        queries.append(f"{skill_lower} learning guide")
        queries.append(f"{skill_lower} practice exercises")
        if activity_terms:
            queries.append(f"{' '.join(activity_terms[:2])} {skill_lower}")

    seen: set[str] = set()
    unique: list[str] = []
    for q in queries:
        q = q.strip()
        if q and q not in seen:
            seen.add(q)
            unique.append(q)

    return unique[:4]


# ── Cache helpers ──────────────────────────────────────────────────────────────

def _query_hash(query: str) -> str:
    """12-char MD5 hash of a normalised query string."""
    normalised = " ".join(query.lower().split())
    return hashlib.md5(normalised.encode()).hexdigest()[:12]


def _skill_signature(skills: list[str]) -> str:
    """Return a stable, lowercase, sorted signature for a list of skill names."""
    if not skills:
        return ""
    return "|".join(sorted(s.strip().lower() for s in skills if s.strip()))


# ── Relevance ─────────────────────────────────────────────────────────────────

def _relevance_score(resource: dict, skill: str, activity: str) -> float:
    """Score a resource's relevance to skill + activity context (0.0–1.0)."""
    text = " ".join([
        resource.get("title", ""),
        resource.get("snippet", ""),
        resource.get("url", ""),
    ]).lower()

    skill_words    = {w for w in skill.lower().split()  if len(w) > 3}
    activity_words = {
        w for w in activity.lower().split()
        if len(w) > 3 and w not in _QUERY_STOP_WORDS
    }
    keywords = skill_words | activity_words
    if not keywords:
        return 0.5

    matches = sum(1 for kw in keywords if kw in text)
    score   = matches / len(keywords)

    if skill.lower() in text:
        score = min(1.0, score + 0.2)

    return score


def _filter_relevant(
    resources: list[dict],
    skill: str,
    activity: str,
    threshold: float = 0.1,
) -> list[dict]:
    """Return resources above relevance threshold, sorted best-first."""
    if not skill:
        return resources

    scored = [(r, _relevance_score(r, skill, activity)) for r in resources]

    for r, s in scored:
        print(
            f"[resource-selection] skill={skill!r}"
            f" score={s:.2f}"
            f" title={r.get('title','')[:60]!r}"
            f" url={r.get('url','')[:80]}",
            flush=True,
        )

    filtered = [(r, s) for r, s in scored if s >= threshold]
    if not filtered:
        return resources

    filtered.sort(key=lambda x: x[1], reverse=True)
    return [r for r, _ in filtered]


# ── Tool ──────────────────────────────────────────────────────────────────────

class SearchWebResourcesTool(ToolDefinition):
    name = "SearchWebResources"
    description = (
        "Search the web for learning resources on a specific skill or topic. "
        "Use this ONLY when RetrieveLearningKnowledge did not return relevant "
        "resources for one or more of the student's weak skills. "
        "Returns real URLs — never invents links."
    )
    input_schema = {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": (
                    "Search query based on the student's weak skills and goal. "
                    "Be specific, e.g. 'problem solving arrays algorithm tutorial' "
                    "for technical skills or 'leadership behavioral interview' for "
                    "behavioral skills."
                ),
            },
            "skills": {
                "type": "array",
                "items": {"type": "string"},
                "description": "The weak skills this search covers (used for query generation and caching).",
            },
            "activity": {
                "type": "string",
                "description": "Optional: key activity terms (e.g. 'arrays two pointer algorithm') to focus the search.",
            },
            "goal": {
                "type": "string",
                "description": "Optional: student's learning goal for additional query context.",
            },
            "include_youtube": {
                "type": "boolean",
                "description": "Also search for a relevant YouTube tutorial (default: true).",
            },
        },
        "required": ["query"],
    }
    requires_student_scope = False
    read_only = True

    def execute(self, args: dict[str, Any], ctx: ToolContext) -> ToolResult:
        raw_query       = (args.get("query") or "").strip()
        skills          = args.get("skills") or []
        activity        = (args.get("activity") or "").strip()
        goal            = (args.get("goal") or raw_query).strip()
        include_youtube = args.get("include_youtube", True)

        if not raw_query and not skills:
            return ToolResult(success=False, error_code="INVALID_ARGS", error_message="query is required")

        primary_skill = skills[0].strip() if skills else ""

        # Generate topic-aware queries from skill + activity context.
        # This overrides the raw LLM-generated query so technical skills always
        # get coding/algorithm results and behavioral skills get STAR-method results.
        if primary_skill:
            generated_queries = build_resource_queries(
                skill=primary_skill,
                activity=activity,
                student_goal=goal,
                proficiency_level="beginner",
            )
        else:
            generated_queries = [raw_query] if raw_query else []

        if not generated_queries:
            return ToolResult(success=False, error_code="INVALID_ARGS", error_message="query is required")

        primary_query = generated_queries[0]

        # ── Cache lookup by query hash ────────────────────────────────────────
        cache_sig = _query_hash(primary_query)
        cache_key = CacheKeys.web_resources(cache_sig)
        try:
            cached = cache_get(cache_key)
            if cached is not None:
                print(
                    f"[SearchWebResources] CACHE_HIT"
                    f" query_hash={cache_sig}"
                    f" skill={primary_skill!r}",
                    flush=True,
                )
                web_resources = cached.get("webResources", [])
                return ToolResult(
                    success=True,
                    data=cached,
                    cache_hit=True,
                    context_summary=_web_summary(web_resources),
                )
            print(
                f"[SearchWebResources] CACHE_MISS"
                f" query_hash={cache_sig}"
                f" skill={primary_skill!r}",
                flush=True,
            )
        except Exception:
            pass

        # ── Multi-query search ────────────────────────────────────────────────
        skill_type = _classify_skill(primary_skill) if primary_skill else "GENERAL"
        print(
            f"[resource-search] skill={primary_skill!r}"
            f" skill_type={skill_type}"
            f" queries={generated_queries}"
            f" youtube={include_youtube}",
            flush=True,
        )

        all_web: list[dict]     = []
        all_youtube: list[dict] = []
        seen_urls: set[str]     = set()

        for query in generated_queries:
            print(f"[resource-search] executing query={query!r}", flush=True)
            web_batch = _search_web(query)
            for r in web_batch:
                url = r.get("url", "")
                if url and url not in seen_urls:
                    seen_urls.add(url)
                    all_web.append(r)
                    print(
                        f"[resource-result] type=WEB"
                        f" url={url}"
                        f" title={r.get('title','')[:80]!r}",
                        flush=True,
                    )
            if len(all_web) >= _MAX_WEB_RESULTS:
                break

        # YouTube search runs AFTER all web searches to prevent DuckDuckGo
        # rate-limiting.  _search_youtube() sleeps 2.5 s internally and makes
        # one bounded retry on empty results or DDGSException.
        if include_youtube:
            yt_batch = _search_youtube(primary_query)
            for r in yt_batch:
                url = r.get("url", "")
                if url and url not in seen_urls:
                    seen_urls.add(url)
                    all_youtube.append(r)
                    print(
                        f"[resource-result] type=YOUTUBE"
                        f" url={url}"
                        f" title={r.get('title','')[:80]!r}",
                        flush=True,
                    )

        # ── Relevance filtering ───────────────────────────────────────────────
        web_filtered     = _filter_relevant(all_web, primary_skill, activity)[:_MAX_WEB_RESULTS]
        youtube_filtered = _filter_relevant(all_youtube, primary_skill, activity)[:_MAX_YOUTUBE_RESULTS]

        print(
            f"[SearchWebResources] search_done"
            f" raw_web={len(all_web)} raw_yt={len(all_youtube)}"
            f" filtered_web={len(web_filtered)} filtered_yt={len(youtube_filtered)}",
            flush=True,
        )
        for _i, _r in enumerate(web_filtered + youtube_filtered, 1):
            print(
                f"[SearchWebResources] RESULT[{_i}]"
                f" type={_r.get('type','WEB')}"
                f" url={_r.get('url','')}"
                f" title={_r.get('title','')[:80]!r}"
                f" snippet={_r.get('snippet','')[:120]!r}",
                flush=True,
            )

        total = len(web_filtered) + len(youtube_filtered)
        data = {
            "skills":       skills,
            "query":        primary_query,
            "webResources": web_filtered + youtube_filtered,
            "totalFound":   total,
        }

        try:
            cache_set(cache_key, data, settings.module3_web_cache_ttl)
            print(
                f"[SearchWebResources] CACHE_STORE"
                f" query_hash={cache_sig}"
                f" resources={total}",
                flush=True,
            )
        except Exception:
            pass

        return ToolResult(
            success=True,
            data=data,
            cache_hit=False,
            context_summary=_web_summary(data["webResources"]),
        )


# ── Internal search helpers ────────────────────────────────────────────────────

def _web_summary(web_resources: list[dict]) -> str:
    if not web_resources:
        return "ok. 0 web resources found."
    sources = [r.get("source", r.get("type", "?")) for r in web_resources[:4]]
    return f"ok. {len(web_resources)} resources: {', '.join(sources)}"


def _search_web(query: str) -> list[dict]:
    """DuckDuckGo text search, non-YouTube results only."""
    if DDGS is None:
        print("[SearchWebResources] ddgs not installed — skipping web search", flush=True)
        return []
    try:
        results: list[dict] = []
        with DDGS() as ddgs:
            for r in ddgs.text(query, max_results=_MAX_WEB_RESULTS + 5, backend="html"):
                href = r.get("href", "")
                if "youtube.com" in href or "youtu.be" in href:
                    continue
                snippet = (r.get("body") or "")[:_MAX_SNIPPET_CHARS]
                results.append({
                    "title":   r.get("title", ""),
                    "url":     href,
                    "snippet": snippet,
                    "source":  _domain(href),
                    "type":    "WEB",
                })
                if len(results) >= _MAX_WEB_RESULTS:
                    break
        return results
    except Exception as exc:
        print(f"[SearchWebResources] web search failed ({type(exc).__name__}: {exc})", flush=True)
        return []


def _search_youtube(query: str) -> list[dict]:
    """Search YouTube using site:youtube.com restriction on ddgs.text().

    Sleeps 2.5 s before each attempt so DuckDuckGo does not rate-limit the
    YouTube search after a preceding _search_web() call.  Makes ONE bounded
    fallback attempt (with 3 s extra sleep) on empty results or DDGSException.
    """
    if DDGS is None:
        return []

    def _attempt(sleep_secs: float) -> list[dict]:
        time.sleep(sleep_secs)
        results: list[dict] = []
        with DDGS() as ddgs:
            for r in ddgs.text(
                f"site:youtube.com {query}", max_results=5, backend="html"
            ):
                href = r.get("href", "")
                # Normalize mobile subdomain so downstream dedup works correctly
                href = href.replace("//m.youtube.com/", "//www.youtube.com/")
                if "youtube.com/watch?v=" not in href and "youtu.be/" not in href:
                    continue
                snippet = (r.get("body") or "")[:_MAX_SNIPPET_CHARS]
                results.append({
                    "title":   r.get("title", ""),
                    "url":     href,
                    "snippet": snippet,
                    "source":  "youtube.com",
                    "type":    "YOUTUBE",
                })
                if len(results) >= _MAX_YOUTUBE_RESULTS:
                    break
        return results

    try:
        results = _attempt(2.5)
        if results:
            return results
        # Bounded fallback: one additional attempt with extra backoff
        print(
            "[SearchWebResources] YouTube attempt 1 returned 0 results — retrying",
            flush=True,
        )
        return _attempt(3.0)
    except Exception as exc:
        print(
            f"[SearchWebResources] YouTube search failed ({type(exc).__name__}: {exc})",
            flush=True,
        )
        try:
            return _attempt(4.0)
        except Exception as exc2:
            print(
                f"[SearchWebResources] YouTube retry failed ({type(exc2).__name__}: {exc2})",
                flush=True,
            )
            return []


def _domain(url: str) -> str:
    try:
        return urlparse(url).netloc
    except Exception:
        return ""
