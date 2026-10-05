from __future__ import annotations

from typing import Any

from app.database.connection import execute_query


def get_public_documents(limit: int = 10) -> list[dict[str, Any]]:
    return execute_query(
        """
        SELECT kd.id, kd.title, kd.source_type, kd.visibility_type,
               kc.chunk_text AS excerpt
        FROM knowledge.knowledge_documents kd
        LEFT JOIN knowledge.knowledge_chunks kc
              ON kc.document_id = kd.id AND kc.chunk_index = 0
        WHERE kd.visibility_type = 'PUBLIC'
        ORDER BY kd.created_at DESC
        LIMIT %s
        """,
        [limit],
    )
