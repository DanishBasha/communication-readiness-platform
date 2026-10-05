from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class AgentRunRequest(BaseModel):
    student_id: str
    goal: str = Field(min_length=1, max_length=500)
    triggered_by_user_id: Optional[str] = None


class AgentRunResponse(BaseModel):
    run_id: str
    status: str
