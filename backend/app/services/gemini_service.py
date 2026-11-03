"""Gemini API service with structured parsing and bounded retry logic."""

import json
import logging
import re
from typing import Any, Dict, List, Optional
import google.generativeai as genai
from fastapi import HTTPException

from app.config import settings
from app.prompts import (
    SUMMARIZER_SYSTEM_PROMPT,
    build_summarizer_user_prompt,
    QUIZ_SYSTEM_PROMPT,
    build_quiz_user_prompt,
    IMPROVER_SYSTEM_PROMPT,
    build_improver_user_prompt,
    EXPLAINER_SYSTEM_PROMPT,
    build_explainer_user_prompt,
)
from app.schemas import (
    SummarizeResponse,
    QuizResponse,
    QuizQuestion,
    ImproveAnswerResponse,
    ExplainConceptResponse,
    ExplanationStep,
)

logger = logging.getLogger("studymate.gemini")

# Sanitize text by removing em dashes and en dashes
def sanitize_dashes(text: str) -> str:
    if not isinstance(text, str):
        return text
    # Replace em-dashes and en-dashes with comma or colon as appropriate
    text = text.replace("—", ", ").replace("–", ", ")
    return text


def clean_json_string(raw: str) -> str:
    """Extract and sanitize raw JSON string from LLM output."""
    raw = raw.strip()
    # Strip markdown code blocks if present
    if raw.startswith("```json"):
        raw = raw[7:]
    elif raw.startswith("```"):
        raw = raw[3:]
    if raw.endswith("```"):
        raw = raw[:-3]
    raw = raw.strip()

    # Sometimes model includes leading or trailing text around JSON
    json_start = raw.find("{")
    json_end = raw.rfind("}")
    if json_start != -1 and json_end != -1 and json_end > json_start:
        raw = raw[json_start : json_end + 1]

    return sanitize_dashes(raw)


class GeminiService:
    """Client wrapper for Google Gemini models with fallback and retry mechanisms."""

    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        self.model_name = "gemini-1.5-flash"
        if self.api_key:
            genai.configure(api_key=self.api_key)
            self.model = genai.GenerativeModel(self.model_name)
        else:
            self.model = None
            logger.warning("GEMINI_API_KEY is not set. Service running in mock/fallback mode.")

    def _call_model(self, system_instruction: str, user_content: str) -> str:
        """Call Gemini API or return mock if not configured."""
        if not self.model or not self.api_key:
            raise ValueError("GEMINI_API_KEY_UNSET")

        try:
            full_prompt = f"{system_instruction}\n\n{user_content}"
            response = self.model.generate_content(
                full_prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.2,
                    top_p=0.95,
                    response_mime_type="application/json",
                ),
            )
            return response.text or ""
        except Exception as e:
            logger.error("Gemini API invocation error: %s", str(e))
            raise e

    # -----------------------------------------------------
    # 1. Summarizer
    # -----------------------------------------------------
    def generate_summary(self, text: str) -> SummarizeResponse:
        """Generate structured 6-section academic summary."""
        if not self.api_key:
            return self._mock_summary(text)

        user_prompt = build_summarizer_user_prompt(text)
        max_attempts = 3
        last_error = None

        for attempt in range(max_attempts):
            try:
                raw_response = self._call_model(SUMMARIZER_SYSTEM_PROMPT, user_prompt)
                cleaned = clean_json_string(raw_response)
                data = json.loads(cleaned)

                # Format raw markdown for clean reading
                markdown_lines = [
                    f"## Executive Summary\n\n{data.get('executive_summary', '')}\n",
                    "## Key Concepts\n",
                ]
                for concept in data.get("key_concepts", []):
                    markdown_lines.append(f"- {concept}")

                markdown_lines.append("\n## Detailed Structural Breakdown\n")
                for sec in data.get("breakdown_sections", []):
                    markdown_lines.append(f"### {sec.get('title', 'Section')}")
                    for pt in sec.get("points", []):
                        markdown_lines.append(f"- {pt}")
                    markdown_lines.append("")

                markdown_lines.append("## Important Definitions\n")
                for item in data.get("important_definitions", []):
                    markdown_lines.append(f"- **{item.get('term', '')}**: {item.get('definition', '')}")

                markdown_lines.append("\n## Practical Applications\n")
                for app in data.get("practical_applications", []):
                    markdown_lines.append(f"- {app}")

                markdown_lines.append("\n## Review Questions\n")
                for q in data.get("review_questions", []):
                    markdown_lines.append(f"1. {q}")

                data["raw_markdown"] = "\n".join(markdown_lines)
                return SummarizeResponse.model_validate(data)

            except Exception as e:
                last_error = e
                logger.warning("Summarize attempt %d failed: %s", attempt + 1, str(e))

        raise HTTPException(
            status_code=502,
            detail="Unable to generate a valid structured summary after multiple attempts. Please try again."
        )

    # -----------------------------------------------------
    # 2. Quiz Generator with Bounded Retry (Max 2 Retries)
    # -----------------------------------------------------
    def generate_quiz(self, text: str, difficulty: str, count: int) -> QuizResponse:
        """Generate multiple choice questions with bounded retry on schema failure."""
        if not self.api_key:
            return self._mock_quiz(text, difficulty, count)

        user_prompt = build_quiz_user_prompt(text, difficulty, count)
        max_attempts = 3  # initial + max 2 retries
        last_error = None

        for attempt in range(max_attempts):
            try:
                raw_response = self._call_model(QUIZ_SYSTEM_PROMPT, user_prompt)
                cleaned = clean_json_string(raw_response)
                data = json.loads(cleaned)

                # Validate data schema
                if "questions" not in data or not isinstance(data["questions"], list):
                    raise ValueError("JSON response missing 'questions' array.")

                # Ensure questions list is non-empty and has required structure
                parsed_questions = []
                for idx, q in enumerate(data["questions"][:count]):
                    q_id = q.get("id", idx + 1)
                    q_stem = q.get("question", "").strip()
                    options = [str(opt).strip() for opt in q.get("options", [])]
                    if len(options) != 4:
                        raise ValueError(f"Question {q_id} does not have exactly 4 options.")
                    correct_idx = int(q.get("correct_index", 0))
                    if not (0 <= correct_idx <= 3):
                        raise ValueError(f"Question {q_id} has invalid correct_index: {correct_idx}")
                    explanation = q.get("explanation", "").strip()

                    parsed_questions.append(
                        QuizQuestion(
                            id=q_id,
                            question=sanitize_dashes(q_stem),
                            options=[sanitize_dashes(o) for o in options],
                            correct_index=correct_idx,
                            explanation=sanitize_dashes(explanation),
                        )
                    )

                return QuizResponse(
                    difficulty=difficulty,
                    question_count=len(parsed_questions),
                    questions=parsed_questions,
                )

            except Exception as e:
                last_error = e
                logger.warning("Quiz generation attempt %d failed: %s", attempt + 1, str(e))

        raise HTTPException(
            status_code=502,
            detail="The model output could not be validated into a reliable quiz format after 2 retries. Please retry with clearer study text."
        )

    # -----------------------------------------------------
    # 3. Answer Improver
    # -----------------------------------------------------
    def improve_answer(self, question: str, draft_answer: str) -> ImproveAnswerResponse:
        """Evaluate draft answer, provide critique and improved version."""
        if not self.api_key:
            return self._mock_improver(question, draft_answer)

        user_prompt = build_improver_user_prompt(question, draft_answer)
        max_attempts = 3

        for attempt in range(max_attempts):
            try:
                raw_response = self._call_model(IMPROVER_SYSTEM_PROMPT, user_prompt)
                cleaned = clean_json_string(raw_response)
                data = json.loads(cleaned)
                data["original_answer"] = draft_answer
                return ImproveAnswerResponse.model_validate(data)
            except Exception as e:
                logger.warning("Answer improvement attempt %d failed: %s", attempt + 1, str(e))

        raise HTTPException(
            status_code=502,
            detail="Unable to evaluate and improve the draft answer. Please try again."
        )

    # -----------------------------------------------------
    # 4. Concept Explainer
    # -----------------------------------------------------
    def explain_concept(self, concept: str, level: str, context: Optional[str] = None) -> ExplainConceptResponse:
        """Explain concept at specified academic depth."""
        if not self.api_key:
            return self._mock_explainer(concept, level)

        user_prompt = build_explainer_user_prompt(concept, level, context)
        max_attempts = 3

        for attempt in range(max_attempts):
            try:
                raw_response = self._call_model(EXPLAINER_SYSTEM_PROMPT, user_prompt)
                cleaned = clean_json_string(raw_response)
                data = json.loads(cleaned)
                data["concept"] = concept
                data["level"] = level

                # Generate formatted markdown
                markdown_lines = [
                    f"# Understanding {concept} ({level.capitalize()} Level)\n",
                    f"## Intuitive Analogy\n\n{data.get('intuitive_analogy', '')}\n",
                    "## Foundational Principles\n",
                ]
                for p in data.get("foundational_principles", []):
                    markdown_lines.append(f"- {p}")

                markdown_lines.append("\n## Step-by-Step Breakdown\n")
                for step in data.get("step_by_step_breakdown", []):
                    markdown_lines.append(f"### Step {step.get('step_number', '')}: {step.get('title', '')}")
                    markdown_lines.append(f"{step.get('description', '')}\n")

                markdown_lines.append("## Key Terminology\n")
                for term in data.get("key_terms", []):
                    markdown_lines.append(f"- **{term.get('term', '')}**: {term.get('definition', '')}")

                markdown_lines.append(f"\n## Real-World Case Study\n\n{data.get('real_world_case', '')}\n")
                markdown_lines.append(f"## Self-Check Exercise\n\n{data.get('self_check_exercise', '')}\n")

                data["raw_markdown"] = "\n".join(markdown_lines)
                return ExplainConceptResponse.model_validate(data)

            except Exception as e:
                logger.warning("Explain concept attempt %d failed: %s", attempt + 1, str(e))

        raise HTTPException(
            status_code=502,
            detail="Unable to generate conceptual explanation. Please try again."
        )

    # -----------------------------------------------------
    # Deterministic Mock Responses for Testing & Zero-Key Mode
    # -----------------------------------------------------
    def _mock_summary(self, text: str) -> SummarizeResponse:
        title = text.split("\n")[0][:60].strip() or "Academic Study Text"
        return SummarizeResponse(
            executive_summary=(
                f"This document centers on {title}. It establishes core theoretical foundations, "
                "examines primary mechanisms, and outlines empirical applications across contemporary problem domains."
            ),
            key_concepts=[
                "Structural decoupling of independent component responsibilities",
                "Deterministic verification through measurable state transitions",
                "Conservation principles governing energy and information flow",
                "Heuristic optimization under bounded computational constraints",
            ],
            breakdown_sections=[
                {
                    "title": "Theoretical Foundations",
                    "points": [
                        "Primary axioms establish foundational behavioral boundaries.",
                        "Observed phenomena correlate directly with initial condition variables.",
                    ],
                },
                {
                    "title": "Operational Dynamics",
                    "points": [
                        "Sequential state evaluation minimizes execution latency.",
                        "Feedback loops reinforce stabilizing variables during perturbation.",
                    ],
                },
            ],
            important_definitions=[
                {
                    "term": "Invariant State",
                    "definition": "A condition that remains strictly true across all valid execution cycles.",
                },
                {
                    "term": "Equilibrium Constant",
                    "definition": "The quantitative ratio of forward to reverse rates at steady state.",
                },
            ],
            practical_applications=[
                "Fault tolerant distributed system verification in mission critical software",
                "Predictive modeling in high throughput experimental setups",
            ],
            review_questions=[
                "How do initial constraints influence long term equilibrium in this model?",
                "Which mechanism prevents cascading failures during high load conditions?",
                "In what scenario would the primary operational assumption fail?",
            ],
            raw_markdown=(
                f"## Executive Summary\n\nThis document centers on {title}.\n\n"
                "## Key Concepts\n- Structural decoupling of independent component responsibilities\n"
                "- Deterministic verification through measurable state transitions\n\n"
                "## Detailed Structural Breakdown\n### Theoretical Foundations\n- Primary axioms establish boundaries.\n\n"
                "## Important Definitions\n- **Invariant State**: A condition that remains strictly true.\n\n"
                "## Practical Applications\n- Fault tolerant distributed system verification\n\n"
                "## Review Questions\n1. How do initial constraints influence equilibrium?"
            ),
        )

    def _mock_quiz(self, text: str, difficulty: str, count: int) -> QuizResponse:
        questions: List[QuizQuestion] = []
        templates = [
            (
                "What is the primary function of deterministic state verification?",
                [
                    "Ensuring system invariants remain true across execution cycles",
                    "Maximizing raw computational throughput at any cost",
                    "Eliminating the need for input parameter boundaries",
                    "Randomizing process scheduling across virtual threads",
                ],
                0,
                "Option A is correct because deterministic verification explicitly checks that pre-established invariants hold across all transitions.",
            ),
            (
                "Which condition most directly threatens system equilibrium?",
                [
                    "Gradual, controlled parameter scaling",
                    "Unbounded positive feedback loops without dampening mechanisms",
                    "Uniform distribution of operational workloads",
                    "Periodic reset of non-essential transient caches",
                ],
                1,
                "Option B is correct because unchecked positive feedback amplifies small perturbations, driving systems away from stable equilibrium.",
            ),
            (
                "How does decoupling component responsibilities improve maintainability?",
                [
                    "It doubles runtime memory allocation requirements",
                    "It forces all modules to share a single global memory space",
                    "It isolates failure domains and simplifies independent unit verification",
                    "It bypasses the requirement for formal interface specifications",
                ],
                2,
                "Option C is correct because modular decoupling ensures bugs or faults in one module do not silently corrupt adjacent components.",
            ),
            (
                "In this domain, what distinguishes an axiom from a hypothesis?",
                [
                    "Axioms require empirical validation, while hypotheses are assumed true",
                    "Axioms are established starting premises, whereas hypotheses are testable predictions",
                    "Axioms only apply to mathematical simulations, not physical systems",
                    "Both terms represent identical epistemic standards in practice",
                ],
                1,
                "Option B is correct: axioms serve as foundational premises accepted without proof within a formal framework, while hypotheses require testing.",
            ),
            (
                "What is the most effective safeguard against cascading failures in distributed nodes?",
                [
                    "Immediate synchronized restart of the entire network cluster",
                    "Exponential backoff combined with isolated circuit breakers",
                    "Increasing request timeout limits to infinity",
                    "Disabling diagnostic telemetry during peak incident load",
                ],
                1,
                "Option B is correct because circuit breakers trip quickly when downstream services fail, preventing callers from exhausting thread pools.",
            ),
        ]

        for i in range(count):
            q_idx = i % len(templates)
            q_stem, opts, correct_idx, expl = templates[q_idx]
            questions.append(
                QuizQuestion(
                    id=i + 1,
                    question=f"[Question {i+1}] {q_stem}",
                    options=opts,
                    correct_index=correct_idx,
                    explanation=expl,
                )
            )

        return QuizResponse(
            difficulty=difficulty,
            question_count=len(questions),
            questions=questions,
        )

    def _mock_improver(self, question: str, draft_answer: str) -> ImproveAnswerResponse:
        return ImproveAnswerResponse(
            original_answer=draft_answer,
            improved_answer=(
                f"In response to the question regarding {question[:50].strip()}, the draft argues validly "
                "but requires higher precision. Specifically, the revised formulation explicitly categorizes "
                "the underlying causal mechanisms, replaces colloquial phrasing with standard academic terminology, "
                "and articulates both the immediate effects and structural implications with verifiable clarity."
            ),
            changed_phrases=[
                {
                    "original_phrase": "a lot of things change quickly",
                    "improved_phrase": "rapid state transitions occur under dynamic load",
                    "reason": "Replaces vague colloquial language with precise technical terminology.",
                },
                {
                    "original_phrase": "it works because it has to",
                    "improved_phrase": "stability is enforced through continuous feedback equilibrium",
                    "reason": "Substitutes an unsubstantiated assertion with a defined mechanistic explanation.",
                },
                {
                    "original_phrase": "bad stuff can happen",
                    "improved_phrase": "unmitigated failure modes risk cascading degradation",
                    "reason": "Clarifies the nature and severity of potential operational vulnerabilities.",
                },
            ],
            strengths=[
                "Correctly identifies the central topic and primary objective of the prompt.",
                "Demonstrates intuitive grasp of the core relationship between variables.",
            ],
            weaknesses=[
                "Over-relies on conversational terminology where formal academic terms are expected.",
                "Omits secondary consequences and fails to state explicit boundary conditions.",
            ],
            missing_key_points=[
                "Clear citation of the governing theoretical principle or formula.",
                "Discussion of edge conditions under which the proposed model breaks down.",
            ],
            estimated_score_before=5,
            estimated_score_after=9,
            summary_of_changes=(
                "Elevated vocabulary to formal academic standards, established rigorous causal links, "
                "and provided structured paragraph separation for improved exam evaluation."
            ),
        )

    def _mock_explainer(self, concept: str, level: str) -> ExplainConceptResponse:
        level_map = {
            "beginner": (
                "Think of this concept like an orchestra conductor who ensures every musician plays their instrument "
                "at the exact right beat, preventing chaotic noise.",
                [
                    "Every part has a specific responsibility.",
                    "Communication happens through simple, clear signals.",
                    "The system stays balanced by adjusting when tempo changes.",
                ],
                [
                    ExplanationStep(step_number=1, title="Receiving the Signal", description="The system monitors its environment for any incoming change or stimulus."),
                    ExplanationStep(step_number=2, title="Evaluating the Rule", description="It checks its simple internal instructions to see what response is needed."),
                    ExplanationStep(step_number=3, title="Delivering the Output", description="The action is performed cleanly without disturbing adjacent components."),
                ],
                [
                    {"term": "Input", "definition": "Information or energy entering the system from outside."},
                    {"term": "Feedback", "definition": "Information returned to the system telling it how well it is working."},
                ],
                "A home thermostat turning on heat when room temperature drops below a set threshold.",
                "If room temperature suddenly spikes by 10 degrees, what would the thermostat do first?"
            ),
            "intermediate": (
                "Consider this concept as a dual-reservoir hydraulic valve where pressure variations in the primary "
                "chamber dynamically modulate orifice resistance to stabilize downstream flow.",
                [
                    "Dynamic equilibrium between opposing rate constants",
                    "Closed-loop feedback regulation minimizing steady-state error",
                    "Explicit separation of control planes from data execution planes",
                    "Predictable attenuation of external shock frequencies",
                ],
                [
                    ExplanationStep(step_number=1, title="State Observation", description="Continuous telemetry measures instantaneous differential pressure across the boundary."),
                    ExplanationStep(step_number=2, title="Transfer Function Evaluation", description="The error signal is processed through proportional and integral transforms."),
                    ExplanationStep(step_number=3, title="Actuator Modulation", description="Variable resistance elements adjust cross-sectional throughput."),
                    ExplanationStep(step_number=4, title="Settling and Dampening", description="Transient oscillations decay within predetermined settling time bounds."),
                ],
                [
                    {"term": "Steady-State Error", "definition": "The persistent discrepancy between desired setpoint and actual measured output as time approaches infinity."},
                    {"term": "Transfer Function", "definition": "A mathematical representation describing output response relative to input frequency components."},
                    {"term": "Damping Ratio", "definition": "A dimensionless measure describing how rapidly oscillations in a system decay after disturbance."},
                ],
                "Modern aircraft fly-by-wire flight control surfaces compensating for atmospheric turbulence.",
                "Explain why an under-damped system experiences overshoot before reaching steady-state."
            ),
            "advanced": (
                "Formally, this system is modeled as a non-linear stochastic differential equation governed by a Lyapunov "
                "stability criterion with bounded state-space constraints.",
                [
                    "Strict Lyapunov asymptotic stability criteria across all eigenvalues",
                    "Stochastic perturbation mitigation via optimal Kalman filtering",
                    "Information entropy minimization over finite time horizons",
                    "Asymptotic convergence guarantees under non-Gaussian noise distributions",
                    "Decoupled Hamiltonian energy manifolds ensuring phase space preservation",
                ],
                [
                    ExplanationStep(step_number=1, title="Phase Space Formulation", description="System trajectories are mapped onto Riemannian manifold coordinates."),
                    ExplanationStep(step_number=2, title="Jacobian Linearization", description="Local linearization around non-trivial equilibria yields characteristic eigenvalue spectra."),
                    ExplanationStep(step_number=3, title="Lyapunov Function Construction", description="Positive-definite scalar energy candidates are differentiated along system trajectories."),
                    ExplanationStep(step_number=4, title="Bifurcation Boundary Analysis", description="Parametric continuation identifies Hopf and saddle-node boundary conditions."),
                    ExplanationStep(step_number=5, title="Optimal Control Synthesis", description="Hamilton-Jacobi-Bellman formulation establishes globally optimal control policies."),
                ],
                [
                    {"term": "Lyapunov Exponent", "definition": "A quantity characterizing the rate of separation of infinitesimally close trajectories in phase space."},
                    {"term": "Hopf Bifurcation", "definition": "A local bifurcation in which a critical point of a dynamical system loses stability as a pair of complex conjugate eigenvalues crosses the imaginary axis."},
                    {"term": "Kalman Gain", "definition": "The optimal weighting factor balancing prior state estimates against noisy current sensor measurements."},
                ],
                "High-frequency autonomous algorithmic trading infrastructure managing portfolio risk across correlated derivatives under extreme market volatility.",
                "Derive the conditions under which the system matrix loses Hurwitz stability when parameter alpha exceeds the critical threshold."
            ),
        }

        analogy, principles, steps, terms, case_study, exercise = level_map.get(
            level, level_map["intermediate"]
        )

        raw_md = (
            f"# {concept} ({level.capitalize()} Level)\n\n"
            f"## Intuitive Analogy\n{analogy}\n\n"
            "## Foundational Principles\n" + "\n".join([f"- {p}" for p in principles]) + "\n\n"
            "## Step-by-Step Breakdown\n" + "\n".join([f"### Step {s.step_number}: {s.title}\n{s.description}" for s in steps]) + "\n\n"
            "## Key Terminology\n" + "\n".join([f"- **{t['term']}**: {t['definition']}" for t in terms]) + "\n\n"
            f"## Real-World Case Study\n{case_study}\n\n"
            f"## Self-Check Exercise\n{exercise}\n"
        )

        return ExplainConceptResponse(
            concept=concept,
            level=level,
            intuitive_analogy=analogy,
            foundational_principles=principles,
            step_by_step_breakdown=steps,
            key_terms=terms,
            real_world_case=case_study,
            self_check_exercise=exercise,
            raw_markdown=raw_md,
        )


gemini_service = GeminiService()
