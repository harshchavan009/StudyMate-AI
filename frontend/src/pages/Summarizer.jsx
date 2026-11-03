import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { BookOpen, RefreshCw, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FieldCounter } from "@/components/ui/FieldCounter";
import { ToolLayout } from "@/components/layout/ToolLayout";
import { InputPanel } from "@/components/ui/InputPanel";
import { ResultPanel } from "@/components/ui/ResultPanel";
import { AnimatedGroup } from "@/components/motion/AnimatedGroup";
import { usePageMeta } from "@/lib/usePageMeta";
import { api } from "@/lib/api";
import { saveRecentSession, saveDraft, getDraft, clearDraft } from "@/lib/storage";
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

export function Summarizer() {
  usePageMeta(
    "Summarizer",
    "Paste lecture notes or textbook chapters to generate a 6-part structured academic summary."
  );

  const location = useLocation();
  const [text, setText] = useState("");
  const [status, setStatus] = useState("empty"); // empty | loading | success | error
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [limits, setLimits] = useState({ min: 20, max: 10000 });
  const draftTimerRef = useRef(null);

  // Restore from navigation state or local draft
  useEffect(() => {
    if (location.state?.session) {
      const { input, result: savedResult } = location.state.session;
      if (input) setText(input);
      if (savedResult) {
        setResult(savedResult);
        setStatus("success");
      }
    } else {
      const draft = getDraft("summarizer");
      if (draft && typeof draft === "string") {
        setText(draft);
      }
    }
  }, [location.state]);

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
  const isValid = charCount >= limits.min && charCount <= limits.max;

  // Disabled reason for submit button (A7)
  let disabledReason = "";
  if (status === "loading") {
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

    setStatus("loading");
    setError(null);

    try {
      const data = await api.summarize(text.trim());
      setResult(data);
      setStatus("success");
      saveRecentSession({
        tool: "summarizer",
        toolName: "Summarizer",
        title: text.split("\n")[0].slice(0, 60),
        input: text,
        result: data,
      });
    } catch (err) {
      setError(err.message || "Failed to generate summary. Please try again.");
      setStatus("error");
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
          helperText="20 to 10,000 characters. Input validated live."
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
      onRetry={() => handleGenerate()}
      sections={SUMMARIZER_SECTIONS}
      title="Academic Summary"
      badge="6 sections"
      rawMarkdown={result?.raw_markdown}
      filename="studymate-summary.md"
    >
      {result && (
        <AnimatedGroup stagger={0.06} className="space-y-6">
          {/* 1. Topic Overview */}
          <Card className="p-6 space-y-2">
            <h2 className="font-serif text-lg font-medium text-ink">
              1. Topic Overview
            </h2>
            <p className="text-xs sm:text-sm text-ink leading-relaxed max-w-prose">
              {result.topic_overview}
            </p>
          </Card>

          {/* 2. Key Concepts */}
          <Card className="p-6 space-y-3">
            <h2 className="font-serif text-lg font-medium text-ink">
              2. Key Concepts
            </h2>
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
          <Card className="p-6 space-y-3">
            <h2 className="font-serif text-lg font-medium text-ink">
              3. Important Definitions
            </h2>
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
          <Card className="p-6 space-y-3">
            <h2 className="font-serif text-lg font-medium text-ink">
              4. Important Points
            </h2>
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
          <Card className="p-6 space-y-3 bg-[#FCFBFA]">
            <h2 className="font-serif text-lg font-medium text-ink">
              5. Exam Preparation Notes
            </h2>
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
          <Card className="p-6 space-y-2">
            <h2 className="font-serif text-lg font-medium text-ink">
              6. Quick Revision Summary
            </h2>
            <p className="text-xs sm:text-sm text-ink leading-relaxed max-w-prose">
              {result.quick_revision_summary}
            </p>
          </Card>
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
