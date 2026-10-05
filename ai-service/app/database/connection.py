from __future__ import annotations

import decimal
import os
import uuid
import datetime
from typing import Any

import psycopg2
import psycopg2.pool
from psycopg2.extras import RealDictCursor

_pool: psycopg2.pool.ThreadedConnectionPool | None = None


def _get_pool() -> psycopg2.pool.ThreadedConnectionPool:
    global _pool
    if _pool is None:
        db_url = os.getenv(
            "DATABASE_URL",
            "postgresql://postgres:postgres@localhost:5432/comm_readiness",
        )
        print("[db] creating connection pool minconn=1 maxconn=10", flush=True)
        _pool = psycopg2.pool.ThreadedConnectionPool(1, 10, dsn=db_url)
        print("[db] pool created", flush=True)
    return _pool


def _serialize(value: Any) -> Any:
    """Convert psycopg2-returned special types to JSON-safe Python primitives."""
    if isinstance(value, uuid.UUID):
        return str(value)
    if isinstance(value, (datetime.datetime, datetime.date)):
        return value.isoformat()
    if isinstance(value, decimal.Decimal):
        return float(value)
    return value


def _row_to_dict(row: Any) -> dict[str, Any]:
    return {k: _serialize(v) for k, v in dict(row).items()}


def execute_query(sql: str, params: list | None = None) -> list[dict[str, Any]]:
    """Run a SELECT query and return all rows as plain dicts."""
    pool = _get_pool()
    try:
        conn = pool.getconn()
    except Exception as exc:
        print(f"[db] pool.getconn FAILED {type(exc).__name__}: {exc}", flush=True)
        raise
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql, params or [])
            rows = cur.fetchall()
            conn.commit()
            return [_row_to_dict(r) for r in rows]
    except Exception:
        conn.rollback()
        raise
    finally:
        pool.putconn(conn)


def execute_write(sql: str, params: list | None = None) -> int:
    """Run INSERT/UPDATE/DELETE and return the row count."""
    pool = _get_pool()
    try:
        conn = pool.getconn()
    except Exception as exc:
        print(f"[db] pool.getconn FAILED {type(exc).__name__}: {exc}", flush=True)
        raise
    try:
        with conn.cursor() as cur:
            cur.execute(sql, params or [])
            rowcount = cur.rowcount
            conn.commit()
            return rowcount
    except Exception:
        conn.rollback()
        raise
    finally:
        pool.putconn(conn)


def execute_returning(sql: str, params: list | None = None) -> list[dict[str, Any]]:
    """Run INSERT/UPDATE ... RETURNING and return all rows as plain dicts."""
    pool = _get_pool()
    try:
        conn = pool.getconn()
    except Exception as exc:
        print(f"[db] pool.getconn FAILED {type(exc).__name__}: {exc}", flush=True)
        raise
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql, params or [])
            rows = cur.fetchall()
            conn.commit()
            return [_row_to_dict(r) for r in rows]
    except Exception:
        conn.rollback()
        raise
    finally:
        pool.putconn(conn)
