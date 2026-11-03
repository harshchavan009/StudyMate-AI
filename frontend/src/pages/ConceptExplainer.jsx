import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Lightbulb, RefreshCw, RotateCcw, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { FieldCounter } from "@/components/ui/FieldCounter";
import { ToolLayout } from "@/components/layout/ToolLayout";
import { InputPanel } from "@/components/ui/InputPanel";
import { ResultPanel } from "@/components/ui/ResultPanel";
import { TransitionPanel } from "@/components/motion/TransitionPanel";
import { AnimatedGroup } from "@/components/motion/AnimatedGroup";
import { usePageMeta } from "@/lib/usePageMeta";
import { api } from "@/lib/api";
import { saveRecentSession, saveDraft, getDraft, clearDraft } from "@/lib/storage";
import { cn } from "@/lib/utils";

const SUBJECT_OPTIONS = [
  { value: "Not specified", label: "Not specified" },
  { value: "Computer Science", label: "Computer Science" },
  { value: "Physics", label: "Physics" },
  { value: "Chemistry", label: "Chemistry" },
  { value: "Biology", label: "Biology" },
  { value: "Mathematics", label: "Mathematics" },
  { value: "Economics", label: "Economics" },
  { value: "History", label: "History" },
  { value: "Literature", label: "Literature" },
  { value: "Other", label: "Other" },
];

const LEVEL_OPTIONS = [
  { label: "Beginner", value: "beginner" },
  { label: "Intermediate", value: "intermediate" },
  { label: "Advanced", value: "advanced" },
];

const LEVEL_INDEX_MAP = {
  beginner: 0,
  intermediate: 1,
  advanced: 2,
};

const SAMPLE_CONCEPT = "TCP Three-Way Handshake";
const SAMPLE_SUBJECT = "Computer Science";

const EXPLAINER_SECTIONS = [
  { title: "Introduction", description: "Lucid overview defining the fundamental question the concept answers." },
  { title: "Detailed Explanation", description: "The core mechanics, foundational principles, and theoretical framework." },
  { title: "Step-by-Step Understanding", description: "Numbered chronological phases or structural layers showing how the concept works." },
  { title: "Practical Example", description: "A concrete, scenario-based walkthrough illustrating the concept in action." },
  { title: "Real-World Applications", description: "Current industry, scientific, or technological implementations." },
  { title: "Quick Revision Points", description: "High-yield summary bullets for rapid recall before exams." },
];

export function ConceptExplainer() {
  usePageMeta(
    "Concept Explainer",
    "Explore complex theories and mechanisms explained clearly across beginner, intermediate, and advanced levels."
  );

  const location = useLocation();
  const [concept, setConcept] = useState("");
  const [subject, setSubject] = useState("Not specified");
  const [selectedLevel, setSelectedLevel] = useState("intermediate");
  const [status, setStatus] = useState("empty"); // empty | loading | success | error
  const [error, setError] = useState(null);
  const [explainerCache, setExplainerCache] = useState({}); // { [level]: ExplainConceptResponse }
  const [limits, setLimits] = useState({ min: 3, max: 300 });
  const draftTimerRef = useRef(null);

  // Restore session from navigation or draft
  useEffect(() => {
    if (location.state?.session) {
      const { input, result } = location.state.session;
      if (input) setConcept(input);
      if (result) {
        const lvl = result.level || "intermediate";
        setSelectedLevel(lvl);
        if (result.subject) setSubject(result.subject);
        setExplainerCache({ [lvl]: result });
        setStatus("success");
      }
    } else {
      const draft = getDraft("explainer");
      if (draft && typeof draft === "object") {
        if (draft.concept) setConcept(draft.concept);
        if (draft.subject) setSubject(draft.subject);
        if (draft.selectedLevel) setSelectedLevel(draft.selectedLevel);
      }
    }
  }, [location.state]);

  // Load limits from backend /api/config
  useEffect(() => {
    api.getConfig()
      .then((cfg) => {
        if (cfg?.concept_explainer) {
          setLimits({
            min: cfg.concept_explainer.min,
            max: cfg.concept_explainer.max,
          });
        }
      })
      .catch(() => {});
  }, []);

  // Debounced autosave draft (500ms)
  const saveCurrentDraft = (newConcept, newSubject, newLevel) => {
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(() => {
      if (newConcept.trim() || newSubject !== "Not specified") {
        saveDraft("explainer", {
          concept: newConcept,
          subject: newSubject,
          selectedLevel: newLevel,
        });
      } else {
        clearDraft("explainer");
      }
    }, 500);
  };

  const handleConceptChange = (e) => {
    const val = e.target.value.slice(0, limits.max);
    setConcept(val);
    saveCurrentDraft(val, subject, selectedLevel);
  };

  const handleSubjectChange = (e) => {
    const val = e.target.value;
    setSubject(val);
    saveCurrentDraft(concept, val, selectedLevel);
  };

  const charCount = concept.length;
  const isTooShort = charCount > 0 && charCount < limits.min;
  const isTooLong = charCount > limits.max;
  const isValid = charCount >= limits.min && charCount <= limits.max;

  // Disabled reason for submit button (A7)
  let disabledReason = "";
  if (status === "loading") {
    disabledReason = "Synthesizing concept breakdown, please wait...";
  } else if (charCount === 0) {
    disabledReason = `Enter a concept or theory (${limits.min} to ${limits.max} characters).`;
  } else if (isTooShort) {
    disabledReason = `Enter at least ${limits.min} characters (${limits.min - charCount} more needed).`;
  } else if (isTooLong) {
    disabledReason = `Concept exceeds maximum limit of ${limits.max} characters.`;
  }

  const fetchExplanation = async (targetLevel, force = false) => {
    if (!isValid || status === "loading") return;

    if (!force && explainerCache[targetLevel]) {
      setSelectedLevel(targetLevel);
      return;
    }

    setStatus("loading");
    setError(null);

    const apiSubject = subject === "Not specified" ? "Other" : subject;

    try {
      const data = await api.explainConcept(concept.trim(), targetLevel, apiSubject);
      setExplainerCache((prev) => ({
        ...prev,
        [targetLevel]: data,
      }));
      setSelectedLevel(targetLevel);
      setStatus("success");
      saveRecentSession({
        tool: "explainer",
        toolName: "Concept Explainer",
        title: `${concept.trim()} (${targetLevel})`,
        input: concept,
        result: data,
      });
    } catch (err) {
      setError(err.message || "Failed to generate concept explanation. Please try again.");
      setStatus("error");
    }
  };

  const handleGenerate = (e) => {
    if (e) e.preventDefault();
    fetchExplanation(selectedLevel, true);
  };

  const handleLevelChange = (newLevel) => {
    setSelectedLevel(newLevel);
    saveCurrentDraft(concept, subject, newLevel);
    if (status === "success" && isValid) {
      fetchExplanation(newLevel, false);
    }
  };

  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleGenerate();
    }
  };

  const handleUseExample = () => {
    setConcept(SAMPLE_CONCEPT);
    setSubject(SAMPLE_SUBJECT);
    setSelectedLevel("intermediate");
    setExplainerCache({});
    saveDraft("explainer", {
      concept: SAMPLE_CONCEPT,
      subject: SAMPLE_SUBJECT,
      selectedLevel: "intermediate",
    });
    setStatus("empty");
    setError(null);
  };

  const handleClear = () => {
    setConcept("");
    setSubject("Not specified");
    setExplainerCache({});
    clearDraft("explainer");
    setStatus("empty");
    setError(null);
  };

  const currentResult = explainerCache[selectedLevel];

  const inputPanel = (
    <InputPanel onSubmit={handleGenerate}>
      {/* Concept Name Input */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="concept-input" className="text-xs font-semibold text-ink">
            Concept or Theory Name
          </label>
          <button
            type="button"
            onClick={handleUseExample}
            className="text-[11px] text-brand hover:underline font-medium"
          >
            Use an example
          </button>
        </div>

        <input
          id="concept-input"
          type="text"
          value={concept}
          onChange={handleConceptChange}
          onKeyDown={handleKeyDown}
          placeholder="E.g., TCP Three-Way Handshake, Photosynthesis, Opportunity Cost"
          maxLength={limits.max}
          disabled={status === "loading"}
          aria-describedby={!isValid ? "submit-disabled-reason" : undefined}
          className={cn(
            "w-full text-xs sm:text-sm px-3.5 py-2.5 bg-white border rounded truncate focus:outline-none focus:ring-1 transition-colors",
            isTooLong
              ? "border-feedback-error focus:border-feedback-error focus:ring-feedback-error"
              : "border-ink-border focus:border-brand focus:ring-brand",
            status === "loading" && "bg-[#F5F4F0]"
          )}
        />

        <FieldCounter
          count={charCount}
          max={limits.max}
          min={limits.min}
          helperText="3 to 300 characters. Specific topics yield sharper results."
        />
      </div>

      {/* Styled Academic Subject Select (A8) */}
      <Select
        id="concept-subject"
        label="Academic Subject"
        value={subject}
        onChange={handleSubjectChange}
        options={SUBJECT_OPTIONS}
        disabled={status === "loading"}
      />

      {/* Explanation Depth Segmented Control */}
      <div className="space-y-1.5">
        <span className="text-xs font-semibold text-ink block">
          Explanation Depth Level
        </span>
        <SegmentedControl
          options={LEVEL_OPTIONS}
          value={selectedLevel}
          onChange={handleLevelChange}
          ariaLabel="Select depth level"
        />
      </div>

      {/* Action Buttons & Disabled Reason */}
      <div className="pt-2 border-t border-ink-border space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            disabled={status === "loading" || (!concept && subject === "Not specified")}
          >
            <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.75} />
            <span>Clear</span>
          </Button>

          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={!isValid || status === "loading"}
            aria-describedby={!isValid ? "submit-disabled-reason" : undefined}
          >
            {status === "loading" ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" strokeWidth={1.75} />
                <span>Explaining...</span>
              </>
            ) : (
              <>
                <Lightbulb className="w-3.5 h-3.5" strokeWidth={1.75} />
                <span>{status === "success" ? "Regenerate" : "Explain Concept"}</span>
              </>
            )}
          </Button>
        </div>

        {!isValid && disabledReason && (
          <p
            id="submit-disabled-reason"
            className="text-[11px] text-ink-subtle text-right"
          >
            {disabledReason}
          </p>
        )}

        {isValid && (
          <p className="text-[11px] text-ink-subtle text-right">
            Press <kbd className="px-1 py-0.5 bg-[#EAE8E3] rounded text-[10px] font-mono">Cmd</kbd> + <kbd className="px-1 py-0.5 bg-[#EAE8E3] rounded text-[10px] font-mono">Enter</kbd> to submit
          </p>
        )}
      </div>
    </InputPanel>
  );

  const resultPanel = (
    <ResultPanel
      status={status}
      error={error}
      onRetry={() => fetchExplanation(selectedLevel, true)}
      sections={EXPLAINER_SECTIONS}
      title={currentResult ? currentResult.concept : "Concept Explanation"}
      badge={currentResult ? `${currentResult.level} (${currentResult.subject})` : null}
      rawMarkdown={currentResult?.raw_markdown}
      filename="studymate-concept.md"
    >
      {/* Level TransitionPanel crossfade */}
      <TransitionPanel activeIndex={LEVEL_INDEX_MAP[selectedLevel] || 0}>
        {["beginner", "intermediate", "advanced"].map((lvl) => {
          const res = explainerCache[lvl];
          if (!res) return <div key={lvl} />;

          return (
            <AnimatedGroup key={lvl} stagger={0.06} className="space-y-6">
              {/* 1. Introduction */}
              <Card className="p-6 space-y-2">
                <h2 className="font-serif text-lg font-medium text-ink">
                  1. Introduction
                </h2>
                <p className="text-xs sm:text-sm text-ink leading-relaxed max-w-prose">
                  {res.introduction}
                </p>
              </Card>

              {/* 2. Detailed Explanation */}
              <Card className="p-6 space-y-2">
                <h2 className="font-serif text-lg font-medium text-ink">
                  2. Detailed Explanation
                </h2>
                <p className="text-xs sm:text-sm text-ink-secondary leading-relaxed max-w-prose">
                  {res.detailed_explanation}
                </p>
              </Card>

              {/* 3. Step-by-Step Understanding */}
              <Card className="p-6 space-y-4">
                <div className="space-y-1">
                  <h2 className="font-serif text-lg font-medium text-ink">
                    3. Step-by-Step Understanding
                  </h2>
                  <p className="text-xs text-ink-secondary">
                    Logical progression through the key phases of this concept.
                  </p>
                </div>

                <div className="space-y-3">
                  {res.step_by_step_understanding?.map((step) => (
                    <div
                      key={step.step_number}
                      className="p-3.5 bg-[#FCFBFA] border border-ink-border rounded space-y-1"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 flex items-center justify-center bg-brand text-white text-[11px] font-semibold rounded shrink-0">
                          {step.step_number}
                        </span>
                        <h3 className="text-xs sm:text-sm font-semibold text-ink">
                          {step.title}
                        </h3>
                      </div>
                      <p className="text-xs sm:text-sm text-ink-secondary pl-7 leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>

              {/* 4. Practical Example */}
              <Card className="p-6 space-y-2 bg-[#FCFBFA]">
                <h2 className="font-serif text-lg font-medium text-ink">
                  4. Practical Example
                </h2>
                <p className="text-xs sm:text-sm text-ink leading-relaxed max-w-prose whitespace-pre-wrap">
                  {res.practical_example}
                </p>
              </Card>

              {/* 5. Real-World Applications */}
              <Card className="p-6 space-y-3">
                <h2 className="font-serif text-lg font-medium text-ink">
                  5. Real-World Applications
                </h2>
                <ul className="space-y-2 text-xs sm:text-sm text-ink leading-relaxed">
                  {res.real_world_applications?.map((app, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand mt-2 shrink-0" />
                      <span>{app}</span>
                    </li>
                  ))}
                </ul>
              </Card>

              {/* 6. Quick Revision Points */}
              <Card className="p-6 space-y-3 bg-[#FCFBFA]">
                <h2 className="font-serif text-lg font-medium text-ink">
                  6. Quick Revision Points
                </h2>
                <ul className="space-y-2 text-xs sm:text-sm text-ink-secondary leading-relaxed">
                  {res.quick_revision_points?.map((pt, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <ArrowRight className="w-3.5 h-3.5 text-brand mt-0.5 shrink-0" strokeWidth={1.75} />
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </AnimatedGroup>
          );
        })}
      </TransitionPanel>
    </ResultPanel>
  );

  return (
    <ToolLayout
      title="Concept Explainer"
      description="Enter any concept or theory to generate an intuitive, step-by-step academic breakdown calibrated to your level."
      inputPanel={inputPanel}
      resultPanel={resultPanel}
    />
  );
}
