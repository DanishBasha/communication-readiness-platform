from __future__ import annotations

from typing import Any

from app.cache.cache_keys import CacheKeys
from app.cache.cache_service import cache_get, cache_set
from app.config import settings
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
        if not categories:
            return ToolResult(success=True, data={"documents": []})

        key = CacheKeys.knowledge_public()

        # ── Cache lookup (Redis failure is non-fatal) ─────────────────────────
        try:
            cached = cache_get(key)
            if cached is not None:
                return ToolResult(
                    success=True, data=cached,
                    cache_hit=True,
                    context_summary=_docs_summary(cached),
                )
        except Exception:
            pass

        # ── Cache miss — fetch from database ──────────────────────────────────
        try:
            documents = knowledge_repository.get_public_documents()
            data = {"documents": documents}
        except Exception as e:
            return ToolResult(
                success=False,
                data=None,
                error_code="DB_ERROR",
                error_message=str(e),
            )

        # ── Store in cache (failure is non-fatal) ─────────────────────────────
        try:
            cache_set(key, data, settings.module3_knowledge_cache_ttl)
        except Exception:
            pass

        return ToolResult(
            success=True, data=data,
            cache_hit=False,
            context_summary=_docs_summary(data),
        )


def _docs_summary(data: dict) -> str:
    documents = data.get("documents") or []
    if not documents:
        return "ok. 0 docs."
    titles = [d.get("title", "untitled") for d in documents[:4]]
    return f"ok. {len(documents)} docs: {', '.join(repr(t) for t in titles)}"
