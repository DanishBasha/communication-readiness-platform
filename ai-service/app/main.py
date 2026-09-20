import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from app.routers import interview

load_dotenv()

app = FastAPI(
    title="College Placement AI Intelligence Service",
    description="FastAPI microservice providing resume-grounded questions and speech diagnostics via Groq LLM",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(interview.router)

@app.get("/health")
def health_check():
    from app.services.llm_client import GROQ_API_KEY, GROQ_MODEL, LLM_PROVIDER
    has_key = bool(GROQ_API_KEY)
    return {
        "status": "online",
        "service": "fastapi-ai-service",
        "provider": LLM_PROVIDER,
        "groq_configured": has_key,
        "groq_model": GROQ_MODEL if has_key else "offline-fallback-active"
    }

from pydantic import BaseModel
class ConfigUpdateRequest(BaseModel):
    groq_api_key: str | None = None
    groq_model: str | None = None
    provider: str | None = None

@app.post("/ai/config")
def update_config_endpoint(req: ConfigUpdateRequest):
    from app.services.llm_client import update_groq_config
    res = update_groq_config(api_key=req.groq_api_key, model=req.groq_model, provider=req.provider)
    return {"success": True, **res}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=True)
