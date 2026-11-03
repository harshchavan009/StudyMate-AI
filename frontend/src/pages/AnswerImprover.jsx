import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { PenLine, RefreshCw, RotateCcw, Columns, FileText, GitCompare, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FieldCounter } from "@/components/ui/FieldCounter";
import { ToolLayout } from "@/components/layout/ToolLayout";
import { InputPanel } from "@/components/ui/InputPanel";
import { ResultPanel } from "@/components/ui/ResultPanel";
import { DiffHighlighter } from "@/components/tools/DiffHighlighter";
import { AnimatedGroup } from "@/components/motion/AnimatedGroup";
import { usePageMeta } from "@/lib/usePageMeta";
import { useOnlineStatus } from "@/lib/useOnlineStatus";
import { api } from "@/lib/api";
import { saveRecentSession, saveDraft, getDraft, clearDraft } from "@/lib/storage";
import { cn } from "@/lib/utils";

const SAMPLE_ANSWER = `Mitochondria are known as the powerhouse of the cell because they make ATP which the cell needs for energy. They have two membranes, an inner one and an outer one. The inner membrane has folds called cristae that give more surface area. Inside is the matrix where the Krebs cycle happens. During cellular respiration, glucose is broken down to produce ATP through oxidative phosphorylation across the inner mitochondrial membrane.`;
const SAMPLE_TOPIC = "Cell Biology: Cellular Respiration";

const IMPROVER_SECTIONS = [
  { title: "Original Answer Feedback", description: "Assessment of clarity, structure, and academic precision." },
  { title: "Improved Answer", description: "Polished revision retaining your original facts with elevated vocabulary." },
  { title: "Key Improvements Made", description: "Concrete explanations of phrasing substitutions and structural enhancements." },
  { title: "Suggestions for Further Improvement", description: "Actionable recommendations for deepening your understanding and exam readiness." },
];

export function AnswerImprover() {
  usePageMeta(
    "Answer Improver",
    "Paste your draft answer to receive feedback, phrase-level polish, and structural improvements without changing your facts."
  );

  const location = useLocation();
  const isOnline = useOnlineStatus();
  const [answer, setAnswer] = useState("");
  const [subjectOrTopic, setSubjectOrTopic] = useState("");
  const [viewMode, setViewMode] = useState("redline"); // "redline" | "clean" | "side-by-side" (M5)
  const [status, setStatus] = useState("empty"); // empty | loading | success | error
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [limits, setLimits] = useState({ min: 10, max: 5000, subject_max: 200 });
  const draftTimerRef = useRef(null);
  const abortControllerRef = useRef(null);
  const resultHeadingRef = useRef(null);

  // Restore session from navigation or draft
  useEffect(() => {
    if (location.state?.session) {
      const { input, result: savedResult } = location.state.session;
      if (input) setAnswer(input);
      if (savedResult) {
        setResult(savedResult);
        if (savedResult.subject_or_topic) setSubjectOrTopic(savedResult.subject_or_topic);
        setStatus("success");
      }
    } else {
      const draft = getDraft("improver");
      if (draft && typeof draft === "object") {
        if (draft.answer) setAnswer(draft.answer);
        if (draft.subjectOrTopic) setSubjectOrTopic(draft.subjectOrTopic);
      }
    }
  }, [location.state]);

  // Load limits from backend /api/config
  useEffect(() => {
    api.getConfig()
      .then((cfg) => {
        if (cfg?.answer_improver) {
          setLimits({
            min: cfg.answer_improver.min,
            max: cfg.answer_improver.max,
            subject_max: cfg.answer_improver.subject_max || 200,
          });
        }
      })
      .catch(() => {});
  }, []);

  // Debounced autosave draft (500ms) (C3)
  const saveCurrentDraft = (newAnswer, newTopic) => {
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(() => {
      if (newAnswer.trim() || newTopic.trim()) {
        saveDraft("improver", { answer: newAnswer, subjectOrTopic: newTopic });
      } else {
        clearDraft("improver");
      }
    }, 500);
  };

  const handleAnswerChange = (e) => {
    const val = e.target.value;
    setAnswer(val);
    saveCurrentDraft(val, subjectOrTopic);
  };

  const handleSubjectChange = (e) => {
    const val = e.target.value.slice(0, limits.subject_max);
    setSubjectOrTopic(val);
    saveCurrentDraft(answer, val);
  };

  const charCount = answer.length;
  const isTooShort = charCount > 0 && charCount < limits.min;
  const isTooLong = charCount > limits.max;
  const isValid = isOnline && charCount >= limits.min && charCount <= limits.max;

  // Disabled reason for submit button (A7 / C6)
  let disabledReason = "";
  if (!isOnline) {
    disabledReason = "You are currently offline. Check your network connection.";
  } else if (status === "loading") {
    disabledReason = "Analyzing draft answer, please wait...";
  } else if (charCount === 0) {
    disabledReason = `Paste your draft answer (${limits.min} to ${limits.max.toLocaleString()} characters).`;
  } else if (isTooShort) {
    disabledReason = `Enter at least ${limits.min} characters (${limits.min - charCount} more needed).`;
  } else if (isTooLong) {
    disabledReason = `Answer exceeds maximum limit by ${(charCount - limits.max).toLocaleString()} characters.`;
  }

  const handleGenerate = async (e) => {
    if (e) e.preventDefault();
    if (!isValid || status === "loading") return;

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setStatus("loading");
    setError(null);

    try {
      const data = await api.improveAnswer(
        answer.trim(),
        subjectOrTopic.trim() ? subjectOrTopic.trim() : null,
        { signal: controller.signal }
      );
      setResult(data);
      setStatus("success");
      saveRecentSession({
        tool: "improver",
        toolName: "Answer Improver",
        title: subjectOrTopic.trim() || answer.slice(0, 50),
        input: answer,
        result: data,
      });

      // Move focus to result heading after generation (C11)
      setTimeout(() => {
        resultHeadingRef.current?.focus();
      }, 100);
    } catch (err) {
      if (err.name === "AbortError" || err.message === "Request was cancelled.") {
        setStatus(result ? "success" : "empty");
      } else {
        setError(err.message || "Failed to analyze and improve answer. Please try again.");
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

  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleGenerate();
    }
  };

  const handleUseExample = () => {
    setAnswer(SAMPLE_ANSWER);
    setSubjectOrTopic(SAMPLE_TOPIC);
    saveDraft("improver", { answer: SAMPLE_ANSWER, subjectOrTopic: SAMPLE_TOPIC });
    setStatus("empty");
    setResult(null);
  };

  const handleClear = () => {
    setAnswer("");
    setSubjectOrTopic("");
    clearDraft("improver");
    setStatus("empty");
    setResult(null);
    setError(null);
  };

  const rawMarkdown = result
    ? `# Answer Improvement Analysis\n\n` +
      (result.subject_or_topic ? `**Topic:** ${result.subject_or_topic}\n\n` : "") +
      `## 1. Original Answer Feedback\n${result.original_answer_feedback}\n\n` +
      `## 2. Improved Answer\n${result.improved_answer}\n\n` +
      `## 3. Key Improvements Made\n` +
      result.key_improvements_made.map((item) => `- ${item}`).join("\n") +
      `\n\n## 4. Suggestions for Further Improvement\n` +
      result.suggestions_for_further_improvement.map((item) => `- ${item}`).join("\n")
    : null;

  const inputPanel = (
    <InputPanel onSubmit={handleGenerate}>
      {/* Optional Subject Context */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="improver-subject" className="text-xs font-semibold text-ink">
            Subject or Topic <span className="text-ink-subtle font-normal">(optional)</span>
          </label>
          <span className="text-[11px] text-ink-subtle tabular-nums font-sans">
            {subjectOrTopic.length} / {limits.subject_max}
          </span>
        </div>
        <input
          id="improver-subject"
          type="text"
          value={subjectOrTopic}
          onChange={handleSubjectChange}
          placeholder="E.g., Cell Biology, Macroeconomics, Modern History"
          maxLength={limits.subject_max}
          disabled={status === "loading"}
          className="w-full text-xs px-3 py-2 bg-white border border-ink-border rounded focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand disabled:bg-[#F5F4F0] truncate transition-colors"
        />
      </div>

      {/* Student Draft Answer */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="improver-answer" className="text-xs font-semibold text-ink">
            Your Draft Answer
          </label>
          <button
            type="button"
            onClick={handleUseExample}
            className="text-[11px] text-brand hover:underline font-medium"
          >
            Use an example
          </button>
        </div>

        <textarea
          id="improver-answer"
          value={answer}
          onChange={handleAnswerChange}
          onKeyDown={handleKeyDown}
          placeholder="Paste your draft answer here (minimum 10 characters)..."
          rows={9}
          disabled={status === "loading"}
          aria-describedby={!isValid ? "submit-disabled-reason" : undefined}
          className={cn(
            "w-full text-xs sm:text-sm font-sans px-3.5 py-2.5 bg-white border rounded resize-y focus:outline-none focus:ring-1 transition-colors leading-relaxed",
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
          helperText="10 to 5,000 characters. Factual arguments strictly retained."
        />
      </div>

      {/* Action Buttons & Disabled Reason - Sticky above bottom nav on mobile (C12) */}
      <div className="pt-2 border-t border-ink-border space-y-2 sticky bottom-16 sm:static bg-white/95 sm:bg-transparent backdrop-blur-sm sm:backdrop-blur-none -mx-4 px-4 py-2 sm:mx-0 sm:px-0 sm:py-0 z-10">
        <div className="flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="subtle"
            size="sm"
            onClick={handleClear}
            disabled={status === "loading" || (!answer && !subjectOrTopic)}
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
                <span>Improving...</span>
              </>
            ) : (
              <>
                <PenLine className="w-3.5 h-3.5" strokeWidth={1.75} />
                <span>{status === "success" ? "Regenerate" : "Improve Answer"}</span>
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

  // M5: Three views - Redline, Clean, Side by side
  const customActions = (
    <div className="inline-flex p-0.5 bg-[#EAE8E3] rounded border border-ink-border" role="group" aria-label="Diff view options">
      <button
        type="button"
        onClick={() => setViewMode("redline")}
        className={cn(
          "px-2.5 py-1 text-xs rounded transition-colors flex items-center gap-1.5",
          viewMode === "redline"
            ? "bg-white text-ink font-medium shadow-sm"
            : "text-ink-secondary hover:text-ink"
        )}
        title="Show inline redline additions and deletions"
        aria-pressed={viewMode === "redline"}
      >
        <GitCompare className="w-3.5 h-3.5" strokeWidth={1.75} />
        <span className="hidden sm:inline">Redline</span>
      </button>

      <button
        type="button"
        onClick={() => setViewMode("clean")}
        className={cn(
          "px-2.5 py-1 text-xs rounded transition-colors flex items-center gap-1.5",
          viewMode === "clean"
            ? "bg-white text-ink font-medium shadow-sm"
            : "text-ink-secondary hover:text-ink"
        )}
        title="Show clean improved revision"
        aria-pressed={viewMode === "clean"}
      >
        <FileText className="w-3.5 h-3.5" strokeWidth={1.75} />
        <span className="hidden sm:inline">Clean</span>
      </button>

      <button
        type="button"
        onClick={() => setViewMode("side-by-side")}
        className={cn(
          "px-2.5 py-1 text-xs rounded transition-colors flex items-center gap-1.5",
          viewMode === "side-by-side"
            ? "bg-white text-ink font-medium shadow-sm"
            : "text-ink-secondary hover:text-ink"
        )}
        title="Side by side comparison"
        aria-pressed={viewMode === "side-by-side"}
      >
        <Columns className="w-3.5 h-3.5" strokeWidth={1.75} />
        <span className="hidden sm:inline">Side by Side</span>
      </button>
    </div>
  );

  const resultPanel = (
    <ResultPanel
      status={status}
      error={error}
      onRetry={() => handleGenerate()}
      onStop={handleStop}
      sections={IMPROVER_SECTIONS}
      title="Answer Improvement"
      badge={result?.subject_or_topic || null}
      rawMarkdown={rawMarkdown}
      filename="studymate-improved-answer.md"
      actions={status === "success" ? customActions : null}
    >
      {result && (
        <AnimatedGroup stagger={0.06} className="space-y-6">
          {/* 1. Original Answer Feedback */}
          <Card className="p-6 space-y-2">
            <h2
              ref={resultHeadingRef}
              tabIndex={-1}
              className="font-serif text-lg font-medium text-ink focus:outline-none"
            >
              1. Original Answer Feedback
            </h2>
            <p className="text-xs sm:text-sm text-ink-secondary leading-relaxed max-w-prose">
              {result.original_answer_feedback}
            </p>
          </Card>

          {/* 2. Improved Answer Comparison with Diff Views (M5) */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-ink-border">
              <h2 className="font-serif text-lg font-medium text-ink">
                2. Improved Answer
              </h2>
              <span className="text-[11px] font-mono text-ink-subtle uppercase">
                View: {viewMode}
              </span>
            </div>

            <DiffHighlighter
              original={result.original_answer}
              improved={result.improved_answer}
              viewMode={viewMode}
            />
          </Card>

          {/* 3. Key Improvements Made */}
          <Card className="p-6 space-y-4">
            <div className="space-y-1">
              <h2 className="font-serif text-lg font-medium text-ink">
                3. Key Improvements Made
              </h2>
              <p className="text-xs text-ink-secondary">
                Specific structural adjustments and phrasing substitutions.
              </p>
            </div>

            <ul className="space-y-2 text-xs sm:text-sm text-ink leading-relaxed">
              {result.key_improvements_made?.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand mt-2 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            {/* Phrase Substitutions Table */}
            {result.changed_phrases?.length > 0 && (
              <div className="pt-3 border-t border-ink-border space-y-2">
                <span className="text-[11px] font-semibold text-ink uppercase tracking-wider">
                  Phrase Substitutions
                </span>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-ink-border text-ink-subtle">
                        <th className="py-2 pr-3 font-semibold text-[10px] uppercase tracking-wider">Original Phrase</th>
                        <th className="py-2 pr-3 font-semibold text-[10px] uppercase tracking-wider">Improved Substitution</th>
                        <th className="py-2 font-semibold text-[10px] uppercase tracking-wider">Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink-border/50">
                      {result.changed_phrases.map((phrase, idx) => (
                        <tr key={idx} className="hover:bg-black/[0.01]">
                          <td className="py-2.5 pr-3 text-ink-secondary font-mono text-[11px]">
                            {phrase.original_phrase}
                          </td>
                          <td className="py-2.5 pr-3 text-brand font-medium font-mono text-[11px]">
                            <span className="bg-diff-bg px-1.5 py-0.5 rounded border border-diff-border inline-block">
                              {phrase.improved_phrase}
                            </span>
                          </td>
                          <td className="py-2.5 text-ink-secondary text-[11px] leading-relaxed">
                            {phrase.reason}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </Card>

          {/* 4. Suggestions for Further Improvement */}
          <Card className="p-6 space-y-3">
            <h2 className="font-serif text-lg font-medium text-ink">
              4. Suggestions for Further Improvement
            </h2>
            <ul className="space-y-2 text-xs sm:text-sm text-ink-secondary leading-relaxed">
              {result.suggestions_for_further_improvement?.map((sugg, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <ArrowRight className="w-3.5 h-3.5 text-brand mt-0.5 shrink-0" strokeWidth={1.75} />
                  <span>{sugg}</span>
                </li>
              ))}
            </ul>
          </Card>
        </AnimatedGroup>
      )}
    </ResultPanel>
  );

  return (
    <ToolLayout
      title="Answer Improver"
      description="Paste your draft response to get structural feedback, word-level revisions, and suggestions without introducing new facts."
      inputPanel={inputPanel}
      resultPanel={resultPanel}
    />
  );
}
