"""
Verify that MockProvider reads GetSkillGapAnalysis, GetStudentPerformance, and
RetrieveLearningKnowledge tool results from the message history and passes them
dynamically into the DraftLearningPlan tool call.
"""
from __future__ import annotations

import json

from app.services.providers import MockProvider


def _messages(
    weak_skills_data: list | None = None,
    goal_suffix: str = "Improve communication skills",
) -> list[dict]:
    """Build a realistic message history up to the DraftLearningPlan decision point."""
    if weak_skills_data is None:
        weak_skills_data = [
            {"skill_id": "s1", "name": "Leadership",         "category": "SOFT", "avg_score": 38.0},
            {"skill_id": "s2", "name": "Adaptability",       "category": "SOFT", "avg_score": 45.0},
            {"skill_id": "s3", "name": "Conflict Resolution","category": "SOFT", "avg_score": 52.0},
            {"skill_id": "s4", "name": "Time Management",    "category": "SOFT", "avg_score": 55.0},
            {"skill_id": "s5", "name": "Teamwork",           "category": "SOFT", "avg_score": 67.0},
        ]

    student_id = "60000000-0000-0000-0000-000000000001"
    return [
        {
            "role": "system",
            "content": f"You are a specialist agent for student {student_id}.",
        },
        {
            "role": "user",
            "content": f"Create a learning plan for student {student_id}. Goal: {goal_suffix}",
        },
        {"role": "assistant", "content": "[called: GetStudentPerformance]"},
        {
            "role": "tool",
            "name": "GetStudentPerformance",
            "content": json.dumps({
                "profile": {
                    "technical_score": 72.5,
                    "communication_score": 60.0,
                    "listening_score": 58.0,
                    "overall_score": 65.0,
                    "trend": "IMPROVING",
                },
                "recentSnapshots": [],
            }),
        },
        {"role": "assistant", "content": "[called: GetSkillGapAnalysis]"},
        {
            "role": "tool",
            "name": "GetSkillGapAnalysis",
            "content": json.dumps({"weakSkills": weak_skills_data}),
        },
        {"role": "assistant", "content": "[called: RetrieveLearningKnowledge]"},
        {
            "role": "tool",
            "name": "RetrieveLearningKnowledge",
            "content": json.dumps({
                "documents": [
                    {"title": "Interview Prep Guide", "content": "Comprehensive guide..."},
                    {"title": "Communication Tips",   "content": "Tips for clear speech..."},
                ],
            }),
        },
    ]


# ── provider fixture ──────────────────────────────────────────────────────────

def _provider() -> MockProvider:
    return MockProvider()


# ── tests ─────────────────────────────────────────────────────────────────────

def test_next_tool_is_draft_learning_plan():
    """After all three data tools are called, MockProvider must choose DraftLearningPlan."""
    result = _provider().chat_complete_with_tools(_messages(), [])
    assert result["type"] == "tool_call"
    assert result["tool_name"] == "DraftLearningPlan"


def test_weak_skills_come_from_skill_gap_result():
    """weakSkills must be the names extracted from GetSkillGapAnalysis, not []."""
    result = _provider().chat_complete_with_tools(_messages(), [])
    assert result["tool_args"]["weakSkills"] == [
        "Leadership", "Adaptability", "Conflict Resolution", "Time Management", "Teamwork"
    ]


def test_performance_data_comes_from_performance_result():
    """performanceData must be the profile dict from GetStudentPerformance."""
    result = _provider().chat_complete_with_tools(_messages(), [])
    perf = result["tool_args"]["performanceData"]
    assert perf is not None
    assert perf["overall_score"] == 65.0
    assert perf["trend"] == "IMPROVING"


def test_knowledge_docs_come_from_knowledge_result():
    """knowledgeDocs must be the documents list from RetrieveLearningKnowledge."""
    result = _provider().chat_complete_with_tools(_messages(), [])
    docs = result["tool_args"]["knowledgeDocs"]
    assert len(docs) == 2
    assert docs[0]["title"] == "Interview Prep Guide"


def test_goal_extracted_from_user_message():
    """goal must come from the user message, not the hard-coded default."""
    result = _provider().chat_complete_with_tools(
        _messages(goal_suffix="Ace my campus placement interview"), []
    )
    assert result["tool_args"]["goal"] == "Ace my campus placement interview"


def test_empty_weak_skills_handled_gracefully():
    """If GetSkillGapAnalysis returns no weak skills, DraftLearningPlan gets [] not None."""
    result = _provider().chat_complete_with_tools(_messages(weak_skills_data=[]), [])
    assert result["tool_args"]["weakSkills"] == []


def test_partial_skill_objects_skipped():
    """Skill objects missing the 'name' key must be silently skipped."""
    skills = [
        {"skill_id": "s1", "name": "Leadership", "avg_score": 38.0},
        {"skill_id": "s2",                         "avg_score": 45.0},  # missing 'name'
    ]
    result = _provider().chat_complete_with_tools(_messages(weak_skills_data=skills), [])
    assert result["tool_args"]["weakSkills"] == ["Leadership"]
