#!/usr/bin/env python
"""Worker pool autoscaler.

Manages a configurable pool of RQ worker subprocesses.  Reads
MIN_WORKERS / MAX_WORKERS / etc. from environment variables.

Usage:
    python autoscaler.py

Environment:
    MIN_WORKERS                 (default 1)
    MAX_WORKERS                 (default 4)
    TARGET_JOBS_PER_WORKER      (default 1)
    SCALE_UP_COOLDOWN_SECONDS   (default 10)
    SCALE_DOWN_COOLDOWN_SECONDS (default 30)
    AUTOSCALER_CHECK_INTERVAL   (default 5)
    MAX_CONCURRENT_AGENT_JOBS   (default 4)
    REDIS_URL                   (default redis://localhost:6379/0)
"""
from __future__ import annotations

import os
import signal
import subprocess
import sys
import time
from dataclasses import dataclass, field

from app.workers.pool import AutoscalerConfig, desired_worker_count, scale_action

# ── Configuration from environment ────────────────────────────────────────────

_cfg = AutoscalerConfig(
    min_workers            = int(os.environ.get("MIN_WORKERS",                "1")),
    max_workers            = int(os.environ.get("MAX_WORKERS",                "4")),
    target_jobs_per_worker = int(os.environ.get("TARGET_JOBS_PER_WORKER",     "1")),
    scale_up_cooldown      = float(os.environ.get("SCALE_UP_COOLDOWN_SECONDS",   "10")),
    scale_down_cooldown    = float(os.environ.get("SCALE_DOWN_COOLDOWN_SECONDS", "30")),
    max_concurrent_jobs    = int(os.environ.get("MAX_CONCURRENT_AGENT_JOBS",  "4")),
)

CHECK_INTERVAL = float(os.environ.get("AUTOSCALER_CHECK_INTERVAL", "5"))
REDIS_URL      = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
QUEUE_NAME     = "agent_jobs"


# ── Worker process tracking ────────────────────────────────────────────────────

@dataclass
class WorkerProcess:
    worker_id: str
    process: subprocess.Popen
    started_at: float = field(default_factory=time.time)

    def is_alive(self) -> bool:
        return self.process.poll() is None


_workers: list[WorkerProcess] = []
_counter: int = 0
_last_scale_up: float   = 0.0
_last_scale_down: float = 0.0


def _queue_depth() -> int:
    """Return the number of jobs currently queued (not running)."""
    try:
        from redis import Redis
        from rq import Queue
        conn = Redis.from_url(REDIS_URL, socket_connect_timeout=2, socket_timeout=2)
        q = Queue(QUEUE_NAME, connection=conn)
        return q.count
    except Exception as exc:
        print(f"[autoscaler] queue_depth error: {exc!r}", flush=True)
        return 0


def _prune_dead() -> None:
    """Remove dead worker processes from the tracking list."""
    global _workers
    dead = [w for w in _workers if not w.is_alive()]
    for w in dead:
        print(
            f"[autoscaler] worker_exited worker_id={w.worker_id}"
            f" pid={w.process.pid}"
            f" returncode={w.process.returncode}",
            flush=True,
        )
    _workers = [w for w in _workers if w.is_alive()]


def _spawn() -> WorkerProcess:
    global _counter
    _counter += 1
    worker_id = f"worker-{_counter}"
    env = {**os.environ, "WORKER_ID": worker_id}
    proc = subprocess.Popen(
        [sys.executable, "worker.py"],
        env=env,
        stdout=sys.stdout,
        stderr=sys.stderr,
    )
    wp = WorkerProcess(worker_id=worker_id, process=proc)
    _workers.append(wp)
    print(
        f"[autoscaler] spawned worker_id={worker_id}"
        f" pid={proc.pid}"
        f" total_workers={len(_workers)}",
        flush=True,
    )
    return wp


def _terminate_last() -> None:
    """Gracefully terminate the last-spawned worker (LIFO)."""
    if not _workers:
        return
    wp = _workers[-1]
    print(
        f"[autoscaler] terminating worker_id={wp.worker_id}"
        f" pid={wp.process.pid}",
        flush=True,
    )
    try:
        wp.process.send_signal(signal.SIGTERM)
    except (ProcessLookupError, AttributeError):
        pass
    try:
        wp.process.wait(timeout=15)
    except subprocess.TimeoutExpired:
        wp.process.kill()
    if wp in _workers:
        _workers.remove(wp)


def _tick() -> None:
    """One autoscaler iteration: inspect queue and adjust worker count."""
    global _last_scale_up, _last_scale_down

    _prune_dead()
    now     = time.time()
    alive   = len(_workers)
    depth   = _queue_depth()
    desired = desired_worker_count(depth, _cfg)
    action  = scale_action(alive, desired)

    print(
        f"[autoscaler] tick"
        f" queue={depth}"
        f" alive_workers={alive}"
        f" desired={desired}"
        f" action={action}"
        f" min={_cfg.min_workers}"
        f" max={_cfg.max_workers}"
        f" max_jobs={_cfg.max_concurrent_jobs}",
        flush=True,
    )

    if action == "SCALE_UP":
        if now - _last_scale_up >= _cfg.scale_up_cooldown:
            for _ in range(desired - alive):
                _spawn()
            _last_scale_up = now
        else:
            remaining = _cfg.scale_up_cooldown - (now - _last_scale_up)
            print(
                f"[autoscaler] scale_up_blocked cooldown_remaining={remaining:.1f}s",
                flush=True,
            )

    elif action == "SCALE_DOWN":
        if now - _last_scale_down >= _cfg.scale_down_cooldown:
            for _ in range(alive - desired):
                _terminate_last()
            _last_scale_down = now
        else:
            remaining = _cfg.scale_down_cooldown - (now - _last_scale_down)
            print(
                f"[autoscaler] scale_down_blocked cooldown_remaining={remaining:.1f}s",
                flush=True,
            )


def _shutdown(signum=None, frame=None) -> None:
    print("[autoscaler] shutdown signal received — terminating workers", flush=True)
    for wp in list(_workers):
        try:
            wp.process.send_signal(signal.SIGTERM)
        except (ProcessLookupError, AttributeError):
            pass
    for wp in list(_workers):
        try:
            wp.process.wait(timeout=10)
        except subprocess.TimeoutExpired:
            wp.process.kill()
    sys.exit(0)


if __name__ == "__main__":
    signal.signal(signal.SIGTERM, _shutdown)
    signal.signal(signal.SIGINT,  _shutdown)

    print(
        f"[autoscaler] starting"
        f" min_workers={_cfg.min_workers}"
        f" max_workers={_cfg.max_workers}"
        f" max_concurrent_jobs={_cfg.max_concurrent_jobs}"
        f" scale_up_cooldown={_cfg.scale_up_cooldown}s"
        f" scale_down_cooldown={_cfg.scale_down_cooldown}s"
        f" check_interval={CHECK_INTERVAL}s",
        flush=True,
    )

    for _ in range(_cfg.min_workers):
        _spawn()

    while True:
        time.sleep(CHECK_INTERVAL)
        _tick()
