from __future__ import annotations

import json
from typing import Any

from app.agents.agent_loop import run_agent_loop
from app.agents.prompts import get_specialist_system_prompt
from app.agents.state import AgentLoopConfig, AgentLoopResult, AgentMetrics, TerminationReason
from app.config import LEARNING_PLAN_DURATION_WEEKS
from app.repositories import agent_repository
from app.services.llm_client import get_llm_client
from app.tools.base import ToolContext
from app.tools.knowledge import RetrieveLearningKnowledgeTool
from app.tools.learning_plan import DraftLearningPlanTool
from app.tools.performance import GetStudentPerformanceTool
from app.tools.skill_gap import GetSkillGapAnalysisTool
from app.tools.web_search import SearchWebResourcesTool

SPECIALIST_TOOLS = [
    GetStudentPerformanceTool(),
    GetSkillGapAnalysisTool(),
    RetrieveLearningKnowledgeTool(),
    SearchWebResourcesTool(),
    DraftLearningPlanTool(),
]

# Reuse the single DraftLearningPlanTool instance for its helper methods
_PLAN_TOOL = SPECIALIST_TOOLS[-1]


def run_specialist_agent(
    task: dict[str, Any],
    spec_def: dict[str, Any],
) -> dict[str, Any]:
    student_id: str = task["studentId"]
    goal: str = task["goal"]
    supervisor_run_id: str = task["supervisorRunId"]
    triggered_by_user_id: str | None = task.get("triggeredByUserId")

    specialist_run_id: str = agent_repository.create_specialist_run(
        agent_def_id=spec_def["id"],
        student_id=student_id,
        triggered_by_user_id=triggered_by_user_id,
        goal=goal,
        supervisor_run_id=supervisor_run_id,
    )

    system_prompt = get_specialist_system_prompt(student_id, goal)
    user_message = f"Create a learning plan for student {student_id}. Goal: {goal}"

    loop_config = AgentLoopConfig(
        agent_run_id=specialist_run_id,
        student_id=student_id,
        system_prompt=system_prompt,
        user_message=user_message,
        tools=SPECIALIST_TOOLS,
        max_steps=int(spec_def.get("max_steps") or 12),
        max_tool_calls=int(spec_def.get("max_tool_calls") or 8),
        timeout_seconds=float(spec_def.get("timeout_seconds") or 150),
        # Guard: the agent MUST call these tools before DraftLearningPlan is
        # accepted.  SearchWebResources is now required — the pre-terminal guard
        # in agent_loop.py blocks DraftLearningPlan until it has been called.
        required_tools=["RetrieveLearningKnowledge", "SearchWebResources", "DraftLearningPlan"],
        max_plan_nudges=3,
    )

    print(
        f"[specialist] start"
        f" specialistRunId={specialist_run_id}"
        f" studentId={student_id}"
        f" timeout={loop_config.timeout_seconds}s"
        f" max_steps={loop_config.max_steps}"
        f" supervisorRunId={supervisor_run_id}",
        flush=True,
    )
    loop_result: AgentLoopResult = run_agent_loop(loop_config)
    print(
        f"[specialist] done"
        f" specialistRunId={specialist_run_id}"
        f" termination={loop_result.termination_reason.value}"
        f" steps={loop_result.step_count}"
        f" tool_calls={loop_result.tool_call_count}"
        f" has_draft={'DraftLearningPlan' in loop_result.tool_results}",
        flush=True,
    )

    perf_data      = loop_result.tool_results.get("GetStudentPerformance")
    gap_data       = loop_result.tool_results.get("GetSkillGapAnalysis")
    knowledge_data = loop_result.tool_results.get("RetrieveLearningKnowledge")
    web_data       = loop_result.tool_results.get("SearchWebResources")
    draft_ctx      = loop_result.tool_results.get("DraftLearningPlan") or {}

    # ── Post-loop resource relevance check and web-search guard ───────────────
    # Determine whether the internal knowledge docs actually cover the student's
    # weak skills.  If they don't, we:
    #   1. Strip unrelated docs from the plan context (Case 2).
    #   2. Trigger SearchWebResources if the LLM skipped it (ensures the plan
    #      always has external resources when internal content is insufficient).
    knowledge_docs_list = (knowledge_data or {}).get("documents") or []
    gap_skills_list     = (gap_data or {}).get("weakSkills") or []
    web_called          = "SearchWebResources" in loop_result.tool_results

    relevant_internal = _is_knowledge_relevant(knowledge_docs_list, gap_skills_list)

    print(
        f"[specialist] RESOURCE_TRACE"
        f" specialistRunId={specialist_run_id}"
        f" internalDocsFound={len(knowledge_docs_list)}"
        f" internalRelevant={relevant_internal}"
        f" webSearchCalled={web_called}"
        f" webResourcesFound={len((web_data or {}).get('webResources') or [])}",
        flush=True,
    )

    if knowledge_docs_list and not relevant_internal:
        # Case 2: internal docs exist but are not relevant to the student's weak skills.
        # Do not pass unrelated documents into the plan.
        print(
            f"[specialist] INTERNAL_NOT_RELEVANT"
            f" specialistRunId={specialist_run_id}"
            f" clearing {len(knowledge_docs_list)} unrelated doc(s) from plan context",
            flush=True,
        )
        knowledge_data = {"documents": []}
        knowledge_docs_list = []

    # ── Detect and fix generic skill labels in web search ────────────────────
    # The LLM sometimes calls SearchWebResources with generic category labels
    # like ['BEHAVIORAL'] or ['TECHNICAL'] instead of the actual measured skill
    # names (e.g. ['Problem Solving', 'Adaptability']).  When this happens,
    # build_resource_queries() classifies "BEHAVIORAL" as a behavioral skill and
    # generates behavioral interview queries even for technical skill students.
    # We detect this and override with the correct gap skill names.
    _GENERIC_CATEGORY_LABELS = frozenset({
        "behavioral", "technical", "general", "soft skills", "hard skills",
        "communication skills", "interpersonal skills",
    })
    if web_called and web_data and gap_skills_list:
        _used_skills = [s.lower().strip() for s in (web_data.get("skills") or []) if isinstance(s, str)]
        _has_generic = bool(_used_skills) and any(s in _GENERIC_CATEGORY_LABELS for s in _used_skills)
        if _has_generic:
            _actual_names = [
                s.get("name") or s.get("category") or ""
                for s in gap_skills_list
                if isinstance(s, dict)
            ]
            _actual_names = [n for n in _actual_names if n]
            if _actual_names:
                print(
                    f"[specialist] WEB_SKILLS_OVERRIDE"
                    f" specialistRunId={specialist_run_id}"
                    f" genericLabels={_used_skills!r}"
                    f" → actualSkills={_actual_names[:3]!r}",
                    flush=True,
                )
                _wsearch = next(
                    (t for t in SPECIALIST_TOOLS if t.name == "SearchWebResources"), None
                )
                if _wsearch:
                    _ctx2 = ToolContext(student_id=student_id, agent_run_id=specialist_run_id)
                    _res2 = _wsearch.execute(
                        {"query": " ".join(_actual_names[:3]), "skills": _actual_names[:5]},
                        _ctx2,
                    )
                    if _res2.success:
                        web_data = _res2.data
                        print(
                            f"[specialist] WEB_SKILLS_OVERRIDE_DONE"
                            f" specialistRunId={specialist_run_id}"
                            f" webResourceCount={len((web_data or {}).get('webResources') or [])}",
                            flush=True,
                        )

    # Safety-net: if the loop exited without SearchWebResources (e.g. after
    # max nudges exhausted), run it here so the plan always has external
    # resources.  With the pre-terminal guard this should rarely trigger.
    if not web_called and gap_skills_list:
        print(
            f"[specialist] POST_LOOP_WEB_SEARCH"
            f" specialistRunId={specialist_run_id}"
            f" reason=no_relevant_internal_docs",
            flush=True,
        )
        _web_search_tool = next(
            (t for t in SPECIALIST_TOOLS if t.name == "SearchWebResources"), None
        )
        if _web_search_tool:
            skill_names = [
                s.get("name") or s.get("category") or ""
                for s in gap_skills_list
                if isinstance(s, dict)
            ]
            skill_names = [n for n in skill_names if n]
            _query = (" ".join(skill_names[:3]) + " " + goal).strip() if skill_names else goal
            _ctx = ToolContext(student_id=student_id, agent_run_id=specialist_run_id)
            _web_result = _web_search_tool.execute(
                {"query": _query, "skills": skill_names[:5]}, _ctx
            )
            if _web_result.success:
                web_data = _web_result.data
                print(
                    f"[specialist] POST_LOOP_WEB_SEARCH_DONE"
                    f" specialistRunId={specialist_run_id}"
                    f" webResourceCount={len((web_data or {}).get('webResources') or [])}",
                    flush=True,
                )

    # ── Phase 2: generate the plan if context is ready ────────────────────────
    combined_metrics = loop_result.metrics
    plan_data: dict[str, Any] | None = None

    if draft_ctx.get("_ready_for_generation"):
        # Inject exact search result URLs — _resolve_resource_url needs them
        # to restore abbreviated URLs that the LLM may have shortened.
        exact_web = (web_data or {}).get("webResources") or []
        if exact_web:
            draft_ctx = {**draft_ctx, "webResources": exact_web}

        # Override weakSkills with authoritative data from GetSkillGapAnalysis.
        # The real LLM sometimes reclassifies actual skill names (Leadership,
        # Adaptability…) into a single category label (e.g. "BEHAVIORAL") when
        # it calls DraftLearningPlan.  Overriding here ensures the generation
        # prompt always shows the actual measured skill names + scores.
        actual_gap_skills = (gap_data or {}).get("weakSkills") or []
        if actual_gap_skills:
            draft_ctx = {**draft_ctx, "weakSkills": _format_weak_skills(actual_gap_skills)}

        # Override performanceData with the authoritative profile from
        # GetStudentPerformance so the LLM sees actual scores even if the
        # agent call omitted or misreported them.
        actual_profile = (perf_data or {}).get("profile") or {}
        if actual_profile:
            draft_ctx = {**draft_ctx, "performanceData": actual_profile}

        # Override knowledgeDocs with the relevance-checked list from the
        # post-loop strategy above.  If internal docs were found irrelevant,
        # knowledge_data was cleared — this ensures the generation LLM never
        # sees unrelated internal documents regardless of what the agent loop LLM
        # passed to DraftLearningPlan.
        authoritative_docs = (knowledge_data or {}).get("documents") or []
        draft_ctx = {**draft_ctx, "knowledgeDocs": authoritative_docs}

        plan_data = _generate_plan(
            draft_ctx, student_id, specialist_run_id, combined_metrics
        )
    elif draft_ctx:
        # Compatibility: execute() already generated the plan (legacy path)
        plan_data = draft_ctx if draft_ctx.get("weeklyPlan") else None

    # ── Emit token/call metrics ───────────────────────────────────────────────
    print(
        f"[agent_metrics]"
        f" run={specialist_run_id}"
        f" llm_calls={combined_metrics.llm_calls}"
        f" input_tokens={combined_metrics.input_tokens}"
        f" output_tokens={combined_metrics.output_tokens}"
        f" total_tokens={combined_metrics.total_tokens}"
        f" retries={combined_metrics.retry_count}"
        f" cache_hits={combined_metrics.cache_hits}"
        f" cache_misses={combined_metrics.cache_misses}"
        f" generation_source={plan_data.get('generation_source', 'NONE') if plan_data else 'NONE'}",
        flush=True,
    )

    succeeded = plan_data is not None

    agent_repository.update_run_status(
        specialist_run_id,
        "SUCCEEDED" if succeeded else "FAILED",
        "DraftPlanCompleted" if succeeded else loop_result.termination_reason.value,
    )

    return {
        "specialist_run_id": specialist_run_id,
        "performance_profile": (perf_data or {}).get("profile"),
        "recent_snapshots":    (perf_data or {}).get("recentSnapshots") or [],
        "weak_skills":         (gap_data or {}).get("weakSkills") or [],
        "knowledge_docs":      (knowledge_data or {}).get("documents") or [],
        "web_resources":       (web_data or {}).get("webResources") or [],
        "draft_plan":          plan_data,
        "loop_result":         loop_result,
    }


def _generate_plan(
    draft_ctx: dict[str, Any],
    student_id: str,
    specialist_run_id: str,
    metrics: AgentMetrics,
) -> dict[str, Any] | None:
    """Post-loop generation: one focused LLM call to produce the roadmap.

    Duration is ALWAYS the application-level constant LEARNING_PLAN_DURATION_WEEKS.
    The LLM's durationWeeks field is intentionally ignored — it is a business rule,
    not a per-student decision.
    """
    llm = get_llm_client()
    provider_name = type(llm._provider).__name__

    goal             = draft_ctx.get("goal", "")
    weak_skills      = draft_ctx.get("weakSkills") or []
    performance_data = draft_ctx.get("performanceData") or {}
    knowledge_docs   = draft_ctx.get("knowledgeDocs") or []
    web_resources    = draft_ctx.get("webResources") or []
    # Fixed business rule — never sourced from LLM or draft_ctx
    duration_weeks   = LEARNING_PLAN_DURATION_WEEKS

    print(
        f"[DraftLearningPlan] STARTED "
        f"runId={specialist_run_id} studentId={student_id} provider={provider_name} "
        f"weakSkillCount={len(weak_skills)} "
        f"internalDocCount={len(knowledge_docs)} "
        f"webResourceCount={len(web_resources)} "
        f"durationWeeks={duration_weeks}",
        flush=True,
    )
    print(
        f"[DraftLearningPlan] learning plan contract:"
        f" required_duration_weeks={duration_weeks}",
        flush=True,
    )

    print(
        f"[DraftLearningPlan] LLM_RESOURCE_CONTEXT "
        f"webResourceCount={len(web_resources)} internalDocCount={len(knowledge_docs)}",
        flush=True,
    )
    for _i, _r in enumerate(web_resources, 1):
        print(
            f"[DraftLearningPlan] LLM_RESOURCE[{_i}] "
            f"type={_r.get('type','WEB')} "
            f"url={_r.get('url','')} "
            f"title={_r.get('title','')[:80]!r} "
            f"snippet={_r.get('snippet','')[:120]!r}",
            flush=True,
        )

    _MAX_REGENERATION_ATTEMPTS = 2
    last_raw: dict[str, Any] | None = None

    for attempt in range(1, _MAX_REGENERATION_ATTEMPTS + 1):
        try:
            if attempt == 1:
                prompt = _PLAN_TOOL._build_prompt(
                    student_id, goal, weak_skills, performance_data,
                    knowledge_docs, web_resources, duration_weeks,
                )
            else:
                print(
                    f"[DraftLearningPlan] REGENERATION attempt={attempt}"
                    f" runId={specialist_run_id}"
                    f" reason=FIXED_DURATION_CONTRACT_VIOLATION",
                    flush=True,
                )
                prompt = _PLAN_TOOL._build_correction_prompt(
                    student_id, goal, weak_skills, performance_data,
                    knowledge_docs, web_resources, duration_weeks,
                    previous_week_count=len((last_raw or {}).get("weeklyPlan") or []),
                )

            raw       = llm._call_json(prompt, max_tokens=8192)
            last_raw  = raw
            plan      = _PLAN_TOOL._parse_response(raw, goal, weak_skills, duration_weeks, web_resources)

            # Accumulate generation call tokens
            provider   = getattr(llm, "_provider", None)
            last_usage = getattr(provider, "_last_usage", {})
            if not isinstance(last_usage, dict):
                last_usage = {}
            metrics.llm_calls    += 1
            metrics.input_tokens  += last_usage.get("input",  0)
            metrics.output_tokens += last_usage.get("output", 0)
            metrics.total_tokens  += last_usage.get("total",  0)

            # ── Validate fixed-duration contract ──────────────────────────────
            ok, reason = _validate_learning_plan(plan, duration_weeks)
            if not ok:
                print(
                    f"[DraftLearningPlan] learning plan validation FAILED"
                    f" attempt={attempt}"
                    f" runId={specialist_run_id}"
                    f" expected_duration_weeks={duration_weeks}"
                    f" actual_weeks={len(plan.get('weeklyPlan') or [])}"
                    f" reason={reason}",
                    flush=True,
                )
                if attempt < _MAX_REGENERATION_ATTEMPTS:
                    continue  # retry with corrected prompt
                # All attempts exhausted — do not persist
                print(
                    f"[DraftLearningPlan] learning plan generation FAILED"
                    f" runId={specialist_run_id}"
                    f" reason=FIXED_DURATION_CONTRACT_VIOLATION"
                    f" detail={reason}",
                    flush=True,
                )
                return None

            print(
                f"[DraftLearningPlan] learning plan validation PASS"
                f" durationWeeks={duration_weeks}"
                f" weeklyPlanCount={len(plan.get('weeklyPlan') or [])}"
                f" attempt={attempt}",
                flush=True,
            )
            print(
                f"[DraftLearningPlan] {provider_name} returned valid"
                f" {len(plan.get('weeklyPlan', []))}-week plan"
                f" — generation_source=LLM",
                flush=True,
            )
            plan["generation_source"] = "LLM"
            return plan

        except Exception as exc:
            print(
                f"[DraftLearningPlan] {provider_name} call FAILED attempt={attempt}"
                f" ({type(exc).__name__}: {exc}) — using FALLBACK",
                flush=True,
            )
            plan = _PLAN_TOOL._fallback_plan(
                goal, weak_skills, knowledge_docs, web_resources, duration_weeks
            )
            plan["generation_source"] = "FALLBACK"
            return plan

    # All attempts exhausted without exception (validation failed every time)
    return None


# ── Resource relevance ────────────────────────────────────────────────────────

def _is_knowledge_relevant(
    knowledge_docs: list[dict],
    weak_skills: list[dict | str],
) -> bool:
    """Return True when at least one internal doc is relevant to any weak skill.

    Relevance is determined by keyword overlap between the doc's title/text and
    the skill name.  Only words longer than 3 characters are used as keywords so
    common stop-words ('and', 'the', 'for') don't cause false positives.
    """
    if not knowledge_docs:
        return False

    skill_keywords: set[str] = set()
    for s in weak_skills:
        if isinstance(s, dict):
            name = (s.get("name") or s.get("category") or "").lower()
        elif isinstance(s, str):
            name = s.lower()
        else:
            continue
        for word in name.split():
            if len(word) > 3:
                skill_keywords.add(word)

    if not skill_keywords:
        return False

    for doc in knowledge_docs:
        title   = (doc.get("title") or "").lower()
        content = (
            doc.get("chunk_text") or doc.get("excerpt") or doc.get("content") or ""
        ).lower()
        text = title + " " + content
        if any(kw in text for kw in skill_keywords):
            return True

    return False


# ── Skill-gap formatting ──────────────────────────────────────────────────────

def _validate_learning_plan(
    plan: dict[str, Any],
    required_weeks: int,
) -> tuple[bool, str]:
    """Validate that a generated plan meets the fixed-duration contract.

    Returns (True, "") on success, or (False, reason) on any violation.
    Checks:
      1. weeklyPlan exists and has exactly required_weeks entries.
      2. durationWeeks field agrees with required_weeks.
      3. Week numbers are sequential [1, 2, ..., required_weeks].
    """
    weekly_plan = plan.get("weeklyPlan")
    if not isinstance(weekly_plan, list):
        return False, "weeklyPlan is missing or not a list"

    actual = len(weekly_plan)
    if actual != required_weeks:
        return False, f"weeklyPlan has {actual} weeks, expected {required_weeks}"

    field_weeks = plan.get("durationWeeks")
    if field_weeks is not None and int(field_weeks) != required_weeks:
        return (
            False,
            f"durationWeeks field is {field_weeks}, expected {required_weeks}",
        )

    week_numbers = [w.get("week") for w in weekly_plan]
    expected_numbers = list(range(1, required_weeks + 1))
    if week_numbers != expected_numbers:
        return (
            False,
            f"week numbers {week_numbers} are not sequential {expected_numbers}",
        )

    return True, ""


def _format_weak_skills(gap_skills: list[dict | str]) -> list[str]:
    """Convert GetSkillGapAnalysis results into score-annotated display strings.

    Accepts either dicts (from the DB tool) or plain strings (from tests /
    legacy paths).  Each dict is formatted as "SkillName (score/100)" so
    the generation LLM sees both the exact measured name AND the actual score.
    """
    result: list[str] = []
    for s in gap_skills:
        if isinstance(s, dict):
            name = s.get("name") or s.get("category") or "Unknown"
            score = s.get("avg_score")
            if score is not None:
                try:
                    result.append(f"{name} ({int(float(score))}/100)")
                except (ValueError, TypeError):
                    result.append(name)
            else:
                result.append(name)
        elif isinstance(s, str) and s:
            result.append(s)
    return result
