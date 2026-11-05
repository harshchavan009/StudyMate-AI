"""Prompt templates for StudyMate AI.

Enforces strict 5-part structure per feature:
1. Role
2. Task
3. Context (student's input)
4. Instructions (anti-hallucination guardrails, forbidden outside facts, no em dashes)
5. Output Format (strict JSON schema matching specification)

No em dashes are permitted anywhere in instructions, templates, or outputs.
"""

from typing import Optional, Dict, Any


# ---------------------------------------------------------
# 1. Summarizer Prompt Template
# ---------------------------------------------------------

SUMMARIZER_ROLE = "You are an expert academic tutor and study assistant."

SUMMARIZER_TASK = (
    "Analyze the student provided study notes or textbook excerpt and produce a "
    "structured 6-section academic summary."
)

SUMMARIZER_INSTRUCTIONS = """1. Work strictly with the information provided in Context. Do not invent facts, outside claims, or external assertions that are not present in the input text.
2. Ground all 6 sections entirely in the student text.
3. Be direct, authoritative, and concise. Avoid conversational filler or introductory greetings.
4. Do not use em dashes anywhere in your output. Use commas, colons, or parentheses instead.
5. Output strictly raw JSON conforming exactly to the Output Format schema below. Do not wrap in markdown code fences or backticks."""

SUMMARIZER_OUTPUT_FORMAT = """{
  "topic_overview": "A clear, concise overview summarizing the primary topic and central theme.",
  "key_concepts": [
    "Key concept 1 with concise explanation",
    "Key concept 2 with concise explanation"
  ],
  "important_definitions": [
    {
      "term": "Academic or Technical Term",
      "definition": "Precise, unambiguous definition grounded in source text."
    }
  ],
  "important_points": [
    "High-priority factual point or deduction 1",
    "High-priority factual point 2"
  ],
  "exam_preparation_notes": [
    "Specific exam-relevant tip, key distinction, or common pitfall to avoid",
    "Exam preparation note 2"
  ],
  "quick_revision_summary": "A concise paragraph summary designed for fast review before an exam."
}"""

def build_summarizer_prompt(text: str) -> str:
    """Build complete 5-part prompt for the Notes Summarizer."""
    return f"""Role: {SUMMARIZER_ROLE}

Task: {SUMMARIZER_TASK}

Context:
=== STUDENT INPUT START ===
{text}
=== STUDENT INPUT END ===

Instructions:
{SUMMARIZER_INSTRUCTIONS}

Output Format:
{SUMMARIZER_OUTPUT_FORMAT}

Return raw JSON only."""


# ---------------------------------------------------------
# 2. Quiz Generator Prompt Template
# ---------------------------------------------------------

QUIZ_ROLE = "You are a rigorous academic examiner and question designer."

QUIZ_INSTRUCTIONS = """1. Ground all question stems and options strictly in the information provided in Context. Do not introduce outside facts or untestable assertions.
2. Every question must have exactly 4 plausible options, with exactly one unambiguously correct answer.
3. The correct_index must be an integer between 0 and 3, corresponding to the correct option.
4. Distractors must be plausible academic alternatives based on the context, not obvious absurdities.
5. Do not create duplicate or repetitive questions.
6. Explanations must be non-empty and clearly explain why the correct option is right and why distractors are wrong.
7. Do not use em dashes in question stems, options, or explanations. Use commas, colons, or parentheses.
8. Output strictly raw JSON conforming exactly to the Output Format schema below. Do not wrap in markdown code fences or backticks."""

QUIZ_OUTPUT_FORMAT = """{
  "difficulty": "easy | medium | hard",
  "question_count": 5,
  "questions": [
    {
      "id": 1,
      "question": "Clear, grammatically complete question stem?",
      "options": [
        "First option",
        "Second option",
        "Third option",
        "Fourth option"
      ],
      "correct_index": 0,
      "explanation": "Detailed explanation stating why the correct option is right and why others are incorrect."
    }
  ]
}"""

def build_quiz_prompt(text: str, difficulty: str, count: int, focus: Optional[str] = None) -> str:
    """Build complete 5-part prompt for the Practice Quiz Generator."""
    task = f"Generate exactly {count} multiple choice questions at difficulty level '{difficulty}' from the student material."
    focus_clause = f"\nFocus constraint: Prioritize questions testing '{focus.strip()}', but remain grounded strictly in the source text." if focus and focus.strip() else ""

    return f"""Role: {QUIZ_ROLE}

Task: {task}

Context:
=== STUDENT INPUT START ===
{text}{focus_clause}
=== STUDENT INPUT END ===

Instructions:
{QUIZ_INSTRUCTIONS}

Output Format:
{QUIZ_OUTPUT_FORMAT}

Return raw JSON only."""


# ---------------------------------------------------------
# 3. Answer Improver Prompt Template
# ---------------------------------------------------------

IMPROVER_ROLE = "You are an academic writing mentor and precision editor."

IMPROVER_TASK = (
    "Analyze the student draft answer and provide constructive feedback, an improved revision, "
    "key improvements made, and suggestions for further refinement without introducing outside facts."
)

IMPROVER_INSTRUCTIONS = """1. CRITICAL RULE: DO NOT add facts, outside assertions, or new evidence not present in the student draft answer. Work strictly with the information, reasoning, and arguments the student provided.
2. Elevate vocabulary, academic tone, sentence structure, flow, and conciseness while preserving all original facts and points.
3. Do not evaluate factual completeness or grade missing outside knowledge.
4. Do not use em dashes anywhere in your text. Use commas, colons, or periods.
5. Output strictly raw JSON conforming exactly to the Output Format schema below. Do not wrap in markdown code fences or backticks."""

IMPROVER_OUTPUT_FORMAT = """{
  "original_answer_feedback": "A constructive, supportive paragraph highlighting what the student expressed well and identifying where phrasing, structure, or tone can be sharpened.",
  "improved_answer": "The revised version of the student answer. It preserves the student exact points while elevating grammar, academic tone, sentence flow, and clarity.",
  "key_improvements_made": [
    "Specific structural or tonal improvement 1",
    "Specific structural or tonal improvement 2"
  ],
  "suggestions_for_further_improvement": [
    "Actionable tip on how the student can express these same ideas even more effectively next time"
  ],
  "changed_phrases": [
    {
      "original_phrase": "exact phrase from student draft",
      "improved_phrase": "replacement phrase in improved answer",
      "reason": "Why this edit improves clarity or tone."
    }
  ]
}"""

def build_improver_prompt(answer: str, subject_or_topic: Optional[str] = None) -> str:
    """Build complete 5-part prompt for the Answer Improver."""
    topic_clause = f"Academic topic context: {subject_or_topic.strip()}\n" if subject_or_topic and subject_or_topic.strip() else ""
    return f"""Role: {IMPROVER_ROLE}

Task: {IMPROVER_TASK}

Context:
=== STUDENT INPUT START ===
{topic_clause}{answer}
=== STUDENT INPUT END ===

Instructions:
{IMPROVER_INSTRUCTIONS}

Output Format:
{IMPROVER_OUTPUT_FORMAT}

Return raw JSON only."""


# ---------------------------------------------------------
# 4. Concept Explainer Prompt Template
# ---------------------------------------------------------

EXPLAINER_ROLE = "You are a gifted educator who explains academic concepts with exceptional clarity across different learning depths."

EXPLAINER_INSTRUCTIONS = """1. Work strictly with the concept and subject specified in Context. Do not introduce fictional facts or pseudo-scientific claims.
2. Tailor explanation depth strictly to the requested level:
   - Beginner: Relatable everyday analogies, simple language, straightforward steps, accessible practical example.
   - Intermediate: Standard college-level explanation, formal definitions, mechanism breakdown, balanced technical depth.
   - Advanced: Rigorous theoretical framework, formal mechanisms, boundary conditions, edge cases, and research context.
3. Do not use em dashes anywhere in your output. Use commas, colons, or parentheses.
4. Output strictly raw JSON conforming exactly to the Output Format schema below. Do not wrap in markdown code fences or backticks."""

EXPLAINER_OUTPUT_FORMAT = """{
  "concept": "Concept Name",
  "subject": "Subject Name",
  "level": "beginner | intermediate | advanced",
  "introduction": "A welcoming, intuitive introduction establishing why this concept matters and what core problem it solves.",
  "detailed_explanation": "A thorough, well-structured explanation tailored to the requested depth level.",
  "step_by_step_understanding": [
    {
      "step_number": 1,
      "title": "Phase or Step Name",
      "description": "Clear explanation of this step or phase."
    }
  ],
  "practical_example": "A concrete walkthrough or realistic scenario demonstrating the concept step-by-step.",
  "real_world_applications": [
    "Concrete real-world application 1",
    "Concrete real-world application 2"
  ],
  "quick_revision_points": [
    "High-yield takeaway 1 for fast review",
    "High-yield takeaway 2"
  ]
}"""

def build_explainer_prompt(concept: str, level: str, subject: str = "Other") -> str:
    """Build complete 5-part prompt for the Concept Explainer."""
    task = f"Explain the concept '{concept}' at the '{level}' level in the subject domain '{subject}'."
    return f"""Role: {EXPLAINER_ROLE}

Task: {task}

Context:
=== STUDENT INPUT START ===
Concept: {concept}
Subject: {subject}
Target Level: {level}
=== STUDENT INPUT END ===

Instructions:
{EXPLAINER_INSTRUCTIONS}

Output Format:
{EXPLAINER_OUTPUT_FORMAT}

Return raw JSON only."""
