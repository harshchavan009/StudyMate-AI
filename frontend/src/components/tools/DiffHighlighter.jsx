import { useMemo } from "react";
import { motion, useReducedMotion } from "motion/react";

export function DiffHighlighter({ text = "", phrases = [] }) {
  const shouldReduceMotion = useReducedMotion();

  const segments = useMemo(() => {
    if (!text || !phrases || phrases.length === 0) {
      return [{ text, isHighlight: false }];
    }

    // Extract valid non-empty improved phrases
    const targets = phrases
      .map((p) => p.improved_phrase?.trim())
      .filter((p) => p && p.length > 2);

    if (targets.length === 0) {
      return [{ text, isHighlight: false }];
    }

    // Escape special regex characters in targets
    const escaped = targets.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    const regex = new RegExp(`(${escaped.join("|")})`, "gi");

    const parts = text.split(regex);
    return parts.map((part) => {
      const isMatch = targets.some((t) => t.toLowerCase() === part.toLowerCase());
      return {
        text: part,
        isHighlight: isMatch,
      };
    });
  }, [text, phrases]);

  return (
    <span className="leading-relaxed">
      {segments.map((segment, index) => {
        if (!segment.isHighlight) {
          return <span key={index}>{segment.text}</span>;
        }

        return (
          <motion.mark
            key={index}
            initial={shouldReduceMotion ? false : { opacity: 0.6, backgroundColor: "rgba(254, 243, 199, 0.2)" }}
            animate={{ opacity: 1, backgroundColor: "#FEF3C7" }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="bg-diff-bg text-ink font-medium px-1 py-0.5 rounded border border-diff-border not-italic inline"
            title="Improved phrase"
          >
            {segment.text}
          </motion.mark>
        );
      })}
    </span>
  );
}

