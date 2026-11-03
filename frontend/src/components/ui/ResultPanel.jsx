import { useState } from "react";
import { RefreshCw, Copy, Check, Download, Printer, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { SkeletonBlock } from "@/components/ui/SkeletonBlock";
import { cn } from "@/lib/utils";

/**
 * ResultPanel: Unified document sheet container across all four study tools.
 * Handles empty (document sheet with ghost headings), loading (in-sheet skeleton),
 * error (alert with retry), and success states.
 */
export function ResultPanel({
  status = "empty",
  error = null,
  onRetry = null,
  sections = [],
  title = "Document",
  badge = null,
  rawMarkdown = null,
  filename = "studymate-document.md",
  actions = null,
  children,
}) {
  const [copied, setCopied] = useState(false);

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

      {/* Empty State: Document Sheet with Faint Ghost Headings (B5 / A3) */}
      {(status === "empty" || status === "initial") && (
        <Card className="p-6 sm:p-8 space-y-6 bg-surface border border-ink-border rounded-panel">
          <div className="space-y-1 pb-4 border-b border-ink-border">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-wider text-ink-subtle">
                Document Preview Sheet
              </span>
              <span className="text-[11px] text-ink-subtle">
                {sections.length} sections
              </span>
            </div>
            <h3 className="font-serif text-lg font-medium text-ink">
              Expected Output Structure
            </h3>
            <p className="text-xs text-ink-secondary">
              Generated results will populate this document in real time across the following structured sections:
            </p>
          </div>

          <div className="space-y-5">
            {sections.map((section, idx) => (
              <div key={idx} className="space-y-1.5 opacity-60">
                <div className="flex items-baseline gap-2">
                  <span className="text-[11px] font-mono text-ink-subtle font-medium">
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
      )}

      {/* Loading State: The same document sheet with skeletons under ghost headings (B5 / M3) */}
      {status === "loading" && (
        <Card
          className="p-6 sm:p-8 space-y-6 bg-surface border border-ink-border rounded-panel"
          aria-busy="true"
          aria-live="polite"
        >
          <div className="space-y-1 pb-4 border-b border-ink-border">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-wider text-brand font-medium">
                Generating Document...
              </span>
              <span className="text-[11px] text-ink-subtle animate-pulse">
                Synthesizing
              </span>
            </div>
            <h3 className="font-serif text-lg font-medium text-ink">
              {title}
            </h3>
          </div>

          <div className="space-y-6">
            {sections.map((section, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-[11px] font-mono text-brand font-medium">
                    0{idx + 1}.
                  </span>
                  <h4 className="font-serif text-sm font-medium text-ink">
                    {section.title}
                  </h4>
                </div>
                <div className="pl-6 space-y-2">
                  <div className="h-3 bg-[#EAE8E3] rounded w-full animate-pulse" />
                  <div className="h-3 bg-[#F2F0EB] rounded w-5/6 animate-pulse" />
                  {idx % 2 === 0 && (
                    <div className="h-3 bg-[#F2F0EB] rounded w-3/4 animate-pulse" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Success / Document Output State */}
      {(status === "success" || status === "playing" || status === "finished") && (
        <div className="space-y-4">
          {/* Top Document Actions Bar */}
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
              {actions}

              {rawMarkdown && (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleCopy}
                    aria-live="polite"
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
                    variant="ghost"
                    size="sm"
                    onClick={handleDownload}
                    title="Download document as Markdown (.md)"
                  >
                    <Download className="w-3.5 h-3.5" strokeWidth={1.75} />
                    <span className="hidden sm:inline">Download</span>
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
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

          {/* Document Content */}
          <div className="space-y-6 print:space-y-4">
            {children}
          </div>

          {/* AI Disclosure Line (B8) */}
          <div className="pt-4 border-t border-ink-border text-center sm:text-left print:mt-6">
            <p className="text-[11px] text-ink-subtle">
              Generated by AI. Check it against your course material.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

