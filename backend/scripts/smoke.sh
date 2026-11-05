#!/usr/bin/env bash
# StudyMate AI Smoke Test Script
# Verifies all core API endpoints against a running backend server.

set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:8000}"
FAILED=0

echo "=========================================================="
echo "Running StudyMate AI Backend Smoke Tests against ${BASE_URL}"
echo "=========================================================="

test_endpoint() {
    local method="$1"
    local path="$2"
    local payload="$3"
    local expected_status="$4"
    local desc="$5"

    echo -n "Testing ${method} ${path} (${desc})... "

    local status
    if [ "$method" = "GET" ]; then
        status=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}${path}")
    else
        status=$(curl -s -o /dev/null -w "%{http_code}" -X "${method}" \
            -H "Content-Type: application/json" \
            -d "${payload}" \
            "${BASE_URL}${path}")
    fi

    # Check status (allow multiple expected status codes separated by |)
    if [[ "$expected_status" =~ $status ]]; then
        echo "PASS [HTTP ${status}]"
    else
        echo "FAIL [Expected ${expected_status}, got ${status}]"
        FAILED=$((FAILED + 1))
    fi
}

# 1. Health check
test_endpoint "GET" "/api/health" "" "200" "System health status"
test_endpoint "GET" "/health" "" "200" "Root health status"

# 2. Config check
test_endpoint "GET" "/api/config" "" "200" "Shared limits and configuration"

# 3. Input validation (422 expected on short/empty text)
test_endpoint "POST" "/api/summarize" '{"text": "Short"}' "422" "Validation rejection on short text"
test_endpoint "POST" "/api/generate-quiz" '{"text": "Short", "question_count": 7}' "422" "Validation rejection on invalid count"
test_endpoint "POST" "/api/improve-answer" '{"answer": "Short"}' "422" "Validation rejection on short answer"
test_endpoint "POST" "/api/explain" '{"concept": "AI", "level": "invalid_level"}' "422" "Validation rejection on invalid level"

# 4. Valid payload tool calls (Expect 200 if GEMINI_API_KEY is configured, or 503 if unconfigured)
test_endpoint "POST" "/api/summarize" '{"text": "Photosynthesis is the biological process by which plants and algae convert light energy into chemical energy stored in glucose."}' "200|503" "Summarizer endpoint"
test_endpoint "POST" "/api/generate-quiz" '{"text": "Photosynthesis is the biological process by which plants and algae convert light energy into chemical energy stored in glucose.", "difficulty": "medium", "question_count": 5}' "200|503" "Quiz Generator endpoint"
test_endpoint "POST" "/api/improve-answer" '{"answer": "Mitochondria produce cellular ATP through oxidative phosphorylation.", "subject_or_topic": "Cell Biology"}' "200|503" "Answer Improver endpoint"
test_endpoint "POST" "/api/explain" '{"concept": "Photosynthesis", "level": "intermediate", "subject": "Biology"}' "200|503" "Concept Explainer endpoint"

echo "=========================================================="
if [ "$FAILED" -eq 0 ]; then
    echo "All smoke tests PASSED successfully."
    exit 0
else
    echo "${FAILED} smoke test(s) FAILED."
    exit 1
fi
