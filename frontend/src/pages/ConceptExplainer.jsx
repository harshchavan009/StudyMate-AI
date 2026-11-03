import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Lightbulb, RefreshCw, Copy, Check, RotateCcw, AlertCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { SkeletonBlock } from "@/components/ui/SkeletonBlock";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { TransitionPanel } from "@/components/motion/TransitionPanel";
import { AnimatedGroup } from "@/components/motion/AnimatedGroup";
import { usePageMeta } from "@/lib/usePageMeta";
import { api } from "@/lib/api";
import { saveRecentSession } from "@/lib/storage";
import { cn } from "@/lib/utils";

const SUBJECTS = [
  "Computer Science",
  "Physics",
  "Chemistry",
  "Biology",
  "Mathematics",
  "Economics",
  "History",
  "Literature",
  "Other",
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

export function ConceptExplainer() {
  usePageMeta(
    "Concept Explainer",
    "Explore complex theories and mechanisms explained clearly across beginner, intermediate, and advanced levels."
  );

  const location = useLocation();
  const [concept, setConcept] = useState("");
  const [subject, setSubject] = useState("Other");
  const [selectedLevel, setSelectedLevel] = useState("intermediate");
  const [status, setStatus] = useState("initial"); // initial | loading | success | error
  const [error, setError] = useState(null);
  const [explainerCache, setExplainerCache] = useState({}); // { [level]: ExplainConceptResponse }
  const [copied, setCopied] = useState(false);
  const [limits, setLimits] = useState({ min: 3, max: 300 });

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
    }
  }, [location.state]);

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

  const charCount = concept.length;
  const isTooShort = charCount > 0 && charCount < limits.min;
  const isTooLong = charCount > limits.max;
  const isValid = charCount >= limits.min && charCount <= limits.max;

  const fetchExplanation = async (targetLevel, force = false) => {
    if (!isValid || status === "loading") return;

    if (!force && explainerCache[targetLevel]) {
      setSelectedLevel(targetLevel);
      return;
    }

    setStatus("loading");
    setError(null);

    try {
      const data = await api.explainConcept(concept.trim(), targetLevel, subject);
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
    setStatus("initial");
    setError(null);
  };

  const handleClear = () => {
    setConcept("");
    setSubject("Other");
    setExplainerCache({});
    setStatus("initial");
    setError(null);
  };

  const currentResult = explainerCache[selectedLevel];

  const handleCopyMarkdown = () => {
    if (!currentResult?.raw_markdown) return;
    navigator.clipboard.writeText(currentResult.raw_markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Title & Short Description */}
      <div className="space-y-1">
        <h1 className="font-serif text-2xl sm:text-3xl font-medium text-ink tracking-tight">
          Concept Explainer
        </h1>
        <p className="text-xs text-ink-secondary">
          Enter any concept or theory to generate an intuitive, step-by-step academic breakdown calibrated to your level.
        </p>
      </div>

      {/* Split view at 1280px (xl:), stacked below */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* Left Column: Input and Controls */}
        <div className="xl:col-span-5 space-y-4">
          <Card className="p-5 sm:p-6 space-y-4">
            <form onSubmit={handleGenerate} className="space-y-4">
              {/* Concept Input Field */}
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
                  onChange={(e) => setConcept(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="E.g., TCP Three-Way Handshake, Photosynthesis, Opportunity Cost"
                  maxLength={limits.max}
                  disabled={status === "loading"}
                  className={cn(
                    "w-full text-xs sm:text-sm px-3.5 py-2.5 bg-white border rounded focus:outline-none focus:ring-1 transition-colors",
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
                        Maximum {limits.max} characters exceeded.
                      </span>
                    )}
                    {!isTooShort && !isTooLong && (
                      <span className="text-ink-subtle">
                        3 to 300 characters. Specific topics give sharper results.
                      </span>
                    )}
                  </div>
                  <span
                    className={cn(
                      "font-mono",
                      isTooLong ? "text-feedback-error font-medium" : "text-ink-subtle"
                    )}
                  >
                    {charCount} / {limits.max}
                  </span>
                </div>
              </div>

              {/* Subject Select Dropdown */}
              <div className="space-y-1.5">
                <label htmlFor="concept-subject" className="text-xs font-semibold text-ink">
                  Academic Subject
                </label>
                <select
                  id="concept-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  disabled={status === "loading"}
                  className="w-full text-xs px-3 py-2 bg-white border border-ink-border rounded focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand disabled:bg-[#F5F4F0] transition-colors"
                >
                  {SUBJECTS.map((subj) => (
                    <option key={subj} value={subj}>
                      {subj}
                    </option>
                  ))}
                </select>
              </div>

              {/* Explanation Depth Segmented Control */}
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-ink block">
                  Depth Level
                </span>
                <SegmentedControl
                  options={LEVEL_OPTIONS}
                  value={selectedLevel}
                  onChange={handleLevelChange}
                  ariaLabel="Select depth level"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-between gap-3 border-t border-ink-border">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClear}
                  disabled={status === "loading" || (!concept && subject === "Other")}
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
                        <span>Explaining...</span>
                      </>
                    ) : (
                      <>
                        <Lightbulb className="w-3.5 h-3.5" />
                        <span>{status === "success" ? "Regenerate" : "Explain Concept"}</span>
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
            <Alert variant="error" title="Explanation Failed" onClose={() => setStatus("initial")}>
              <div className="space-y-2">
                <p>{error}</p>
                <Button variant="secondary" size="sm" onClick={() => fetchExplanation(selectedLevel, true)} className="mt-1">
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
                  When you submit a concept, StudyMate AI provides six structured explanation sections:
                </p>
              </div>

              <ol className="space-y-3 text-xs">
                <li className="flex items-start gap-3 p-3 bg-white border border-ink-border rounded">
                  <span className="w-5 h-5 flex items-center justify-center bg-[#EAE8E3] text-ink font-semibold rounded text-[11px] shrink-0">
                    1
                  </span>
                  <div>
                    <strong className="text-ink block">Introduction</strong>
                    <span className="text-ink-secondary text-[11px]">
                      A lucid overview defining the fundamental question the concept answers.
                    </span>
                  </div>
                </li>

                <li className="flex items-start gap-3 p-3 bg-white border border-ink-border rounded">
                  <span className="w-5 h-5 flex items-center justify-center bg-[#EAE8E3] text-ink font-semibold rounded text-[11px] shrink-0">
                    2
                  </span>
                  <div>
                    <strong className="text-ink block">Detailed Explanation</strong>
                    <span className="text-ink-secondary text-[11px]">
                      The core mechanics, foundational principles, and underlying theoretical framework.
                    </span>
                  </div>
                </li>

                <li className="flex items-start gap-3 p-3 bg-white border border-ink-border rounded">
                  <span className="w-5 h-5 flex items-center justify-center bg-[#EAE8E3] text-ink font-semibold rounded text-[11px] shrink-0">
                    3
                  </span>
                  <div>
                    <strong className="text-ink block">Step-by-Step Understanding</strong>
                    <span className="text-ink-secondary text-[11px]">
                      Numbered chronological phases or structural layers showing how the concept works.
                    </span>
                  </div>
                </li>

                <li className="flex items-start gap-3 p-3 bg-white border border-ink-border rounded">
                  <span className="w-5 h-5 flex items-center justify-center bg-[#EAE8E3] text-ink font-semibold rounded text-[11px] shrink-0">
                    4
                  </span>
                  <div>
                    <strong className="text-ink block">Practical Example</strong>
                    <span className="text-ink-secondary text-[11px]">
                      A concrete, scenario-based walkthrough illustrating the concept in action.
                    </span>
                  </div>
                </li>

                <li className="flex items-start gap-3 p-3 bg-white border border-ink-border rounded">
                  <span className="w-5 h-5 flex items-center justify-center bg-[#EAE8E3] text-ink font-semibold rounded text-[11px] shrink-0">
                    5
                  </span>
                  <div>
                    <strong className="text-ink block">Real-World Applications</strong>
                    <span className="text-ink-secondary text-[11px]">
                      Current industry, scientific, or technological implementations of the theory.
                    </span>
                  </div>
                </li>

                <li className="flex items-start gap-3 p-3 bg-white border border-ink-border rounded">
                  <span className="w-5 h-5 flex items-center justify-center bg-[#EAE8E3] text-ink font-semibold rounded text-[11px] shrink-0">
                    6
                  </span>
                  <div>
                    <strong className="text-ink block">Quick Revision Points</strong>
                    <span className="text-ink-secondary text-[11px]">
                      High-yield summary bullets for rapid recall before exams.
                    </span>
                  </div>
                </li>
              </ol>
            </Card>
          )}

          {/* Loading Skeleton mirroring 6 output sections */}
          {status === "loading" && (
            <div className="space-y-4" aria-busy="true" aria-live="polite">
              <SkeletonBlock lines={3} className="p-6" />
              <SkeletonBlock lines={4} className="p-6" />
              <SkeletonBlock lines={5} className="p-6" />
              <SkeletonBlock lines={3} className="p-6" />
              <SkeletonBlock lines={3} className="p-6" />
              <SkeletonBlock lines={4} className="p-6" />
            </div>
          )}

          {/* Success State: Clean Document Layout with TransitionPanel crossfade between levels */}
          {status === "success" && currentResult && (
            <div className="space-y-6">
              {/* Output Actions Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-ink-border">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-ink">
                    {currentResult.concept}
                  </span>
                  <span className="text-[11px] text-ink-secondary bg-[#EAE8E3] px-2 py-0.5 rounded capitalize">
                    {currentResult.level}
                  </span>
                  <span className="text-[11px] text-ink-subtle">
                    ({currentResult.subject})
                  </span>
                </div>

                <Button variant="secondary" size="sm" onClick={handleCopyMarkdown}>
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-feedback-success" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Document</span>
                    </>
                  )}
                </Button>
              </div>

              {/* Crossfade when switching levels via TransitionPanel */}
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
                        <p className="text-xs sm:text-sm text-ink-secondary leading-relaxed max-w-prose">
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
                              <ArrowRight className="w-3.5 h-3.5 text-brand mt-0.5 shrink-0" />
                              <span>{pt}</span>
                            </li>
                          ))}
                        </ul>
                      </Card>
                    </AnimatedGroup>
                  );
                })}
              </TransitionPanel>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
