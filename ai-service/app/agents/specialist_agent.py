from __future__ import annotations

import json
from typing import Any

from app.agents.agent_loop import run_agent_loop
from app.agents.prompts import get_specialist_system_prompt
from app.agents.state import AgentLoopConfig, AgentLoopResult, TerminationReason
from app.repositories import agent_repository
from app.tools.knowledge import RetrieveLearningKnowledgeTool
from app.tools.learning_plan import DraftLearningPlanTool
from app.tools.performance import GetStudentPerformanceTool
from app.tools.skill_gap import GetSkillGapAnalysisTool

SPECIALIST_TOOLS = [
    GetStudentPerformanceTool(),
    GetSkillGapAnalysisTool(),
    RetrieveLearningKnowledgeTool(),
    DraftLearningPlanTool(),
]


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
        timeout_seconds=float(spec_def.get("timeout_seconds") or 45),
    )

    loop_result: AgentLoopResult = run_agent_loop(loop_config)

    perf_data = loop_result.tool_results.get("GetStudentPerformance")
    gap_data = loop_result.tool_results.get("GetSkillGapAnalysis")
    knowledge_data = loop_result.tool_results.get("RetrieveLearningKnowledge")
    plan_data = loop_result.tool_results.get("DraftLearningPlan")

    succeeded = (
        loop_result.termination_reason == TerminationReason.NATURAL and plan_data is not None
    )

    agent_repository.update_run_status(
        specialist_run_id,
        "SUCCEEDED" if succeeded else "FAILED",
        "DraftPlanCompleted" if succeeded else loop_result.termination_reason.value,
    )

    return {
        "specialist_run_id": specialist_run_id,
        "performance_profile": (perf_data or {}).get("profile"),
        "recent_snapshots": (perf_data or {}).get("recentSnapshots") or [],
        "weak_skills": (gap_data or {}).get("weakSkills") or [],
        "knowledge_docs": (knowledge_data or {}).get("documents") or [],
        "draft_plan": plan_data,
        "loop_result": loop_result,
    }
