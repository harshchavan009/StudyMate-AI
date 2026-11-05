"""Comprehensive unit and integration tests for StudyMate AI."""

import json
from unittest.mock import patch, MagicMock
import pytest
from fastapi.testclient import TestClient
from app.services.gemini_service import clean_json_string, sanitize_dashes, gemini_service


def test_health_check(client: TestClient):
    """Test health endpoint returns healthy status and metadata."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "environment" in data
    assert "gemini_configured" in data
    assert data["version"] == "1.0.0"


def test_root_health(client: TestClient):
    """Test root /health endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"


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
# Input Validation Tests (422)
# ---------------------------------------------------------

def test_summarize_rejects_too_short_text(client: TestClient):
    """Summarizer must reject texts shorter than 20 characters."""
    response = client.post("/api/summarize", json={"text": "Short note"})
    assert response.status_code == 422
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "VALIDATION_ERROR"


def test_summarize_rejects_whitespace_only(client: TestClient):
    """Summarizer must reject whitespace-only text with 422."""
    response = client.post("/api/summarize", json={"text": "                    "})
    assert response.status_code == 422
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "VALIDATION_ERROR"


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
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


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


def test_improver_rejects_too_short_or_whitespace_answer(client: TestClient):
    """Answer improver must validate answer is at least 10 non-whitespace characters."""
    res1 = client.post("/api/improve-answer", json={"answer": "Short"})
    assert res1.status_code == 422

    res2 = client.post("/api/improve-answer", json={"answer": "          "})
    assert res2.status_code == 422


def test_explainer_rejects_short_concept_and_invalid_level(client: TestClient):
    """Concept explainer must validate concept length (min 3) and valid level."""
    res1 = client.post("/api/explain-concept", json={"concept": "AI", "level": "beginner"})
    assert res1.status_code == 422

    res2 = client.post("/api/explain-concept", json={"concept": "Entropy", "level": "master"})
    assert res2.status_code == 422

    res3 = client.post("/api/explain-concept", json={"concept": "   ", "level": "beginner"})
    assert res3.status_code == 422


# ---------------------------------------------------------
# Real AI Missing / Error Scenarios (503, 504, 502, 429)
# ---------------------------------------------------------

def test_missing_api_key_returns_503_on_all_endpoints(client: TestClient):
    """When GEMINI_API_KEY is not configured, all 4 AI endpoints must return HTTP 503."""
    with patch.object(gemini_service, "api_key", ""), patch.object(gemini_service, "model", None):
        res_sum = client.post("/api/summarize", json={"text": "Valid test content with more than twenty characters."})
        assert res_sum.status_code == 503
        data_sum = res_sum.json()
        assert data_sum["success"] is False
        assert data_sum["error"]["code"] == "SERVICE_UNAVAILABLE"
        assert "not configured or unavailable" in data_sum["error"]["message"]

        res_quiz = client.post("/api/quiz", json={"text": "Valid test content with more than twenty characters.", "question_count": 5, "difficulty": "medium"})
        assert res_quiz.status_code == 503

        res_imp = client.post("/api/improve-answer", json={"answer": "This is a valid test answer."})
        assert res_imp.status_code == 503

        res_exp = client.post("/api/explain-concept", json={"concept": "Osmosis", "level": "beginner"})
        assert res_exp.status_code == 503


def test_invalid_api_key_returns_503(client: TestClient):
    """When Gemini returns an authentication/permission error, endpoint returns 503."""
    mock_model = MagicMock()
    mock_model.generate_content.side_effect = Exception("API_KEY_INVALID: API key not valid. Please pass a valid API key.")
    with patch.object(gemini_service, "api_key", "fake-key"), patch.object(gemini_service, "model", mock_model):
        res = client.post("/api/summarize", json={"text": "Valid test content with more than twenty characters."})
        assert res.status_code == 503
        assert res.json()["error"]["code"] == "SERVICE_UNAVAILABLE"


def test_upstream_quota_exhausted_returns_429(client: TestClient):
    """When Gemini returns 429 / resource exhausted, endpoint returns 429."""
    mock_model = MagicMock()
    mock_model.generate_content.side_effect = Exception("429 Resource has been exhausted (check quota).")
    with patch.object(gemini_service, "api_key", "fake-key"), patch.object(gemini_service, "model", mock_model):
        res = client.post("/api/summarize", json={"text": "Valid test content with more than twenty characters."})
        assert res.status_code == 429
        assert res.json()["error"]["code"] == "RATE_LIMIT_EXCEEDED"


def test_upstream_timeout_returns_504(client: TestClient):
    """When Gemini API times out, endpoint returns 504."""
    mock_model = MagicMock()
    mock_model.generate_content.side_effect = Exception("504 Deadline Exceeded: request timed out.")
    with patch.object(gemini_service, "api_key", "fake-key"), patch.object(gemini_service, "model", mock_model):
        res = client.post("/api/summarize", json={"text": "Valid test content with more than twenty characters."})
        assert res.status_code == 504
        assert res.json()["error"]["code"] == "GATEWAY_TIMEOUT"


def test_malformed_json_after_retries_returns_502(client: TestClient):
    """When Gemini returns unparseable output across all retries, endpoint returns 502."""
    with patch.object(gemini_service, "_call_model", return_value="plain text without json"):
        res = client.post("/api/summarize", json={"text": "Valid test content with more than twenty characters."})
        assert res.status_code == 502
        assert res.json()["error"]["code"] == "BAD_GATEWAY"


def test_empty_gemini_model_rejected():
    """Settings must reject empty GEMINI_MODEL values."""
    from app.config import Settings
    with pytest.raises(ValueError, match="cannot be empty"):
        Settings(GEMINI_MODEL="   ")


def test_startup_model_verification_success():
    """Startup API check succeeds when Google Gen AI reports model exists."""
    from app.services.gemini_service import verify_gemini_model_exists
    with patch("google.generativeai.get_model", return_value={"name": "models/gemini-3.8-flash"}):
        result = verify_gemini_model_exists("gemini-3.8-flash", "test-key-123")
        assert result is True


def test_startup_model_verification_failure_raises_runtime_error():
    """Startup API check raises clear RuntimeError when model does not exist."""
    from app.services.gemini_service import verify_gemini_model_exists
    with patch("google.generativeai.get_model", side_effect=Exception("404 Model models/invalid-model not found")):
        with pytest.raises(RuntimeError, match="does not exist or is not accepted by the Gemini API"):
            verify_gemini_model_exists("invalid-model", "test-key-123")


def test_quiz_duplicate_question_triggers_retry_and_502(client: TestClient):
    """Duplicate question stems (case-insensitive) must be rejected and trigger retry/502."""
    duplicate_quiz = json.dumps({
        "difficulty": "medium",
        "question_count": 5,
        "questions": [
            {"id": 1, "question": "What is DNS?", "options": ["A", "B", "C", "D"], "correct_index": 0, "explanation": "Exp 1"},
            {"id": 2, "question": "what is dns?", "options": ["A", "B", "C", "D"], "correct_index": 1, "explanation": "Exp 2"},
            {"id": 3, "question": "Q3?", "options": ["A", "B", "C", "D"], "correct_index": 2, "explanation": "Exp 3"},
            {"id": 4, "question": "Q4?", "options": ["A", "B", "C", "D"], "correct_index": 0, "explanation": "Exp 4"},
            {"id": 5, "question": "Q5?", "options": ["A", "B", "C", "D"], "correct_index": 1, "explanation": "Exp 5"},
        ]
    })
    with patch.object(gemini_service, "_call_model", return_value=duplicate_quiz):
        res = client.post("/api/quiz", json={"text": "Valid test content with more than twenty characters.", "question_count": 5, "difficulty": "medium"})
        assert res.status_code == 502
        assert "could not be validated after 2 retries" in res.json()["detail"].lower()


def test_quiz_invalid_options_count_triggers_retry_and_502(client: TestClient):
    """Question with != 4 options must be rejected and trigger retry/502."""
    bad_options_quiz = json.dumps({
        "difficulty": "medium",
        "question_count": 5,
        "questions": [
            {"id": 1, "question": "Q1?", "options": ["A", "B", "C"], "correct_index": 0, "explanation": "Exp 1"},
            {"id": 2, "question": "Q2?", "options": ["A", "B", "C", "D"], "correct_index": 1, "explanation": "Exp 2"},
            {"id": 3, "question": "Q3?", "options": ["A", "B", "C", "D"], "correct_index": 2, "explanation": "Exp 3"},
            {"id": 4, "question": "Q4?", "options": ["A", "B", "C", "D"], "correct_index": 0, "explanation": "Exp 4"},
            {"id": 5, "question": "Q5?", "options": ["A", "B", "C", "D"], "correct_index": 1, "explanation": "Exp 5"},
        ]
    })
    with patch.object(gemini_service, "_call_model", return_value=bad_options_quiz):
        res = client.post("/api/quiz", json={"text": "Valid test content with more than twenty characters.", "question_count": 5, "difficulty": "medium"})
        assert res.status_code == 502


def test_quiz_invalid_correct_index_triggers_retry_and_502(client: TestClient):
    """Question with correct_index out of bounds must trigger retry/502."""
    bad_index_quiz = json.dumps({
        "difficulty": "medium",
        "question_count": 5,
        "questions": [
            {"id": 1, "question": "Q1?", "options": ["A", "B", "C", "D"], "correct_index": 5, "explanation": "Exp 1"},
            {"id": 2, "question": "Q2?", "options": ["A", "B", "C", "D"], "correct_index": 1, "explanation": "Exp 2"},
            {"id": 3, "question": "Q3?", "options": ["A", "B", "C", "D"], "correct_index": 2, "explanation": "Exp 3"},
            {"id": 4, "question": "Q4?", "options": ["A", "B", "C", "D"], "correct_index": 0, "explanation": "Exp 4"},
            {"id": 5, "question": "Q5?", "options": ["A", "B", "C", "D"], "correct_index": 1, "explanation": "Exp 5"},
        ]
    })
    with patch.object(gemini_service, "_call_model", return_value=bad_index_quiz):
        res = client.post("/api/quiz", json={"text": "Valid test content with more than twenty characters.", "question_count": 5, "difficulty": "medium"})
        assert res.status_code == 502


def test_quiz_empty_explanation_triggers_retry_and_502(client: TestClient):
    """Question with empty explanation must trigger retry/502."""
    bad_exp_quiz = json.dumps({
        "difficulty": "medium",
        "question_count": 5,
        "questions": [
            {"id": 1, "question": "Q1?", "options": ["A", "B", "C", "D"], "correct_index": 0, "explanation": "   "},
            {"id": 2, "question": "Q2?", "options": ["A", "B", "C", "D"], "correct_index": 1, "explanation": "Exp 2"},
            {"id": 3, "question": "Q3?", "options": ["A", "B", "C", "D"], "correct_index": 2, "explanation": "Exp 3"},
            {"id": 4, "question": "Q4?", "options": ["A", "B", "C", "D"], "correct_index": 0, "explanation": "Exp 4"},
            {"id": 5, "question": "Q5?", "options": ["A", "B", "C", "D"], "correct_index": 1, "explanation": "Exp 5"},
        ]
    })
    with patch.object(gemini_service, "_call_model", return_value=bad_exp_quiz):
        res = client.post("/api/quiz", json={"text": "Valid test content with more than twenty characters.", "question_count": 5, "difficulty": "medium"})
        assert res.status_code == 502


def test_unexpected_exception_returns_500(client: TestClient):
    """Unhandled internal exceptions return standard 500 without leaking stack traces."""
    with patch.object(gemini_service, "generate_summary", side_effect=RuntimeError("Database/Disk crash")):
        res = client.post("/api/summarize", json={"text": "Valid test content with more than twenty characters."})
        assert res.status_code == 500
        data = res.json()
        assert data["success"] is False
        assert data["error"]["code"] == "INTERNAL_SERVER_ERROR"
        assert "stack" not in data
        assert "RuntimeError" not in data["error"]["message"]


# ---------------------------------------------------------
# Tool Execution Tests (Mocked LLM in Pytest Only)
# ---------------------------------------------------------

def test_summarizer_generates_six_exact_sections(client: TestClient):
    """Verify summarizer produces exactly the 6 required spec sections."""
    sample_text = (
        "Operating systems manage hardware resources through abstraction layers. "
        "The kernel serves as the central control module, arbitrating memory allocation, "
        "process scheduling, and input/output requests while enforcing security boundaries."
    )
    mock_payload = json.dumps({
        "topic_overview": "Operating systems manage hardware resources through abstraction layers.",
        "key_concepts": ["Kernel control module", "Virtual memory management", "Process scheduling"],
        "important_definitions": [{"term": "Kernel", "definition": "The central control module of an OS."}],
        "important_points": ["Arbitrates hardware access", "Enforces security boundaries"],
        "exam_preparation_notes": ["Differentiate user space from kernel space"],
        "quick_revision_summary": "The kernel arbitrates hardware and enforces security via abstraction."
    })
    with patch.object(gemini_service, "_call_model", return_value=mock_payload):
        response = client.post("/api/summarize", json={"text": sample_text})
        assert response.status_code == 200
        data = response.json()
        assert "topic_overview" in data
        assert len(data["key_concepts"]) == 3
        assert len(data["important_definitions"]) == 1
        assert len(data["important_points"]) == 2
        assert len(data["exam_preparation_notes"]) == 1
        assert len(data["quick_revision_summary"]) > 10
        assert "# Topic Overview" in data["raw_markdown"]


def test_quiz_generates_requested_count_and_schema(client: TestClient):
    """Verify quiz generator outputs exact question count with valid options and indices."""
    sample_text = (
        "Mitochondria generate most of the chemical energy needed to power the biochemical "
        "reactions in cells. This chemical energy is stored in adenosine triphosphate (ATP)."
    )
    def mock_quiz_call(prompt: str) -> str:
        count = 5
        if "exactly 10 multiple" in prompt:
            count = 10
        elif "exactly 15 multiple" in prompt:
            count = 15
        questions = [
            {
                "id": i + 1,
                "question": f"Question {i + 1} regarding cellular respiration and ATP?",
                "options": ["Option A", "Option B", "Option C", "Option D"],
                "correct_index": 0,
                "explanation": f"Explanation for question {i + 1} detailing ATP synthesis."
            }
            for i in range(count)
        ]
        return json.dumps({
            "difficulty": "medium",
            "question_count": count,
            "questions": questions
        })

    with patch.object(gemini_service, "_call_model", side_effect=mock_quiz_call):
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
                assert len(q["explanation"]) > 5


def test_improver_generates_exact_spec_sections(client: TestClient):
    """Verify answer improver generates the 4 required sections."""
    draft = "TCP sends packets and uses acknowledgments. If something is lost it sends it again quickly."
    mock_payload = json.dumps({
        "original_answer_feedback": "Your draft correctly captures the core mechanism of TCP reliability.",
        "improved_answer": "Transmission Control Protocol (TCP) ensures reliable data transfer through packet acknowledgment and retransmission.",
        "key_improvements_made": ["Introduced formal terminology", "Enhanced syntactic clarity"],
        "suggestions_for_further_improvement": ["Consider mentioning sequence numbers in future responses"],
        "changed_phrases": [
            {
                "original_phrase": "sends it again quickly",
                "improved_phrase": "retransmits dropped segments",
                "reason": "Technical accuracy"
            }
        ]
    })
    with patch.object(gemini_service, "_call_model", return_value=mock_payload):
        response = client.post(
            "/api/improve-answer",
            json={"answer": draft, "subject_or_topic": "Computer Networking"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["original_answer"] == draft
        assert data["subject_or_topic"] == "Computer Networking"
        assert len(data["original_answer_feedback"]) > 10
        assert len(data["improved_answer"]) > 10
        assert len(data["key_improvements_made"]) == 2
        assert len(data["suggestions_for_further_improvement"]) == 1
        assert len(data["changed_phrases"]) == 1


def test_explainer_adjusts_by_level_with_exact_sections(client: TestClient):
    """Verify concept explainer returns exact 6 sections."""
    def mock_explainer_call(prompt: str) -> str:
        level = "intermediate"
        if "at the 'beginner' level" in prompt:
            level = "beginner"
        elif "at the 'advanced' level" in prompt:
            level = "advanced"
        return json.dumps({
            "concept": "Recursion",
            "subject": "Computer Science",
            "level": level,
            "introduction": f"Recursion is a programming technique explained at {level} level.",
            "detailed_explanation": f"Detailed breakdown of stack frames at {level} depth.",
            "step_by_step_understanding": [
                {"step_number": 1, "title": "Base Case", "description": "Terminates recursion"},
                {"step_number": 2, "title": "Recursive Step", "description": "Breaks problem into subproblems"}
            ],
            "practical_example": "Calculating factorial(n) = n * factorial(n - 1).",
            "real_world_applications": ["Traversing hierarchical DOM trees", "Parsing JSON structures"],
            "quick_revision_points": ["Always ensure base case is reachable", "Each call uses call stack frame"]
        })

    with patch.object(gemini_service, "_call_model", side_effect=mock_explainer_call):
        for lvl in ["beginner", "intermediate", "advanced"]:
            response = client.post(
                "/api/explain-concept",
                json={"concept": "Recursion", "level": lvl, "subject": "Computer Science"},
            )
            assert response.status_code == 200
            data = response.json()
            assert data["concept"] == "Recursion"
            assert data["level"] == lvl
            assert len(data["step_by_step_understanding"]) == 2
            assert len(data["real_world_applications"]) == 2


# ---------------------------------------------------------
# Utility and Sanitizer Tests
# ---------------------------------------------------------

def test_clean_json_string_and_em_dash_sanitizer():
    """Verify JSON block extraction and em dash substitution."""
    raw_markdown_json = "```json\n{\"key\": \"value\u2014with\u2014em-dash\"}\n```"
    cleaned = clean_json_string(raw_markdown_json)
    assert cleaned == '{"key": "value, with, em-dash"}'
    assert "\u2014" not in cleaned


def test_sanitize_dashes_helper():
    text = "Photosynthesis\u2014the process\u2014converts sunlight"
    sanitized = sanitize_dashes(text)
    assert "\u2014" not in sanitized
    assert "Photosynthesis, the process, converts sunlight" == sanitized


def test_no_em_dashes_in_prompts_and_schemas():
    """Verify prompts.py has zero em dashes anywhere in its templates."""
    import app.prompts as prompts
    for attr in dir(prompts):
        val = getattr(prompts, attr)
        if isinstance(val, str):
            assert "\u2014" not in val, f"Em dash found in prompt: {attr}"


def test_malformed_json_body_returns_422(client: TestClient):
    """Sending bad request payload must trigger clean 422 error."""
    response = client.post(
        "/api/summarize",
        headers={"Content-Type": "application/json"},
        content="not valid json",
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


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
            assert data["error"]["code"] == "RATE_LIMIT_EXCEEDED"
            break
    assert hit_limit, "Rate limiter should have triggered 429 after repeated requests."


def test_rate_limiting_tracks_x_forwarded_for_headers(client: TestClient):
    """Different client IPs via X-Forwarded-For must have independent rate limit buckets."""
    ip1 = "198.51.100.1"
    ip2 = "198.51.100.2"
    payload = {
        "text": "This is a sufficiently long study text that reaches the handler.",
        "difficulty": "medium",
        "question_count": 5,
    }

    # Exhaust limit for IP1
    ip1_limited = False
    for _ in range(25):
        resp = client.post("/api/quiz", json=payload, headers={"X-Forwarded-For": ip1})
        if resp.status_code == 429:
            ip1_limited = True
            break
    assert ip1_limited, "IP1 should be rate limited after exceeding threshold."

    # IP2 should NOT be rate limited yet (returns 503 since no key, not 429)
    resp_ip2 = client.post("/api/quiz", json=payload, headers={"X-Forwarded-For": ip2})
    assert resp_ip2.status_code == 503, f"IP2 should not be blocked by IP1 limit, got {resp_ip2.status_code}"


def test_fake_leading_x_forwarded_for_cannot_bypass_rate_limit(client: TestClient):
    """An attacker varying fake leading IPs in X-Forwarded-For cannot bypass rate limiting.

    The limiter extracts the right-most IP appended by the trusted proxy.
    """
    real_proxy_appended_ip = "203.0.113.195"
    payload = {
        "text": "This is a sufficiently long study text that reaches the handler.",
        "difficulty": "medium",
        "question_count": 5,
    }

    hit_limit = False
    for i in range(25):
        spoofed_header = f"fake-client-{i}.internal, 10.0.0.{i}, {real_proxy_appended_ip}"
        resp = client.post("/api/quiz", json=payload, headers={"X-Forwarded-For": spoofed_header})
        if resp.status_code == 429:
            hit_limit = True
            break

    assert hit_limit, "Varying fake leading IPs must not bypass rate limit on right-most IP."

