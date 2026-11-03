"""Pydantic request and response schemas for StudyMate AI."""

from typing import List, Optional, Literal
from pydantic import BaseModel, Field, ConfigDict, field_validator


class BaseValidatedModel(BaseModel):
    """Base model with whitespace stripping enabled."""

    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")


# ---------------------------------------------------------
# Summarizer Schemas
# ---------------------------------------------------------

class SummarizeRequest(BaseValidatedModel):
    """Request payload for text summarization."""

    text: str = Field(
        ...,
        min_length=20,
        max_length=20000,
        description="The academic or study text to summarize.",
    )

    @field_validator("text")
    @classmethod
    def validate_text_not_empty(cls, v: str) -> str:
        cleaned = v.strip()
        if len(cleaned) < 20:
            raise ValueError("Input text must contain at least 20 non-whitespace characters.")
        return cleaned


class DefinitionItem(BaseValidatedModel):
    term: str
    definition: str


class BreakdownSection(BaseValidatedModel):
    title: str
    points: List[str]


class SummarizeResponse(BaseValidatedModel):
    """Structured 6-section academic summary."""

    executive_summary: str
    key_concepts: List[str]
    breakdown_sections: List[BreakdownSection]
    important_definitions: List[DefinitionItem]
    practical_applications: List[str]
    review_questions: List[str]
    raw_markdown: str


# ---------------------------------------------------------
# Quiz Generator Schemas
# ---------------------------------------------------------

class QuizRequest(BaseValidatedModel):
    """Request payload for quiz generation."""

    text: str = Field(
        ...,
        min_length=20,
        max_length=20000,
        description="The source text or topic to generate quiz questions from.",
    )
    difficulty: Literal["easy", "medium", "hard"] = Field(
        default="medium",
        description="Difficulty level of the quiz.",
    )
    question_count: Literal[5, 10, 15] = Field(
        default=5,
        description="Number of questions to generate.",
    )

    @field_validator("text")
    @classmethod
    def validate_text_not_empty(cls, v: str) -> str:
        cleaned = v.strip()
        if len(cleaned) < 20:
            raise ValueError("Source text must contain at least 20 non-whitespace characters.")
        return cleaned


class QuizQuestion(BaseValidatedModel):
    id: int
    question: str
    options: List[str] = Field(..., min_length=4, max_length=4)
    correct_index: int = Field(..., ge=0, le=3)
    explanation: str


class QuizResponse(BaseValidatedModel):
    difficulty: str
    question_count: int
    questions: List[QuizQuestion]


# ---------------------------------------------------------
# Answer Improver Schemas
# ---------------------------------------------------------

class ImproveAnswerRequest(BaseValidatedModel):
    """Request payload for diagnostic answer critique and improvement."""

    question: str = Field(
        ...,
        min_length=5,
        max_length=4000,
        description="The exam prompt or homework question.",
    )
    draft_answer: str = Field(
        ...,
        min_length=10,
        max_length=10000,
        description="The student's original draft answer.",
    )

    @field_validator("question", "draft_answer")
    @classmethod
    def validate_text_not_empty(cls, v: str) -> str:
        cleaned = v.strip()
        if len(cleaned) < 5:
            raise ValueError("Input field must not be blank or trivial.")
        return cleaned


class ChangedPhrase(BaseValidatedModel):
    original_phrase: str
    improved_phrase: str
    reason: str


class ImproveAnswerResponse(BaseValidatedModel):
    original_answer: str
    improved_answer: str
    changed_phrases: List[ChangedPhrase]
    strengths: List[str]
    weaknesses: List[str]
    missing_key_points: List[str]
    estimated_score_before: int = Field(..., ge=1, le=10)
    estimated_score_after: int = Field(..., ge=1, le=10)
    summary_of_changes: str


# ---------------------------------------------------------
# Concept Explainer Schemas
# ---------------------------------------------------------

class ExplainConceptRequest(BaseValidatedModel):
    """Request payload for conceptual explanation."""

    concept: str = Field(
        ...,
        min_length=2,
        max_length=500,
        description="The concept, mechanism, or theory to explain.",
    )
    level: Literal["beginner", "intermediate", "advanced"] = Field(
        default="intermediate",
        description="Target depth level.",
    )
    context: Optional[str] = Field(
        default=None,
        max_length=5000,
        description="Optional additional course or subject context.",
    )

    @field_validator("concept")
    @classmethod
    def validate_concept(cls, v: str) -> str:
        cleaned = v.strip()
        if len(cleaned) < 2:
            raise ValueError("Concept name is too short.")
        return cleaned


class ExplanationStep(BaseValidatedModel):
    step_number: int
    title: str
    description: str


class ExplainConceptResponse(BaseValidatedModel):
    concept: str
    level: str
    intuitive_analogy: str
    foundational_principles: List[str]
    step_by_step_breakdown: List[ExplanationStep]
    key_terms: List[DefinitionItem]
    real_world_case: str
    self_check_exercise: str
    raw_markdown: str


# ---------------------------------------------------------
# Health Check Schema
# ---------------------------------------------------------

class HealthResponse(BaseValidatedModel):
    status: str
    environment: str
    gemini_configured: bool
    version: str

