from __future__ import annotations

from fastapi import APIRouter, BackgroundTasks, HTTPException

from app.agents import agent_runner
from app.models.agent_schemas import AgentRunRequest
from app.repositories import agent_repository, learning_repository

router = APIRouter(prefix="/agent", tags=["agent"])


@router.post("/run", status_code=202)
def start_agent_run(request: AgentRunRequest, background_tasks: BackgroundTasks) -> dict:
    sup_def = agent_repository.load_supervisor_def()
    if not sup_def:
        raise HTTPException(status_code=503, detail="Agent not configured")

    run_id = agent_repository.create_agent_run(
        agent_def_id=sup_def["id"],
        student_id=request.student_id,
        triggered_by_user_id=request.triggered_by_user_id,
        goal=request.goal,
        correlation_id=None,
    )

    background_tasks.add_task(agent_runner.execute_agent_run, run_id)

    return {"run_id": run_id, "status": "QUEUED"}


@router.get("/run/{run_id}")
def get_agent_run(run_id: str) -> dict:
    run = agent_repository.get_run_by_id(run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Agent run not found")

    steps = agent_repository.get_steps_by_run(run_id)

    learning_plan = None
    if run.get("status") == "SUCCEEDED":
        learning_plan = learning_repository.find_plan_by_agent_run(run_id)

    return {"run": run, "steps": steps, "learning_plan": learning_plan}
