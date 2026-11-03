import { useState } from "react";
import { PenLine, RefreshCw, CheckCircle2, AlertTriangle, ArrowRight, LayoutGrid, Columns, Copy, Check } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Textarea";
import { Alert } from "@/components/ui/Alert";
import { TransitionPanel } from "@/components/motion/TransitionPanel";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

export function AnswerImprover() {
  const [question, setQuestion] = useState("");
  const [draftAnswer, setDraftAnswer] = useState("");
  const [viewMode, setViewMode] = useState(0); // 0 = side-by-side, 1 = stacked
  const [status, setStatus] = useState("initial"); // initial | loading | success | error
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (question.trim().length < 5 || draftAnswer.trim().length < 10 || status === "loading") return;

    setStatus("loading");
    setError(null);

    try {
      const data = await api.improveAnswer(question.trim(), draftAnswer.trim());
      setResult(data);
      setStatus("success");
    } catch (err) {
      setError(err.message || "Failed to analyze and improve answer. Please try again.");
      setStatus("error");
    }
  };

  const handleCopyImproved = () => {
    if (!result?.improved_answer) return;
    navigator.clipboard.writeText(result.improved_answer);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="space-y-1">
        <h2 className="font-serif text-2xl sm:text-3xl font-medium text-ink tracking-tight">
          Diagnostic Answer Improver
        </h2>
        <p className="text-xs text-ink-secondary">
          Compare your original draft against an elevated academic revision with phrase substitutions and rubrics.
        </p>
      </div>

      {/* Input Card */}
      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Textarea
            id="improver-question"
            label="Exam Question or Assignment Prompt"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="E.g., Explain the significance of the Krebs cycle in cellular respiration..."
            minChars={5}
            maxChars={4000}
            rows={2}
            disabled={status === "loading"}
          />

          <Textarea
            id="improver-draft"
            label="Your Draft Response"
            value={draftAnswer}
            onChange={(e) => setDraftAnswer(e.target.value)}
            placeholder="Paste your initial answer or outline here (minimum 10 characters)..."
            minChars={10}
            maxChars={10000}
            rows={6}
            disabled={status === "loading"}
          />

          <div className="flex items-center justify-between pt-2 border-t border-ink-border">
            <span className="text-[11px] text-ink-subtle">
              Analyzes factual completeness, academic tone, and structural precision.
            </span>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={
                question.trim().length < 5 ||
                draftAnswer.trim().length < 10 ||
                status === "loading"
              }
            >
              {status === "loading" ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Evaluating Answer...</span>
                </>
              ) : (
                <>
                  <PenLine className="w-4 h-4" />
                  <span>Improve and Diagnose</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>

      {/* Error Alert with Retry */}
      {status === "error" && (
        <Alert variant="error" title="Improvement Error" onClose={() => setStatus("initial")}>
          <div className="space-y-2">
            <p>{error}</p>
            <Button variant="secondary" size="sm" onClick={handleSubmit} className="mt-1">
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Evaluation</span>
            </Button>
          </div>
        </Alert>
      )}

      {/* Loading Skeleton */}
      {status === "loading" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4" aria-busy="true" aria-live="polite">
          <div className="p-6 bg-white border border-ink-border rounded-lg space-y-3">
            <div className="h-4 bg-[#EAE8E3] rounded w-1/4 animate-pulse" />
            <div className="h-3 bg-[#F2F0EB] rounded w-full animate-pulse" />
            <div className="h-3 bg-[#F2F0EB] rounded w-5/6 animate-pulse" />
            <div className="h-3 bg-[#F2F0EB] rounded w-3/4 animate-pulse" />
          </div>
          <div className="p-6 bg-white border border-ink-border rounded-lg space-y-3">
            <div className="h-4 bg-[#EAE8E3] rounded w-1/4 animate-pulse" />
            <div className="h-3 bg-[#F2F0EB] rounded w-full animate-pulse" />
            <div className="h-3 bg-[#F2F0EB] rounded w-5/6 animate-pulse" />
            <div className="h-3 bg-[#F2F0EB] rounded w-4/5 animate-pulse" />
          </div>
        </div>
      )}

      {/* SUCCESS: SIDE-BY-SIDE OR STACKED COMPARISON */}
      {status === "success" && result && (
        <div className="space-y-6">
          {/* Header Controls & View Toggle for Mobile/Tablet */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-ink-border">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">
                Comparative Analysis
              </span>
              <div className="flex items-center gap-2 text-xs bg-[#EAE8E3] px-2.5 py-0.5 rounded font-medium">
                <span>Score: {result.estimated_score_before}/10</span>
                <ArrowRight className="w-3 h-3 text-brand" />
                <span className="text-brand font-semibold">{result.estimated_score_after}/10</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="inline-flex p-0.5 bg-[#F0EFEB] rounded border border-ink-border">
                <button
                  type="button"
                  onClick={() => setViewMode(0)}
                  className={cn(
                    "px-2.5 py-1 text-xs rounded transition-colors flex items-center gap-1.5",
                    viewMode === 0 ? "bg-white text-ink font-medium shadow-sm" : "text-ink-secondary"
                  )}
                  title="Side by Side Layout"
                >
                  <Columns className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Side by Side</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode(1)}
                  className={cn(
                    "px-2.5 py-1 text-xs rounded transition-colors flex items-center gap-1.5",
                    viewMode === 1 ? "bg-white text-ink font-medium shadow-sm" : "text-ink-secondary"
                  )}
                  title="Stacked Layout"
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
                    <span>Copy Revision</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Comparison Panels switched via TransitionPanel */}
          <TransitionPanel activeIndex={viewMode}>
            {/* View Mode 0: Side by Side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-6 space-y-3 bg-[#FAF9F6]">
                <div className="flex items-center justify-between pb-2 border-b border-ink-border">
                  <span className="text-xs font-semibold text-ink-secondary uppercase tracking-wider">
                    Original Draft
                  </span>
                  <span className="text-[11px] text-ink-subtle">
                    Score: {result.estimated_score_before} / 10
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-ink-secondary whitespace-pre-wrap leading-relaxed">
                  {result.original_answer}
                </p>
              </Card>

              <Card className="p-6 space-y-3 bg-white border-brand/30">
                <div className="flex items-center justify-between pb-2 border-b border-ink-border">
                  <span className="text-xs font-semibold text-brand uppercase tracking-wider">
                    Improved Academic Revision
                  </span>
                  <span className="text-[11px] font-semibold text-brand">
                    Score: {result.estimated_score_after} / 10
                  </span>
                </div>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="text-xs sm:text-sm text-ink whitespace-pre-wrap leading-relaxed"
                >
                  {result.improved_answer}
                </motion.p>
              </Card>
            </div>

            {/* View Mode 1: Stacked */}
            <div className="space-y-4">
              <Card className="p-6 space-y-2 bg-[#FAF9F6]">
                <span className="text-xs font-semibold text-ink-secondary uppercase tracking-wider">
                  Original Draft ({result.estimated_score_before}/10)
                </span>
                <p className="text-xs sm:text-sm text-ink-secondary whitespace-pre-wrap leading-relaxed">
                  {result.original_answer}
                </p>
              </Card>

              <Card className="p-6 space-y-2 bg-white border-brand/30">
                <span className="text-xs font-semibold text-brand uppercase tracking-wider">
                  Improved Academic Revision ({result.estimated_score_after}/10)
                </span>
                <p className="text-xs sm:text-sm text-ink whitespace-pre-wrap leading-relaxed">
                  {result.improved_answer}
                </p>
              </Card>
            </div>
          </TransitionPanel>

          {/* Changed Phrases Highlight Table */}
          {result.changed_phrases?.length > 0 && (
            <Card className="space-y-4">
              <div className="space-y-1">
                <CardTitle>High-Impact Phrase Substitutions</CardTitle>
                <p className="text-xs text-ink-secondary">
                  Concrete vocabulary and tonal improvements made to elevate your response.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-ink-border text-ink-subtle">
                      <th className="py-2.5 pr-4 font-semibold uppercase tracking-wider text-[10px]">Original Phrase</th>
                      <th className="py-2.5 pr-4 font-semibold uppercase tracking-wider text-[10px]">Revised Substitution</th>
                      <th className="py-2.5 font-semibold uppercase tracking-wider text-[10px]">Pedagogical Rationale</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-border/50">
                    {result.changed_phrases.map((phrase, idx) => (
                      <tr key={idx} className="hover:bg-black/[0.01]">
                        <td className="py-3 pr-4 text-ink-secondary line-through decoration-feedback-error/40 font-mono text-[11px]">
                          {phrase.original_phrase}
                        </td>
                        <td className="py-3 pr-4 text-brand font-medium font-mono text-[11px]">
                          <span className="bg-diff-bg px-1.5 py-0.5 rounded border border-diff-border inline-block">
                            {phrase.improved_phrase}
                          </span>
                        </td>
                        <td className="py-3 text-ink-secondary leading-relaxed">
                          {phrase.reason}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Diagnostic Breakdown: Strengths, Weaknesses, Missing Points */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-5 space-y-2">
              <div className="flex items-center gap-2 text-feedback-success text-xs font-semibold uppercase tracking-wider">
                <CheckCircle2 className="w-4 h-4" />
                <span>Demonstrated Strengths</span>
              </div>
              <ul className="space-y-1.5 text-xs text-ink-secondary">
                {result.strengths.map((s, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-feedback-success">✓</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="p-5 space-y-2">
              <div className="flex items-center gap-2 text-feedback-warning text-xs font-semibold uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4" />
                <span>Identified Weaknesses</span>
              </div>
              <ul className="space-y-1.5 text-xs text-ink-secondary">
                {result.weaknesses.map((w, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-feedback-warning">!</span>
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="p-5 space-y-2">
              <div className="flex items-center gap-2 text-brand text-xs font-semibold uppercase tracking-wider">
                <ArrowRight className="w-4 h-4" />
                <span>Missing Key Points</span>
              </div>
              <ul className="space-y-1.5 text-xs text-ink-secondary">
                {result.missing_key_points.map((m, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-brand">→</span>
                    <span>{m}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
