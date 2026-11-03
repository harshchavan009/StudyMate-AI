import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Lightbulb, RefreshCw, RotateCcw, ArrowRight, HelpCircle, FileText } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { FieldCounter } from "@/components/ui/FieldCounter";
import { ToolLayout } from "@/components/layout/ToolLayout";
import { InputPanel } from "@/components/ui/InputPanel";
import { ResultPanel } from "@/components/ui/ResultPanel";
import { SectionMiniNav } from "@/components/layout/SectionMiniNav";
import { AnimatedGroup } from "@/components/motion/AnimatedGroup";
import { NextSteps } from "@/components/tools/NextSteps";
import { SectionHeader } from "@/components/tools/SectionHeader";
import { usePageMeta } from "@/lib/usePageMeta";
import { useOnlineStatus } from "@/lib/useOnlineStatus";
import { api } from "@/lib/api";
import { saveRecentSession, saveDraft, getDraft, clearDraft, getReviewedSections, saveReviewedSections } from "@/lib/storage";
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

const LEVEL_BAR_COUNT = {
  beginner: 1,
  intermediate: 2,
  advanced: 3,
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

const EXPLAINER_MINI_NAV_SECTIONS = [
  { id: "explainer-sec-1", title: "Introduction" },
  { id: "explainer-sec-2", title: "Detailed Explanation" },
  { id: "explainer-sec-3", title: "Step-by-Step" },
  { id: "explainer-sec-4", title: "Practical Example" },
  { id: "explainer-sec-5", title: "Real-World Apps" },
  { id: "explainer-sec-6", title: "Quick Revision" },
];

/**
 * Three-bar depth indicator beside title that transitions with level over 200ms (M6).
 */
function DepthIndicator({ level = "intermediate" }) {
  const activeCount = LEVEL_BAR_COUNT[level] || 2;

  return (
    <div
      className="inline-flex items-end gap-1 h-4 px-1"
      title={`Depth: ${level} (${activeCount} of 3 bars)`}
      aria-label={`Depth level ${level}`}
    >
      {[1, 2, 3].map((bar) => {
        const isActive = bar <= activeCount;
        return (
          <motion.div
            key={bar}
            initial={false}
            animate={{
              backgroundColor: isActive ? "#1F3FBF" : "#D5D8E2",
              height: bar === 1 ? 8 : bar === 2 ? 12 : 16,
            }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="w-1.5 rounded-sm"
          />
        );
      })}
    </div>
  );
}

export function ConceptExplainer() {
  usePageMeta(
    "Concept Explainer",
    "Explore complex theories and mechanisms explained clearly across beginner, intermediate, and advanced levels."
  );

  const location = useLocation();
  const navigate = useNavigate();
  const isOnline = useOnlineStatus();
  const shouldReduceMotion = useReducedMotion();
  const [concept, setConcept] = useState("");
  const [subject, setSubject] = useState("Not specified");
  const [selectedLevel, setSelectedLevel] = useState("intermediate");
  const [status, setStatus] = useState("empty"); // empty | loading | success | error
  const [error, setError] = useState(null);
  const [explainerCache, setExplainerCache] = useState({}); // { [level]: ExplainConceptResponse } (C8)
  const [sessionId, setSessionId] = useState(null);
  const [reviewedSections, setReviewedSections] = useState(new Set());
  const [limits, setLimits] = useState({ min: 3, max: 300 });
  const draftTimerRef = useRef(null);
  const abortControllerRef = useRef(null);
  const resultHeadingRef = useRef(null);

  // Restore session from navigation, prefill, or draft
  useEffect(() => {
    if (location.state?.session) {
      const { id, input, result } = location.state.session;
      if (input) setConcept(input);
      if (id) {
        setSessionId(id);
        setReviewedSections(getReviewedSections(id));
      }
      if (result) {
        const lvl = result.level || "intermediate";
        setSelectedLevel(lvl);
        if (result.subject) setSubject(result.subject);
        setExplainerCache({ [lvl]: result });
        setStatus("success");
      }
    } else if (location.state?.prefill) {
      setConcept(location.state.prefill.slice(0, limits.max || 300));
      if (location.state.subject) setSubject(location.state.subject);
      setStatus("empty");
      setExplainerCache({});
      setSessionId(null);
      setReviewedSections(new Set());
      setTimeout(() => {
        const el = document.getElementById("explainer-concept");
        if (el) el.focus();
      }, 50);
    } else {
      const draft = getDraft("explainer");
      if (draft && typeof draft === "object") {
        if (draft.concept) setConcept(draft.concept);
        if (draft.subject) setSubject(draft.subject);
        if (draft.selectedLevel) setSelectedLevel(draft.selectedLevel);
      }
    }
  }, [location.state]);

  const handleToggleReviewed = (secId) => {
    setReviewedSections((prev) => {
      const next = new Set(prev);
      if (next.has(secId)) next.delete(secId);
      else next.add(secId);
      const effectiveId = sessionId || "explainer_latest";
      saveReviewedSections(effectiveId, next);
      return next;
    });
  };

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

  // Debounced autosave draft (500ms) (C3)
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
  const isValid = isOnline && charCount >= limits.min && charCount <= limits.max;

  // Disabled reason for submit button (A7 / C6)
  let disabledReason = "";
  if (!isOnline) {
    disabledReason = "You are currently offline. Check your network connection.";
  } else if (status === "loading") {
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

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setStatus("loading");
    setError(null);

    const apiSubject = subject === "Not specified" ? "Other" : subject;

    try {
      const data = await api.explainConcept(
        concept.trim(),
        targetLevel,
        apiSubject,
        { signal: controller.signal }
      );
      setExplainerCache((prev) => ({
        ...prev,
        [targetLevel]: data,
      }));
      setSelectedLevel(targetLevel);
      setStatus("success");
      const saved = saveRecentSession({
        tool: "explainer",
        toolName: "Concept Explainer",
        title: `${concept.trim()} (${targetLevel})`,
        input: concept,
        result: data,
      });
      if (saved?.id) {
        setSessionId(saved.id);
        setReviewedSections(new Set());
      }

      // Move focus to result heading after generation (C11)
      setTimeout(() => {
        resultHeadingRef.current?.focus();
      }, 100);
    } catch (err) {
      if (err.name === "AbortError" || err.message === "Request was cancelled.") {
        setStatus(explainerCache[targetLevel] ? "success" : "empty");
      } else {
        setError(err.message || "Failed to generate concept explanation. Please try again.");
        setStatus("error");
      }
    } finally {
      abortControllerRef.current = null;
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };

  const handleGenerate = (e) => {
    if (e) e.preventDefault();
    fetchExplanation(selectedLevel, true);
  };

  // C8: Switching level shows cached result instantly, or an empty panel with a "Generate this level" button.
  // Never silently discard a result.
  const handleLevelChange = (newLevel) => {
    setSelectedLevel(newLevel);
    saveCurrentDraft(concept, subject, newLevel);
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
    setSessionId(null);
    setReviewedSections(new Set());
    setStatus("empty");
    setError(null);
  };

  const currentResult = explainerCache[selectedLevel];
  const hasAnyCached = Object.keys(explainerCache).length > 0;

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
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-ink block">
            Explanation Depth Level
          </span>
          <DepthIndicator level={selectedLevel} />
        </div>
        <SegmentedControl
          options={LEVEL_OPTIONS}
          value={selectedLevel}
          onChange={handleLevelChange}
          ariaLabel="Select depth level"
        />
      </div>

      {/* Action Buttons & Disabled Reason - Sticky above bottom nav on mobile (C12) */}
      <div className="pt-2 border-t border-ink-border space-y-2 sticky bottom-16 sm:static bg-white/95 sm:bg-transparent backdrop-blur-sm sm:backdrop-blur-none -mx-4 px-4 py-2 sm:mx-0 sm:px-0 sm:py-0 z-10">
        <div className="flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="secondary"
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
                <span>{currentResult ? "Regenerate" : "Explain Concept"}</span>
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
            Press <kbd className="px-1.5 py-0.5 bg-[#EAE8E3] border border-ink-border/60 rounded text-[10px] font-mono text-ink shadow-[0_1px_0_rgba(0,0,0,0.06)]">Cmd</kbd> + <kbd className="px-1.5 py-0.5 bg-[#EAE8E3] border border-ink-border/60 rounded text-[10px] font-mono text-ink shadow-[0_1px_0_rgba(0,0,0,0.06)]">Enter</kbd> to submit
          </p>
        )}
      </div>
    </InputPanel>
  );

  const resultPanel = (
    <ResultPanel
      status={status === "loading" ? "loading" : currentResult ? "success" : hasAnyCached ? "empty" : status}
      error={error}
      onRetry={() => fetchExplanation(selectedLevel, true)}
      onStop={handleStop}
      sections={EXPLAINER_SECTIONS}
      title={currentResult ? currentResult.concept : "Concept Explanation"}
      badge={
        currentResult ? (
          <span className="inline-flex items-center gap-1.5">
            <span>{currentResult.level}</span>
            <DepthIndicator level={currentResult.level} />
          </span>
        ) : null
      }
      rawMarkdown={currentResult?.raw_markdown}
      filename="studymate-concept.md"
      miniNav={<SectionMiniNav sections={EXPLAINER_MINI_NAV_SECTIONS} />}
    >
      {/* If current level is not yet generated but other levels are in cache (C8) */}
      {!currentResult && hasAnyCached && (
        <Card className="p-8 text-center space-y-4 border border-dashed border-ink-border rounded-panel bg-[#FCFBFA]">
          <div className="max-w-md mx-auto space-y-2">
            <div className="flex items-center justify-center gap-2">
              <h3 className="font-serif text-lg font-medium text-ink">
                {concept}
              </h3>
              <DepthIndicator level={selectedLevel} />
            </div>
            <p className="text-xs text-ink-secondary leading-relaxed">
              The <strong>{selectedLevel}</strong> depth level is not yet generated for this concept. Click below to generate it while retaining your existing explanations in memory.
            </p>
          </div>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => fetchExplanation(selectedLevel, true)}
            disabled={!isValid || status === "loading"}
          >
            <Lightbulb className="w-3.5 h-3.5" strokeWidth={1.75} />
            <span className="capitalize">Generate {selectedLevel} Level</span>
          </Button>
        </Card>
      )}

      {currentResult && (
        <AnimatedGroup stagger={0.06} className="space-y-6">
          {/* 1. Introduction */}
          <Card id="explainer-sec-1" className="p-6 space-y-3">
            <SectionHeader
              title="1. Introduction"
              sectionId="introduction"
              headingRef={resultHeadingRef}
              isReviewed={reviewedSections.has("introduction")}
              onToggleReviewed={handleToggleReviewed}
              copyContent={`## 1. Introduction\n\n${currentResult.introduction}`}
            />
            <p className="text-xs sm:text-sm text-ink leading-relaxed max-w-prose">
              {currentResult.introduction}
            </p>
          </Card>

          {/* 2. Detailed Explanation */}
          <Card id="explainer-sec-2" className="p-6 space-y-3">
            <SectionHeader
              title="2. Detailed Explanation"
              sectionId="detailed_explanation"
              isReviewed={reviewedSections.has("detailed_explanation")}
              onToggleReviewed={handleToggleReviewed}
              copyContent={`## 2. Detailed Explanation\n\n${currentResult.detailed_explanation}`}
            />
            <p className="text-xs sm:text-sm text-ink-secondary leading-relaxed max-w-prose">
              {currentResult.detailed_explanation}
            </p>
          </Card>

          {/* 3. Step-by-Step Understanding with Connector Line (M6) */}
          <Card id="explainer-sec-3" className="p-6 space-y-4">
            <SectionHeader
              title="3. Step-by-Step Understanding"
              sectionId="step_by_step"
              isReviewed={reviewedSections.has("step_by_step")}
              onToggleReviewed={handleToggleReviewed}
              copyContent={`## 3. Step-by-Step Understanding\n\n${currentResult.step_by_step_understanding?.map((s) => `### Step ${s.step_number}: ${s.title}\n${s.description}`).join("\n\n")}`}
            />
            <p className="text-xs text-ink-secondary">
              Logical progression through the key phases of this concept.
            </p>

            <div className="relative space-y-4 pt-1">
              {/* Vertical connector line drawing down beside steps (M6) */}
              <motion.div
                initial={shouldReduceMotion ? false : { scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="absolute left-[11px] top-3 bottom-3 w-0.5 bg-brand/25 origin-top"
                aria-hidden="true"
              />

              {currentResult.step_by_step_understanding?.map((step, sIdx) => (
                <motion.div
                  key={step.step_number}
                  initial={shouldReduceMotion ? false : { opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    duration: 0.25,
                    delay: shouldReduceMotion ? 0 : 0.08 * sIdx,
                    ease: "easeOut",
                  }}
                  className="relative flex items-start gap-3.5"
                >
                  <span className="w-6 h-6 flex items-center justify-center bg-brand text-white text-[11px] font-semibold rounded-full shrink-0 z-10 shadow-sm mt-0.5">
                    {step.step_number}
                  </span>
                  <div className="flex-1 p-3.5 bg-[#FCFBFA] border border-ink-border rounded-panel space-y-1">
                    <h3 className="text-xs sm:text-sm font-semibold text-ink">
                      {step.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-ink-secondary leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </Card>

          {/* 4. Practical Example */}
          <Card id="explainer-sec-4" className="p-6 space-y-3 bg-[#FCFBFA]">
            <SectionHeader
              title="4. Practical Example"
              sectionId="practical_example"
              isReviewed={reviewedSections.has("practical_example")}
              onToggleReviewed={handleToggleReviewed}
              copyContent={`## 4. Practical Example\n\n${currentResult.practical_example}`}
            />
            <p className="text-xs sm:text-sm text-ink leading-relaxed max-w-prose whitespace-pre-wrap">
              {currentResult.practical_example}
            </p>
          </Card>

          {/* 5. Real-World Applications */}
          <Card id="explainer-sec-5" className="p-6 space-y-3">
            <SectionHeader
              title="5. Real-World Applications"
              sectionId="real_world"
              isReviewed={reviewedSections.has("real_world")}
              onToggleReviewed={handleToggleReviewed}
              copyContent={`## 5. Real-World Applications\n\n${currentResult.real_world_applications?.map((a) => `- ${a}`).join("\n")}`}
            />
            <ul className="space-y-2 text-xs sm:text-sm text-ink leading-relaxed">
              {currentResult.real_world_applications?.map((app, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand mt-2 shrink-0" />
                  <span>{app}</span>
                </li>
              ))}
            </ul>
          </Card>

          {/* 6. Quick Revision Points */}
          <Card id="explainer-sec-6" className="p-6 space-y-3 bg-[#FCFBFA]">
            <SectionHeader
              title="6. Quick Revision Points"
              sectionId="revision_points"
              isReviewed={reviewedSections.has("revision_points")}
              onToggleReviewed={handleToggleReviewed}
              copyContent={`## 6. Quick Revision Points\n\n${currentResult.quick_revision_points?.map((p) => `- ${p}`).join("\n")}`}
            />
            <ul className="space-y-2 text-xs sm:text-sm text-ink-secondary leading-relaxed">
              {currentResult.quick_revision_points?.map((pt, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <ArrowRight className="w-3.5 h-3.5 text-brand mt-0.5 shrink-0" strokeWidth={1.75} />
                  <span>{pt}</span>
                </li>
              ))}
            </ul>
          </Card>

          {/* Next Steps Cross-Tool Study (F4) */}
          <NextSteps
            steps={[
              {
                title: "Quiz me on this",
                description: `Generate practice multiple choice questions testing your grasp of ${currentResult.concept}.`,
                icon: HelpCircle,
                onClick: () => {
                  const quizSource = `${currentResult.concept}: ${currentResult.introduction}\n\n${currentResult.detailed_explanation}\n\n${currentResult.step_by_step_understanding?.map((s) => s.title + ": " + s.description).join("\n")}`;
                  navigate("/quiz", {
                    state: {
                      prefill: quizSource,
                      focus: currentResult.concept,
                    },
                  });
                },
              },
              {
                title: "Summarize this topic",
                description: `Structure the explanation of ${currentResult.concept} into formal definitions and revision notes.`,
                icon: FileText,
                onClick: () => {
                  const sumSource = `${currentResult.concept}\n\n${currentResult.detailed_explanation}\n\n${currentResult.step_by_step_understanding?.map((s) => s.title + ": " + s.description).join("\n")}`;
                  navigate("/summarizer", { state: { prefill: sumSource } });
                },
              },
            ]}
          />
        </AnimatedGroup>
      )}
    </ResultPanel>
  );

  return (
    <ToolLayout
      title="Concept Explainer"
      description="Enter any concept or theory to generate an intuitive, step-by-step academic breakdown for your level."
      inputPanel={inputPanel}
      resultPanel={resultPanel}
    />
  );
}
