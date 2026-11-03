import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { BookOpen, RefreshCw, RotateCcw, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
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

const SAMPLE_TEXT = `Operating systems manage computer hardware and execution environments through abstraction layers. The kernel is the central core of an operating system, arbitrating memory allocation, CPU scheduling, file storage, and peripheral input and output while enforcing strict process isolation boundaries. 

In a monolithic kernel architecture, all major operating system services, including the virtual file system, IPC subsystems, and device drivers, execute within a unified kernel address space. This provides high raw communication throughput between subsystems. By contrast, a microkernel architecture minimizes the code running in privileged supervisor mode, moving device drivers and file systems into user-space daemon processes. Communication between isolated servers occurs through synchronous or asynchronous message passing mechanisms. While microkernels enhance fault tolerance and security isolation, message passing introduces context-switch overhead that can impact throughput.`;

const SUMMARIZER_SECTIONS = [
  { title: "Topic Overview", description: "High-level summary of the central domain and primary arguments." },
  { title: "Key Concepts", description: "Fundamental frameworks, principles, and theoretical mechanisms." },
  { title: "Important Definitions", description: "Critical terminology and domain-specific vocabulary defined." },
  { title: "Important Points", description: "Essential factual takeaways, rules, and core insights." },
  { title: "Exam Preparation Notes", description: "Targeted revision focus areas, key distinctions, and exam priorities." },
  { title: "Quick Revision Summary", description: "High-yield synopsis for fast review before an exam or lecture." },
];

const MINI_NAV_SECTIONS = [
  { id: "summary-sec-1", title: "Topic Overview" },
  { id: "summary-sec-2", title: "Key Concepts" },
  { id: "summary-sec-3", title: "Definitions" },
  { id: "summary-sec-4", title: "Important Points" },
  { id: "summary-sec-5", title: "Exam Notes" },
  { id: "summary-sec-6", title: "Quick Revision" },
];

export function Summarizer() {
  usePageMeta(
    "Summarizer",
    "Paste lecture notes or textbook chapters to generate a 6-part structured academic summary."
  );

  const location = useLocation();
  const navigate = useNavigate();
  const isOnline = useOnlineStatus();
  const [text, setText] = useState("");
  const [status, setStatus] = useState("empty"); // empty | loading | success | error
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [reviewedSections, setReviewedSections] = useState(new Set());
  const [limits, setLimits] = useState({ min: 20, max: 10000 });
  const draftTimerRef = useRef(null);
  const abortControllerRef = useRef(null);
  const resultHeadingRef = useRef(null);

  // Restore from navigation state, prefill, or local draft
  useEffect(() => {
    if (location.state?.session) {
      const { id, input, result: savedResult } = location.state.session;
      if (input) setText(input);
      if (id) {
        setSessionId(id);
        setReviewedSections(getReviewedSections(id));
      }
      if (savedResult) {
        setResult(savedResult);
        setStatus("success");
      }
    } else if (location.state?.prefill) {
      setText(location.state.prefill);
      setStatus("empty");
      setResult(null);
      setSessionId(null);
      setReviewedSections(new Set());
      setTimeout(() => {
        const el = document.getElementById("summarizer-input");
        if (el) el.focus();
      }, 50);
    } else {
      const draft = getDraft("summarizer");
      if (draft && typeof draft === "string") {
        setText(draft);
      }
    }
  }, [location.state]);

  const handleToggleReviewed = (secId) => {
    setReviewedSections((prev) => {
      const next = new Set(prev);
      if (next.has(secId)) next.delete(secId);
      else next.add(secId);
      const effectiveId = sessionId || "summarizer_latest";
      saveReviewedSections(effectiveId, next);
      return next;
    });
  };

  // Load limits from backend /api/config
  useEffect(() => {
    api.getConfig()
      .then((cfg) => {
        if (cfg?.summarizer) setLimits(cfg.summarizer);
      })
      .catch(() => {});
  }, []);

  // Autosave draft (debounced 500ms)
  const handleTextChange = (e) => {
    const val = e.target.value;
    setText(val);
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(() => {
      if (val.trim()) {
        saveDraft("summarizer", val);
      } else {
        clearDraft("summarizer");
      }
    }, 500);
  };

  const charCount = text.length;
  const isTooShort = charCount > 0 && charCount < limits.min;
  const isTooLong = charCount > limits.max;
  const isValid = isOnline && charCount >= limits.min && charCount <= limits.max;

  // Disabled reason for submit button (A7 / C6)
  let disabledReason = "";
  if (!isOnline) {
    disabledReason = "You are currently offline. Check your network connection.";
  } else if (status === "loading") {
    disabledReason = "Generating summary, please wait...";
  } else if (charCount === 0) {
    disabledReason = `Enter at least ${limits.min} characters to generate a summary.`;
  } else if (isTooShort) {
    disabledReason = `Enter at least ${limits.min} characters (${limits.min - charCount} more needed).`;
  } else if (isTooLong) {
    disabledReason = `Text exceeds the maximum limit by ${(charCount - limits.max).toLocaleString()} characters.`;
  }

  const handleGenerate = async (e) => {
    if (e) e.preventDefault();
    if (!isValid || status === "loading") return;

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setStatus("loading");
    setError(null);

    try {
      const data = await api.summarize(text.trim(), { signal: controller.signal });
      setResult(data);
      setStatus("success");
      const saved = saveRecentSession({
        tool: "summarizer",
        toolName: "Summarizer",
        title: text.split("\n")[0].slice(0, 60),
        input: text,
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
        setStatus(result ? "success" : "empty");
      } else {
        setError(err.message || "Failed to generate summary. Please try again.");
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
    setText(SAMPLE_TEXT);
    saveDraft("summarizer", SAMPLE_TEXT);
    setStatus("empty");
    setResult(null);
  };

  const handleClear = () => {
    setText("");
    clearDraft("summarizer");
    setStatus("empty");
    setResult(null);
    setSessionId(null);
    setReviewedSections(new Set());
    setError(null);
  };

  const inputPanel = (
    <InputPanel onSubmit={handleGenerate}>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="summarizer-input" className="text-xs font-semibold text-ink">
            Study Notes or Lecture Excerpt
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
          id="summarizer-input"
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder="Paste lecture notes, study guides, or textbook chapters here..."
          rows={11}
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
          helperText="20 to 10,000 characters."
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
            disabled={status === "loading" || !text}
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
                <span>Summarizing...</span>
              </>
            ) : (
              <>
                <BookOpen className="w-3.5 h-3.5" strokeWidth={1.75} />
                <span>{status === "success" ? "Regenerate" : "Generate Summary"}</span>
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
      status={status}
      error={error}
      onRetry={() => handleGenerate()}
      onStop={handleStop}
      sections={SUMMARIZER_SECTIONS}
      title="Academic Summary"
      badge="6 sections"
      rawMarkdown={result?.raw_markdown}
      filename="studymate-summary.md"
      miniNav={<SectionMiniNav sections={MINI_NAV_SECTIONS} />}
    >
      {result && (
        <AnimatedGroup stagger={0.06} className="space-y-6">
          {/* 1. Topic Overview */}
          <Card id="summary-sec-1" className="p-6 space-y-3">
            <SectionHeader
              title="1. Topic Overview"
              sectionId="topic_overview"
              headingRef={resultHeadingRef}
              isReviewed={reviewedSections.has("topic_overview")}
              onToggleReviewed={handleToggleReviewed}
              copyContent={`## 1. Topic Overview\n\n${result.topic_overview}`}
            />
            <p className="text-xs sm:text-sm text-ink leading-relaxed max-w-prose">
              {result.topic_overview}
            </p>
          </Card>

          {/* 2. Key Concepts */}
          <Card id="summary-sec-2" className="p-6 space-y-3">
            <SectionHeader
              title="2. Key Concepts"
              sectionId="key_concepts"
              isReviewed={reviewedSections.has("key_concepts")}
              onToggleReviewed={handleToggleReviewed}
              copyContent={`## 2. Key Concepts\n\n${result.key_concepts?.map((c) => `- ${c}`).join("\n")}`}
            />
            <ul className="space-y-2 text-xs sm:text-sm text-ink leading-relaxed">
              {result.key_concepts?.map((concept, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand mt-2 shrink-0" />
                  <span>{concept}</span>
                </li>
              ))}
            </ul>
          </Card>

          {/* 3. Important Definitions */}
          <Card id="summary-sec-3" className="p-6 space-y-3">
            <SectionHeader
              title="3. Important Definitions"
              sectionId="important_definitions"
              isReviewed={reviewedSections.has("important_definitions")}
              onToggleReviewed={handleToggleReviewed}
              copyContent={`## 3. Important Definitions\n\n${result.important_definitions?.map((d) => `### ${d.term}\n${d.definition}`).join("\n\n")}`}
            />
            <div className="space-y-3">
              {result.important_definitions?.map((item, idx) => (
                <div key={idx} className="p-3.5 bg-[#FCFBFA] border border-ink-border rounded space-y-1">
                  <h3 className="text-xs sm:text-sm font-semibold text-ink">
                    {item.term}
                  </h3>
                  <p className="text-xs text-ink-secondary leading-relaxed">
                    {item.definition}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          {/* 4. Important Points */}
          <Card id="summary-sec-4" className="p-6 space-y-3">
            <SectionHeader
              title="4. Important Points"
              sectionId="important_points"
              isReviewed={reviewedSections.has("important_points")}
              onToggleReviewed={handleToggleReviewed}
              copyContent={`## 4. Important Points\n\n${result.important_points?.map((p) => `- ${p}`).join("\n")}`}
            />
            <ul className="space-y-2 text-xs sm:text-sm text-ink leading-relaxed">
              {result.important_points?.map((point, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand mt-2 shrink-0" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </Card>

          {/* 5. Exam Preparation Notes */}
          <Card id="summary-sec-5" className="p-6 space-y-3 bg-[#FCFBFA]">
            <SectionHeader
              title="5. Exam Preparation Notes"
              sectionId="exam_notes"
              isReviewed={reviewedSections.has("exam_notes")}
              onToggleReviewed={handleToggleReviewed}
              copyContent={`## 5. Exam Preparation Notes\n\n${result.exam_preparation_notes?.map((n) => `- ${n}`).join("\n")}`}
            />
            <ul className="space-y-2 text-xs sm:text-sm text-ink-secondary leading-relaxed">
              {result.exam_preparation_notes?.map((note, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <span className="text-brand font-semibold">→</span>
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </Card>

          {/* 6. Quick Revision Summary */}
          <Card id="summary-sec-6" className="p-6 space-y-3">
            <SectionHeader
              title="6. Quick Revision Summary"
              sectionId="revision_summary"
              isReviewed={reviewedSections.has("revision_summary")}
              onToggleReviewed={handleToggleReviewed}
              copyContent={`## 6. Quick Revision Summary\n\n${result.quick_revision_summary}`}
            />
            <p className="text-xs sm:text-sm text-ink leading-relaxed max-w-prose">
              {result.quick_revision_summary}
            </p>
          </Card>

          {/* Next Steps Cross-Tool Study (F4) */}
          <NextSteps
            steps={[
              {
                title: "Quiz me on this",
                description: "Generate practice multiple choice questions from your summary material.",
                icon: HelpCircle,
                onClick: () => navigate("/quiz", { state: { prefill: text } }),
              },
              {
                title: "Explain a key concept",
                description: result.key_concepts?.[0]
                  ? `Explore "${result.key_concepts[0]}" with step-by-step mechanisms.`
                  : "Explore an underlying concept from this material in depth.",
                icon: BookOpen,
                onClick: () =>
                  navigate("/explainer", {
                    state: {
                      prefill:
                        result.key_concepts?.[0] ||
                        result.important_definitions?.[0]?.term ||
                        "",
                    },
                  }),
              },
            ]}
          />
        </AnimatedGroup>
      )}
    </ResultPanel>
  );

  return (
    <ToolLayout
      title="Summarizer"
      description="Paste study material to generate a six-section summary: overview, concepts, definitions, key points, exam notes, and revision points."
      inputPanel={inputPanel}
      resultPanel={resultPanel}
    />
  );
}
