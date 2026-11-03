"""Pydantic request and response schemas for StudyMate AI.

Enforces strict input validation, length bounds, and exact output section contracts.
No em dashes are used in schemas, docstrings, or validation errors.
"""

from typing import List, Optional, Literal, Dict, Any
from pydantic import BaseModel, Field, ConfigDict, field_validator


class BaseValidatedModel(BaseModel):
    """Base model with whitespace stripping enabled."""

    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")


# ---------------------------------------------------------
# Shared Configuration Schema
# ---------------------------------------------------------

class ToolLimits(BaseValidatedModel):
    min: int
    max: int


class ConfigResponse(BaseValidatedModel):
    """Shared limits and options contract for frontend and backend alignment."""

    summarizer: ToolLimits
    quiz: Dict[str, Any]
    answer_improver: Dict[str, Any]
    concept_explainer: Dict[str, Any]


# ---------------------------------------------------------
# 1. Summarizer Schemas
# ---------------------------------------------------------

class SummarizeRequest(BaseValidatedModel):
    """Request payload for text summarization (20 to 10,000 characters)."""

    text: str = Field(
        ...,
        min_length=20,
        max_length=10000,
        description="The study text or lecture notes to summarize.",
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


class SummarizeResponse(BaseValidatedModel):
    """Structured 6-section academic summary strictly matching spec:
    1. Topic Overview
    2. Key Concepts
    3. Important Definitions
    4. Important Points
    5. Exam Preparation Notes
    6. Quick Revision Summary
    """

    topic_overview: str
    key_concepts: List[str]
    important_definitions: List[DefinitionItem]
    important_points: List[str]
    exam_preparation_notes: List[str]
    quick_revision_summary: str
    raw_markdown: str


# ---------------------------------------------------------
# 2. Quiz Generator Schemas
# ---------------------------------------------------------

class QuizRequest(BaseValidatedModel):
    """Request payload for quiz generation (20 to 10,000 characters)."""

    text: str = Field(
        ...,
        min_length=20,
        max_length=10000,
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
    focus: Optional[str] = Field(
        default=None,
        max_length=200,
        description="Optional topic to focus questions on, constrained within source notes.",
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
# 3. Answer Improver Schemas
# ---------------------------------------------------------

class ImproveAnswerRequest(BaseValidatedModel):
    """Request payload for improving a student draft answer.
    Answer: 10 to 5,000 characters.
    Subject/topic: Optional context up to 200 characters.
    """

    answer: str = Field(
        ...,
        min_length=10,
        max_length=5000,
        description="The student original draft answer.",
    )
    subject_or_topic: Optional[str] = Field(
        default=None,
        max_length=200,
        description="Optional subject or topic context.",
    )

    @field_validator("answer")
    @classmethod
    def validate_answer(cls, v: str) -> str:
        cleaned = v.strip()
        if len(cleaned) < 10:
            raise ValueError("Draft answer must contain at least 10 non-whitespace characters.")
        return cleaned


class ChangedPhrase(BaseValidatedModel):
    original_phrase: str
    improved_phrase: str
    reason: str


class ImproveAnswerResponse(BaseValidatedModel):
    """Structured response strictly matching spec:
    1. Original Answer Feedback
    2. Improved Answer
    3. Key Improvements Made
    4. Suggestions for Further Improvement
    """

    original_answer: str
    subject_or_topic: Optional[str] = None
    original_answer_feedback: str
    improved_answer: str
    key_improvements_made: List[str]
    suggestions_for_further_improvement: List[str]
    changed_phrases: List[ChangedPhrase]


# ---------------------------------------------------------
# 4. Concept Explainer Schemas
# ---------------------------------------------------------

SUBJECT_CHOICES = [
    "Computer Science",
    "Physics",
    "Chemistry",
    "Biology",
    "Mathematics",
    "Economics",
    "History",
    "Literature",
    "Other",
]

class ExplainConceptRequest(BaseValidatedModel):
    """Request payload for conceptual explanation.
    Concept: 3 to 300 characters.
    Subject: Selected category from supported choices.
    Level: beginner, intermediate, advanced.
    """

    concept: str = Field(
        ...,
        min_length=3,
        max_length=300,
        description="The concept, mechanism, or theory to explain (3 to 300 characters).",
    )
    subject: Optional[str] = Field(
        default="Other",
        description="Optional subject domain.",
    )
    level: Literal["beginner", "intermediate", "advanced"] = Field(
        default="intermediate",
        description="Target depth level.",
    )

    @field_validator("concept")
    @classmethod
    def validate_concept(cls, v: str) -> str:
        cleaned = v.strip()
        if len(cleaned) < 3:
            raise ValueError("Concept name must contain at least 3 non-whitespace characters.")
        return cleaned


class ExplanationStep(BaseValidatedModel):
    step_number: int
    title: str
    description: str


class ExplainConceptResponse(BaseValidatedModel):
    """Structured 6-section conceptual explanation strictly matching spec:
    1. Introduction
    2. Detailed Explanation
    3. Step-by-Step Understanding
    4. Practical Example
    5. Real-World Applications
    6. Quick Revision Points
    """

    concept: str
    subject: str
    level: str
    introduction: str
    detailed_explanation: str
    step_by_step_understanding: List[ExplanationStep]
    practical_example: str
    real_world_applications: List[str]
    quick_revision_points: List[str]
    raw_markdown: str


# ---------------------------------------------------------
# Health Check Schema
# ---------------------------------------------------------

class HealthResponse(BaseValidatedModel):
    status: str
    environment: str
    gemini_configured: bool
    version: str
