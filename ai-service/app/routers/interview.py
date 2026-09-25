from __future__ import annotations

import asyncio
import json

from fastapi import APIRouter, BackgroundTasks, File, Form, Header, HTTPException, UploadFile

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


@router.post("/evaluate-response", response_model=CombinedEvalResult)
async def evaluate_response(
    audio: UploadFile = File(...),
    metadata: str = Form(...),
    background_tasks: BackgroundTasks = BackgroundTasks(),
) -> CombinedEvalResult:
    """
    POST /ai/evaluate-response — multipart/form-data pipeline.

    Architecture (W2):
      Stage 1 (parallel): STT  ∥  waveform signal analysis
      Stage 2 (sequential): LLM evaluation (needs transcript from STT)
      Stage 3 (sync): merge transcript-derived filler count into audio metrics

    The audio file is expected as WAV (16 kHz mono) produced by the VAD hook.
    Node.js passes Redis session context as `previous_turns` in the metadata JSON.
    """
    try:
        meta = EvaluateResponseMetadata.model_validate_json(metadata)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Invalid metadata JSON: {exc}") from exc

    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Empty audio payload")

    # ── Stage 1: STT and signal analysis in parallel ──────────────────────────
    stt_task = asyncio.create_task(stt_service.transcribe(audio_bytes))
    signal_task = asyncio.create_task(audio_analyzer.analyze_signal(audio_bytes))

    transcript, signal_metrics = await asyncio.gather(stt_task, signal_task)

    # ── Stage 2: LLM evaluation (needs transcript) ────────────────────────────
    history_lines = ""
    if meta.previous_turns:
        lines = [
            f"Q{i+1} [{t.difficulty}]: {t.question_text} → score {t.technical_score}"
            for i, t in enumerate(meta.previous_turns)
        ]
        history_lines = "\nPrevious turns:\n" + "\n".join(lines)

    eval_prompt = (
        "You are an interview evaluator. Score the student's spoken answer.\n"
        f"Question [{meta.difficulty}]: {meta.question_text}\n"
        f"Student transcript: {transcript or '(no speech detected)'}\n"
        f"Turn number: {meta.turn_number}"
        + (f"\nDomain: {meta.domain}" if meta.domain else "")
        + history_lines
        + "\n\nRespond with valid JSON: "
        '{"technical_score": 0-10, "feedback": "str", "strengths": "str", '
        '"weaknesses": "str", "next_recommended_difficulty": "EASY"|"MEDIUM"|"ADVANCED"}'
    )

    try:
        raw = get_llm_client().evaluate_turn(eval_prompt)
        tech_score = float(raw.get("technical_score", 5))
        feedback = str(raw.get("feedback", ""))
        strengths = str(raw.get("strengths", ""))
        weaknesses = str(raw.get("weaknesses", ""))
        next_diff = str(raw.get("next_recommended_difficulty", "EASY"))
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"LLM error: {exc}") from exc

    # ── Stage 3: merge transcript-derived audio metrics (sync) ────────────────
    # get_duration requires the raw bytes path; pass duration as None to let
    # finalize_metrics re-derive it from transcript word count with a known WPM.
    # For accurate duration we would need to load the waveform again — avoid
    # double-loading by using the signal_metrics fluency as fallback.
    final_audio = audio_analyzer.finalize_metrics(
        signal_metrics=signal_metrics,
        transcript=transcript,
        duration_sec=None,  # signal already captured duration-based fluency above
    )

    return CombinedEvalResult(
        transcript=transcript,
        stt_raw=transcript,
        technical_score=tech_score,
        feedback=feedback,
        strengths=strengths,
        weaknesses=weaknesses,
        next_recommended_difficulty=next_diff,
        pace_wpm=final_audio.pace_wpm,
        filler_count=final_audio.filler_count,
        fluency_score=final_audio.fluency_score,
        clarity_score=final_audio.clarity_score,
    )


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
