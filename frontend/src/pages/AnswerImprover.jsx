import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { PenLine, RefreshCw, Copy, Check, RotateCcw, AlertCircle, ArrowRight, Columns, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { SkeletonBlock } from "@/components/ui/SkeletonBlock";
import { DiffHighlighter } from "@/components/tools/DiffHighlighter";
import { AnimatedGroup } from "@/components/motion/AnimatedGroup";
import { usePageMeta } from "@/lib/usePageMeta";
import { api } from "@/lib/api";
import { saveRecentSession } from "@/lib/storage";
import { cn } from "@/lib/utils";

const SAMPLE_ANSWER = `Mitochondria are known as the powerhouse of the cell because they make ATP which the cell needs for energy. They have two membranes, an inner one and an outer one. The inner membrane has folds called cristae that give more surface area. Inside is the matrix where the Krebs cycle happens. During cellular respiration, glucose is broken down to produce ATP through oxidative phosphorylation across the inner mitochondrial membrane.`;
const SAMPLE_TOPIC = "Cell Biology: Cellular Respiration";

export function AnswerImprover() {
  usePageMeta(
    "Answer Improver",
    "Paste your draft answer to receive feedback, phrase-level polish, and structural improvements without changing your facts."
  );

  const location = useLocation();
  const [answer, setAnswer] = useState("");
  const [subjectOrTopic, setSubjectOrTopic] = useState("");
  const [viewMode, setViewMode] = useState("side-by-side"); // "side-by-side" | "stacked"
  const [status, setStatus] = useState("initial"); // initial | loading | success | error
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [limits, setLimits] = useState({ min: 10, max: 5000, subject_max: 200 });

  useEffect(() => {
    if (location.state?.session) {
      const { input, result: savedResult } = location.state.session;
      if (input) setAnswer(input);
      if (savedResult) {
        setResult(savedResult);
        if (savedResult.subject_or_topic) {
          setSubjectOrTopic(savedResult.subject_or_topic);
        }
        setStatus("success");
      }
    }
  }, [location.state]);

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

  const charCount = answer.length;
  const isTooShort = charCount > 0 && charCount < limits.min;
  const isTooLong = charCount > limits.max;
  const isValid = charCount >= limits.min && charCount <= limits.max;

  const handleGenerate = async (e) => {
    if (e) e.preventDefault();
    if (!isValid || status === "loading") return;

    setStatus("loading");
    setError(null);

    try {
      const data = await api.improveAnswer(
        answer.trim(),
        subjectOrTopic.trim() ? subjectOrTopic.trim() : null
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
    } catch (err) {
      setError(err.message || "Failed to analyze and improve answer. Please try again.");
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
    setAnswer(SAMPLE_ANSWER);
    setSubjectOrTopic(SAMPLE_TOPIC);
    setStatus("initial");
    setResult(null);
  };

  const handleClear = () => {
    setAnswer("");
    setSubjectOrTopic("");
    setStatus("initial");
    setResult(null);
    setError(null);
  };

  const handleCopyImproved = () => {
    if (!result?.improved_answer) return;
    navigator.clipboard.writeText(result.improved_answer);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Title & Short Description */}
      <div className="space-y-1">
        <h1 className="font-serif text-2xl sm:text-3xl font-medium text-ink tracking-tight">
          Answer Improver
        </h1>
        <p className="text-xs text-ink-secondary">
          Paste your draft response to get structural feedback, side-by-side wording refinements, and suggestions without introducing new facts.
        </p>
      </div>

      {/* Split view at 1280px (xl:), stacked below */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* Left Column: Input and Controls */}
        <div className="xl:col-span-5 space-y-4">
          <Card className="p-5 sm:p-6 space-y-4">
            <form onSubmit={handleGenerate} className="space-y-4">
              {/* Optional Subject or Topic Context */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="improver-subject" className="text-xs font-semibold text-ink">
                    Subject or Topic <span className="text-ink-subtle font-normal">(optional)</span>
                  </label>
                  <span className="text-[11px] text-ink-subtle font-mono">
                    {subjectOrTopic.length}/{limits.subject_max}
                  </span>
                </div>
                <input
                  id="improver-subject"
                  type="text"
                  value={subjectOrTopic}
                  onChange={(e) => setSubjectOrTopic(e.target.value.slice(0, limits.subject_max))}
                  placeholder="E.g., Cell Biology, Macroeconomics, Modern History"
                  maxLength={limits.subject_max}
                  disabled={status === "loading"}
                  className="w-full text-xs px-3 py-2 bg-white border border-ink-border rounded focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand disabled:bg-[#F5F4F0] transition-colors"
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
                  onChange={(e) => setAnswer(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Paste your draft answer here (minimum 10 characters)..."
                  rows={9}
                  disabled={status === "loading"}
                  className={cn(
                    "w-full text-xs sm:text-sm font-sans px-3.5 py-2.5 bg-white border rounded resize-y focus:outline-none focus:ring-1 transition-colors leading-relaxed",
                    isTooLong
                      ? "border-feedback-error focus:border-feedback-error focus:ring-feedback-error"
                      : "border-ink-border focus:border-brand focus:ring-brand",
                    status === "loading" && "bg-[#F5F4F0]"
                  )}
                />

                {/* Inline Character Counter and Validation Hints */}
                <div className="flex items-center justify-between text-[11px]">
                  <div>
                    {isTooShort && (
                      <span className="text-feedback-error">
                        Minimum {limits.min} characters required ({limits.min - charCount} more needed).
                      </span>
                    )}
                    {isTooLong && (
                      <span className="text-feedback-error">
                        Maximum {limits.max.toLocaleString()} characters exceeded by {(charCount - limits.max).toLocaleString()}.
                      </span>
                    )}
                    {!isTooShort && !isTooLong && (
                      <span className="text-ink-subtle">
                        Preserves your factual arguments while refining tone and structure.
                      </span>
                    )}
                  </div>
                  <span
                    className={cn(
                      "font-mono",
                      isTooLong ? "text-feedback-error font-medium" : "text-ink-subtle"
                    )}
                  >
                    {charCount.toLocaleString()} / {limits.max.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-between gap-3 border-t border-ink-border">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClear}
                  disabled={status === "loading" || (!answer && !subjectOrTopic)}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={!isValid || status === "loading"}
                  >
                    {status === "loading" ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Improving...</span>
                      </>
                    ) : (
                      <>
                        <PenLine className="w-3.5 h-3.5" />
                        <span>{status === "success" ? "Regenerate" : "Improve Answer"}</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <p className="text-[11px] text-ink-subtle text-right">
                Press <kbd className="px-1 py-0.5 bg-[#EAE8E3] rounded text-[10px] font-mono">Cmd</kbd> + <kbd className="px-1 py-0.5 bg-[#EAE8E3] rounded text-[10px] font-mono">Enter</kbd> to submit
              </p>
            </form>
          </Card>
        </div>

        {/* Right Column: Output Panel */}
        <div className="xl:col-span-7 space-y-4">
          {/* Error Banner with Retry */}
          {status === "error" && (
            <Alert variant="error" title="Improvement Failed" onClose={() => setStatus("initial")}>
              <div className="space-y-2">
                <p>{error}</p>
                <Button variant="secondary" size="sm" onClick={() => handleGenerate()} className="mt-1">
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry</span>
                </Button>
              </div>
            </Alert>
          )}

          {/* Empty Initial State: Ordered Section Preview */}
          {status === "initial" && (
            <Card className="p-6 sm:p-8 space-y-5 bg-[#FCFBFA]">
              <div className="space-y-1">
                <h3 className="font-serif text-lg font-medium text-ink">
                  Expected Output Structure
                </h3>
                <p className="text-xs text-ink-secondary">
                  When you submit your draft answer, StudyMate AI provides four structured analysis sections:
                </p>
              </div>

              <ol className="space-y-3 text-xs">
                <li className="flex items-start gap-3 p-3 bg-white border border-ink-border rounded">
                  <span className="w-5 h-5 flex items-center justify-center bg-[#EAE8E3] text-ink font-semibold rounded text-[11px] shrink-0">
                    1
                  </span>
                  <div>
                    <strong className="text-ink block">Original Answer Feedback</strong>
                    <span className="text-ink-secondary text-[11px]">
                      A candid appraisal of clarity, argument structure, and academic precision.
                    </span>
                  </div>
                </li>

                <li className="flex items-start gap-3 p-3 bg-white border border-ink-border rounded">
                  <span className="w-5 h-5 flex items-center justify-center bg-[#EAE8E3] text-ink font-semibold rounded text-[11px] shrink-0">
                    2
                  </span>
                  <div>
                    <strong className="text-ink block">Improved Answer</strong>
                    <span className="text-ink-secondary text-[11px]">
                      A polished revision retaining your original facts with elevated vocabulary and flow.
                    </span>
                  </div>
                </li>

                <li className="flex items-start gap-3 p-3 bg-white border border-ink-border rounded">
                  <span className="w-5 h-5 flex items-center justify-center bg-[#EAE8E3] text-ink font-semibold rounded text-[11px] shrink-0">
                    3
                  </span>
                  <div>
                    <strong className="text-ink block">Key Improvements Made</strong>
                    <span className="text-ink-secondary text-[11px]">
                      Concrete explanations of phrasing substitutions and structural enhancements.
                    </span>
                  </div>
                </li>

                <li className="flex items-start gap-3 p-3 bg-white border border-ink-border rounded">
                  <span className="w-5 h-5 flex items-center justify-center bg-[#EAE8E3] text-ink font-semibold rounded text-[11px] shrink-0">
                    4
                  </span>
                  <div>
                    <strong className="text-ink block">Suggestions for Further Improvement</strong>
                    <span className="text-ink-secondary text-[11px]">
                      Actionable recommendations for deepening your understanding and exam readiness.
                    </span>
                  </div>
                </li>
              </ol>
            </Card>
          )}

          {/* Loading Skeleton mirroring 4 output sections */}
          {status === "loading" && (
            <div className="space-y-4" aria-busy="true" aria-live="polite">
              <SkeletonBlock lines={3} className="p-6" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SkeletonBlock lines={5} className="p-6" />
                <SkeletonBlock lines={5} className="p-6" />
              </div>
              <SkeletonBlock lines={4} className="p-6" />
              <SkeletonBlock lines={3} className="p-6" />
            </div>
          )}

          {/* Success State: Clean Document Layout */}
          {status === "success" && result && (
            <div className="space-y-6">
              {/* Output Actions Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-ink-border">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-ink">
                    Answer Analysis
                  </span>
                  {result.subject_or_topic && (
                    <span className="text-[11px] text-ink-secondary bg-[#EAE8E3] px-2 py-0.5 rounded">
                      {result.subject_or_topic}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <div className="inline-flex p-0.5 bg-[#EAE8E3] rounded border border-ink-border">
                    <button
                      type="button"
                      onClick={() => setViewMode("side-by-side")}
                      className={cn(
                        "px-2.5 py-1 text-xs rounded transition-colors flex items-center gap-1.5",
                        viewMode === "side-by-side"
                          ? "bg-white text-ink font-medium shadow-sm"
                          : "text-ink-secondary hover:text-ink"
                      )}
                      title="Side-by-side comparison"
                    >
                      <Columns className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Side by Side</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("stacked")}
                      className={cn(
                        "px-2.5 py-1 text-xs rounded transition-colors flex items-center gap-1.5",
                        viewMode === "stacked"
                          ? "bg-white text-ink font-medium shadow-sm"
                          : "text-ink-secondary hover:text-ink"
                      )}
                      title="Stacked comparison"
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Stacked</span>
                    </button>
                  </div>

                  <Button variant="secondary" size="sm" onClick={handleCopyImproved}>
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-feedback-success" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Improved</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Staggered Sections Reveal */}
              <AnimatedGroup stagger={0.08} className="space-y-6">
                {/* 1. Original Answer Feedback */}
                <Card className="p-6 space-y-2">
                  <h2 className="font-serif text-lg font-medium text-ink">
                    1. Original Answer Feedback
                  </h2>
                  <p className="text-xs sm:text-sm text-ink-secondary leading-relaxed max-w-prose">
                    {result.original_answer_feedback}
                  </p>
                </Card>

                {/* 2. Improved Answer Comparison */}
                <div className="space-y-2">
                  <h2 className="font-serif text-lg font-medium text-ink">
                    2. Improved Answer
                  </h2>

                  {viewMode === "side-by-side" ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
                      {/* Original Answer */}
                      <Card className="p-5 space-y-2 bg-[#FCFBFA]">
                        <div className="flex items-center justify-between pb-1.5 border-b border-ink-border">
                          <span className="text-[11px] font-semibold text-ink-secondary uppercase tracking-wider">
                            Original Answer
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-ink-secondary whitespace-pre-wrap leading-relaxed">
                          {result.original_answer}
                        </p>
                      </Card>

                      {/* Improved Answer with Subtle Highlights */}
                      <Card className="p-5 space-y-2 bg-white border-brand/40">
                        <div className="flex items-center justify-between pb-1.5 border-b border-ink-border">
                          <span className="text-[11px] font-semibold text-brand uppercase tracking-wider">
                            Improved Answer
                          </span>
                        </div>
                        <div className="text-xs sm:text-sm text-ink whitespace-pre-wrap leading-relaxed">
                          <DiffHighlighter
                            text={result.improved_answer}
                            phrases={result.changed_phrases}
                          />
                        </div>
                      </Card>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <Card className="p-5 space-y-2 bg-[#FCFBFA]">
                        <span className="text-[11px] font-semibold text-ink-secondary uppercase tracking-wider">
                          Original Answer
                        </span>
                        <p className="text-xs sm:text-sm text-ink-secondary whitespace-pre-wrap leading-relaxed">
                          {result.original_answer}
                        </p>
                      </Card>

                      <Card className="p-5 space-y-2 bg-white border-brand/40">
                        <span className="text-[11px] font-semibold text-brand uppercase tracking-wider">
                          Improved Answer
                        </span>
                        <div className="text-xs sm:text-sm text-ink whitespace-pre-wrap leading-relaxed">
                          <DiffHighlighter
                            text={result.improved_answer}
                            phrases={result.changed_phrases}
                          />
                        </div>
                      </Card>
                    </div>
                  )}
                </div>

                {/* 3. Key Improvements Made */}
                <Card className="p-6 space-y-4">
                  <div className="space-y-1">
                    <h2 className="font-serif text-lg font-medium text-ink">
                      3. Key Improvements Made
                    </h2>
                    <p className="text-xs text-ink-secondary">
                      Specific adjustments made to structure, tone, and clarity.
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
                        <ArrowRight className="w-3.5 h-3.5 text-brand mt-0.5 shrink-0" />
                        <span>{sugg}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              </AnimatedGroup>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
