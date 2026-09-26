from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers.interview import router as interview_router
from app.routers.learning import router as learning_router
from app.routers.agent import router as agent_router

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    debug=settings.debug,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(interview_router)
app.include_router(learning_router)
app.include_router(agent_router)


@app.on_event("startup")
def startup_event() -> None:
    try:
        from app.agents.agent_runner import recover_dead_runs
        recovered = recover_dead_runs()
        if recovered:
            print(f"[startup] Recovered {len(recovered)} dead agent run(s): {recovered}")
    except Exception as e:
        print(f"[startup] recoverDeadRuns error: {e}")


@app.get("/health")
def health() -> dict:
    from app.services.llm_client import get_llm_client
    provider = type(get_llm_client()).__name__
    return {
        "status": "ok",
        "service": settings.app_name,
        "version": settings.app_version,
        "llm_provider": provider,
    }
