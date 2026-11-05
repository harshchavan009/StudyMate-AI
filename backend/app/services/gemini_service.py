"""Gemini API service with structured parsing, bounded retry logic, and strict error mapping.

Runtime code operates with real AI calls only. If GEMINI_API_KEY is not configured
or rejected, endpoints return HTTP 503. Mocks are restricted solely to pytest test suites.
"""

import json
import logging
import re
from typing import Any, Dict, List, Optional
import google.generativeai as genai
from fastapi import HTTPException

from app.config import settings
from app.prompts import (
    build_summarizer_prompt,
    build_quiz_prompt,
    build_improver_prompt,
    build_explainer_prompt,
)
from app.schemas import (
    SummarizeResponse,
    QuizResponse,
    QuizQuestion,
    ImproveAnswerResponse,
    ExplainConceptResponse,
    ExplanationStep,
    DefinitionItem,
    ChangedPhrase,
)

logger = logging.getLogger("studymate.gemini")


def sanitize_dashes(text: str) -> str:
    """Replace em dashes and en dashes with commas or colons."""
    if not isinstance(text, str):
        return text
    return text.replace("\u2014", ", ").replace("\u2013", ", ")


def verify_gemini_model_exists(model_name: str, api_key: str) -> bool:
    """Ask the Google Gen AI API whether the configured model exists.

    Fails fast with a clear message if the model does not exist or is inaccessible.
    """
    if not api_key:
        return False
    genai.configure(api_key=api_key)
    name = model_name if model_name.startswith("models/") else f"models/{model_name}"
    try:
        genai.get_model(name)
        return True
    except Exception as exc:
        raise RuntimeError(
            f"Configured GEMINI_MODEL '{model_name}' does not exist or is not accepted by the Gemini API: {exc}"
        ) from exc


def clean_json_string(raw: str) -> str:
    """Extract and sanitize raw JSON string from LLM output."""
    raw = raw.strip()
    if raw.startswith("```json"):
        raw = raw[7:]
    elif raw.startswith("```"):
        raw = raw[3:]
    if raw.endswith("```"):
        raw = raw[:-3]
    raw = raw.strip()

    json_start = raw.find("{")
    json_end = raw.rfind("}")
    if json_start != -1 and json_end != -1 and json_end > json_start:
        raw = raw[json_start : json_end + 1]

    return sanitize_dashes(raw)


class GeminiService:
    """Client wrapper for Google Gemini models with bounded retry and strict error handling."""

    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        self.model_name = settings.GEMINI_MODEL
        if self.api_key and self.api_key.strip():
            genai.configure(api_key=self.api_key)
            self.model = genai.GenerativeModel(self.model_name)
        else:
            self.model = None
            logger.info("GEMINI_API_KEY is not configured. Real AI calls will return HTTP 503.")

    def _call_model(self, prompt: str) -> str:
        """Call Gemini API. Maps errors to standard HTTP status codes without leaking keys or stack traces."""
        if not self.api_key or not self.api_key.strip() or not self.model:
            raise HTTPException(
                status_code=503,
                detail="The AI service is not configured or unavailable.",
            )

        try:
            response = self.model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.2,
                    top_p=0.95,
                    response_mime_type="application/json",
                ),
            )
            text = response.text or ""
            if not text.strip():
                raise ValueError("Empty response received from AI model.")
            return text
        except HTTPException:
            raise
        except Exception as e:
            err_msg = str(e).lower()
            logger.warning("Gemini API call failed: %s", type(e).__name__)

            # Rate limit on Google side
            if "resource_exhausted" in err_msg or "429" in err_msg or "quota" in err_msg:
                raise HTTPException(
                    status_code=429,
                    detail="Upstream AI rate limit reached. Please wait a minute before retrying.",
                )

            # Timeout / deadline exceeded
            if "deadline" in err_msg or "timeout" in err_msg or "timed out" in err_msg:
                raise HTTPException(
                    status_code=504,
                    detail="The AI service request timed out. Please try again.",
                )

            # Invalid or rejected API key, permission denied, or service unavailable
            if (
                "api_key_invalid" in err_msg
                or "invalid_argument" in err_msg
                or "permission_denied" in err_msg
                or "unauthenticated" in err_msg
                or "not found" in err_msg
                or "unavailable" in err_msg
                or "503" in err_msg
            ):
                raise HTTPException(
                    status_code=503,
                    detail="The AI service is not configured or unavailable.",
                )

            # General upstream failure
            raise HTTPException(
                status_code=503,
                detail="The AI service is not configured or unavailable.",
            )

    # -----------------------------------------------------
    # 1. Summarizer (6 Exact Spec Sections)
    # -----------------------------------------------------
    def generate_summary(self, text: str) -> SummarizeResponse:
        """Generate structured 6-section academic summary."""
        prompt = build_summarizer_prompt(text)
        max_attempts = 3

        for attempt in range(max_attempts):
            try:
                raw_response = self._call_model(prompt)
                cleaned = clean_json_string(raw_response)
                data = json.loads(cleaned)

                markdown_lines = [
                    f"# Topic Overview\n\n{data.get('topic_overview', '')}\n",
                    "## Key Concepts\n",
                ]
                for concept in data.get("key_concepts", []):
                    markdown_lines.append(f"- {concept}")

                markdown_lines.append("\n## Important Definitions\n")
                for item in data.get("important_definitions", []):
                    markdown_lines.append(f"- **{item.get('term', '')}**: {item.get('definition', '')}")

                markdown_lines.append("\n## Important Points\n")
                for pt in data.get("important_points", []):
                    markdown_lines.append(f"- {pt}")

                markdown_lines.append("\n## Exam Preparation Notes\n")
                for note in data.get("exam_preparation_notes", []):
                    markdown_lines.append(f"- {note}")

                markdown_lines.append(f"\n## Quick Revision Summary\n\n{data.get('quick_revision_summary', '')}\n")

                data["raw_markdown"] = "\n".join(markdown_lines)
                return SummarizeResponse.model_validate(data)

            except HTTPException:
                raise
            except Exception as e:
                logger.warning("Summarize attempt %d failed: %s", attempt + 1, str(e))

        raise HTTPException(
            status_code=502,
            detail="The AI service returned an invalid response structure after retries. Please retry with clearer text.",
        )

    # -----------------------------------------------------
    # 2. Quiz Generator with Bounded Retry (Max 2 Retries)
    # -----------------------------------------------------
    def generate_quiz(self, text: str, difficulty: str, count: int, focus: Optional[str] = None) -> QuizResponse:
        """Generate multiple choice questions with bounded retry and strict schema validation."""
        sanitized_focus = sanitize_dashes(focus.strip()) if focus and isinstance(focus, str) else None
        prompt = build_quiz_prompt(text, difficulty, count, focus=sanitized_focus)
        max_attempts = 3

        for attempt in range(max_attempts):
            try:
                raw_response = self._call_model(prompt)
                cleaned = clean_json_string(raw_response)
                data = json.loads(cleaned)

                if "questions" not in data or not isinstance(data["questions"], list):
                    raise ValueError("JSON response missing 'questions' list.")

                questions_raw = data.get("questions", [])
                if len(questions_raw) != count:
                    raise ValueError(f"Generated {len(questions_raw)} questions, but exactly {count} were requested.")

                parsed_questions = []
                seen_questions = set()

                for idx, q in enumerate(questions_raw):
                    q_id = q.get("id", idx + 1)
                    q_stem = str(q.get("question", "")).strip()
                    if not q_stem:
                        raise ValueError(f"Question {q_id} has empty question stem.")

                    # Check for duplicate question stems (case-insensitive)
                    stem_lower = q_stem.lower()
                    if stem_lower in seen_questions:
                        raise ValueError(f"Duplicate question detected: '{q_stem}'")
                    seen_questions.add(stem_lower)

                    options = [str(opt).strip() for opt in q.get("options", [])]
                    if len(options) != 4:
                        raise ValueError(f"Question {q_id} does not have exactly 4 options.")

                    correct_idx = int(q.get("correct_index", 0))
                    if not (0 <= correct_idx <= 3):
                        raise ValueError(f"Question {q_id} has invalid correct_index: {correct_idx}")

                    explanation = str(q.get("explanation", "")).strip()
                    if not explanation:
                        raise ValueError(f"Question {q_id} has empty explanation.")

                    parsed_questions.append(
                        QuizQuestion(
                            id=q_id,
                            question=q_stem,
                            options=options,
                            correct_index=correct_idx,
                            explanation=explanation,
                        )
                    )

                # Validate exact question count requested
                if len(parsed_questions) != count:
                    raise ValueError(f"Generated {len(parsed_questions)} questions, but exactly {count} were requested.")

                return QuizResponse(
                    difficulty=difficulty,
                    question_count=len(parsed_questions),
                    questions=parsed_questions,
                )

            except HTTPException:
                raise
            except Exception as e:
                logger.warning("Quiz generation attempt %d failed: %s", attempt + 1, str(e))
                # Append specific failure reason to prompt for bounded retry (Step 2 requirement)
                prompt = f"{prompt}\n\nPREVIOUS ATTEMPT FAILED: {str(e)}. Please correct this error, returning strictly {count} non-duplicate questions with 4 options each."

        raise HTTPException(
            status_code=502,
            detail="The quiz output could not be validated after 2 retries. Please retry with clearer study text.",
        )

    # -----------------------------------------------------
    # 3. Answer Improver (Exact Spec Sections)
    # -----------------------------------------------------
    def improve_answer(self, answer: str, subject_or_topic: Optional[str] = None) -> ImproveAnswerResponse:
        """Evaluate draft answer without adding external facts."""
        prompt = build_improver_prompt(answer, subject_or_topic)
        max_attempts = 3

        for attempt in range(max_attempts):
            try:
                raw_response = self._call_model(prompt)
                cleaned = clean_json_string(raw_response)
                data = json.loads(cleaned)
                data["original_answer"] = answer
                data["subject_or_topic"] = subject_or_topic
                return ImproveAnswerResponse.model_validate(data)
            except HTTPException:
                raise
            except Exception as e:
                logger.warning("Answer improvement attempt %d failed: %s", attempt + 1, str(e))

        raise HTTPException(
            status_code=502,
            detail="Unable to evaluate and improve the draft answer after retries. Please try again.",
        )

    # -----------------------------------------------------
    # 4. Concept Explainer (6 Exact Spec Sections)
    # -----------------------------------------------------
    def explain_concept(self, concept: str, level: str, subject: str = "Other") -> ExplainConceptResponse:
        """Explain concept at specified academic depth."""
        prompt = build_explainer_prompt(concept, level, subject)
        max_attempts = 3

        for attempt in range(max_attempts):
            try:
                raw_response = self._call_model(prompt)
                cleaned = clean_json_string(raw_response)
                data = json.loads(cleaned)
                data["concept"] = concept
                data["level"] = level
                data["subject"] = subject

                markdown_lines = [
                    f"# Introduction: {concept}\n\n{data.get('introduction', '')}\n",
                    f"## Detailed Explanation ({level.capitalize()} Level)\n\n{data.get('detailed_explanation', '')}\n",
                    "## Step-by-Step Understanding\n",
                ]
                for step in data.get("step_by_step_understanding", []):
                    markdown_lines.append(f"### Step {step.get('step_number', '')}: {step.get('title', '')}")
                    markdown_lines.append(f"{step.get('description', '')}\n")

                markdown_lines.append(f"## Practical Example\n\n{data.get('practical_example', '')}\n")

                markdown_lines.append("## Real-World Applications\n")
                for app in data.get("real_world_applications", []):
                    markdown_lines.append(f"- {app}")

                markdown_lines.append("\n## Quick Revision Points\n")
                for pt in data.get("quick_revision_points", []):
                    markdown_lines.append(f"- {pt}")

                data["raw_markdown"] = "\n".join(markdown_lines)
                return ExplainConceptResponse.model_validate(data)

            except HTTPException:
                raise
            except Exception as e:
                logger.warning("Explain concept attempt %d failed: %s", attempt + 1, str(e))

        raise HTTPException(
            status_code=502,
            detail="Unable to generate conceptual explanation after retries. Please try again.",
        )


gemini_service = GeminiService()
