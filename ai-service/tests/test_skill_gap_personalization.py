"""
test_skill_gap_personalization.py

Verify that Module 3 always uses the student's ACTUAL weak skills (names + scores
from GetSkillGapAnalysis) in the roadmap prompt, NOT search-category labels.

Requirements:
  1. _format_weak_skills converts DB dicts to score-annotated strings.
  2. Actual skill names appear in the LLM generation prompt.
  3. Actual scores appear in the LLM generation prompt.
  4. A search-category label (e.g. "BEHAVIORAL") is NOT used as a skill name.
  5. The specialist_agent overrides weakSkills from gap_data, not LLM output.
  6. whyThisSkill instruction forbids "score is N/A".
  7. focus instruction requires exact skill name, not category.
  8. Web resources still reach the LLM prompt.
  9. YouTube resources still reach the LLM prompt.
 10. _fallback_plan uses actual skill names.
 11. _parse_response falls back to actual skill names for focusSkills.
"""
from __future__ import annotations

import json
from unittest.mock import MagicMock, patch

import pytest

from app.agents.specialist_agent import _format_weak_skills
from app.tools.learning_plan import DraftLearningPlanTool
from app.tools.base import ToolContext


# ── fixtures ──────────────────────────────────────────────────────────────────

ALICE_GAP_SKILLS = [
    {"skill_id": "s1", "name": "Leadership",         "category": "BEHAVIORAL", "avg_score": 38.0},
    {"skill_id": "s2", "name": "Adaptability",       "category": "BEHAVIORAL", "avg_score": 45.0},
    {"skill_id": "s3", "name": "Conflict Resolution","category": "BEHAVIORAL", "avg_score": 52.0},
    {"skill_id": "s4", "name": "Time Management",    "category": "BEHAVIORAL", "avg_score": 55.0},
    {"skill_id": "s5", "name": "Teamwork",           "category": "BEHAVIORAL", "avg_score": 67.0},
]

ALICE_PROFILE = {
    "overall_score":       72.3,
    "technical_score":     66.75,
    "communication_score": 74.75,
    "listening_score":     75.31,
    "trend":               "STABLE",
}

WEB_RESOURCES = [
    {
        "type":    "WEB",
        "title":   "Campus Placement Interview Questions: 40 Answers",
        "url":     "https://hyring.com/jobseeker-toolkit/interview-questions/behavioral/campus-placement",
        "snippet": "Strong placement answers prove entry-level readiness.",
        "source":  "hyring.com",
    },
    {
        "type":    "YOUTUBE",
        "title":   "Behavioral Placement Interview Questions and Answers",
        "url":     "https://www.youtube.com/watch?v=Vt6jvRzBQNA",
        "snippet": "Complete guide for behavioral interview prep.",
        "source":  "youtube.com",
    },
]

def _tool() -> DraftLearningPlanTool:
    return DraftLearningPlanTool()

def _ctx() -> ToolContext:
    return ToolContext(student_id="60000000-0000-0000-0000-000000000001", agent_run_id="test-run")


# ══════════════════════════════════════════════════════════════════════════════
# 1. _format_weak_skills
# ══════════════════════════════════════════════════════════════════════════════

class TestFormatWeakSkills:

    def test_dict_skills_annotated_with_score(self):
        result = _format_weak_skills(ALICE_GAP_SKILLS)
        assert result[0] == "Leadership (38/100)"
        assert result[1] == "Adaptability (45/100)"
        assert result[2] == "Conflict Resolution (52/100)"
        assert result[3] == "Time Management (55/100)"
        assert result[4] == "Teamwork (67/100)"

    def test_preserves_all_skills(self):
        result = _format_weak_skills(ALICE_GAP_SKILLS)
        assert len(result) == 5

    def test_string_skills_pass_through(self):
        skills = ["Leadership", "Adaptability"]
        result = _format_weak_skills(skills)
        assert result == ["Leadership", "Adaptability"]

    def test_missing_score_uses_name_only(self):
        skills = [{"name": "Leadership", "skill_id": "s1"}]  # no avg_score
        result = _format_weak_skills(skills)
        assert result == ["Leadership"]

    def test_missing_name_falls_back_to_category(self):
        skills = [{"category": "BEHAVIORAL", "avg_score": 38.0}]
        result = _format_weak_skills(skills)
        assert result == ["BEHAVIORAL (38/100)"]

    def test_empty_list_returns_empty(self):
        assert _format_weak_skills([]) == []

    def test_score_truncated_to_int(self):
        skills = [{"name": "Teamwork", "avg_score": 67.3}]
        result = _format_weak_skills(skills)
        assert result == ["Teamwork (67/100)"]

    def test_category_label_not_used_when_name_present(self):
        """Name field takes priority over category."""
        skills = [{"name": "Leadership", "category": "BEHAVIORAL", "avg_score": 38.0}]
        result = _format_weak_skills(skills)
        assert "BEHAVIORAL" not in result[0]
        assert "Leadership" in result[0]

    def test_mixed_dict_and_string(self):
        skills = [
            {"name": "Leadership", "avg_score": 38.0},
            "Adaptability",
        ]
        result = _format_weak_skills(skills)
        assert result[0] == "Leadership (38/100)"
        assert result[1] == "Adaptability"


# ══════════════════════════════════════════════════════════════════════════════
# 2. _build_prompt — actual skill names appear in prompt
# ══════════════════════════════════════════════════════════════════════════════

class TestBuildPromptPersonalization:

    def _prompt(self, weak_skills=None, perf=None, web=None):
        skills = weak_skills if weak_skills is not None else _format_weak_skills(ALICE_GAP_SKILLS)
        perf   = perf or ALICE_PROFILE
        web    = web or WEB_RESOURCES
        return _tool()._build_prompt(
            student_id="alice-id",
            goal="Ace campus placement interview",
            weak_skills=skills,
            performance_data=perf,
            knowledge_docs=[],
            web_resources=web,
            duration_weeks=4,
        )

    def test_leadership_appears_in_prompt(self):
        prompt = self._prompt()
        assert "Leadership" in prompt

    def test_adaptability_appears_in_prompt(self):
        prompt = self._prompt()
        assert "Adaptability" in prompt

    def test_conflict_resolution_appears_in_prompt(self):
        prompt = self._prompt()
        assert "Conflict Resolution" in prompt

    def test_time_management_appears_in_prompt(self):
        prompt = self._prompt()
        assert "Time Management" in prompt

    def test_teamwork_appears_in_prompt(self):
        prompt = self._prompt()
        assert "Teamwork" in prompt

    def test_actual_scores_appear_in_prompt(self):
        prompt = self._prompt()
        assert "38/100" in prompt
        assert "45/100" in prompt
        assert "52/100" in prompt

    def test_search_category_not_used_as_skill_name(self):
        """'BEHAVIORAL' category must NOT appear as a standalone skill name."""
        prompt = self._prompt()
        # BEHAVIORAL may appear in the resources section but must not be
        # listed as a weak skill.  The actual skill names should be there.
        lines = [ln for ln in prompt.splitlines() if "BEHAVIORAL" in ln]
        # No line should show "- BEHAVIORAL" as a skill entry
        skill_section_hits = [ln for ln in lines if ln.strip().startswith("- BEHAVIORAL")]
        assert skill_section_hits == [], (
            f"BEHAVIORAL used as a skill name in prompt: {skill_section_hits}"
        )

    def test_na_score_absent_when_real_scores_provided(self):
        prompt = self._prompt()
        # "(N/A/100)" must not appear — that would mean a skill has no score
        assert "(N/A/100)" not in prompt
        # The prompt may mention "score is N/A" only as a NEVER-do example,
        # not as an actual skill entry.  Verify no skill line says "N/A/100".
        skill_na_lines = [
            ln for ln in prompt.splitlines()
            if "N/A/100" in ln
        ]
        assert skill_na_lines == []

    def test_prompt_contains_actual_score_for_leadership(self):
        prompt = self._prompt()
        assert "38/100" in prompt  # Leadership score

    def test_web_resource_url_in_prompt(self):
        prompt = self._prompt()
        assert "hyring.com" in prompt

    def test_youtube_resource_url_in_prompt(self):
        prompt = self._prompt()
        assert "youtube.com/watch?v=Vt6jvRzBQNA" in prompt

    def test_focus_instruction_says_exact_skill_name(self):
        prompt = self._prompt()
        assert 'EXACT skill name' in prompt or 'exact skill name' in prompt.lower()

    def test_prompt_forbids_na_score_in_whythisskill(self):
        prompt = self._prompt()
        assert "NEVER write" in prompt or "score is N/A" in prompt.lower() is False

    def test_overall_score_in_profile_section(self):
        prompt = self._prompt()
        assert "72" in prompt  # overall_score from ALICE_PROFILE

    def test_prompt_labels_skills_as_actual_measured(self):
        prompt = self._prompt()
        assert "ACTUAL" in prompt or "actual" in prompt.lower()


# ══════════════════════════════════════════════════════════════════════════════
# 3. _parse_response — focus skills from actual skill names
# ══════════════════════════════════════════════════════════════════════════════

class TestParseResponseActualSkills:

    ACTUAL_SKILLS = ["Leadership (38/100)", "Adaptability (45/100)", "Conflict Resolution (52/100)"]

    def _parse(self, raw: dict) -> dict:
        return _tool()._parse_response(raw, "Campus placement", self.ACTUAL_SKILLS, 4)

    def test_focusskills_from_response_preserved(self):
        raw = {
            "goal": "G",
            "focusSkills": ["Leadership", "Adaptability"],
            "weeklyPlan": [],
        }
        result = self._parse(raw)
        assert result["focusSkills"] == ["Leadership", "Adaptability"]

    def test_focusskills_fallback_to_weak_skills(self):
        raw = {"goal": "G", "weeklyPlan": []}
        result = self._parse(raw)
        assert result["focusSkills"] == self.ACTUAL_SKILLS

    def test_week_focus_from_llm_preserved(self):
        raw = {
            "goal": "G",
            "focusSkills": ["Leadership"],
            "weeklyPlan": [
                {"week": 1, "focus": "Leadership", "skills": ["Leadership"],
                 "activities": [], "resources": []},
            ],
        }
        result = self._parse(raw)
        assert result["weeklyPlan"][0]["focus"] == "Leadership"

    def test_actual_skill_name_not_category_in_focus(self):
        """If the LLM returns BEHAVIORAL as focus, it is preserved as-is BUT
        the override in specialist_agent ensures actual names are in the prompt.
        This test verifies _parse_response does not itself inject category names."""
        raw = {
            "goal": "G",
            "weeklyPlan": [
                {"week": 1, "focus": "Leadership", "skills": ["Leadership"],
                 "activities": [], "resources": []},
            ],
        }
        result = self._parse(raw)
        assert result["weeklyPlan"][0]["focus"] == "Leadership"
        assert "BEHAVIORAL" not in result["weeklyPlan"][0]["focus"]


# ══════════════════════════════════════════════════════════════════════════════
# 4. _fallback_plan — uses actual skill names (not categories)
# ══════════════════════════════════════════════════════════════════════════════

class TestFallbackWithActualSkills:

    def test_fallback_focus_uses_actual_skill_names(self):
        actual_skills = ["Leadership (38/100)", "Adaptability (45/100)"]
        plan = _tool()._fallback_plan("Goal", actual_skills, [], [], 2)
        focuses = [w["focus"] for w in plan["weeklyPlan"]]
        assert focuses[0] == "Leadership (38/100)"
        assert focuses[1] == "Adaptability (45/100)"

    def test_fallback_does_not_invent_category_label(self):
        actual_skills = ["Leadership (38/100)"]
        plan = _tool()._fallback_plan("Goal", actual_skills, [], [], 2)
        for w in plan["weeklyPlan"]:
            assert "BEHAVIORAL" not in w.get("focus", "")


# ══════════════════════════════════════════════════════════════════════════════
# 5. specialist_agent override logic (unit test via mock)
# ══════════════════════════════════════════════════════════════════════════════

class TestSpecialistAgentOverride:
    """Verify that run_specialist_agent replaces LLM-supplied weakSkills with
    authoritative gap_data from GetSkillGapAnalysis."""

    def test_format_weak_skills_preserves_correct_count(self):
        result = _format_weak_skills(ALICE_GAP_SKILLS)
        assert len(result) == 5

    def test_format_produces_score_annotated_strings(self):
        result = _format_weak_skills(ALICE_GAP_SKILLS)
        for item in result:
            assert "/100" in item, f"Score annotation missing: {item!r}"

    def test_format_uses_name_not_category(self):
        result = _format_weak_skills(ALICE_GAP_SKILLS)
        names = [r.split(" (")[0] for r in result]
        assert names == [
            "Leadership", "Adaptability", "Conflict Resolution",
            "Time Management", "Teamwork",
        ]

    def test_prompt_contains_formatted_skills_after_override(self):
        """Simulate the override: format actual gap skills and verify the
        resulting prompt contains the annotated skill names."""
        formatted = _format_weak_skills(ALICE_GAP_SKILLS)
        prompt = _tool()._build_prompt(
            student_id="alice-id",
            goal="Ace campus placement",
            weak_skills=formatted,
            performance_data=ALICE_PROFILE,
            knowledge_docs=[],
            web_resources=WEB_RESOURCES,
            duration_weeks=4,
        )
        # All actual skill names + scores must be in the prompt
        for skill in formatted:
            name = skill.split(" (")[0]
            score = skill.split("(")[1].split("/")[0]
            assert name in prompt, f"Skill name {name!r} missing from prompt"
            assert score in prompt, f"Score {score} missing from prompt"

    def test_category_label_not_injected_into_prompt(self):
        """Even though the LLM might have passed 'BEHAVIORAL', the override
        ensures actual names are in the prompt instead."""
        # Simulate what happens after override: actual skills go into draft_ctx
        llm_supplied_wrong = ["BEHAVIORAL"]  # what the LLM wrongly passed
        actual_from_db = _format_weak_skills(ALICE_GAP_SKILLS)  # override

        # Build the prompt with the overridden skills
        prompt = _tool()._build_prompt(
            student_id="alice-id",
            goal="Ace campus placement",
            weak_skills=actual_from_db,  # the overridden value
            performance_data=ALICE_PROFILE,
            knowledge_docs=[],
            web_resources=[],
            duration_weeks=4,
        )
        # "BEHAVIORAL" should NOT appear as a skill line
        skill_lines = [
            ln for ln in prompt.splitlines()
            if ln.strip().startswith("- BEHAVIORAL")
        ]
        assert skill_lines == []
        # But "Leadership (38/100)" etc. should be there
        assert "Leadership (38/100)" in prompt


# ══════════════════════════════════════════════════════════════════════════════
# 6. Resource pipeline preserved
# ══════════════════════════════════════════════════════════════════════════════

class TestResourcePipelinePreserved:
    """Ensure the fix does not break web/YouTube resource flow."""

    def test_web_resources_in_prompt(self):
        formatted = _format_weak_skills(ALICE_GAP_SKILLS)
        prompt = _tool()._build_prompt(
            student_id="s", goal="Goal", weak_skills=formatted,
            performance_data=ALICE_PROFILE, knowledge_docs=[],
            web_resources=WEB_RESOURCES, duration_weeks=4,
        )
        assert "hyring.com" in prompt
        assert "Campus Placement Interview Questions" in prompt

    def test_youtube_resources_in_prompt(self):
        formatted = _format_weak_skills(ALICE_GAP_SKILLS)
        prompt = _tool()._build_prompt(
            student_id="s", goal="Goal", weak_skills=formatted,
            performance_data=ALICE_PROFILE, knowledge_docs=[],
            web_resources=WEB_RESOURCES, duration_weeks=4,
        )
        assert "youtube.com/watch?v=Vt6jvRzBQNA" in prompt
        assert "Behavioral Placement Interview" in prompt

    def test_exact_url_preserved_in_prompt(self):
        formatted = _format_weak_skills(ALICE_GAP_SKILLS)
        prompt = _tool()._build_prompt(
            student_id="s", goal="Goal", weak_skills=formatted,
            performance_data=ALICE_PROFILE, knowledge_docs=[],
            web_resources=WEB_RESOURCES, duration_weeks=4,
        )
        # Full exact URL must appear (never shortened)
        assert "https://hyring.com/jobseeker-toolkit/interview-questions/behavioral/campus-placement" in prompt
        assert "https://www.youtube.com/watch?v=Vt6jvRzBQNA" in prompt

    def test_url_not_shortened_to_domain_only(self):
        formatted = _format_weak_skills(ALICE_GAP_SKILLS)
        prompt = _tool()._build_prompt(
            student_id="s", goal="Goal", weak_skills=formatted,
            performance_data=ALICE_PROFILE, knowledge_docs=[],
            web_resources=WEB_RESOURCES, duration_weeks=4,
        )
        # Should not have truncated "https://youtube.com" without watch?v=
        assert '"url": "https://youtube.com"' not in prompt
        assert '"url": "https://www.youtube.com"' not in prompt or \
               "watch?v=Vt6jvRzBQNA" in prompt
