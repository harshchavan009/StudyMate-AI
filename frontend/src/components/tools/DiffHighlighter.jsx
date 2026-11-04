import { useState, useMemo, useEffect } from "react";
import { motion, useReducedMotion } from "motion/react";
import { diffWordsWithSpace } from "diff";
import { Check, X, RotateCcw, Copy } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

/**
 * Word-level diff viewer for Answer Improver with interactive tracked changes (F3 / M5).
 * Views:
 * - 'redline': Inline word diff with strikethrough deletions, underline + accent additions,
 *              and per-change Accept/Reject controls.
 * - 'clean': Clean live text reflecting accepted/rejected choices.
 * - 'side-by-side': Original draft vs live revision side-by-side.
 */
export function DiffHighlighter({
  original = "",
  improved = "",
  viewMode = "redline", // 'redline' | 'clean' | 'side-by-side'
  onAcceptedTextChange = null,
  className = "",
}) {
  const shouldReduceMotion = useReducedMotion();
  const [rejectedGroupIds, setRejectedGroupIds] = useState(new Set());
  const [copied, setCopied] = useState(false);

  // Parse diff chunks and group contiguous modifications
  const { groups, changeGroups } = useMemo(() => {
    if (!original || !improved) return { groups: [], changeGroups: [] };
    const rawChunks = diffWordsWithSpace(original, improved);
    const resultGroups = [];
    const changeList = [];
    let currentChange = null;
    let changeIdCounter = 0;

    for (let i = 0; i < rawChunks.length; i++) {
      const chunk = rawChunks[i];
      if (chunk.added || chunk.removed) {
        if (!currentChange) {
          currentChange = {
            id: changeIdCounter++,
            type: "change",
            removedText: "",
            addedText: "",
          };
          resultGroups.push(currentChange);
          changeList.push(currentChange);
        }
        if (chunk.removed) currentChange.removedText += chunk.value;
        if (chunk.added) currentChange.addedText += chunk.value;
      } else {
        currentChange = null;
        resultGroups.push({
          type: "equal",
          text: chunk.value,
        });
      }
    }

    return { groups: resultGroups, changeGroups: changeList };
  }, [original, improved]);

  // Compute live reconstructed text based on accepted/rejected state
  const currentLiveText = useMemo(() => {
    return groups
      .map((g) => {
        if (g.type === "equal") return g.text;
        const isRejected = rejectedGroupIds.has(g.id);
        return isRejected ? g.removedText : g.addedText;
      })
      .join("");
  }, [groups, rejectedGroupIds]);

  // Propagate text changes to parent copy buffer and markdown export
  useEffect(() => {
    if (onAcceptedTextChange) {
      onAcceptedTextChange(currentLiveText);
    }
  }, [currentLiveText, onAcceptedTextChange]);

  const totalChanges = changeGroups.length;
  const acceptedCount = totalChanges - rejectedGroupIds.size;
  const skipStagger = shouldReduceMotion || totalChanges > 60;

  const handleToggleGroup = (id) => {
    setRejectedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleAcceptAll = () => {
    setRejectedGroupIds(new Set());
  };

  const handleRejectAll = () => {
    setRejectedGroupIds(new Set(changeGroups.map((g) => g.id)));
  };

  const handleCopyLiveText = async () => {
    try {
      await navigator.clipboard.writeText(currentLiveText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const toolbar = totalChanges > 0 && (
    <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 pt-1 border-b border-ink-border text-xs">
      <div className="flex items-center gap-2">
        <span className="font-semibold text-ink">Tracked changes:</span>
        <span className="font-mono tabular-nums text-ink-secondary">
          {acceptedCount} of {totalChanges} accepted
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={handleAcceptAll}
          disabled={rejectedGroupIds.size === 0}
          className="px-2 py-1 text-xs rounded border border-ink-border bg-white hover:bg-[#F5F4F0] text-ink disabled:opacity-40 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-1"
          title="Accept all phrasing improvements"
        >
          <Check className="w-3 h-3 text-brand" strokeWidth={2} />
          <span>Accept all</span>
        </button>

        <button
          type="button"
          onClick={handleRejectAll}
          disabled={rejectedGroupIds.size === totalChanges}
          className="px-2 py-1 text-xs rounded border border-ink-border bg-white hover:bg-[#F5F4F0] text-ink disabled:opacity-40 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-1"
          title="Revert all changes to original draft"
        >
          <RotateCcw className="w-3 h-3 text-ink-subtle" strokeWidth={2} />
          <span>Reject all</span>
        </button>

        <button
          type="button"
          onClick={handleCopyLiveText}
          className="px-2 py-1 text-xs rounded border border-brand/30 bg-[#EEF1FB] hover:bg-[#DCE3FA] text-brand transition-colors inline-flex items-center gap-1 font-medium ml-1"
          title="Copy current edited revision"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-feedback-success" strokeWidth={2} />
              <span className="text-feedback-success">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" strokeWidth={1.75} />
              <span>Copy edited text</span>
            </>
          )}
        </button>
      </div>
    </div>
  );

  if (viewMode === "clean") {
    return (
      <div className="space-y-3">
        {toolbar}
        <div className={cn("text-ink leading-relaxed whitespace-pre-wrap text-xs sm:text-sm", className)}>
          {currentLiveText}
        </div>
      </div>
    );
  }

  if (viewMode === "side-by-side") {
    return (
      <div className="space-y-3">
        {toolbar}
        <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-4", className)}>
          <div className="p-4 bg-[#FCFBFA] border border-ink-border rounded space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-ink-border">
              <span className="text-xs font-sans tracking-[0.04em] text-ink-subtle font-medium">
                Original Draft
              </span>
              <span className="text-xs text-ink-subtle font-mono tabular-nums">
                {original.length} chars
              </span>
            </div>
            <div className="text-xs sm:text-sm text-ink-secondary leading-relaxed whitespace-pre-wrap">
              {original}
            </div>
          </div>

          <div className="p-4 bg-white border border-brand/30 rounded space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-brand/20">
              <span className="text-xs font-sans tracking-[0.04em] text-brand font-medium">
                Current Revision
              </span>
              <span className="text-xs text-ink-subtle font-mono tabular-nums">
                {currentLiveText.length} chars
              </span>
            </div>
            <div className="text-xs sm:text-sm text-ink leading-relaxed whitespace-pre-wrap">
              {currentLiveText}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Redline view with interactive per-change Accept/Reject controls
  return (
    <div className="space-y-3">
      {toolbar}
      <div className={cn("leading-relaxed whitespace-pre-wrap text-ink text-xs sm:text-sm", className)}>
        {groups.map((group, idx) => {
          if (group.type === "equal") {
            return (
              <span key={`equal-${idx}`} className="text-ink">
                {group.text}
              </span>
            );
          }

          const isRejected = rejectedGroupIds.has(group.id);
          const delay = skipStagger ? 0 : group.id * 0.04;

          return (
            <motion.span
              key={`change-${group.id}`}
              initial={skipStagger ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.15, delay }}
              className="inline align-baseline"
            >
              {!isRejected ? (
                // Accepted state (AI improvement active)
                <>
                  {group.removedText && (
                    <del
                      className="line-through text-[#B3261E] bg-[#FDF2F2] px-1 rounded select-text inline border border-[#B3261E]/20"
                      title="Original phrasing removed"
                    >
                      {group.removedText}
                    </del>
                  )}
                  {group.addedText && (
                    <ins
                      className="no-underline bg-[#EAF5EF] text-[#1F7A4D] font-medium px-1 rounded select-text inline ml-0.5 border border-[#1F7A4D]/20"
                      title="AI improved phrasing accepted"
                    >
                      {group.addedText}
                    </ins>
                  )}
                  <button
                    type="button"
                    onClick={() => handleToggleGroup(group.id)}
                    className="inline-flex items-center gap-0.5 text-[10px] text-ink-subtle hover:text-[#B3261E] bg-[#F5F4F0] hover:bg-[#FEE4E2] border border-ink-border px-1 py-0.2 rounded ml-1 transition-colors align-middle"
                    title="Revert to original phrasing"
                  >
                    <X className="w-2.5 h-2.5" strokeWidth={2} />
                    <span>Revert</span>
                  </button>
                </>
              ) : (
                // Rejected state (Original draft kept)
                <>
                  <span
                    className="bg-[#FFF4E5] text-[#9A4200] font-medium px-1 rounded border border-[#FEDF89] select-text inline"
                    title="Original draft phrasing retained"
                  >
                    {group.removedText || "(Original omitted)"}
                  </span>
                  {group.addedText && (
                    <del
                      className="line-through text-ink-subtle opacity-50 text-[11px] select-text inline ml-1"
                      title="Rejected improvement"
                    >
                      {group.addedText}
                    </del>
                  )}
                  <button
                    type="button"
                    onClick={() => handleToggleGroup(group.id)}
                    className="inline-flex items-center gap-0.5 text-[10px] text-brand hover:text-brand-dark bg-[#EEF1FB] hover:bg-[#DCE3FA] border border-brand/30 px-1 py-0.2 rounded ml-1 transition-colors align-middle font-medium"
                    title="Apply improved phrasing"
                  >
                    <Check className="w-2.5 h-2.5" strokeWidth={2} />
                    <span>Accept</span>
                  </button>
                </>
              )}
            </motion.span>
          );
        })}
      </div>
    </div>
  );
}
