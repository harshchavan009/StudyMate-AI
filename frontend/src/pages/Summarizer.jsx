import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { BookOpen, RefreshCw, Copy, Check, RotateCcw, AlertCircle, FileText } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { SkeletonBlock } from "@/components/ui/SkeletonBlock";
import { AnimatedGroup } from "@/components/motion/AnimatedGroup";
import { usePageMeta } from "@/lib/usePageMeta";
import { api } from "@/lib/api";
import { saveRecentSession } from "@/lib/storage";
import { cn } from "@/lib/utils";

const SAMPLE_TEXT = `Operating systems manage computer hardware and execution environments through abstraction layers. The kernel is the central core of an operating system, arbitrating memory allocation, CPU scheduling, file storage, and peripheral input and output while enforcing strict process isolation boundaries. 

In a monolithic kernel architecture, all major operating system services, including the virtual file system, IPC subsystems, and device drivers, execute within a unified kernel address space. This provides high raw communication throughput between subsystems. By contrast, a microkernel architecture minimizes the code running in privileged supervisor mode, moving device drivers and file systems into user-space daemon processes. Communication between isolated servers occurs through synchronous or asynchronous message passing mechanisms. While microkernels enhance fault tolerance and security isolation, message passing introduces context-switch overhead that can impact throughput.`;

export function Summarizer() {
  usePageMeta(
    "Summarizer",
    "Paste lecture notes or textbook chapters to generate a 6-part structured academic summary."
  );

  const location = useLocation();
  const [text, setText] = useState("");
  const [status, setStatus] = useState("initial"); // initial | loading | success | error
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [limits, setLimits] = useState({ min: 20, max: 20000 });

  useEffect(() => {
    if (location.state?.session) {
      const { input, result: savedResult } = location.state.session;
      if (input) setText(input);
      if (savedResult) {
        setResult(savedResult);
        setStatus("success");
      }
    }
  }, [location.state]);

  useEffect(() => {
    api.getConfig()
      .then((cfg) => {
        if (cfg?.summarizer) setLimits(cfg.summarizer);
      })
      .catch(() => {});
  }, []);

  const charCount = text.length;
  const isTooShort = charCount > 0 && charCount < limits.min;
  const isTooLong = charCount > limits.max;
  const isValid = charCount >= limits.min && charCount <= limits.max;

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
    setStatus("initial");
    setResult(null);
  };

  const handleClear = () => {
    setText("");
    setStatus("initial");
    setResult(null);
    setError(null);
  };

  const handleCopy = () => {
    if (!result?.raw_markdown) return;
    navigator.clipboard.writeText(result.raw_markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Title & Short Description */}
      <div className="space-y-1">
        <h1 className="font-serif text-2xl sm:text-3xl font-medium text-ink tracking-tight">
          Summarizer
        </h1>
        <p className="text-xs text-ink-secondary">
          Paste study material to generate a six-section summary: overview, concepts, definitions, key points, exam notes, and revision points.
        </p>
      </div>

      {/* Split view at 1280px (xl:), stacked below */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* Left Column: Input and Controls */}
        <div className="xl:col-span-5 space-y-4">
          <Card className="p-5 sm:p-6 space-y-4">
            <form onSubmit={handleGenerate} className="space-y-3">
              <div className="flex items-center justify-between">
                <label htmlFor="summarizer-input" className="text-xs font-semibold text-ink">
                  Study Notes
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
                rows={12}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Paste your study notes or textbook text here (minimum 20 characters)..."
                disabled={status === "loading"}
                className={cn(
                  "w-full px-3.5 py-2.5 text-xs sm:text-sm text-ink bg-white border rounded-md transition-colors resize-y leading-relaxed",
                  "placeholder:text-ink-subtle/70 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand",
                  isTooShort && "border-feedback-warning",
                  isTooLong && "border-feedback-error",
                  !isTooShort && !isTooLong && "border-ink-border"
                )}
              />

              {/* Inline Character Count & Validation Hint */}
              <div className="flex items-center justify-between text-[11px]">
                <span
                  className={cn(
                    isTooShort
                      ? "text-feedback-warning"
                      : isTooLong
                      ? "text-feedback-error"
                      : "text-ink-subtle"
                  )}
                >
                  {isTooShort
                    ? `Enter at least ${limits.min} characters (${limits.min - charCount} more needed)`
                    : isTooLong
                    ? `Exceeds limit of ${limits.max} characters`
                    : "Press Cmd or Ctrl + Enter to submit"}
                </span>
                <span className="tabular-nums text-ink-subtle">
                  {charCount} / {limits.max}
                </span>
              </div>

              {/* Actions: Clear, Generate, Regenerate */}
              <div className="flex items-center justify-between pt-3 border-t border-ink-border">
                {text.length > 0 && status !== "loading" ? (
                  <Button type="button" variant="subtle" size="sm" onClick={handleClear}>
                    Clear
                  </Button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  {status === "success" && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleGenerate}
                      disabled={!isValid || status === "loading"}
                    >
                      <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.75} />
                      <span>Regenerate</span>
                    </Button>
                  )}
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    disabled={!isValid || status === "loading"}
                  >
                    {status === "loading" ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" strokeWidth={1.75} />
                        <span>Generating...</span>
                      </>
                    ) : (
                      <>
                        <BookOpen className="w-4 h-4" strokeWidth={1.75} />
                        <span>Generate Summary</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </Card>

          {/* Error Alert with Retry */}
          {status === "error" && (
            <Alert variant="error" title="Generation Error" onClose={() => setStatus("initial")}>
              <div className="space-y-2">
                <p>{error}</p>
                <Button variant="secondary" size="sm" onClick={handleGenerate}>
                  <RefreshCw className="w-3.5 h-3.5" strokeWidth={1.75} />
                  <span>Retry</span>
                </Button>
              </div>
            </Alert>
          )}
        </div>

        {/* Right Column: Output Panel */}
        <div className="xl:col-span-7 space-y-4">
          {/* INITIAL EMPTY STATE: Real ordered list of the 6 sections */}
          {status === "initial" && (
            <Card className="p-6 space-y-4 border-dashed">
              <div className="space-y-1">
                <h3 className="font-serif text-base font-medium text-ink">
                  Output Document Preview
                </h3>
                <p className="text-xs text-ink-secondary">
                  When you submit your notes, your summary will appear here in six structured sections:
                </p>
              </div>

              <ol className="space-y-2 text-xs text-ink-secondary border-t border-ink-border pt-4">
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-brand min-w-[1.25rem]">1.</span>
                  <div>
                    <span className="font-medium text-ink">Topic Overview</span>: A concise overview summarizing the main topic and thesis.
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-brand min-w-[1.25rem]">2.</span>
                  <div>
                    <span className="font-medium text-ink">Key Concepts</span>: Foundational ideas and underlying principles.
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-brand min-w-[1.25rem]">3.</span>
                  <div>
                    <span className="font-medium text-ink">Important Definitions</span>: Key academic and technical terms with clear definitions.
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-brand min-w-[1.25rem]">4.</span>
                  <div>
                    <span className="font-medium text-ink">Important Points</span>: High-priority factual details and deductions.
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-brand min-w-[1.25rem]">5.</span>
                  <div>
                    <span className="font-medium text-ink">Exam Preparation Notes</span>: Common exam pitfalls and high-yield focus areas.
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-brand min-w-[1.25rem]">6.</span>
                  <div>
                    <span className="font-medium text-ink">Quick Revision Summary</span>: Rapid review points for study consolidation.
                  </div>
                </li>
              </ol>
            </Card>
          )}

          {/* LOADING STATE: Skeletons mirroring the 6 sections */}
          {status === "loading" && (
            <div className="space-y-4" aria-busy="true" aria-live="polite">
              <div className="text-xs text-ink-secondary flex items-center gap-2 mb-1">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-brand" strokeWidth={1.75} />
                <span>Generating structured summary across six sections...</span>
              </div>
              <SkeletonBlock lines={3} />
              <SkeletonBlock lines={4} />
              <SkeletonBlock lines={3} />
              <SkeletonBlock lines={3} />
              <SkeletonBlock lines={3} />
              <SkeletonBlock lines={2} />
            </div>
          )}

          {/* SUCCESS STATE: 6 Exact Output Sections via AnimatedGroup */}
          {status === "success" && result && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-ink-border">
                <span className="text-xs font-semibold text-ink-subtle uppercase tracking-wider">
                  Summary Output
                </span>
                <Button variant="secondary" size="sm" onClick={handleCopy}>
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-feedback-success" strokeWidth={1.75} />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" strokeWidth={1.75} />
                      <span>Copy Output</span>
                    </>
                  )}
                </Button>
              </div>

              <AnimatedGroup className="space-y-4">
                {/* 1. Topic Overview */}
                <Card key="s-1" className="p-6 space-y-2">
                  <CardHeader>
                    <span className="text-[10px] font-semibold text-brand uppercase tracking-wider">Section 1</span>
                    <CardTitle>Topic Overview</CardTitle>
                  </CardHeader>
                  <p className="text-xs sm:text-sm text-ink leading-relaxed max-w-prose">
                    {result.topic_overview}
                  </p>
                </Card>

                {/* 2. Key Concepts */}
                <Card key="s-2" className="p-6 space-y-2">
                  <CardHeader>
                    <span className="text-[10px] font-semibold text-brand uppercase tracking-wider">Section 2</span>
                    <CardTitle>Key Concepts</CardTitle>
                  </CardHeader>
                  <ul className="space-y-2 text-xs sm:text-sm text-ink-secondary max-w-prose">
                    {result.key_concepts.map((concept, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand mt-2 shrink-0" />
                        <span className="leading-relaxed">{concept}</span>
                      </li>
                    ))}
                  </ul>
                </Card>

                {/* 3. Important Definitions */}
                <Card key="s-3" className="p-6 space-y-2">
                  <CardHeader>
                    <span className="text-[10px] font-semibold text-brand uppercase tracking-wider">Section 3</span>
                    <CardTitle>Important Definitions</CardTitle>
                  </CardHeader>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                    {result.important_definitions.map((item, idx) => (
                      <div key={idx} className="p-3 bg-[#FAF9F6] rounded border border-ink-border">
                        <dt className="font-semibold text-ink text-xs">{item.term}</dt>
                        <dd className="text-ink-secondary mt-1 leading-relaxed text-xs">{item.definition}</dd>
                      </div>
                    ))}
                  </dl>
                </Card>

                {/* 4. Important Points */}
                <Card key="s-4" className="p-6 space-y-2">
                  <CardHeader>
                    <span className="text-[10px] font-semibold text-brand uppercase tracking-wider">Section 4</span>
                    <CardTitle>Important Points</CardTitle>
                  </CardHeader>
                  <ul className="space-y-2 text-xs sm:text-sm text-ink-secondary max-w-prose">
                    {result.important_points.map((pt, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-brand font-bold">·</span>
                        <span className="leading-relaxed">{pt}</span>
                      </li>
                    ))}
                  </ul>
                </Card>

                {/* 5. Exam Preparation Notes */}
                <Card key="s-5" className="p-6 space-y-2">
                  <CardHeader>
                    <span className="text-[10px] font-semibold text-brand uppercase tracking-wider">Section 5</span>
                    <CardTitle>Exam Preparation Notes</CardTitle>
                  </CardHeader>
                  <ul className="space-y-2 text-xs sm:text-sm text-ink-secondary max-w-prose">
                    {result.exam_preparation_notes.map((note, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-feedback-warning font-bold">!</span>
                        <span className="leading-relaxed">{note}</span>
                      </li>
                    ))}
                  </ul>
                </Card>

                {/* 6. Quick Revision Summary */}
                <Card key="s-6" className="p-6 space-y-2">
                  <CardHeader>
                    <span className="text-[10px] font-semibold text-brand uppercase tracking-wider">Section 6</span>
                    <CardTitle>Quick Revision Summary</CardTitle>
                  </CardHeader>
                  <p className="text-xs sm:text-sm text-ink leading-relaxed max-w-prose bg-[#FAF9F6] p-4 rounded border border-ink-border">
                    {result.quick_revision_summary}
                  </p>
                </Card>
              </AnimatedGroup>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
