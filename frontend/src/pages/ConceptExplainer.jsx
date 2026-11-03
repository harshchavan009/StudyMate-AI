import { useState } from "react";
import { Lightbulb, RefreshCw, BookOpen, Layers, CheckCircle2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Textarea";
import { Alert } from "@/components/ui/Alert";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { TransitionPanel } from "@/components/motion/TransitionPanel";
import { AnimatedGroup } from "@/components/motion/AnimatedGroup";
import { api } from "@/lib/api";

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

export function ConceptExplainer() {
  const [concept, setConcept] = useState("");
  const [context, setContext] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("intermediate");
  const [status, setStatus] = useState("initial"); // initial | loading | success | error
  const [error, setError] = useState(null);
  const [explainerCache, setExplainerCache] = useState({}); // { [level]: ExplainConceptResponse }
  const [copied, setCopied] = useState(false);

  const fetchLevelExplanation = async (targetLevel, force = false) => {
    if (!concept.trim()) return;
    if (!force && explainerCache[targetLevel]) {
      setSelectedLevel(targetLevel);
      return;
    }

    setStatus("loading");
    setError(null);
    try {
      const data = await api.explainConcept(concept.trim(), targetLevel, context.trim() || null);
      setExplainerCache((prev) => ({
        ...prev,
        [targetLevel]: data,
      }));
      setSelectedLevel(targetLevel);
      setStatus("success");
    } catch (err) {
      setError(err.message || "Failed to generate concept explanation. Please try again.");
      setStatus("error");
    }
  };

  const handleInitialSubmit = (e) => {
    e.preventDefault();
    if (concept.trim().length < 2 || status === "loading") return;
    fetchLevelExplanation(selectedLevel, true);
  };

  const handleLevelChange = (newLevel) => {
    setSelectedLevel(newLevel);
    if (status === "success") {
      fetchLevelExplanation(newLevel);
    }
  };

  const currentResult = explainerCache[selectedLevel];

  const handleCopyMarkdown = () => {
    if (!currentResult?.raw_markdown) return;
    navigator.clipboard.writeText(currentResult.raw_markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="space-y-1">
        <h2 className="font-serif text-2xl sm:text-3xl font-medium text-ink tracking-tight">
          Multi-Level Concept Explainer
        </h2>
        <p className="text-xs text-ink-secondary">
          Break down any complex theory into intuitive analogies, formal mechanisms, or theoretical deep dives.
        </p>
      </div>

      {/* Input Card */}
      <Card>
        <form onSubmit={handleInitialSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="concept-name" className="text-xs font-semibold text-ink">
              Concept, Mechanism, or Theory Name
            </label>
            <input
              id="concept-name"
              type="text"
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              placeholder="E.g., Quantum Entanglement, TCP Handshake, Gradient Descent, Opportunity Cost..."
              disabled={status === "loading"}
              className="w-full px-3.5 py-2.5 text-sm text-ink bg-white border border-ink-border rounded-md shadow-inner transition-colors duration-150 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand placeholder:text-ink-subtle/70"
            />
          </div>

          <Textarea
            id="concept-context"
            label="Optional Subject Context or Application Domain"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="Optional: Mention your course level, specific textbook focus, or industry setting..."
            maxChars={3000}
            rows={2}
            disabled={status === "loading"}
          />

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-ink-border">
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-ink-secondary block">Depth Calibration:</span>
              <SegmentedControl
                options={LEVEL_OPTIONS}
                value={selectedLevel}
                onChange={handleLevelChange}
                ariaLabel="Select depth level"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={concept.trim().length < 2 || status === "loading"}
            >
              {status === "loading" ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Synthesizing Concept...</span>
                </>
              ) : (
                <>
                  <Lightbulb className="w-4 h-4" />
                  <span>Explain Concept</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>

      {/* Error Alert with Retry */}
      {status === "error" && (
        <Alert variant="error" title="Explanation Error" onClose={() => setStatus("initial")}>
          <div className="space-y-2">
            <p>{error}</p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => fetchLevelExplanation(selectedLevel, true)}
              className="mt-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Request</span>
            </Button>
          </div>
        </Alert>
      )}

      {/* Loading Skeleton */}
      {status === "loading" && (
        <div className="space-y-4" aria-busy="true" aria-live="polite">
          <div className="text-xs text-ink-secondary flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-brand animate-ping inline-block" />
            Calibrating explanation structure for {selectedLevel} depth...
          </div>
          <div className="p-6 bg-white border border-ink-border rounded-lg space-y-3">
            <div className="h-4 bg-[#EAE8E3] rounded w-1/3 animate-pulse" />
            <div className="h-3 bg-[#F2F0EB] rounded w-full animate-pulse" />
            <div className="h-3 bg-[#F2F0EB] rounded w-5/6 animate-pulse" />
          </div>
          <div className="p-6 bg-white border border-ink-border rounded-lg space-y-3">
            <div className="h-4 bg-[#EAE8E3] rounded w-1/4 animate-pulse" />
            <div className="h-3 bg-[#F2F0EB] rounded w-full animate-pulse" />
            <div className="h-3 bg-[#F2F0EB] rounded w-4/5 animate-pulse" />
          </div>
        </div>
      )}

      {/* SUCCESS: STRUCTURAL RE-FLOW ACROSS LEVELS VIA TRANSITIONPANEL */}
      {status === "success" && currentResult && (
        <div className="space-y-6">
          {/* Level Switch Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-ink-border">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">
                Active Level:
              </span>
              <SegmentedControl
                options={LEVEL_OPTIONS}
                value={selectedLevel}
                onChange={handleLevelChange}
                ariaLabel="Switch explanation level"
              />
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
                  <span>Copy Markdown</span>
                </>
              )}
            </Button>
          </div>

          {/* TransitionPanel smoothly crossfades re-flowed structure */}
          <TransitionPanel
            activeIndex={LEVEL_INDEX_MAP[selectedLevel]}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {LEVEL_OPTIONS.map((levelOption) => {
              const res = explainerCache[levelOption.value];
              if (!res) {
                return (
                  <div key={levelOption.value} className="py-12 text-center text-xs text-ink-subtle">
                    Switching to {levelOption.label} explanation...
                  </div>
                );
              }

              return (
                <div key={levelOption.value} className="space-y-4">
                  <AnimatedGroup className="space-y-4">
                    {/* Section 1: Intuitive Analogy */}
                    <Card key="exp-1">
                      <CardHeader>
                        <span className="text-[10px] font-semibold tracking-wider text-brand uppercase">
                          Anchor Analogy ({levelOption.label})
                        </span>
                        <CardTitle>Intuitive Mental Model</CardTitle>
                      </CardHeader>
                      <p className="text-sm text-ink leading-relaxed">
                        {res.intuitive_analogy}
                      </p>
                    </Card>

                    {/* Section 2: Core Principles */}
                    <Card key="exp-2">
                      <CardHeader>
                        <span className="text-[10px] font-semibold tracking-wider text-brand uppercase">
                          Foundations
                        </span>
                        <CardTitle>Governing Principles</CardTitle>
                      </CardHeader>
                      <ul className="space-y-2 text-xs text-ink-secondary">
                        {res.foundational_principles.map((p, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-brand mt-1.5 shrink-0" />
                            <span>{p}</span>
                          </li>
                        ))}
                      </ul>
                    </Card>

                    {/* Section 3: Step-by-Step Breakdown */}
                    <Card key="exp-3">
                      <CardHeader>
                        <span className="text-[10px] font-semibold tracking-wider text-brand uppercase">
                          Structural Mechanics ({res.step_by_step_breakdown.length} Stages)
                        </span>
                        <CardTitle>Step-by-Step Breakdown</CardTitle>
                      </CardHeader>
                      <div className="space-y-3 divide-y divide-ink-border/50">
                        {res.step_by_step_breakdown.map((step) => (
                          <div key={step.step_number} className={step.step_number > 1 ? "pt-3" : ""}>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="w-5 h-5 rounded-[4px] bg-[#F0EFEB] text-ink font-semibold text-[11px] flex items-center justify-center">
                                {step.step_number}
                              </span>
                              <h4 className="text-xs font-semibold text-ink">{step.title}</h4>
                            </div>
                            <p className="text-xs text-ink-secondary leading-relaxed pl-7">
                              {step.description}
                            </p>
                          </div>
                        ))}
                      </div>
                    </Card>

                    {/* Section 4: Key Terminology */}
                    <Card key="exp-4">
                      <CardHeader>
                        <span className="text-[10px] font-semibold tracking-wider text-brand uppercase">
                          Vocabulary ({res.key_terms.length} Terms)
                        </span>
                        <CardTitle>Key Academic Terminology</CardTitle>
                      </CardHeader>
                      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        {res.key_terms.map((term, idx) => (
                          <div key={idx} className="p-3 bg-[#FAF9F6] rounded border border-ink-border">
                            <dt className="font-semibold text-ink">{term.term}</dt>
                            <dd className="text-ink-secondary mt-0.5 leading-relaxed">{term.definition}</dd>
                          </div>
                        ))}
                      </dl>
                    </Card>

                    {/* Section 5: Real-World Case */}
                    <Card key="exp-5">
                      <CardHeader>
                        <span className="text-[10px] font-semibold tracking-wider text-brand uppercase">
                          Application
                        </span>
                        <CardTitle>Real-World Case Study</CardTitle>
                      </CardHeader>
                      <p className="text-xs text-ink-secondary leading-relaxed">
                        {res.real_world_case}
                      </p>
                    </Card>

                    {/* Section 6: Self-Check Exercise */}
                    <Card key="exp-6">
                      <CardHeader>
                        <span className="text-[10px] font-semibold tracking-wider text-brand uppercase">
                          Comprehension Check
                        </span>
                        <CardTitle>Self-Check Reflection Exercise</CardTitle>
                      </CardHeader>
                      <div className="p-3.5 bg-brand-tint border border-brand/20 rounded-md text-xs text-ink leading-relaxed">
                        <span className="font-semibold block mb-1 text-brand">Prompt to consider:</span>
                        {res.self_check_exercise}
                      </div>
                    </Card>
                  </AnimatedGroup>
                </div>
              );
            })}
          </TransitionPanel>
        </div>
      )}
    </div>
  );
}
