"""Unit tests verifying 5-part prompt structures and safety guardrails."""

import pytest
from app.prompts import (
    build_summarizer_prompt,
    build_quiz_prompt,
    build_improver_prompt,
    build_explainer_prompt,
)


def test_summarizer_prompt_has_all_five_parts():
    """Verify Summarizer prompt has Role, Task, Context, Instructions, Output Format."""
    user_input = "Operating systems coordinate CPU execution and virtual memory page mapping."
    prompt = build_summarizer_prompt(user_input)

    assert "Role:" in prompt
    assert "Task:" in prompt
    assert "Context:" in prompt
    assert "Instructions:" in prompt
    assert "Output Format:" in prompt
    assert "=== STUDENT INPUT START ===" in prompt
    assert "=== STUDENT INPUT END ===" in prompt
    assert user_input in prompt
    # Anti-hallucination check
    assert "Do not invent facts" in prompt
    # Em-dash check
    assert "—" not in prompt


def test_quiz_prompt_has_all_five_parts():
    """Verify Quiz Generator prompt has Role, Task, Context, Instructions, Output Format."""
    user_input = "Mitochondria produce ATP through oxidative phosphorylation across the inner membrane."
    prompt = build_quiz_prompt(user_input, difficulty="hard", count=10, focus="ATP synthase")

    assert "Role:" in prompt
    assert "Task:" in prompt
    assert "Context:" in prompt
    assert "Instructions:" in prompt
    assert "Output Format:" in prompt
    assert "=== STUDENT INPUT START ===" in prompt
    assert "=== STUDENT INPUT END ===" in prompt
    assert user_input in prompt
    assert "ATP synthase" in prompt
    assert "exactly 10 multiple choice questions" in prompt
    # Anti-hallucination check
    assert "strictly in the information provided" in prompt
    assert "—" not in prompt


def test_improver_prompt_has_all_five_parts():
    """Verify Answer Improver prompt has Role, Task, Context, Instructions, Output Format."""
    user_input = "The CPU gets data from RAM and runs instructions in a cycle."
    prompt = build_improver_prompt(user_input, subject_or_topic="Computer Architecture")

    assert "Role:" in prompt
    assert "Task:" in prompt
    assert "Context:" in prompt
    assert "Instructions:" in prompt
    assert "Output Format:" in prompt
    assert "=== STUDENT INPUT START ===" in prompt
    assert "=== STUDENT INPUT END ===" in prompt
    assert user_input in prompt
    assert "Computer Architecture" in prompt
    # Anti-hallucination guardrail check
    assert "DO NOT add facts, outside assertions, or new evidence" in prompt
    assert "—" not in prompt


def test_explainer_prompt_has_all_five_parts():
    """Verify Concept Explainer prompt has Role, Task, Context, Instructions, Output Format."""
    prompt = build_explainer_prompt(concept="Dynamic Programming", level="advanced", subject="Computer Science")

    assert "Role:" in prompt
    assert "Task:" in prompt
    assert "Context:" in prompt
    assert "Instructions:" in prompt
    assert "Output Format:" in prompt
    assert "=== STUDENT INPUT START ===" in prompt
    assert "=== STUDENT INPUT END ===" in prompt
    assert "Dynamic Programming" in prompt
    assert "advanced" in prompt
    assert "Computer Science" in prompt
    # Anti-hallucination check
    assert "Do not introduce fictional facts" in prompt
    assert "—" not in prompt

