from __future__ import annotations

import json
from typing import Any
from urllib.parse import urlparse

from app.tools.base import ToolContext, ToolDefinition, ToolResult

# Worst-first skills already sorted by the agent; take the top N for the prompt.
_MAX_WEAK_SKILLS_IN_PROMPT    = 5
# Include up to this many internal knowledge docs (with excerpts) in the prompt.
_MAX_KNOWLEDGE_DOCS_IN_PROMPT = 5
# Include up to this many web resources in the prompt.
_MAX_WEB_RESOURCES_IN_PROMPT  = 5
# Trim excerpt/snippet text so the prompt stays token-efficient.
_MAX_EXCERPT_CHARS = 200


class DraftLearningPlanTool(ToolDefinition):
    name = "DraftLearningPlan"
    description = (
        "Signals that all data has been gathered and the agent is ready to generate "
        "the learning plan. Call this LAST, after all other tools have run. "
        "Does NOT call the LLM directly — the plan is generated post-loop. "
        "Does NOT persist the plan — the supervisor validates and persists it."
    )
    input_schema = {
        "type": "object",
        "properties": {
            "goal": {"type": "string", "description": "The student's learning goal"},
            "weakSkills": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Weak skill names (lowest scores first)",
            },
            "performanceData": {
                "type": ["object", "null"],
                "description": "Performance profile data",
            },
            "knowledgeDocs": {
                "type": "array",
                "description": "Internal knowledge documents from RetrieveLearningKnowledge",
            },
            "webResources": {
                "type": "array",
                "description": (
                    "External resources from SearchWebResources. "
                    "Each item has {title, url, snippet, source, type}. "
                    "Pass [] if SearchWebResources was not called."
                ),
            },
            "durationWeeks": {
                "type": "number",
                "description": (
                    "Plan duration in weeks. This is a FIXED business rule: always 4. "
                    "Do not change this value."
                ),
            },
        },
        "required": ["goal"],
    }
    read_only = False
    requires_student_scope = False
    is_terminal = True  # agent loop exits immediately after this tool succeeds

    def execute(self, args: dict[str, Any], ctx: ToolContext) -> ToolResult:
        """Collect context for post-loop plan generation — no LLM call here."""
        goal             = args.get("goal", "")
        weak_skills      = (args.get("weakSkills") or [])[:_MAX_WEAK_SKILLS_IN_PROMPT]
        performance_data = args.get("performanceData") or {}
        knowledge_docs   = args.get("knowledgeDocs") or []
        web_resources    = args.get("webResources") or []
        duration_weeks   = int(args.get("durationWeeks") or 4)

        print(
            f"[DraftLearningPlan] CONTEXT_COLLECTED "
            f"runId={ctx.agent_run_id} studentId={ctx.student_id} "
            f"weakSkillCount={len(weak_skills)} "
            f"internalDocCount={len(knowledge_docs)} "
            f"webResourceCount={len(web_resources)} "
            f"durationWeeks={duration_weeks}",
            flush=True,
        )

        context = {
            "goal":                goal,
            "weakSkills":          weak_skills,
            "performanceData":     performance_data,
            "knowledgeDocs":       knowledge_docs,
            "webResources":        web_resources,
            "durationWeeks":       duration_weeks,
            "_ready_for_generation": True,
        }
        summary = (
            f"context_ready. goal='{goal[:40]}' weakSkills={len(weak_skills)} "
            f"docs={len(knowledge_docs)} web={len(web_resources)}"
        )
        return ToolResult(success=True, data=context, context_summary=summary)

    # ── Prompt ─────────────────────────────────────────────────────────────────

    def _build_prompt(
        self,
        student_id: str,
        goal: str,
        weak_skills: list[str],
        performance_data: dict,
        knowledge_docs: list,
        web_resources: list,
        duration_weeks: int,
    ) -> str:
        # ── Internal knowledge items ───────────────────────────────────────────
        internal_items: list[dict] = []
        for d in knowledge_docs[:_MAX_KNOWLEDGE_DOCS_IN_PROMPT]:
            title = d.get("title", "")
            if not title:
                continue
            item: dict[str, Any] = {
                "documentId": str(d.get("id", "")),
                "title":      title,
            }
            excerpt = d.get("excerpt") or d.get("chunk_text", "")
            if excerpt:
                item["excerpt"] = excerpt[:_MAX_EXCERPT_CHARS]
            internal_items.append(item)

        # ── External web/YouTube items (from SearchWebResources) ───────────────
        external_items: list[dict] = []
        for r in web_resources[:_MAX_WEB_RESOURCES_IN_PROMPT]:
            url = r.get("url", "")
            if not url:
                continue
            external_items.append({
                "type":    r.get("type", "WEB"),   # "WEB" or "YOUTUBE"
                "title":   r.get("title", ""),
                "url":     url,
                "snippet": (r.get("snippet") or "")[:_MAX_EXCERPT_CHARS],
                "source":  r.get("source", ""),
            })

        perf_summary = {
            "overall_score":       performance_data.get("overall_score"),
            "technical_score":     performance_data.get("technical_score"),
            "communication_score": performance_data.get("communication_score"),
            "listening_score":     performance_data.get("listening_score"),
            "trend":               performance_data.get("trend", "STABLE"),
        }

        internal_section = (
            json.dumps(internal_items, indent=2) if internal_items else "[]"
        )
        external_section = (
            json.dumps(external_items, indent=2) if external_items else "[]"
        )

        weak_skills_display = "\n".join(
            f"  - {s}" for s in weak_skills
        ) or "  (none identified)"

        return f"""You are generating a PERSONALIZED, ACTIONABLE learning roadmap for student {student_id}.

This roadmap must be immediately actionable. The student must know EXACTLY what to do each study session. Vague advice ("practice interviews", "improve communication") is unacceptable. Every activity must specify WHAT to do, HOW LONG it takes, and HOW to measure success.

=== STUDENT PROFILE ===
Student ID:     {student_id}
Goal:           {goal}
Overall:        {perf_summary["overall_score"] or "N/A"} / 100
Technical:      {perf_summary["technical_score"] or "N/A"} / 100
Communication:  {perf_summary["communication_score"] or "N/A"} / 100
Listening:      {perf_summary["listening_score"] or "N/A"} / 100
Trend:          {perf_summary["trend"]}

MEASURED WEAK SKILLS — these are the student's ACTUAL performance gaps from the database.
Each entry is "SkillName (actual_score/100)", sorted lowest-score first.
These exact skill names MUST appear as "focus" and in "whyThisSkill" for each week.
Do NOT rename them. Do NOT invent scores. Do NOT substitute a search-topic label.
{weak_skills_display}

=== AVAILABLE RESOURCES ===
--- Internal Knowledge Base (reference by documentId exactly as shown) ---
{internal_section}

--- External Web & YouTube Resources (use URLs EXACTLY as shown — never alter them) ---
{external_section}

Note: These resources were specifically searched and filtered for the student's weak skills.
Each resource is relevant to the skill it was retrieved for. Match each resource to the
week where its skill focus aligns most closely.

=== GENERATE A {duration_weeks}-WEEK ROADMAP — THIS IS A HARD CONTRACT ===
You MUST produce EXACTLY {duration_weeks} weekly entries in weeklyPlan.
durationWeeks MUST be {duration_weeks}. Any other number is a contract violation.
Each week MUST include ALL 12 fields listed below.

1. "week" — integer week number
2. "objective" — one sentence: "By end of week N, you will [concrete achievement]."
   Must reference the EXACT skill name and score from the Weak Skills list above.
   Example: "By end of week 1, you will have completed 5 STAR-method practice sessions
   targeting your Leadership score of 38/100."
3. "focus" — EXACT skill name taken from the Weak Skills list above (e.g. "Leadership").
   NEVER use a search category (e.g. do NOT write "Behavioral Interview") as the focus.
4. "skills" — array of exact skill names practiced this week (from the Weak Skills list)
5. "whyThisSkill" — 2-3 sentences. MUST cite (a) the student's ACTUAL score shown in
   the Weak Skills list and (b) why that specific skill matters for their goal.
   Example: "Your Leadership score is 38/100 — your lowest measured skill. For campus
   placement, interviewers use behavioral questions to assess leadership capability,
   making this the most critical skill to develop first."
   NEVER write "score is N/A" — the actual score is always shown in parentheses above.
6. "activities" — array of 4-5 SPECIFIC activities. Each MUST include:
   • WHAT exactly to do (name the technique or resource)
   • Time in minutes
   • HOW to do it (method/approach)
   BAD: "Read about STAR method"
   GOOD: "Read the STAR (Situation, Task, Action, Result) guide at [resource title] (30 min).
   Write the 4 components in your notes, then write one STAR story from your own experience."
7. "practiceExercises" — array of 2-3 timed drills with MEASURABLE targets. Example:
   "Set a 2-min timer. Answer 'Describe a conflict you resolved.' Record yourself.
   Count filler words (um, uh, like). Repeat until you achieve fewer than 3 per answer."
8. "applicationTask" — ONE end-of-week real-world task tied to the student's goal. Example:
   "Arrange a 15-min mock interview with a classmate. Answer 3 behavioral questions using
   STAR. Request written feedback on clarity and confidence."
9. "resources" — array of resources FROM THE LISTS ABOVE that apply to this week's skill.
   Each resource MUST include "usage" explaining HOW to use it this week specifically.
   CRITICAL RESOURCE MATCHING RULES:
   • Behavioral resources (Leadership, Teamwork, Adaptability, Conflict Resolution,
     Communication) MUST ONLY appear in weeks focused on those behavioral skills.
   • Technical/coding resources (Problem Solving, DSA, Algorithms, Arrays, Data
     Structures, Coding) MUST ONLY appear in weeks focused on technical skills.
   • NEVER place a behavioral interview resource in a coding/algorithm week.
   • NEVER place a coding tutorial in a leadership/teamwork week.
   • Use [] if no supplied resource matches this week's focus skill.
10. "measurableOutcome" — specific, checkable success criteria for the week.
    BAD: "Better understanding of behavioral interviews"
    GOOD: "5 written STAR stories completed; mock interview recorded and reviewed; filler
    word count under 3 per 2-minute answer"
11. "estimatedHours" — integer 4-8 (total realistic effort this week)
12. "progressCheck" — one self-assessment action on the LAST DAY of the week. Example:
    "Re-record your Day 1 question answer. Compare: fewer filler words? Under 2 min?
    Rate your confidence 1-10 and note it as next week's baseline."

RULES:
- Exactly {duration_weeks} weekly entries — no more, no less. This is a hard constraint.
- durationWeeks MUST be {duration_weeks} in the response JSON. Do not change this value.
- Week numbers must be sequential integers: 1, 2, 3, …, {duration_weeks}.
- Progression: Week 1=fundamentals, Week 2=structured practice, Week 3=applied practice,
  Week 4=evaluation/mock assessment. Adjust if student's actual skill gaps require it.
- NEVER invent URLs — use only exact URLs from External Resources above.
- NEVER invent documentIds — use only exact IDs from Internal Resources above.
- Each activity must be doable in one session (30-90 min). No overloading.
- Activities must reference specific resources by name/URL when available.
- The plan MUST be personalized to THIS student's scores and goal — not generic advice.

Respond ONLY with valid JSON (no markdown, no explanation outside the JSON):
{{
  "goal": "{goal}",
  "durationWeeks": {duration_weeks},
  "focusSkills": ["skill1", "skill2"],
  "weeklyPlan": [
    {{
      "week": 1,
      "objective": "By end of week 1, you will...",
      "focus": "Skill Name",
      "skills": ["Skill Name"],
      "whyThisSkill": "Your [skill] score is [N]/100...",
      "activities": [
        "Activity 1 (30 min): ...",
        "Activity 2 (45 min): ...",
        "Activity 3 (30 min): ...",
        "Activity 4 (20 min): ..."
      ],
      "practiceExercises": [
        "Exercise 1: ... Target: ...",
        "Exercise 2: ... Goal: ..."
      ],
      "applicationTask": "By end of this week: ...",
      "resources": [
        {{"type": "WEB", "url": "exact-url", "title": "...", "usage": "Use this to..."}}
      ],
      "measurableOutcome": "...",
      "estimatedHours": 5,
      "progressCheck": "On the last day: ..."
    }}
  ]
}}
"""

    # ── Correction prompt (sent on regeneration attempt) ─────────────────────

    def _build_correction_prompt(
        self,
        student_id: str,
        goal: str,
        weak_skills: list[str],
        performance_data: dict,
        knowledge_docs: list,
        web_resources: list,
        duration_weeks: int,
        previous_week_count: int,
    ) -> str:
        """Return a corrected prompt that explicitly calls out the prior violation."""
        base = self._build_prompt(
            student_id, goal, weak_skills, performance_data,
            knowledge_docs, web_resources, duration_weeks,
        )
        correction = (
            f"\n\n"
            f"⚠️  CRITICAL CORRECTION REQUIRED ⚠️\n"
            f"Your previous response contained {previous_week_count} weeks in weeklyPlan.\n"
            f"The required number is EXACTLY {duration_weeks} weeks — this is a hard contract.\n"
            f"You MUST produce EXACTLY {duration_weeks} weekly entries.\n"
            f"durationWeeks in the response MUST be {duration_weeks}.\n"
            f"Regenerate the complete plan now with exactly {duration_weeks} weeks.\n"
        )
        return base + correction

    # ── Parse & normalise LLM response ─────────────────────────────────────────

    def _parse_response(
        self,
        raw: dict,
        goal: str,
        weak_skills: list[str],
        duration_weeks: int,
        web_resources: list | None = None,
    ) -> dict:
        supplied = web_resources or []
        weekly_raw = raw.get("weeklyPlan") or raw.get("weekly_plan") or []
        weekly_plan = [
            {
                "week":              w.get("week", i + 1),
                "objective":         w.get("objective", ""),
                "focus":             w.get("focus", ""),
                "skills":            w.get("skills", []),
                "whyThisSkill":      w.get("whyThisSkill", ""),
                "activities":        w.get("activities", []),
                "practiceExercises": w.get("practiceExercises", []),
                "applicationTask":   w.get("applicationTask", ""),
                "resources": [
                    _resolve_resource_url(_normalise_resource(r), supplied)
                    for r in (w.get("resources") or [])
                ],
                "measurableOutcome": w.get("measurableOutcome", ""),
                "estimatedHours":    w.get("estimatedHours", 0),
                "progressCheck":     w.get("progressCheck", ""),
            }
            for i, w in enumerate(weekly_raw)
        ]
        return {
            "goal":          raw.get("goal", goal),
            "durationWeeks": int(
                raw.get("durationWeeks") or raw.get("duration_weeks") or duration_weeks
            ),
            "focusSkills":   raw.get("focusSkills") or raw.get("focus_skills") or weak_skills,
            "weeklyPlan":    weekly_plan,
        }

    # ── Deterministic fallback (only used when LLM fails) ─────────────────────

    def _fallback_plan(
        self,
        goal: str,
        weak_skills: list[str],
        knowledge_docs: list,
        web_resources: list,
        duration_weeks: int,
    ) -> dict:
        # Build internal resource refs from supplied docs
        internal_refs = [
            {"type": "INTERNAL", "documentId": str(d.get("id", "")), "title": d.get("title", "")}
            for d in knowledge_docs[:duration_weeks]
            if d.get("title")
        ]
        # Build external resource refs from web/YouTube search results
        external_refs = [
            {"type": r.get("type", "WEB"), "url": r.get("url", ""), "title": r.get("title", "")}
            for r in web_resources[:duration_weeks]
            if r.get("url") and r.get("title")
        ]
        # Merge: internal first, then external
        all_refs = internal_refs + external_refs

        weekly_plan: list[dict] = []
        for i in range(duration_weeks):
            skill = (
                weak_skills[i] if i < len(weak_skills)
                else (weak_skills[0] if weak_skills else "General Review")
            )
            week_resource = [all_refs[i]] if i < len(all_refs) else []
            weekly_plan.append({
                "week":              i + 1,
                "objective":         f"By end of week {i + 1}, you will have practiced {skill} through structured exercises.",
                "focus":             skill,
                "skills":            [skill],
                "whyThisSkill":      f"{skill} was identified as a weak area requiring improvement.",
                "activities": [
                    f"Study {skill} fundamentals and core concepts (45 min)",
                    f"Review examples of strong {skill} performance (30 min)",
                    f"Practice {skill} in mock-interview scenarios (30 min)",
                    f"Self-assess {skill} progress and identify remaining gaps (15 min)",
                ],
                "practiceExercises": [
                    f"Complete one timed {skill} practice drill (set a 2-min timer)",
                    f"Record yourself demonstrating {skill} and review the recording",
                ],
                "applicationTask":   f"Apply {skill} in one real scenario this week and document the outcome.",
                "resources":         week_resource,
                "measurableOutcome": f"All 4 activities completed; one practice recording reviewed; improvement in {skill} noted.",
                "estimatedHours":    5,
                "progressCheck":     f"Rate your {skill} confidence 1-10 at end of week and compare to your starting point.",
            })

        return {
            "goal":          goal,
            "durationWeeks": duration_weeks,
            "focusSkills":   weak_skills[:3] if weak_skills else [],
            "weeklyPlan":    weekly_plan,
        }


# ── Resource normalisation ─────────────────────────────────────────────────────

def _normalise_resource(r: Any) -> dict:
    """
    Ensure every resource dict has a 'type' field.
    Old format {documentId, title} → type=INTERNAL.
    New format already has type.
    """
    if not isinstance(r, dict):
        return {"type": "INTERNAL", "title": str(r), "documentId": ""}

    rtype = r.get("type", "").upper()
    if not rtype:
        # Infer from fields present
        rtype = "WEB" if r.get("url") else "INTERNAL"

    out: dict[str, Any] = {
        "type":  rtype,
        "title": r.get("title", ""),
    }
    if rtype == "INTERNAL":
        out["documentId"] = r.get("documentId", "")
    else:
        url = r.get("url", "")
        # Normalise: add https:// if LLM dropped the scheme
        if url and not url.startswith(("http://", "https://")):
            url = "https://" + url
        out["url"] = url

    # Preserve usage hint if the LLM included one
    usage = r.get("usage", "")
    if usage:
        out["usage"] = usage

    return out


def _bare_domain(url: str) -> str:
    """Return lowercase domain without scheme or www prefix."""
    try:
        netloc = urlparse(url).netloc.lower()
        return netloc[4:] if netloc.startswith("www.") else netloc
    except Exception:
        return ""


def _resolve_resource_url(r: dict, supplied: list[dict]) -> dict:
    """Restore the exact URL from the original SearchWebResources results.

    The LLM often shortens URLs (e.g. https://youtube.com instead of the full
    watch link). This function matches the LLM-chosen resource against the
    supplied list by domain and, when multiple resources share a domain, by
    title similarity — then substitutes the exact original URL.
    """
    if not supplied or r.get("type", "").upper() == "INTERNAL":
        return r

    llm_url   = r.get("url", "")
    llm_title = r.get("title", "").lower()
    llm_dom   = _bare_domain(llm_url)

    # 1. Exact URL match
    for s in supplied:
        if s.get("url", "") == llm_url:
            return r  # already exact — nothing to restore

    # 2. Domain match
    domain_hits = [s for s in supplied if _bare_domain(s.get("url", "")) == llm_dom]

    if not domain_hits:
        return r  # no match found — keep as-is

    if len(domain_hits) == 1:
        best = domain_hits[0]
    else:
        # Multiple resources for this domain — prefer title overlap
        scored = [
            (
                s,
                len(set(llm_title.split()) & set(s.get("title", "").lower().split())),
            )
            for s in domain_hits
        ]
        scored.sort(key=lambda x: x[1], reverse=True)
        best = scored[0][0]

    out = dict(r)
    out["url"] = best["url"]
    # Restore the full descriptive title from search if the LLM used a placeholder
    if best.get("title") and len(best["title"]) > len(r.get("title", "")):
        out["title"] = best["title"]
    return out
