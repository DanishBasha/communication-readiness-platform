from __future__ import annotations

import json
from typing import Any, Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.services.llm_client import get_llm_client

router = APIRouter(prefix="/learning", tags=["learning"])


# ── Draft-plan models (unchanged) ─────────────────────────────────────────────

class PerformanceData(BaseModel):
    assessment_count: int = 0
    overall_score: float | None = None
    technical_score: float | None = None
    communication_score: float | None = None
    listening_score: float | None = None
    trend: str = "STABLE"


class WeeklyActivity(BaseModel):
    week: int
    focus: str
    activities: list[str] = Field(default_factory=list)


class DraftPlanRequest(BaseModel):
    goal: str
    duration_weeks: int = 4
    focus_skills: list[str] = Field(default_factory=list)
    performance_data: PerformanceData = Field(default_factory=PerformanceData)
    knowledge_context: list[dict[str, Any]] = Field(default_factory=list)


class DraftPlanResponse(BaseModel):
    goal: str
    duration_weeks: int
    focus_skills: list[str]
    weekly_plan: list[WeeklyActivity]


# ── Chat-complete models (agent loop) ─────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str
    content: str
    name: Optional[str] = None


class ChatCompleteRequest(BaseModel):
    messages: list[ChatMessage]
    tools: list[dict[str, Any]] = Field(default_factory=list)


class ChatCompleteResponse(BaseModel):
    type: str                           # "tool_call" | "final_answer"
    tool_name: Optional[str] = None
    tool_args: Optional[dict[str, Any]] = None
    content: Optional[str] = None


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/draft-plan", response_model=DraftPlanResponse)
def draft_learning_plan(request: DraftPlanRequest) -> DraftPlanResponse:
    """Generate a personalized learning plan using the configured LLM provider.

    Falls back to a template-based plan if the LLM call fails, so the backend
    agent always receives a valid response.
    """
    try:
        llm = get_llm_client()
        prompt = _build_prompt(request)
        raw = llm._call_json(prompt)
        return _parse_response(raw, request)
    except Exception:
        return _fallback_plan(request)


@router.post("/chat-complete", response_model=ChatCompleteResponse)
def chat_complete(request: ChatCompleteRequest) -> ChatCompleteResponse:
    """Execute one iteration of the agent loop.

    Accepts the current message history and tool definitions; returns the
    model's next action as either a tool_call or final_answer.
    """
    try:
        llm = get_llm_client()
        messages = [
            {
                "role": m.role,
                "content": m.content,
                **({"name": m.name} if m.name else {}),
            }
            for m in request.messages
        ]
        result = llm.chat_complete_with_tools(messages, request.tools)
        return ChatCompleteResponse(
            type=result.get("type", "final_answer"),
            tool_name=result.get("tool_name"),
            tool_args=result.get("tool_args"),
            content=result.get("content"),
        )
    except Exception as exc:
        return ChatCompleteResponse(type="final_answer", content=f"Agent loop error: {exc}")


# ── Helpers ───────────────────────────────────────────────────────────────────

def _build_prompt(req: DraftPlanRequest) -> str:
    perf = req.performance_data
    knowledge_titles = [d.get("title", "") for d in req.knowledge_context[:3]]

    return f"""You are a learning plan advisor for interview readiness.

Student goal: {req.goal}
Assessment count: {perf.assessment_count}
Overall score: {perf.overall_score or "No data yet"}
Technical score: {perf.technical_score or "No data yet"}
Communication score: {perf.communication_score or "No data yet"}
Listening score: {perf.listening_score or "No data yet"}
Trend: {perf.trend}

Skills needing improvement (lowest scores first):
{json.dumps(req.focus_skills)}

Available learning resources:
{json.dumps(knowledge_titles)}

Create a {req.duration_weeks}-week personalized learning plan.

Respond ONLY with valid JSON matching this exact structure:
{{
  "goal": "<student goal>",
  "durationWeeks": {req.duration_weeks},
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


def _parse_response(raw: dict[str, Any], req: DraftPlanRequest) -> DraftPlanResponse:
    weekly_raw = raw.get("weeklyPlan", raw.get("weekly_plan", []))
    weekly_plan = [
        WeeklyActivity(
            week=w.get("week", i + 1),
            focus=w.get("focus", ""),
            activities=w.get("activities", []),
        )
        for i, w in enumerate(weekly_raw)
    ]
    return DraftPlanResponse(
        goal=raw.get("goal", req.goal),
        duration_weeks=int(raw.get("durationWeeks", raw.get("duration_weeks", req.duration_weeks))),
        focus_skills=raw.get("focusSkills", raw.get("focus_skills", req.focus_skills)),
        weekly_plan=weekly_plan,
    )


def _fallback_plan(req: DraftPlanRequest) -> DraftPlanResponse:
    weeks = []
    for i, skill in enumerate(req.focus_skills[: req.duration_weeks]):
        weeks.append(WeeklyActivity(
            week=i + 1,
            focus=skill,
            activities=[
                f"Study core concepts of {skill}",
                f"Complete 3 practice exercises on {skill}",
                f"Review and self-assess {skill} progress",
            ],
        ))
    for i in range(len(weeks), req.duration_weeks):
        skill = req.focus_skills[0] if req.focus_skills else "General Review"
        weeks.append(WeeklyActivity(
            week=i + 1,
            focus=skill,
            activities=[
                "Consolidate learning from previous weeks",
                "Mock practice session",
                "Reflect and identify remaining gaps",
            ],
        ))
    return DraftPlanResponse(
        goal=req.goal,
        duration_weeks=req.duration_weeks,
        focus_skills=req.focus_skills,
        weekly_plan=weeks,
    )
