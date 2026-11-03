import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Section card header with per-section Copy action and "Reviewed" checkbox (F5).
 * Does not collapse or hide the card when reviewed; applies a subtle muted title.
 */
export function SectionHeader({
  title,
  sectionId,
  isReviewed = false,
  onToggleReviewed = null,
  copyContent = "",
  headingRef = null,
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!copyContent) return;
    try {
      await navigator.clipboard.writeText(copyContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };

  return (
    <div className="flex items-center justify-between gap-3 pb-2 border-b border-ink-border/60">
      <div className="flex items-center gap-2.5 min-w-0">
        <h2
          ref={headingRef}
          tabIndex={headingRef ? -1 : undefined}
          className={cn(
            "font-serif text-lg font-medium transition-colors truncate focus:outline-none",
            isReviewed ? "text-ink-subtle line-through decoration-ink-subtle/50" : "text-ink"
          )}
        >
          {title}
        </h2>
        {isReviewed && (
          <span className="text-[11px] font-sans font-medium text-brand bg-[#EEF1FB] px-1.5 py-0.5 rounded shrink-0">
            Reviewed
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {onToggleReviewed && (
          <label className="flex items-center gap-1.5 text-xs text-ink-subtle hover:text-ink cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isReviewed}
              onChange={() => onToggleReviewed(sectionId)}
              className="w-3.5 h-3.5 rounded border-ink-border text-brand focus:ring-brand focus:ring-offset-0 cursor-pointer accent-[#1F3FBF]"
            />
            <span className="text-[11px]">Mark reviewed</span>
          </label>
        )}

        {copyContent && (
          <button
            type="button"
            onClick={handleCopy}
            className="p-1 rounded text-ink-subtle hover:text-ink hover:bg-[#F5F4F0] border border-transparent hover:border-ink-border transition-colors"
            title={`Copy ${title}`}
            aria-label={`Copy ${title}`}
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-feedback-success" strokeWidth={2} />
            ) : (
              <Copy className="w-3.5 h-3.5" strokeWidth={1.75} />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
