from __future__ import annotations

import json
import time
from typing import Any

from app.agents.specialist_agent import run_specialist_agent
from app.repositories import agent_repository, learning_repository
from app.tools.base import ToolContext
from app.tools.performance import GetStudentPerformanceTool

_perf_tool = GetStudentPerformanceTool()


def run_supervisor_agent(
    supervisor_run_id: str,
    student_id: str,
    goal: str,
    triggered_by_user_id: str | None,
    spec_def: dict[str, Any],
) -> dict[str, Any]:

    # ── Step 1 (DECISION): START ──────────────────────────────────────────────
    agent_repository.upsert_completed_step(
        supervisor_run_id, 1, "DECISION", None,
        json.dumps({"goal": goal}),
        json.dumps({"decision": "START"}),
        "COMPLETED", None, None, 0,
    )

    # ── Step 2 (TOOL): GetStudentPerformance — direct call, no LLM ───────────
    agent_repository.insert_running_tool_step(
        supervisor_run_id, 2, "GetStudentPerformance",
        json.dumps({"studentId": student_id}),
    )
    perf_ctx = ToolContext(student_id=student_id, agent_run_id=supervisor_run_id)
    perf_start = time.time()
    perf_result = _perf_tool.execute({"studentId": student_id}, perf_ctx)
    perf_ms = int((time.time() - perf_start) * 1000)

    agent_repository.update_tool_step(
        supervisor_run_id, 2,
        json.dumps(perf_result.data) if perf_result.success else None,
        "COMPLETED" if perf_result.success else "FAILED",
        perf_result.error_code if not perf_result.success else None,
        perf_result.error_message if not perf_result.success else None,
        perf_ms,
    )

    # ── Step 3 (DECISION): DELEGATE_TO_SPECIALIST ─────────────────────────────
    agent_repository.upsert_completed_step(
        supervisor_run_id, 3, "DECISION", None,
        json.dumps({"decision": "DELEGATE_TO_SPECIALIST"}),
        json.dumps({"reason": "learning plan requires specialist analysis"}),
        "COMPLETED", None, None, 0,
    )

    specialist_result = run_specialist_agent(
        {
            "studentId": student_id,
            "goal": goal,
            "supervisorRunId": supervisor_run_id,
            "triggeredByUserId": triggered_by_user_id,
        },
        spec_def,
    )

    if not specialist_result.get("draft_plan"):
        raise RuntimeError("Specialist failed to produce a learning plan")

    # ── Step 4 (DECISION): PERSIST_PLAN ──────────────────────────────────────
    agent_repository.upsert_completed_step(
        supervisor_run_id, 4, "DECISION", None,
        json.dumps({"decision": "PERSIST_PLAN"}),
        json.dumps({"specialistRunId": specialist_result["specialist_run_id"]}),
        "COMPLETED", None, None, 0,
    )

    # ── Idempotency guard ─────────────────────────────────────────────────────
    existing_plan = learning_repository.find_plan_by_agent_run(supervisor_run_id)

    if existing_plan:
        learning_plan = existing_plan
    else:
        learning_plan = learning_repository.create_learning_plan(
            student_id=student_id,
            agent_run_id=supervisor_run_id,
            goal=goal,
            plan_data_json_str=json.dumps(specialist_result["draft_plan"]),
        )
        for ws in specialist_result.get("weak_skills") or []:
            skill_id = ws.get("skill_id") or str(ws.get("skill_id", ""))
            name = ws.get("name", "Unknown skill")
            learning_repository.create_recommendation(
                student_id=student_id,
                plan_id=learning_plan["id"],
                skill_id=skill_id,
                title=f"Improve: {name}",
            )

    return {
        "learning_plan": learning_plan,
        "specialist_result": specialist_result,
    }
