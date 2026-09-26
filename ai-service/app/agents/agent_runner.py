from __future__ import annotations

import warnings

from app.agents.supervisor_agent import run_supervisor_agent
from app.repositories import agent_repository


def execute_agent_run(run_id: str) -> None:
    """Load a QUEUED agent run, execute it, and mark it SUCCEEDED or FAILED."""
    run = agent_repository.load_run(run_id)
    if run is None:
        return
    if run.get("status") != "QUEUED":
        return

    spec_def = agent_repository.load_specialist_def()
    if spec_def is None:
        agent_repository.update_run_status(run_id, "FAILED", "SPECIALIST_DEF_NOT_FOUND")
        return

    acquired = agent_repository.cas_start_run(run_id)
    if not acquired:
        return

    try:
        run_supervisor_agent(
            supervisor_run_id=run_id,
            student_id=run["student_id"],
            goal=run["goal_snapshot"],
            triggered_by_user_id=run.get("triggered_by_user_id"),
            spec_def=spec_def,
        )
        agent_repository.update_run_status(run_id, "SUCCEEDED", "LearningPlanPersisted")
    except Exception as err:
        reason = str(err)[:500]
        agent_repository.update_run_status(run_id, "FAILED", reason)


def recover_dead_runs() -> list[str]:
    """Mark stuck RUNNING runs as DEAD on service startup.

    A run is stuck when its started_at exceeds the agent definition's timeout.
    Uses 'DEAD' (not 'FAILED') to distinguish crash recovery from normal failure.
    """
    recovered = agent_repository.recover_dead_runs()
    if recovered:
        warnings.warn(
            f"[agent_runner] recover_dead_runs: marked {len(recovered)} stuck run(s) as DEAD: {recovered}",
            RuntimeWarning,
            stacklevel=1,
        )
    return recovered
