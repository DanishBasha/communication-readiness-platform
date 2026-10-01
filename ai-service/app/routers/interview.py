from __future__ import annotations

import asyncio
import json

from fastapi import APIRouter, BackgroundTasks, File, Form, Header, HTTPException, UploadFile
from fastapi.responses import StreamingResponse

from app.models.schemas import (
    CombinedEvalResult,
    ConfigUpdateRequest,
    ConfigUpdateResponse,
    EvaluateResponseMetadata,
    GeneratedQuestionResponse,
    ListeningEvaluationRequest,
    ListeningEvaluationResponse,
    QuestionGenerationRequest,
    TurnEvaluationRequest,
    TurnEvaluationResponse,
)
from app.config import settings
from app.services import audio_analyzer, stt_service
from app.services.llm_client import get_llm_client, update_llm_config

router = APIRouter(prefix="/ai", tags=["interview"])


def _skills_summary(req: QuestionGenerationRequest) -> str:
    skills = ", ".join(req.skills) if req.skills else "general programming"
    projects = "; ".join(
        f"{p.title} ({', '.join(p.tech_stack)})" for p in req.projects
    ) if req.projects else "no projects listed"
    history = ""
    if req.previous_turns:
        lines = [
            f"Q{i+1} [{t.difficulty}]: {t.question_text} → score {t.technical_score}"
            for i, t in enumerate(req.previous_turns)
        ]
        history = "\nPrevious turns:\n" + "\n".join(lines)
    return (
        f"Student: {req.student_name}\n"
        f"Skills: {skills}\n"
        f"Projects: {projects}\n"
        f"Target difficulty: {req.difficulty}"
        + (f"\nDomain: {req.domain}" if req.domain else "")
        + history
    )


@router.post("/generate-question", response_model=GeneratedQuestionResponse)
def generate_question(req: QuestionGenerationRequest) -> GeneratedQuestionResponse:
    prompt = (
        "You are a technical interviewer. Generate ONE interview question.\n"
        + _skills_summary(req)
        + "\n\nRespond with valid JSON: {\"question_text\": str, \"difficulty\": str, \"category\": str}"
    )
    try:
        raw = get_llm_client().generate_question(prompt)
        return GeneratedQuestionResponse(**raw)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"LLM error: {exc}") from exc


@router.post("/evaluate-turn", response_model=TurnEvaluationResponse)
def evaluate_turn(req: TurnEvaluationRequest) -> TurnEvaluationResponse:
    prompt = (
        "You are an interview evaluator. Score the student's answer.\n"
        f"Question [{req.difficulty}]: {req.question_text}\n"
        f"Student answer: {req.student_answer}\n"
        f"Turn number: {req.turn_number}\n\n"
        "Respond with valid JSON: "
        "{\"technical_score\": 0-10, \"communication_score\": 0-10, "
        "\"wpm\": int, \"filler_words\": int, \"feedback\": str, "
        "\"strengths\": str, \"weaknesses\": str, "
        "\"next_recommended_difficulty\": \"EASY\"|\"MEDIUM\"|\"ADVANCED\"}"
    )
    try:
        raw = get_llm_client().evaluate_turn(prompt)
        return TurnEvaluationResponse(**raw)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"LLM error: {exc}") from exc


@router.post("/evaluate-listening", response_model=ListeningEvaluationResponse)
def evaluate_listening(req: ListeningEvaluationRequest) -> ListeningEvaluationResponse:
    prompt = (
        "You are a listening comprehension evaluator.\n"
        f"Story: {req.story_text}\n"
        f"Question: {req.question}\n"
        f"Expected answer: {req.expected_answer}\n"
        f"Student answer: {req.student_answer}\n\n"
        "Respond with valid JSON: "
        "{\"score\": 0-10, \"accuracy_level\": \"HIGH\"|\"MEDIUM\"|\"LOW\", "
        "\"feedback\": str, \"missed_key_points\": [str]}"
    )
    try:
        raw = get_llm_client().evaluate_listening(prompt)
        return ListeningEvaluationResponse(**raw)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"LLM error: {exc}") from exc


@router.post("/evaluate-response")
async def evaluate_response(
    audio: UploadFile = File(...),
    metadata: str = Form(...),
    background_tasks: BackgroundTasks = BackgroundTasks(),
) -> StreamingResponse:
    """
    POST /ai/evaluate-response — multipart/form-data, returns text/event-stream SSE.

    SSE event types:
      text_chunk  — raw LLM token delta  {"type": "text_chunk", "text": "..."}
      text_end    — LLM stream finished  {"type": "text_end"}
      result      — full parsed response {"type": "result", "data": CombinedEvalResult}
      error       — pipeline failure     {"type": "error", "message": "..."}

    Architecture:
      Stage 1 (parallel): STT  ∥  waveform signal analysis  ∥  vector retrieval
      Stage 2 (streaming): conduct_interview_stream() — yields LLM token chunks
      Stage 3 (background): upsert context_summary to pgvector (non-blocking)
      Stage 4 (sync): merge transcript-derived filler count into audio metrics
    """
    from app.services.vector_store import retrieve_relevant, upsert_summary

    try:
        meta = EvaluateResponseMetadata.model_validate_json(metadata)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Invalid metadata JSON: {exc}") from exc

    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Empty audio payload")

    async def _stream():
        # Stage 1: parallel
        stt_task = asyncio.create_task(stt_service.transcribe(audio_bytes))
        signal_task = asyncio.create_task(audio_analyzer.analyze_signal(audio_bytes))
        vector_task = asyncio.create_task(
            retrieve_relevant(session_id=meta.session_id, query_text=meta.question_text, top_k=3)
        )

        try:
            transcript, signal_metrics, long_term_chunks = await asyncio.gather(
                stt_task, signal_task, vector_task
            )
        except Exception as exc:
            yield f"data: {json.dumps({'type': 'error', 'message': f'Stage 1 error: {exc}'})}\n\n"
            return

        # Stage 2: stream LLM tokens
        full_response = ""
        try:
            async for chunk in get_llm_client().conduct_interview_stream(
                transcript=transcript,
                meta=meta,
                long_term_chunks=long_term_chunks,
            ):
                full_response += chunk
                yield f"data: {json.dumps({'type': 'text_chunk', 'text': chunk})}\n\n"
        except Exception as exc:
            yield f"data: {json.dumps({'type': 'error', 'message': f'LLM error: {exc}'})}\n\n"
            return

        yield f"data: {json.dumps({'type': 'text_end'})}\n\n"

        # Parse accumulated JSON
        try:
            raw = json.loads(full_response)
        except json.JSONDecodeError as exc:
            yield f"data: {json.dumps({'type': 'error', 'message': f'JSON parse error: {exc}'})}\n\n"
            return

        tech_score = float(raw.get("technical_score", 5.0))
        context_summary = str(raw.get("context_summary", ""))

        # Stage 3: background vector upsert
        if context_summary and meta.session_id:
            background_tasks.add_task(
                upsert_summary,
                meta.session_id,
                meta.turn_number,
                context_summary,
            )

        # Stage 4: merge audio metrics
        final_audio = audio_analyzer.finalize_metrics(
            signal_metrics=signal_metrics,
            transcript=transcript,
            duration_sec=None,
        )

        result = CombinedEvalResult(
            transcript=transcript,
            stt_raw=transcript,
            technical_score=tech_score,
            feedback=str(raw.get("feedback", "")),
            strengths=str(raw.get("strengths", "")),
            weaknesses=str(raw.get("weaknesses", "")),
            next_recommended_difficulty=str(raw.get("next_recommended_difficulty", "EASY")),
            conversational_response=str(raw.get("conversational_response", "")),
            next_question_text=str(raw.get("next_question_text", "")),
            rubric_for_next_question=raw.get("rubric_for_next_question") or {},
            update_state=raw.get("update_state") or {},
            context_summary=context_summary,
            pace_wpm=final_audio.pace_wpm,
            filler_count=final_audio.filler_count,
            fluency_score=final_audio.fluency_score,
            clarity_score=final_audio.clarity_score,
        )

        yield f"data: {json.dumps({'type': 'result', 'data': result.model_dump()})}\n\n"

    return StreamingResponse(_stream(), media_type="text/event-stream")


@router.post("/config", response_model=ConfigUpdateResponse)
def update_config(
    req: ConfigUpdateRequest,
    x_internal_key: str | None = Header(default=None),
) -> ConfigUpdateResponse:
    # Guard: require the shared secret so arbitrary callers cannot replace the LLM key.
    if x_internal_key != settings.internal_api_key:
        raise HTTPException(status_code=403, detail="Missing or invalid X-Internal-Key")
    active = update_llm_config(
        provider=req.llm_provider,
        base_url=req.llm_base_url,
        api_key=req.groq_api_key,
        model=req.groq_model,
    )
    return ConfigUpdateResponse(status="updated", active_provider=active)
