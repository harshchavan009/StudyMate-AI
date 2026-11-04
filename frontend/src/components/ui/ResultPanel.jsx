import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { RefreshCw, Copy, Check, Download, Printer, Square, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { cn } from "@/lib/utils";

const TEXT_SIZES = [
  { id: "S", label: "S", className: "text-[15px] leading-relaxed" },
  { id: "M", label: "M", className: "text-[17px] leading-[1.65]" },
  { id: "L", label: "L", className: "text-[19px] leading-[1.7]" },
];

const TOOL_STAGES = {
  summarizer: [
    { label: "Segmenting study notes", desc: "Parsing core concepts and identifying domain mechanisms" },
    { label: "Extracting definitions & key points", desc: "Structuring terminology, rules, and core insights" },
    { label: "Synthesizing exam-prep & revision summary", desc: "Compiling revision takeaways into structured academic sections" },
  ],
  quiz: [
    { label: "Scanning notes for testable propositions", desc: "Identifying key facts and foundational principles" },
    { label: "Formulating distractors & answer keys", desc: "Crafting plausible multiple-choice options" },
    { label: "Calibrating explanations & rationales", desc: "Writing comprehensive explanations for each question" },
  ],
  improver: [
    { label: "Assessing draft precision & structure", desc: "Evaluating academic clarity, grammar, and tone" },
    { label: "Verifying factual retention", desc: "Checking that original facts are preserved without adding new claims" },
    { label: "Generating redline word-level revisions", desc: "Drafting sentence polish and concrete improvement suggestions" },
  ],
  explainer: [
    { label: "Calibrating explanation depth", desc: "Tailoring mechanisms and vocabulary to selected difficulty level" },
    { label: "Deconstructing core mechanisms & analogies", desc: "Building step-by-step conceptual walkthrough" },
    { label: "Synthesizing practical applications", desc: "Compiling real-world examples and high-yield revision points" },
  ],
};

/**
 * ResultPanel: Unified document container across all study tools.
 * Supports:
 * - Empty preview with placeholder headings (B5)
 * - Loading skeleton with Stop button (C4), topic-specific animated stages, and waking up alert if >8s (C5)
 * - Reading comfort text size controls S/M/L (C10)
 * - Result actions: Copy as Markdown with aria-live, Download .md, Print/PDF (C1)
 * - AI attribution footer (B8)
 */
export function ResultPanel({
  toolId = "summarizer",
  status = "empty",
  error = null,
  onRetry = null,
  onStop = null,
  sections = [],
  title = "Document",
  badge = null,
  rawMarkdown = null,
  filename = "studymate-document.md",
  actions = null,
  miniNav = null,
  children,
}) {
  const [copied, setCopied] = useState(false);
  const [textSize, setTextSize] = useState(() => {
    try {
      return localStorage.getItem("studymate_text_size_v1") || "M";
    } catch {
      return "M";
    }
  });

  // Track loading elapsed time for cold start waking message (C5)
  const [loadingSeconds, setLoadingSeconds] = useState(0);

  useEffect(() => {
    if (status !== "loading") {
      setLoadingSeconds(0);
      return;
    }
    const interval = setInterval(() => {
      setLoadingSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [status]);

  const activeStageIdx = loadingSeconds < 3 ? 0 : loadingSeconds < 6 ? 1 : 2;

  const handleTextSizeChange = (sizeId) => {
    setTextSize(sizeId);
    try {
      localStorage.setItem("studymate_text_size_v1", sizeId);
    } catch {}
  };

  const handleCopy = () => {
    if (!rawMarkdown) return;
    navigator.clipboard.writeText(rawMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!rawMarkdown) return;
    const blob = new Blob([rawMarkdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  const activeTextSizeConfig = TEXT_SIZES.find((s) => s.id === textSize) || TEXT_SIZES[1];

  return (
    <div className="space-y-4">
      {/* Error Banner with Retry */}
      {status === "error" && (
        <Alert
          variant="error"
          title="Processing Failed"
          className="border-feedback-error/40 bg-white"
        >
          <div className="space-y-2">
            <p className="text-xs text-ink-secondary leading-relaxed">
              {error || "An unexpected error occurred while processing your request. Please try again."}
            </p>
            {onRetry && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onRetry}
                className="mt-1"
              >
                <RefreshCw className="w-3.5 h-3.5" strokeWidth={1.75} />
                <span>Retry Request</span>
              </Button>
            )}
          </div>
        </Alert>
      )}

      {/* Animated State Transitions: Empty -> Loading -> Success cross-fades over 200ms (G2) */}
      <AnimatePresence mode="wait">
        {/* Empty State: What you will get */}
        {(status === "empty" || status === "initial") && (
          <motion.div
            key="empty-state"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
          >
            <Card className="p-6 space-y-6 bg-surface border border-ink-border rounded-panel">
              <div className="space-y-1 pb-4 border-b border-ink-border">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-lg font-medium text-ink">
                    What you will get
                  </h3>
                  <span className="text-xs text-ink-subtle font-sans tabular-nums">
                    {sections.length} sections
                  </span>
                </div>
                <p className="text-xs text-ink-secondary">
                  Your result will appear here across the following structured sections:
                </p>
              </div>

              <div className="space-y-5">
                {sections.map((section, idx) => (
                  <div key={idx} className="space-y-1.5 opacity-60">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-sans tabular-nums text-ink-subtle font-medium">
                        0{idx + 1}.
                      </span>
                      <h4 className="font-serif text-sm font-medium text-ink">
                        {section.title}
                      </h4>
                    </div>
                    <p className="text-xs text-ink-secondary pl-6 leading-relaxed">
                      {section.description}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

      {/* Loading State: Skeletons, Stop button (C4), and Waking Server Notice (C5) */}
      {status === "loading" && (
        <motion.div
          key="loading-state"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
        >
          <Card
            className="p-6 space-y-6 bg-surface border border-ink-border rounded-panel"
            aria-busy="true"
            aria-live="polite"
          >
          <div className="space-y-3 pb-4 border-b border-ink-border">
            <div className="flex items-center justify-between">
              <span className="text-xs font-sans tracking-[0.04em] text-brand font-medium">
                Generating Document...
              </span>

              {onStop && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={onStop}
                  className="text-xs h-7 px-2.5 gap-1.5 text-feedback-error hover:border-feedback-error"
                  title="Cancel active request"
                >
                  <Square className="w-3 h-3 fill-current" strokeWidth={1} />
                  <span>Stop</span>
                </Button>
              )}
            </div>

            <h3 className="font-serif text-lg font-medium text-ink">
              {title}
            </h3>

            {/* Topic-Specific Processing Pipeline Animation */}
            {TOOL_STAGES[toolId] && (
              <div className="pt-2 space-y-2.5">
                <div className="flex items-center justify-between text-[11px] font-medium text-ink-subtle">
                  <span>Topic Processing Pipeline</span>
                  <span className="font-sans tabular-nums text-brand">
                    Step {Math.min(activeStageIdx + 1, 3)} of 3
                  </span>
                </div>
                {/* Visual animated multi-segment bar */}
                <div className="h-1.5 w-full bg-[#EAE8E3] rounded-full overflow-hidden flex">
                  <motion.div
                    className="h-full bg-brand"
                    initial={{ width: "15%" }}
                    animate={{
                      width: activeStageIdx === 0 ? "35%" : activeStageIdx === 1 ? "70%" : "95%",
                    }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                  />
                </div>
                {/* 3 Step status badges */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  {TOOL_STAGES[toolId].map((stg, sIdx) => {
                    const isDone = sIdx < activeStageIdx;
                    const isCurr = sIdx === activeStageIdx;
                    return (
                      <div
                        key={sIdx}
                        className={cn(
                          "p-2 rounded border text-left text-xs transition-colors duration-200",
                          isCurr && "bg-brand-tint border-brand/40 text-brand font-medium",
                          isDone && "bg-[#F5F9F6] border-feedback-success/30 text-feedback-success",
                          !isDone && !isCurr && "bg-[#FCFBFA] border-ink-border/50 text-ink-subtle"
                        )}
                      >
                        <div className="flex items-center gap-1.5 mb-0.5">
                          {isDone ? (
                            <Check className="w-3 h-3 text-feedback-success shrink-0" strokeWidth={2.5} />
                          ) : isCurr ? (
                            <span className="w-2 h-2 rounded-full bg-brand shrink-0" />
                          ) : (
                            <span className="w-2 h-2 rounded-full bg-[#D3D2CA] shrink-0" />
                          )}
                          <span className="font-semibold text-[11px] truncate">{stg.label}</span>
                        </div>
                        <p className="text-[10px] text-ink-secondary/80 line-clamp-1">{stg.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Cold Start Waking Server Alert if > 8 seconds (C5) */}
            {loadingSeconds >= 8 && (
              <div className="p-3 bg-[#FEF8EC] border border-[#FDE68A] rounded text-xs text-[#8A5A00] flex items-start gap-2 animate-fadeIn">
                <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  The server is waking up. The first request can take up to a minute on cloud hosting.
                </p>
              </div>
            )}
          </div>

          <div className="space-y-6">
            {sections.map((section, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-sans tabular-nums text-brand font-medium">
                    0{idx + 1}.
                  </span>
                  <h4 className="font-serif text-sm font-medium text-ink">
                    {section.title}
                  </h4>
                </div>
                <div className="pl-6 space-y-2">
                  <div className="h-3 bg-[#EAE8E3] rounded w-full animate-pulse-slow" />
                  <div className="h-3 bg-[#F2F0EB] rounded w-5/6 animate-pulse-slow" />
                  {idx % 2 === 0 && (
                    <div className="h-3 bg-[#F2F0EB] rounded w-3/4 animate-pulse-slow" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </motion.div>
    )}

      {/* Success / Document Output State */}
      {(status === "success" || status === "playing" || status === "finished") && (
        <motion.div
          key="success-state"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
          className="space-y-4"
        >
          {/* Top Document Actions Bar with Text Size Control (C1, C10) */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-ink-border print:hidden">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-ink">
                {title}
              </span>
              {badge && (
                <span className="text-[11px] text-ink-secondary bg-[#EAE8E3] px-2 py-0.5 rounded font-medium">
                  {badge}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Reading Comfort Text Size Control S/M/L (C10) */}
              <div className="inline-flex p-0.5 bg-[#EAE8E3] rounded border border-ink-border mr-1" title="Reading text size">
                {TEXT_SIZES.map((sz) => (
                  <button
                    key={sz.id}
                    type="button"
                    onClick={() => handleTextSizeChange(sz.id)}
                    className={cn(
                      "w-6 h-6 flex items-center justify-center text-xs font-sans font-medium rounded transition-colors",
                      textSize === sz.id
                        ? "bg-white text-ink font-semibold shadow-sm"
                        : "text-ink-secondary hover:text-ink"
                    )}
                    aria-label={`Text size ${sz.label}`}
                  >
                    {sz.label}
                  </button>
                ))}
              </div>

              {actions}

              {rawMarkdown && (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleCopy}
                    title="Copy formatted markdown to clipboard"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-feedback-success" strokeWidth={1.75} />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" strokeWidth={1.75} />
                        <span>Copy Markdown</span>
                      </>
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="subtle"
                    size="sm"
                    onClick={handleDownload}
                    title="Download document as Markdown (.md)"
                  >
                    <Download className="w-3.5 h-3.5" strokeWidth={1.75} />
                    <span className="hidden sm:inline">Download</span>
                  </Button>

                  <Button
                    type="button"
                    variant="subtle"
                    size="sm"
                    onClick={handlePrint}
                    title="Print or Save as PDF"
                  >
                    <Printer className="w-3.5 h-3.5" strokeWidth={1.75} />
                    <span className="hidden sm:inline">Print</span>
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Document Content with User's Chosen Text Size (C10) & Section Mini-Nav (C9) */}
          <div className={cn("relative flex gap-6 items-start print:block", activeTextSizeConfig.className)}>
            <div className="flex-1 min-w-0 space-y-6 print:space-y-4">
              {children}
            </div>
            {miniNav && (
              <div className="hidden xl:block w-44 shrink-0">
                {miniNav}
              </div>
            )}
          </div>

          {/* AI Disclosure Line (B8) */}
          <div className="pt-4 border-t border-ink-border text-center sm:text-left print:mt-6">
            <p className="text-xs text-ink-subtle">
              Generated by AI. Check it against your course material.
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>

      {/* Screen Reader Aria-Live Announcement Region (C1) */}
      <div className="sr-only" aria-live="polite" role="status">
        {copied ? "Formatted markdown copied to clipboard." : ""}
        {status === "loading" ? "Document is generating..." : ""}
        {status === "success" ? `${title} generated successfully.` : ""}
      </div>
    </div>
  );
}
