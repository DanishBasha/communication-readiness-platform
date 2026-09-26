from __future__ import annotations

from typing import Any

from app.repositories import knowledge_repository
from app.tools.base import ToolContext, ToolDefinition, ToolResult


class RetrieveLearningKnowledgeTool(ToolDefinition):
    name = "RetrieveLearningKnowledge"
    description = (
        "Retrieve public knowledge documents with their first chunk as an excerpt. "
        "Pass categories from the skill gap analysis to contextualise the retrieval."
    )
    input_schema = {
        "type": "object",
        "properties": {
            "categories": {
                "type": "array",
                "items": {"type": "string"},
                "description": 'Skill categories (e.g. ["TECHNICAL", "COMMUNICATION"])',
            },
        },
        "required": ["categories"],
    }
    read_only = True
    requires_student_scope = False

    def execute(self, args: dict[str, Any], ctx: ToolContext) -> ToolResult:
        categories = args.get("categories", [])
        try:
            if not categories:
                return ToolResult(success=True, data={"documents": []})
            documents = knowledge_repository.get_public_documents()
            return ToolResult(success=True, data={"documents": documents})
        except Exception as e:
            return ToolResult(
                success=False,
                data=None,
                error_code="DB_ERROR",
                error_message=str(e),
            )
