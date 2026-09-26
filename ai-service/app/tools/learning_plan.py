from __future__ import annotations

import json
from typing import Any

from app.services.llm_client import get_llm_client
from app.tools.base import ToolContext, ToolDefinition, ToolResult


class DraftLearningPlanTool(ToolDefinition):
    name = "DraftLearningPlan"
    description = (
        "Call the LLM to generate a personalized learning plan draft. "
        "Does NOT persist the plan — the supervisor validates and persists it."
    )
    input_schema = {
        "type": "object",
        "properties": {
            "goal": {"type": "string", "description": "The student's learning goal"},
            "weakSkills": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Weak skill names",
            },
            "performanceData": {
                "type": ["object", "null"],
                "description": "Performance profile data",
            },
            "knowledgeDocs": {
                "type": "array",
                "description": "Relevant knowledge documents",
            },
            "durationWeeks": {
                "type": "number",
                "description": "Plan duration in weeks (default 4)",
            },
        },
        "required": ["goal"],
    }
    read_only = False
    requires_student_scope = False

    def execute(self, args: dict[str, Any], ctx: ToolContext) -> ToolResult:
        goal = args.get("goal", "")
        weak_skills: list[str] = args.get("weakSkills") or []
        performance_data = args.get("performanceData") or {}
        knowledge_docs: list = args.get("knowledgeDocs") or []
        duration_weeks: int = int(args.get("durationWeeks") or 4)

        try:
            llm = get_llm_client()
            prompt = self._build_prompt(goal, weak_skills, performance_data, knowledge_docs, duration_weeks)
            raw = llm._call_json(prompt)
            plan = self._parse_response(raw, goal, weak_skills, duration_weeks)
            return ToolResult(success=True, data=plan)
        except Exception:
            fallback = self._fallback_plan(goal, weak_skills, duration_weeks)
            return ToolResult(success=True, data=fallback)

    def _build_prompt(
        self,
        goal: str,
        weak_skills: list[str],
        performance_data: dict,
        knowledge_docs: list,
        duration_weeks: int,
    ) -> str:
        knowledge_titles = [d.get("title", "") for d in knowledge_docs[:3]]
        return f"""You are a learning plan advisor for interview readiness.

Student goal: {goal}
Overall score: {performance_data.get("overall_score") or "No data yet"}
Technical score: {performance_data.get("technical_score") or "No data yet"}
Communication score: {performance_data.get("communication_score") or "No data yet"}
Listening score: {performance_data.get("listening_score") or "No data yet"}
Trend: {performance_data.get("trend") or "STABLE"}

Skills needing improvement (lowest scores first):
{json.dumps(weak_skills)}

Available learning resources:
{json.dumps(knowledge_titles)}

Create a {duration_weeks}-week personalized learning plan.

Respond ONLY with valid JSON matching this exact structure:
{{
  "goal": "<student goal>",
  "durationWeeks": {duration_weeks},
  "focusSkills": ["skill1", "skill2"],
  "weeklyPlan": [
    {{
      "week": 1,
      "focus": "Skill Name",
      "activities": ["activity 1", "activity 2", "activity 3"]
    }}
  ]
}}
"""

    def _parse_response(
        self,
        raw: dict,
        goal: str,
        weak_skills: list[str],
        duration_weeks: int,
    ) -> dict:
        weekly_raw = raw.get("weeklyPlan") or raw.get("weekly_plan") or []
        weekly_plan = [
            {
                "week": w.get("week", i + 1),
                "focus": w.get("focus", ""),
                "activities": w.get("activities", []),
            }
            for i, w in enumerate(weekly_raw)
        ]
        return {
            "goal": raw.get("goal", goal),
            "durationWeeks": int(raw.get("durationWeeks") or raw.get("duration_weeks") or duration_weeks),
            "focusSkills": raw.get("focusSkills") or raw.get("focus_skills") or weak_skills,
            "weeklyPlan": weekly_plan,
        }

    def _fallback_plan(self, goal: str, weak_skills: list[str], duration_weeks: int) -> dict:
        weekly_plan = [
            {
                "week": i + 1,
                "focus": skill,
                "activities": [
                    f"Study {skill} fundamentals",
                    f"Practice {skill} exercises",
                ],
            }
            for i, skill in enumerate(weak_skills[:duration_weeks])
        ]
        for i in range(len(weekly_plan), duration_weeks):
            skill = weak_skills[0] if weak_skills else "General Review"
            weekly_plan.append({
                "week": i + 1,
                "focus": skill,
                "activities": [
                    "Consolidate learning from previous weeks",
                    "Mock practice session",
                ],
            })
        return {
            "goal": goal,
            "durationWeeks": duration_weeks,
            "focusSkills": weak_skills[:3],
            "weeklyPlan": weekly_plan,
        }
