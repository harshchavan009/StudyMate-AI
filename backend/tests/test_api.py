"""Comprehensive unit and integration tests for StudyMate AI."""

import pytest
from fastapi.testclient import TestClient
from app.services.gemini_service import clean_json_string, sanitize_dashes


def test_health_check(client: TestClient):
    """Test health endpoint returns healthy status and metadata."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "environment" in data
    assert "gemini_configured" in data
    assert data["version"] == "1.0.0"


def test_security_headers_present(client: TestClient):
    """Verify security headers are attached to responses."""
    response = client.get("/api/health")
    headers = response.headers
    assert headers["x-content-type-options"] == "nosniff"
    assert headers["x-frame-options"] == "DENY"
    assert headers["referrer-policy"] == "strict-origin-when-cross-origin"
    assert "camera=()" in headers["permissions-policy"]
    assert "default-src 'self'" in headers["content-security-policy"]


# ---------------------------------------------------------
# Input Validation Tests
# ---------------------------------------------------------

def test_summarize_rejects_too_short_text(client: TestClient):
    """Summarizer must reject texts shorter than 20 characters."""
    response = client.post("/api/summarize", json={"text": "Short note"})
    assert response.status_code == 422
    assert "Input validation failed" in response.json()["detail"]


def test_quiz_rejects_invalid_count(client: TestClient):
    """Quiz generator must only accept 5, 10, or 15 questions."""
    response = client.post(
        "/api/quiz",
        json={
            "text": "This is a valid piece of text containing more than twenty characters.",
            "difficulty": "medium",
            "question_count": 7,  # invalid count
        },
    )
    assert response.status_code == 422


def test_quiz_rejects_invalid_difficulty(client: TestClient):
    """Quiz generator must reject unsupported difficulty levels."""
    response = client.post(
        "/api/quiz",
        json={
            "text": "This is a valid piece of text containing more than twenty characters.",
            "difficulty": "extreme",
            "question_count": 5,
        },
    )
    assert response.status_code == 422


def test_improver_rejects_empty_inputs(client: TestClient):
    """Answer improver must validate non-empty question and draft answer."""
    response = client.post(
        "/api/improve-answer",
        json={"question": "   ", "draft_answer": "Too short"},
    )
    assert response.status_code == 422


def test_explainer_rejects_invalid_level(client: TestClient):
    """Concept explainer must only accept beginner, intermediate, or advanced."""
    response = client.post(
        "/api/explain-concept",
        json={"concept": "Entropy", "level": "master"},
    )
    assert response.status_code == 422


# ---------------------------------------------------------
# Tool Execution Tests (Mock/Fallback Mode)
# ---------------------------------------------------------

def test_summarizer_generates_six_sections(client: TestClient):
    """Verify summarizer produces all 6 required academic sections."""
    sample_text = (
        "Operating systems manage hardware resources through abstraction layers. "
        "The kernel serves as the central control module, arbitrating memory allocation, "
        "process scheduling, and input/output requests while enforcing security boundaries."
    )
    response = client.post("/api/summarize", json={"text": sample_text})
    assert response.status_code == 200
    data = response.json()

    # Section 1: Executive Summary
    assert len(data["executive_summary"]) > 10
    # Section 2: Key Concepts
    assert len(data["key_concepts"]) >= 3
    # Section 3: Breakdown Sections
    assert len(data["breakdown_sections"]) >= 1
    assert "title" in data["breakdown_sections"][0]
    assert len(data["breakdown_sections"][0]["points"]) >= 1
    # Section 4: Important Definitions
    assert len(data["important_definitions"]) >= 1
    assert "term" in data["important_definitions"][0]
    # Section 5: Practical Applications
    assert len(data["practical_applications"]) >= 1
    # Section 6: Review Questions
    assert len(data["review_questions"]) >= 1
    # Markdown output exists
    assert "## Executive Summary" in data["raw_markdown"]


def test_quiz_generates_requested_count_and_schema(client: TestClient):
    """Verify quiz generator outputs exact question count with valid options and indices."""
    sample_text = (
        "Mitochondria generate most of the chemical energy needed to power the biochemical "
        "reactions in cells. This chemical energy is stored in adenosine triphosphate (ATP)."
    )
    for requested_count in [5, 10]:
        response = client.post(
            "/api/quiz",
            json={
                "text": sample_text,
                "difficulty": "medium",
                "question_count": requested_count,
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["question_count"] == requested_count
        assert len(data["questions"]) == requested_count

        for q in data["questions"]:
            assert "id" in q
            assert len(q["options"]) == 4
            assert 0 <= q["correct_index"] <= 3
            assert len(q["explanation"]) > 10


def test_improver_generates_diagnostic_breakdown(client: TestClient):
    """Verify answer improver generates critique, diff phrases, and score progression."""
    question = "Explain how TCP guarantees reliable transmission over unreliable IP networks."
    draft = "TCP sends packets and uses acknowledgments. If something is lost it sends it again quickly."

    response = client.post(
        "/api/improve-answer",
        json={"question": question, "draft_answer": draft},
    )
    assert response.status_code == 200
    data = response.json()

    assert len(data["improved_answer"]) > len(draft)
    assert data["estimated_score_after"] >= data["estimated_score_before"]
    assert len(data["changed_phrases"]) >= 1
    assert "original_phrase" in data["changed_phrases"][0]
    assert "improved_phrase" in data["changed_phrases"][0]
    assert len(data["strengths"]) >= 1
    assert len(data["weaknesses"]) >= 1
    assert len(data["missing_key_points"]) >= 1


def test_explainer_calibrates_by_level(client: TestClient):
    """Verify concept explainer returns level-calibrated structural breakdown."""
    levels = ["beginner", "intermediate", "advanced"]
    for lvl in levels:
        response = client.post(
            "/api/explain-concept",
            json={"concept": "Recursion", "level": lvl},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["concept"] == "Recursion"
        assert data["level"] == lvl
        assert len(data["intuitive_analogy"]) > 10
        assert len(data["foundational_principles"]) >= 2
        assert len(data["step_by_step_breakdown"]) >= 3
        assert len(data["key_terms"]) >= 1
        assert len(data["real_world_case"]) > 10
        assert len(data["self_check_exercise"]) > 10


# ---------------------------------------------------------
# Utility and Sanitizer Tests
# ---------------------------------------------------------

def test_clean_json_string_and_em_dash_sanitizer():
    """Verify JSON block extraction and em dash substitution."""
    raw_markdown_json = "```json\n{\"key\": \"value—with—em-dash\"}\n```"
    cleaned = clean_json_string(raw_markdown_json)
    assert cleaned == '{"key": "value, with, em-dash"}'
    assert "—" not in cleaned


def test_sanitize_dashes_helper():
    text = "Photosynthesis—the process—converts sunlight"
    sanitized = sanitize_dashes(text)
    assert "—" not in sanitized
    assert "Photosynthesis, the process, converts sunlight" == sanitized


def test_malformed_json_body_returns_422(client: TestClient):
    """Sending bad request payload must trigger clean 422 error."""
    response = client.post(
        "/api/summarize",
        headers={"Content-Type": "application/json"},
        content="not valid json",
    )
    assert response.status_code == 422
    assert "detail" in response.json()


def test_rate_limiting_triggers_friendly_429(client: TestClient):
    """Sending requests beyond endpoint limit must return friendly 429 response."""
    payload = {
        "text": "This is a sufficiently long study text that will be sent multiple times.",
        "difficulty": "medium",
        "question_count": 5,
    }
    hit_limit = False
    for _ in range(25):
        resp = client.post("/api/quiz", json=payload)
        if resp.status_code == 429:
            hit_limit = True
            data = resp.json()
            assert "detail" in data
            assert data["type"] == "rate_limit_exceeded"
            break
    assert hit_limit, "Rate limiter should have triggered 429 after repeated requests."
