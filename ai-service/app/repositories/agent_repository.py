from __future__ import annotations

from typing import Any

from app.database.connection import execute_query, execute_write, execute_returning


def create_specialist_run(
    agent_def_id: str,
    student_id: str,
    triggered_by_user_id: str | None,
    goal: str,
    supervisor_run_id: str,
) -> str:
    """Create a specialist agent run linked to its supervisor via correlation_id.
    Starts immediately as RUNNING (not QUEUED) since the supervisor owns lifecycle."""
    rows = execute_returning(
        """
        INSERT INTO agent.agent_runs
          (agent_definition_id, student_id, triggered_by_user_id, status,
           goal_snapshot, correlation_id, started_at)
        VALUES (%s, %s, %s, 'RUNNING', %s, %s, now())
        RETURNING id
        """,
        [agent_def_id, student_id, triggered_by_user_id, goal, supervisor_run_id],
    )
    return rows[0]["id"]


def create_agent_run(
    agent_def_id: str,
    student_id: str,
    triggered_by_user_id: str | None,
    goal: str,
    correlation_id: str | None,
) -> str:
    rows = execute_returning(
        """
        INSERT INTO agent.agent_runs
          (agent_definition_id, student_id, triggered_by_user_id, status,
           goal_snapshot, correlation_id)
        VALUES (%s, %s, %s, 'QUEUED', %s, %s)
        RETURNING id
        """,
        [agent_def_id, student_id, triggered_by_user_id, goal, correlation_id],
    )
    return rows[0]["id"]


def load_run(run_id: str) -> dict[str, Any] | None:
    rows = execute_query(
        """
        SELECT ar.id, ar.student_id, ar.goal_snapshot, ar.triggered_by_user_id,
               ar.status, ar.agent_definition_id,
               ad.max_steps, ad.max_tool_calls, ad.timeout_seconds
        FROM agent.agent_runs ar
        JOIN agent.agent_definitions ad ON ad.id = ar.agent_definition_id
        WHERE ar.id = %s
        """,
        [run_id],
    )
    return rows[0] if rows else None


def load_supervisor_def() -> dict[str, Any] | None:
    rows = execute_query(
        """
        SELECT id, max_steps, max_tool_calls, timeout_seconds
        FROM agent.agent_definitions
        WHERE name = 'learning_readiness_agent' AND is_active = true
        ORDER BY version DESC LIMIT 1
        """,
    )
    return rows[0] if rows else None


def load_specialist_def() -> dict[str, Any] | None:
    rows = execute_query(
        """
        SELECT id, max_steps, max_tool_calls, timeout_seconds
        FROM agent.agent_definitions
        WHERE name = 'learning_specialist_agent' AND is_active = true
        ORDER BY version DESC LIMIT 1
        """,
    )
    return rows[0] if rows else None


def cas_start_run(run_id: str) -> bool:
    rowcount = execute_write(
        """
        UPDATE agent.agent_runs
        SET status = 'RUNNING', started_at = now()
        WHERE id = %s AND status = 'QUEUED'
        """,
        [run_id],
    )
    return rowcount > 0


def update_run_status(run_id: str, status: str, termination_reason: str | None) -> None:
    execute_write(
        """
        UPDATE agent.agent_runs
        SET status = %s, termination_reason = %s, completed_at = now()
        WHERE id = %s
        """,
        [status, termination_reason, run_id],
    )


def upsert_completed_step(
    run_id: str,
    seq_no: int,
    step_type: str,
    tool_name: str | None,
    input_data: str | None,
    output_data: str | None,
    status: str,
    error_code: str | None,
    error_message: str | None,
    duration_ms: int,
) -> None:
    execute_write(
        """
        INSERT INTO agent.agent_steps
          (agent_run_id, sequence_no, step_type, tool_name, input, output,
           status, error_code, error_message, duration_ms)
        VALUES (%s, %s, %s, %s, %s::jsonb, %s::jsonb, %s, %s, %s, %s)
        ON CONFLICT (agent_run_id, sequence_no) DO NOTHING
        """,
        [
            run_id, seq_no, step_type, tool_name,
            input_data, output_data,
            status, error_code, error_message, duration_ms,
        ],
    )


def insert_running_tool_step(
    run_id: str,
    seq_no: int,
    tool_name: str,
    input_data: str,
) -> None:
    execute_write(
        """
        INSERT INTO agent.agent_steps
          (agent_run_id, sequence_no, step_type, tool_name, input, status)
        VALUES (%s, %s, 'TOOL', %s, %s::jsonb, 'RUNNING')
        """,
        [run_id, seq_no, tool_name, input_data],
    )


def update_tool_step(
    run_id: str,
    seq_no: int,
    output_data: str | None,
    status: str,
    error_code: str | None,
    error_message: str | None,
    duration_ms: int,
) -> None:
    execute_write(
        """
        UPDATE agent.agent_steps
        SET output = %s::jsonb, status = %s, error_code = %s,
            error_message = %s, duration_ms = %s
        WHERE agent_run_id = %s AND sequence_no = %s
        """,
        [output_data, status, error_code, error_message, duration_ms, run_id, seq_no],
    )


def get_run_by_id(run_id: str) -> dict[str, Any] | None:
    rows = execute_query(
        """
        SELECT id, student_id, status, goal_snapshot, termination_reason,
               correlation_id, started_at, completed_at, created_at
        FROM agent.agent_runs WHERE id = %s
        """,
        [run_id],
    )
    return rows[0] if rows else None


def get_steps_by_run(run_id: str) -> list[dict[str, Any]]:
    return execute_query(
        """
        SELECT id, sequence_no, step_type, tool_name, input, output,
               status, error_code, error_message, duration_ms, created_at
        FROM agent.agent_steps
        WHERE agent_run_id = %s
        ORDER BY sequence_no ASC
        """,
        [run_id],
    )


def recover_dead_runs() -> list[str]:
    rows = execute_returning(
        """
        UPDATE agent.agent_runs ar
        SET status             = 'DEAD',
            termination_reason = 'PROCESS_CRASH_RECOVERY',
            completed_at       = now()
        FROM agent.agent_definitions ad
        WHERE ar.agent_definition_id = ad.id
          AND ar.status = 'RUNNING'
          AND ar.started_at < now() - (ad.timeout_seconds * INTERVAL '1 second')
        RETURNING ar.id
        """,
    )
    return [r["id"] for r in rows]
