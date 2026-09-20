from fastapi import APIRouter, HTTPException
from app.models.schemas import (
    QuestionGenerationRequest,
    GeneratedQuestionResponse,
    TurnEvaluationRequest,
    TurnEvaluationResponse,
    ListeningEvaluationRequest,
    ListeningEvaluationResponse
)
from app.services.llm_client import get_llm_client

router = APIRouter(prefix="/ai", tags=["AI Interview Engine"])

@router.post("/generate-question", response_model=GeneratedQuestionResponse)
async def generate_question_endpoint(req: QuestionGenerationRequest):
    try:
        client = get_llm_client()
        result = await client.generate_question(req.model_dump())
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/evaluate-turn", response_model=TurnEvaluationResponse)
async def evaluate_turn_endpoint(req: TurnEvaluationRequest):
    try:
        client = get_llm_client()
        result = await client.evaluate_answer(req.model_dump())
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/evaluate-listening", response_model=ListeningEvaluationResponse)
async def evaluate_listening_endpoint(req: ListeningEvaluationRequest):
    try:
        client = get_llm_client()
        result = await client.evaluate_listening(req.model_dump())
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
