import { useState } from "react";
import { BookOpen, Sparkles, AlertCircle, RefreshCw, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Textarea";
import { Alert } from "@/components/ui/Alert";
import { SkeletonSummarizer } from "@/components/ui/SkeletonBlock";
import { AnimatedGroup } from "@/components/motion/AnimatedGroup";
import { api } from "@/lib/api";

export function Summarizer() {
  const [text, setText] = useState("");
  const [status, setStatus] = useState("initial"); // initial | loading | success | error
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (text.trim().length < 20 || status === "loading") return;

    setStatus("loading");
    setError(null);
    try {
      const data = await api.summarize(text.trim());
      setResult(data);
      setStatus("success");
    } catch (err) {
      setError(err.message || "Failed to generate summary. Please try again.");
      setStatus("error");
    }
  };

  const handleCopyMarkdown = () => {
    if (!result?.raw_markdown) return;
    navigator.clipboard.writeText(result.raw_markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="space-y-1">
        <h2 className="font-serif text-2xl sm:text-3xl font-medium text-ink tracking-tight">
          Academic Text Summarizer
        </h2>
        <p className="text-xs text-ink-secondary">
          Paste dense lecture notes or textbook chapters to extract a structured 6-section academic synthesis.
        </p>
      </div>

      {/* Input Card */}
      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Textarea
            id="summarizer-input"
            label="Study Material or Lecture Notes"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste your course notes, journal excerpt, or syllabus chapter here (minimum 20 characters)..."
            minChars={20}
            maxChars={20000}
            rows={7}
            disabled={status === "loading"}
          />

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <span className="text-[11px] text-ink-subtle">
              Generates: Takeaway, Key Concepts, Structural Breakdown, Definitions, Applications, Review Questions
            </span>
            <div className="flex items-center gap-2">
              {text.length > 0 && status !== "loading" && (
                <Button
                  type="button"
                  variant="subtle"
                  size="sm"
                  onClick={() => {
                    setText("");
                    setStatus("initial");
                    setResult(null);
                  }}
                >
                  Clear
                </Button>
              )}
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={text.trim().length < 20 || status === "loading"}
              >
                {status === "loading" ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Synthesizing...</span>
                  </>
                ) : (
                  <>
                    <BookOpen className="w-4 h-4" />
                    <span>Generate 6-Section Summary</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </Card>

      {/* Error State with Retry */}
      {status === "error" && (
        <Alert
          variant="error"
          title="Summarization Error"
          onClose={() => setStatus("initial")}
        >
          <div className="space-y-2">
            <p>{error}</p>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleSubmit}
              className="mt-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Request</span>
            </Button>
          </div>
        </Alert>
      )}

      {/* Loading Skeleton Mirroring 6 Output Sections */}
      {status === "loading" && <SkeletonSummarizer />}

      {/* Success State Revealed with AnimatedGroup */}
      {status === "success" && result && (
        <div className="space-y-6">
          <div className="flex items-center justify-between pb-2 border-b border-ink-border">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-subtle">
              <span>Structured Synthesis</span>
              <span>·</span>
              <span className="text-feedback-success font-medium">Complete</span>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCopyMarkdown}
              title="Copy markdown document"
            >
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

          <AnimatedGroup className="space-y-4">
            {/* Section 1: Executive Summary */}
            <Card key="sec-1">
              <CardHeader>
                <span className="text-[10px] font-semibold tracking-wider text-brand uppercase">Section 1</span>
                <CardTitle>Core Takeaway</CardTitle>
              </CardHeader>
              <p className="text-sm text-ink leading-relaxed">
                {result.executive_summary}
              </p>
            </Card>

            {/* Section 2: Key Concepts */}
            <Card key="sec-2">
              <CardHeader>
                <span className="text-[10px] font-semibold tracking-wider text-brand uppercase">Section 2</span>
                <CardTitle>Key Concepts and Principles</CardTitle>
              </CardHeader>
              <ul className="space-y-2 text-xs text-ink-secondary">
                {result.key_concepts.map((concept, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand mt-1.5 shrink-0" />
                    <span>{concept}</span>
                  </li>
                ))}
              </ul>
            </Card>

            {/* Section 3: Detailed Breakdown */}
            <Card key="sec-3">
              <CardHeader>
                <span className="text-[10px] font-semibold tracking-wider text-brand uppercase">Section 3</span>
                <CardTitle>Detailed Structural Breakdown</CardTitle>
              </CardHeader>
              <div className="space-y-4 divide-y divide-ink-border/50">
                {result.breakdown_sections.map((section, idx) => (
                  <div key={idx} className={idx > 0 ? "pt-3" : ""}>
                    <h4 className="text-xs font-semibold text-ink mb-1.5">
                      {section.title}
                    </h4>
                    <ul className="space-y-1 text-xs text-ink-secondary">
                      {section.points.map((pt, pIdx) => (
                        <li key={pIdx} className="flex items-start gap-2">
                          <span className="text-ink-subtle">·</span>
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </Card>

            {/* Section 4: Definitions */}
            <Card key="sec-4">
              <CardHeader>
                <span className="text-[10px] font-semibold tracking-wider text-brand uppercase">Section 4</span>
                <CardTitle>Essential Terminology</CardTitle>
              </CardHeader>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {result.important_definitions.map((def, idx) => (
                  <div key={idx} className="p-3 bg-[#FAF9F6] rounded border border-ink-border">
                    <dt className="font-semibold text-ink">{def.term}</dt>
                    <dd className="text-ink-secondary mt-0.5 leading-relaxed">{def.definition}</dd>
                  </div>
                ))}
              </dl>
            </Card>

            {/* Section 5: Practical Applications */}
            <Card key="sec-5">
              <CardHeader>
                <span className="text-[10px] font-semibold tracking-wider text-brand uppercase">Section 5</span>
                <CardTitle>Practical Applications</CardTitle>
              </CardHeader>
              <ul className="space-y-2 text-xs text-ink-secondary">
                {result.practical_applications.map((app, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-feedback-success mt-1.5 shrink-0" />
                    <span>{app}</span>
                  </li>
                ))}
              </ul>
            </Card>

            {/* Section 6: Review Questions */}
            <Card key="sec-6">
              <CardHeader>
                <span className="text-[10px] font-semibold tracking-wider text-brand uppercase">Section 6</span>
                <CardTitle>Self-Check Review Questions</CardTitle>
              </CardHeader>
              <ol className="space-y-2 text-xs text-ink">
                {result.review_questions.map((q, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="font-semibold text-brand min-w-[1.25rem]">{idx + 1}.</span>
                    <span className="text-ink-secondary">{q}</span>
                  </li>
                ))}
              </ol>
            </Card>
          </AnimatedGroup>
        </div>
      )}
    </div>
  );
}
