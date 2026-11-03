"""API endpoints for StudyMate AI study tools."""

import logging
from fastapi import APIRouter, Request, HTTPException
from app.config import settings
from app.api.rate_limit import limiter
from app.schemas import (
    HealthResponse,
    ConfigResponse,
    ToolLimits,
    SUBJECT_CHOICES,
    SummarizeRequest,
    SummarizeResponse,
    QuizRequest,
    QuizResponse,
    ImproveAnswerRequest,
    ImproveAnswerResponse,
    ExplainConceptRequest,
    ExplainConceptResponse,
)
from app.services.gemini_service import gemini_service

logger = logging.getLogger("studymate.api")
router = APIRouter(prefix="/api", tags=["study-tools"])


@router.get("/health", response_model=HealthResponse)
def health_check():
    """Return system status and configuration health."""
    return HealthResponse(
        status="healthy",
        environment=settings.ENVIRONMENT,
        gemini_configured=bool(settings.GEMINI_API_KEY),
        version="1.0.0",
    )


@router.get("/config", response_model=ConfigResponse)
def get_tool_configuration():
    """Shared single source of truth for input limits and tool settings."""
    return ConfigResponse(
        summarizer=ToolLimits(min=20, max=10000),
        quiz={
            "min": 20,
            "max": 10000,
            "counts": [5, 10, 15],
            "difficulties": ["easy", "medium", "hard"],
        },
        answer_improver={
            "min": 10,
            "max": 5000,
            "subject_max": 200,
        },
        concept_explainer={
            "min": 3,
            "max": 300,
            "levels": ["beginner", "intermediate", "advanced"],
            "subjects": SUBJECT_CHOICES,
        },
    )


@router.post("/summarize", response_model=SummarizeResponse)
@limiter.limit(settings.RATE_LIMIT_AI_ENDPOINTS)
def summarize_text(request: Request, payload: SummarizeRequest):
    """Generate structured 6-section academic summary."""
    try:
        return gemini_service.generate_summary(payload.text)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error in /api/summarize: %s", str(e))
        raise HTTPException(
            status_code=500,
            detail="A processing error occurred while summarizing the study text. Please try again.",
        )


@router.post("/quiz", response_model=QuizResponse)
@limiter.limit(settings.RATE_LIMIT_AI_ENDPOINTS)
def generate_quiz(request: Request, payload: QuizRequest):
    """Generate multiple choice questions with bounded retry validation."""
    try:
        return gemini_service.generate_quiz(
            text=payload.text,
            difficulty=payload.difficulty,
            count=payload.question_count,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error in /api/quiz: %s", str(e))
        raise HTTPException(
            status_code=500,
            detail="A processing error occurred while generating the quiz. Please try again.",
        )


@router.post("/improve-answer", response_model=ImproveAnswerResponse)
@limiter.limit(settings.RATE_LIMIT_AI_ENDPOINTS)
def improve_answer(request: Request, payload: ImproveAnswerRequest):
    """Provide feedback, improved answer, key improvements, and suggestions."""
    try:
        return gemini_service.improve_answer(
            answer=payload.answer,
            subject_or_topic=payload.subject_or_topic,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error in /api/improve-answer: %s", str(e))
        raise HTTPException(
            status_code=500,
            detail="A processing error occurred while improving the answer. Please try again.",
        )


@router.post("/explain-concept", response_model=ExplainConceptResponse)
@limiter.limit(settings.RATE_LIMIT_AI_ENDPOINTS)
def explain_concept(request: Request, payload: ExplainConceptRequest):
    """Generate 6-section conceptual explanation calibrated by academic level."""
    try:
        return gemini_service.explain_concept(
            concept=payload.concept,
            level=payload.level,
            subject=payload.subject or "Other",
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error in /api/explain-concept: %s", str(e))
        raise HTTPException(
            status_code=500,
            detail="A processing error occurred while generating the explanation. Please try again.",
        )
