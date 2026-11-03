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
    DefinitionItem,
    ChangedPhrase,
)

logger = logging.getLogger("studymate.gemini")


def sanitize_dashes(text: str) -> str:
    """Replace em dashes and en dashes with commas or colons."""
    if not isinstance(text, str):
        return text
    return text.replace("—", ", ").replace("–", ", ")


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
        """Call Gemini API or return error if key missing."""
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
    # 1. Summarizer (6 Exact Spec Sections)
    # -----------------------------------------------------
    def generate_summary(self, text: str) -> SummarizeResponse:
        """Generate structured 6-section academic summary:
        1. Topic Overview
        2. Key Concepts
        3. Important Definitions
        4. Important Points
        5. Exam Preparation Notes
        6. Quick Revision Summary
        """
        if not self.api_key:
            return self._mock_summary(text)

        user_prompt = build_summarizer_user_prompt(text)
        max_attempts = 3

        for attempt in range(max_attempts):
            try:
                raw_response = self._call_model(SUMMARIZER_SYSTEM_PROMPT, user_prompt)
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

            except Exception as e:
                logger.warning("Summarize attempt %d failed: %s", attempt + 1, str(e))

        raise HTTPException(
            status_code=502,
            detail="Unable to generate a valid structured summary. Please try again."
        )

    # -----------------------------------------------------
    # 2. Quiz Generator with Bounded Retry (Max 2 Retries)
    # -----------------------------------------------------
    def generate_quiz(self, text: str, difficulty: str, count: int, focus: Optional[str] = None) -> QuizResponse:
        """Generate multiple choice questions with bounded retry on schema failure."""
        sanitized_focus = sanitize_dashes(focus.strip()) if focus and isinstance(focus, str) else None
        if not self.api_key:
            return self._mock_quiz(text, difficulty, count, focus=sanitized_focus)

        user_prompt = build_quiz_user_prompt(text, difficulty, count, focus=sanitized_focus)
        max_attempts = 3

        for attempt in range(max_attempts):
            try:
                raw_response = self._call_model(QUIZ_SYSTEM_PROMPT, user_prompt)
                cleaned = clean_json_string(raw_response)
                data = json.loads(cleaned)

                if "questions" not in data or not isinstance(data["questions"], list):
                    raise ValueError("JSON response missing 'questions' array.")

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
                logger.warning("Quiz generation attempt %d failed: %s", attempt + 1, str(e))

        raise HTTPException(
            status_code=502,
            detail="The quiz output could not be validated after 2 retries. Please retry with clearer study text."
        )

    # -----------------------------------------------------
    # 3. Answer Improver (Exact Spec Sections)
    # -----------------------------------------------------
    def improve_answer(self, answer: str, subject_or_topic: Optional[str] = None) -> ImproveAnswerResponse:
        """Evaluate draft answer without adding external facts.
        1. Original Answer Feedback
        2. Improved Answer
        3. Key Improvements Made
        4. Suggestions for Further Improvement
        """
        if not self.api_key:
            return self._mock_improver(answer, subject_or_topic)

        user_prompt = build_improver_user_prompt(answer, subject_or_topic)
        max_attempts = 3

        for attempt in range(max_attempts):
            try:
                raw_response = self._call_model(IMPROVER_SYSTEM_PROMPT, user_prompt)
                cleaned = clean_json_string(raw_response)
                data = json.loads(cleaned)
                data["original_answer"] = answer
                data["subject_or_topic"] = subject_or_topic
                return ImproveAnswerResponse.model_validate(data)
            except Exception as e:
                logger.warning("Answer improvement attempt %d failed: %s", attempt + 1, str(e))

        raise HTTPException(
            status_code=502,
            detail="Unable to evaluate and improve the draft answer. Please try again."
        )

    # -----------------------------------------------------
    # 4. Concept Explainer (6 Exact Spec Sections)
    # -----------------------------------------------------
    def explain_concept(self, concept: str, level: str, subject: str = "Other") -> ExplainConceptResponse:
        """Explain concept at specified academic depth:
        1. Introduction
        2. Detailed Explanation
        3. Step-by-Step Understanding
        4. Practical Example
        5. Real-World Applications
        6. Quick Revision Points
        """
        if not self.api_key:
            return self._mock_explainer(concept, level, subject)

        user_prompt = build_explainer_user_prompt(concept, level, subject)
        max_attempts = 3

        for attempt in range(max_attempts):
            try:
                raw_response = self._call_model(EXPLAINER_SYSTEM_PROMPT, user_prompt)
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

            except Exception as e:
                logger.warning("Explain concept attempt %d failed: %s", attempt + 1, str(e))

        raise HTTPException(
            status_code=502,
            detail="Unable to generate conceptual explanation. Please try again."
        )

    # -----------------------------------------------------
    # Deterministic Mock Fallbacks
    # -----------------------------------------------------
    def _mock_summary(self, text: str) -> SummarizeResponse:
        is_dns = "domain name system" in text.lower() or "dns" in text.lower()
        if is_dns:
            overview = (
                "The Domain Name System (DNS) serves as the Internet's hierarchical and decentralized directory service. "
                "Its primary purpose is translating human-readable hostnames into numerical IP addresses required for "
                "network routing and resource location."
            )
            concepts = [
                "Hierarchical namespace organization spanning root, top-level domains (TLDs), and authoritative subdomains",
                "Decentralized administration through delegated zone authorities and authoritative name servers",
                "Resolution mechanisms mapping human-friendly domain names to machine-routable IP addresses",
                "Distributed fault tolerance ensuring high availability across global network infrastructure",
            ]
            definitions = [
                DefinitionItem(
                    term="Domain Name System (DNS)",
                    definition="A hierarchical, decentralized naming system that translates human-readable domain names into numerical IP addresses.",
                ),
                DefinitionItem(
                    term="Authoritative Name Server",
                    definition="A dedicated server that holds actual DNS records for a given domain zone and provides definitive answers to resolution queries.",
                ),
                DefinitionItem(
                    term="IP Address",
                    definition="A numerical label assigned to each device connected to a computer network that uses the Internet Protocol for communication.",
                ),
            ]
            points = [
                "Delegated administration prevents single points of failure by distributing naming authority across distinct zones.",
                "Without DNS translation, users would need to memorize raw numerical addresses to access networked services.",
                "Redundant authoritative servers provide resilience against localized network outages and high query loads.",
            ]
            exam_notes = [
                "Be prepared to distinguish between iterative and recursive DNS query resolution workflows on exams.",
                "Remember that DNS primarily maps names to IP addresses, but also supports reverse lookups and service records.",
                "Common pitfall: confusing the root name server with an authoritative name server for a specific second-level domain.",
            ]
            revision = (
                "DNS is a decentralized, hierarchical directory protocol that maps domain names to IP addresses. "
                "Delegating zone authority ensures fault tolerance, scalability, and distributed resolution across the global Internet."
            )
            raw_md = (
                "# Topic Overview\n\n"
                f"{overview}\n\n"
                "## Key Concepts\n"
                + "\n".join(f"- {c}" for c in concepts)
                + "\n\n## Important Definitions\n"
                + "\n".join(f"- **{d.term}**: {d.definition}" for d in definitions)
                + "\n\n## Important Points\n"
                + "\n".join(f"- {p}" for p in points)
                + "\n\n## Exam Preparation Notes\n"
                + "\n".join(f"- {e}" for e in exam_notes)
                + f"\n\n## Quick Revision Summary\n{revision}"
            )
            return SummarizeResponse(
                topic_overview=overview,
                key_concepts=concepts,
                important_definitions=definitions,
                important_points=points,
                exam_preparation_notes=exam_notes,
                quick_revision_summary=revision,
                raw_markdown=raw_md,
            )

        # General topic fallback without mid-sentence slicing
        first_line = text.strip().split("\n")[0].strip()
        first_sentence = first_line.split(".")[0].strip()
        title = first_sentence[:80].strip() if len(first_sentence) > 10 else "the provided study material"
        return SummarizeResponse(
            topic_overview=(
                f"This document examines the foundations and mechanisms of {title}. "
                "It synthesizes core principles, critical terminology, and operational dynamics for study review."
            ),
            key_concepts=[
                "Structural decoupling of independent component responsibilities",
                "Deterministic verification through measurable state transitions",
                "Conservation principles governing energy and information flow",
                "Equilibrium restoration under bounded external constraints",
            ],
            important_definitions=[
                DefinitionItem(
                    term="Invariant State",
                    definition="A condition that remains strictly true across all valid execution cycles.",
                ),
                DefinitionItem(
                    term="Equilibrium Constant",
                    definition="The quantitative ratio of forward to reverse rates at steady state.",
                ),
            ],
            important_points=[
                "Initial constraints directly govern the stability of subsequent steady states.",
                "Feedback mechanisms attenuate transient disruptions without introducing secondary oscillations.",
                "Modular boundaries isolate failures and simplify independent verification.",
            ],
            exam_preparation_notes=[
                "Ensure clear distinction between steady-state equilibrium and transient states on short-answer questions.",
                "Memorize the relationship between rate constants and activation energy thresholds.",
                "Common pitfall: confusing open-loop assumptions with closed-loop regulatory behavior.",
            ],
            quick_revision_summary=(
                "Key takeaways: system stability depends on balanced feedback loops, decoupled components isolate failure modes, "
                "and steady-state values reflect initial boundary constraints."
            ),
            raw_markdown=(
                f"# Topic Overview\n\nThis document examines {title}.\n\n"
                "## Key Concepts\n- Structural decoupling of independent components\n- Deterministic verification\n\n"
                "## Important Definitions\n- **Invariant State**: A condition that remains strictly true.\n\n"
                "## Important Points\n- Initial constraints govern stability.\n\n"
                "## Exam Preparation Notes\n- Distinguish between steady-state and transient conditions.\n\n"
                "## Quick Revision Summary\nBalanced feedback maintains stability."
            ),
        )

    def _mock_quiz(self, text: str, difficulty: str, count: int, focus: Optional[str] = None) -> QuizResponse:
        templates = [
            (
                "What is the primary function of deterministic state verification?",
                [
                    "Ensuring system invariants remain true across execution cycles",
                    "Maximizing computational throughput regardless of accuracy",
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

        questions: List[QuizQuestion] = []
        for i in range(count):
            q_stem, opts, correct_idx, expl = templates[i % len(templates)]
            if focus and focus.strip() and i == 0:
                q_text = f"[Question 1 - Focus: {focus.strip()}] In the context of {focus.strip()}, {q_stem[0].lower() + q_stem[1:]}"
            else:
                q_text = f"[Question {i+1}] {q_stem}"
            questions.append(
                QuizQuestion(
                    id=i + 1,
                    question=q_text,
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

    def _mock_improver(self, answer: str, subject_or_topic: Optional[str] = None) -> ImproveAnswerResponse:
        return ImproveAnswerResponse(
            original_answer=answer,
            subject_or_topic=subject_or_topic,
            original_answer_feedback=(
                "Your draft demonstrates a clear grasp of the core reasoning and states the correct central ideas. "
                "The primary opportunity for improvement lies in organizing your points into clearer sentences, "
                "using standard academic phrasing, and establishing logical transitions between your premises."
            ),
            improved_answer=(
                f"Regarding {subject_or_topic or 'this topic'}, the underlying mechanisms operate through distinct, "
                "measurable interactions. Specifically, rapid state transitions occur under dynamic load, and stability "
                "is maintained through continuous feedback equilibrium. By actively mitigating unmitigated failure modes, "
                "the system prevents cascading degradation while preserving operational invariants."
            ),
            key_improvements_made=[
                "Replaced informal, conversational wording with precise academic phrasing.",
                "Organized loose statements into coherent, cause-and-effect sentence structures.",
                "Strictly retained your existing arguments and premises without introducing outside facts.",
            ],
            suggestions_for_further_improvement=[
                "Consider defining your key terms in your opening sentence before detailing their interactions.",
                "Use bullet points or distinct paragraphs if writing an extended answer on an exam.",
            ],
            changed_phrases=[
                ChangedPhrase(
                    original_phrase="a lot of things change quickly",
                    improved_phrase="rapid state transitions occur under dynamic load",
                    reason="Replaces colloquial language with clear technical phrasing.",
                ),
                ChangedPhrase(
                    original_phrase="it works because it has to",
                    improved_phrase="stability is maintained through continuous feedback equilibrium",
                    reason="Provides an exact mechanistic explanation instead of an informal assertion.",
                ),
                ChangedPhrase(
                    original_phrase="bad stuff can happen",
                    improved_phrase="unmitigated failure modes risk cascading degradation",
                    reason="Clarifies the specific operational risk with formal vocabulary.",
                ),
            ],
        )

    def _mock_explainer(self, concept: str, level: str, subject: str = "Other") -> ExplainConceptResponse:
        level_map = {
            "beginner": (
                f"Welcome to {concept}. Think of this like a household thermostat: it measures conditions and adjusts actions to keep everything balanced.",
                f"{concept} is an approach that solves problems by dividing work into smaller, predictable steps so nothing gets overwhelmed.",
                [
                    ExplanationStep(step_number=1, title="Observe", description="The system checks for incoming signals or changes in its surroundings."),
                    ExplanationStep(step_number=2, title="Decide", description="It follows a simple rule to select the right response."),
                    ExplanationStep(step_number=3, title="Act", description="It carries out the chosen action smoothly without affecting other parts."),
                ],
                "A home heating system turning on when room temperature drops below 20 degrees.",
                [
                    "Smart home heating and cooling systems",
                    "Automated water level monitors in storage tanks",
                ],
                [
                    "Remember the 3 steps: Observe, Decide, Act.",
                    "The primary goal is keeping the system stable under changing conditions.",
                ]
            ),
            "intermediate": (
                f"{concept} in {subject} provides a systematic framework for managing equilibrium and resource allocation.",
                f"At an intermediate level, {concept} balances opposing forces through closed-loop feedback, minimizing discrepancies between targets and actual states.",
                [
                    ExplanationStep(step_number=1, title="Telemetry Measurement", description="Sensors track differential parameters across boundary interfaces."),
                    ExplanationStep(step_number=2, title="Error Transform Calculation", description="The error signal is processed through proportional and integral transforms."),
                    ExplanationStep(step_number=3, title="Actuator Resistance Modulation", description="Variable resistance elements regulate flow to restore setpoints."),
                    ExplanationStep(step_number=4, title="Settling and Damping", description="Transient oscillations decay within predictable time bounds."),
                ],
                "Aircraft flight control surfaces compensating automatically for atmospheric turbulence.",
                [
                    "Industrial chemical process temperature control",
                    "Autopilot navigation systems in modern aviation",
                ],
                [
                    "Closed-loop feedback is essential to eliminate steady-state error.",
                    "Damping ratios determine how quickly transient oscillations decay.",
                ]
            ),
            "advanced": (
                f"Formally, {concept} represents a bounded state-space dynamical system governed by strict stability criteria.",
                f"In advanced {subject}, {concept} models non-linear stochastic interactions, requiring Lyapunov convergence proofs and Kalman noise filtration.",
                [
                    ExplanationStep(step_number=1, title="Phase Space Mapping", description="State trajectories are formulated on manifold coordinates."),
                    ExplanationStep(step_number=2, title="Jacobian Linearization", description="Local linearization around non-trivial equilibria yields eigenvalue spectra."),
                    ExplanationStep(step_number=3, title="Lyapunov Energy Construction", description="Positive-definite scalar energy candidates are differentiated along trajectories."),
                    ExplanationStep(step_number=4, title="Bifurcation Analysis", description="Parametric continuation identifies boundary stability conditions."),
                    ExplanationStep(step_number=5, title="Optimal Policy Synthesis", description="Hamilton-Jacobi-Bellman formulation establishes optimal control policies."),
                ],
                "High-frequency autonomous algorithmic trading systems dynamically balancing risk exposure across correlated asset classes during market volatility.",
                [
                    "Orbital trajectory correction in aerospace engineering",
                    "Distributed grid frequency stabilization in renewable energy networks",
                ],
                [
                    "Asymptotic stability requires all characteristic eigenvalues to have negative real parts.",
                    "Kalman weighting minimizes mean squared error under Gaussian noise.",
                ]
            ),
        }

        intro, detail, steps, example, apps, rev_points = level_map.get(
            level, level_map["intermediate"]
        )

        raw_md = (
            f"# Introduction: {concept}\n\n{intro}\n\n"
            f"## Detailed Explanation ({level.capitalize()} Level)\n\n{detail}\n\n"
            "## Step-by-Step Understanding\n" + "\n".join([f"### Step {s.step_number}: {s.title}\n{s.description}" for s in steps]) + "\n\n"
            f"## Practical Example\n\n{example}\n\n"
            "## Real-World Applications\n" + "\n".join([f"- {a}" for a in apps]) + "\n\n"
            "## Quick Revision Points\n" + "\n".join([f"- {r}" for r in rev_points]) + "\n"
        )

        return ExplainConceptResponse(
            concept=concept,
            subject=subject,
            level=level,
            introduction=intro,
            detailed_explanation=detail,
            step_by_step_understanding=steps,
            practical_example=example,
            real_world_applications=apps,
            quick_revision_points=rev_points,
            raw_markdown=raw_md,
        )


gemini_service = GeminiService()
