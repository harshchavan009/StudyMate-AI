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


def test_config_endpoint(client: TestClient):
    """Verify shared configuration endpoint returns exact spec input limits."""
    response = client.get("/api/config")
    assert response.status_code == 200
    data = response.json()
    assert data["summarizer"]["min"] == 20
    assert data["summarizer"]["max"] == 10000
    assert data["quiz"]["min"] == 20
    assert data["quiz"]["max"] == 10000
    assert data["quiz"]["counts"] == [5, 10, 15]
    assert data["answer_improver"]["min"] == 10
    assert data["answer_improver"]["max"] == 5000
    assert data["answer_improver"]["subject_max"] == 200
    assert data["concept_explainer"]["min"] == 3
    assert data["concept_explainer"]["max"] == 300
    assert "Computer Science" in data["concept_explainer"]["subjects"]


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


def test_improver_rejects_too_short_answer(client: TestClient):
    """Answer improver must validate answer is at least 10 characters."""
    response = client.post(
        "/api/improve-answer",
        json={"answer": "Short"},
    )
    assert response.status_code == 422


def test_explainer_rejects_short_concept_and_invalid_level(client: TestClient):
    """Concept explainer must validate concept length (min 3) and valid level."""
    # Too short
    res1 = client.post("/api/explain-concept", json={"concept": "AI", "level": "beginner"})
    assert res1.status_code == 422

    # Invalid level
    res2 = client.post("/api/explain-concept", json={"concept": "Entropy", "level": "master"})
    assert res2.status_code == 422


# ---------------------------------------------------------
# Tool Execution Tests (Mock/Fallback Mode)
# ---------------------------------------------------------

def test_summarizer_generates_six_exact_sections(client: TestClient):
    """Verify summarizer produces exactly the 6 required spec sections:
    Topic Overview, Key Concepts, Important Definitions, Important Points,
    Exam Preparation Notes, Quick Revision Summary.
    """
    sample_text = (
        "Operating systems manage hardware resources through abstraction layers. "
        "The kernel serves as the central control module, arbitrating memory allocation, "
        "process scheduling, and input/output requests while enforcing security boundaries."
    )
    response = client.post("/api/summarize", json={"text": sample_text})
    assert response.status_code == 200
    data = response.json()

    # Section 1: Topic Overview
    assert "topic_overview" in data
    assert len(data["topic_overview"]) > 10

    # Section 2: Key Concepts
    assert "key_concepts" in data
    assert len(data["key_concepts"]) >= 3

    # Section 3: Important Definitions
    assert "important_definitions" in data
    assert len(data["important_definitions"]) >= 1
    assert "term" in data["important_definitions"][0]

    # Section 4: Important Points
    assert "important_points" in data
    assert len(data["important_points"]) >= 1

    # Section 5: Exam Preparation Notes
    assert "exam_preparation_notes" in data
    assert len(data["exam_preparation_notes"]) >= 1

    # Section 6: Quick Revision Summary
    assert "quick_revision_summary" in data
    assert len(data["quick_revision_summary"]) > 10

    # Markdown export
    assert "# Topic Overview" in data["raw_markdown"]


def test_quiz_generates_requested_count_and_schema(client: TestClient):
    """Verify quiz generator outputs exact question count with valid options and indices."""
    sample_text = (
        "Mitochondria generate most of the chemical energy needed to power the biochemical "
        "reactions in cells. This chemical energy is stored in adenosine triphosphate (ATP)."
    )
    for requested_count in [5, 10, 15]:
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


def test_quiz_focus_constraint_validation(client: TestClient):
    """Verify quiz generator supports optional focus up to 200 chars and rejects > 200 chars."""
    sample_text = (
        "DNS resolution maps domain names to IP addresses through recursive query steps. "
        "Authoritative nameservers maintain definitive zone records."
    )
    # Valid focus topic
    res_valid = client.post(
        "/api/quiz",
        json={
            "text": sample_text,
            "difficulty": "medium",
            "question_count": 5,
            "focus": "recursive queries",
        },
    )
    assert res_valid.status_code == 200
    data_valid = res_valid.json()
    assert len(data_valid["questions"]) == 5
    assert "Focus: recursive queries" in data_valid["questions"][0]["question"]

    # Focus exceeding 200 chars should fail with 422
    res_invalid = client.post(
        "/api/quiz",
        json={
            "text": sample_text,
            "difficulty": "medium",
            "question_count": 5,
            "focus": "a" * 201,
        },
    )
    assert res_invalid.status_code == 422


def test_improver_generates_exact_spec_sections(client: TestClient):
    """Verify answer improver generates:
    Original Answer Feedback, Improved Answer, Key Improvements Made,
    Suggestions for Further Improvement.
    """
    draft = "TCP sends packets and uses acknowledgments. If something is lost it sends it again quickly."
    response = client.post(
        "/api/improve-answer",
        json={"answer": draft, "subject_or_topic": "Computer Networking"},
    )
    assert response.status_code == 200
    data = response.json()

    assert data["original_answer"] == draft
    assert data["subject_or_topic"] == "Computer Networking"
    assert len(data["original_answer_feedback"]) > 10
    assert len(data["improved_answer"]) > len(draft)
    assert len(data["key_improvements_made"]) >= 1
    assert len(data["suggestions_for_further_improvement"]) >= 1
    assert len(data["changed_phrases"]) >= 1


def test_explainer_calibrates_by_level_with_exact_sections(client: TestClient):
    """Verify concept explainer returns exact 6 sections:
    Introduction, Detailed Explanation, Step-by-Step Understanding,
    Practical Example, Real-World Applications, Quick Revision Points.
    """
    levels = ["beginner", "intermediate", "advanced"]
    for lvl in levels:
        response = client.post(
            "/api/explain-concept",
            json={"concept": "Recursion", "level": lvl, "subject": "Computer Science"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["concept"] == "Recursion"
        assert data["subject"] == "Computer Science"
        assert data["level"] == lvl
        assert len(data["introduction"]) > 10
        assert len(data["detailed_explanation"]) > 10
        assert len(data["step_by_step_understanding"]) >= 3
        assert len(data["practical_example"]) > 10
        assert len(data["real_world_applications"]) >= 1
        assert len(data["quick_revision_points"]) >= 1


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


def test_no_em_dashes_in_prompts_and_schemas():
    """Verify prompts.py has zero em dashes anywhere in its templates."""
    import app.prompts as prompts
    for attr in dir(prompts):
        val = getattr(prompts, attr)
        if isinstance(val, str):
            assert "—" not in val, f"Em dash found in prompt: {attr}"


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
