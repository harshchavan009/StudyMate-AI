import { useMemo } from "react";
import { motion, useReducedMotion } from "motion/react";
import { diffWordsWithSpace } from "diff";
import { cn } from "@/lib/utils";

/**
 * Word-level diff viewer for Answer Improver (M5).
 * Views:
 * - 'redline': Inline word diff with strikethrough deletions, underline + accent tint additions,
 *              staggered 40ms reveal (skipped if > 60 changes or reduced motion).
 * - 'clean': Clean improved answer only.
 * - 'side-by-side': Original answer and clean improved answer side-by-side on wide screens.
 */
export function DiffHighlighter({
  original = "",
  improved = "",
  viewMode = "redline", // 'redline' | 'clean' | 'side-by-side'
  className = "",
}) {
  const shouldReduceMotion = useReducedMotion();

  const diffChunks = useMemo(() => {
    if (!original || !improved) return [];
    return diffWordsWithSpace(original, improved);
  }, [original, improved]);

  const changeCount = useMemo(() => {
    return diffChunks.filter((chunk) => chunk.added || chunk.removed).length;
  }, [diffChunks]);

  const skipStagger = shouldReduceMotion || changeCount > 60;

  if (viewMode === "clean") {
    return (
      <div className={cn("text-ink leading-relaxed whitespace-pre-wrap", className)}>
        {improved}
      </div>
    );
  }

  if (viewMode === "side-by-side") {
    return (
      <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-4", className)}>
        <div className="p-4 bg-[#FCFBFA] border border-ink-border rounded-panel space-y-2">
          <div className="flex items-center justify-between pb-2 border-b border-ink-border">
            <span className="text-[11px] font-mono uppercase tracking-wider text-ink-subtle font-medium">
              Original Draft
            </span>
            <span className="text-[11px] text-ink-subtle">
              {original.length} chars
            </span>
          </div>
          <div className="text-xs sm:text-sm text-ink-secondary leading-relaxed whitespace-pre-wrap">
            {original}
          </div>
        </div>

        <div className="p-4 bg-white border border-brand/20 rounded-panel space-y-2 shadow-sm">
          <div className="flex items-center justify-between pb-2 border-b border-brand/20">
            <span className="text-[11px] font-mono uppercase tracking-wider text-brand font-medium">
              Polished Revision
            </span>
            <span className="text-[11px] text-ink-subtle">
              {improved.length} chars
            </span>
          </div>
          <div className="text-xs sm:text-sm text-ink leading-relaxed whitespace-pre-wrap">
            {improved}
          </div>
        </div>
      </div>
    );
  }

  // Redline view (M5): Strikethrough for removed, underline + accent tint for added (never color alone)
  let changeIndex = 0;

  return (
    <div className={cn("leading-relaxed whitespace-pre-wrap text-ink", className)}>
      {diffChunks.map((chunk, idx) => {
        if (chunk.removed) {
          const currentChange = changeIndex++;
          const delay = skipStagger ? 0 : currentChange * 0.04;

          return (
            <motion.del
              key={`del-${idx}`}
              initial={skipStagger ? false : { opacity: 0, y: -2 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15, delay }}
              className="line-through text-[#B3261E] bg-[#FDF2F2] px-1 py-0.5 rounded text-xs sm:text-sm decoration-[#B3261E] select-text mx-0.5 inline-block"
              title="Removed original phrasing"
            >
              {chunk.value}
            </motion.del>
          );
        }

        if (chunk.added) {
          const currentChange = changeIndex++;
          const delay = skipStagger ? 0 : currentChange * 0.04;

          return (
            <motion.ins
              key={`ins-${idx}`}
              initial={skipStagger ? false : { opacity: 0, y: 2 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15, delay }}
              className="no-underline underline underline-offset-4 decoration-[#1F3FBF] bg-[#EEF1FB] text-[#1F3FBF] font-medium px-1 py-0.5 rounded text-xs sm:text-sm select-text mx-0.5 inline-block"
              title="Added improved phrasing"
            >
              {chunk.value}
            </motion.ins>
          );
        }

        return (
          <span key={`text-${idx}`} className="text-xs sm:text-sm text-ink">
            {chunk.value}
          </span>
        );
      })}
    </div>
  );
}
