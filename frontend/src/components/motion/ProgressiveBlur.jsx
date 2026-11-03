import { useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * ProgressiveBlur: Layered blur primitive (M7).
 * Allowed only in two places:
 * 1. Sticky top bar edge while content scrolls beneath it.
 * 2. Bottom edge of a scrolling output panel.
 * Strictly adheres to project design rules: NO gradients, hairline fallback under reduced motion.
 */
export function ProgressiveBlur({
  direction = "bottom", // 'top' | 'bottom'
  height = "6px",
  className = "",
}) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return (
      <div
        className={cn(
          "w-full pointer-events-none",
          direction === "bottom" ? "border-b border-ink-border" : "border-t border-ink-border",
          className
        )}
        aria-hidden="true"
      />
    );
  }

  return (
    <div
      className={cn(
        "w-full pointer-events-none relative overflow-hidden",
        direction === "bottom" ? "border-b border-ink-border" : "border-t border-ink-border",
        className
      )}
      style={{ height }}
      aria-hidden="true"
    >
      <div className="absolute inset-0 backdrop-blur-[3px] bg-white/60" />
    </div>
  );
}
