import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

export function SkeletonBlock({ className, lines = 3, showHeading = true }) {
  const shouldReduceMotion = useReducedMotion();

  const pulseAnimation = shouldReduceMotion
    ? {}
    : {
        opacity: [0.65, 0.95, 0.65],
        transition: {
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut",
        },
      };

  return (
    <div className={cn("p-6 bg-white border border-ink-border rounded-lg shadow-hairline space-y-4", className)}>
      {showHeading && (
        <motion.div
          animate={pulseAnimation}
          className="h-5 bg-[#EAE8E3] rounded-[4px] w-1/3 mb-3"
        />
      )}
      <div className="space-y-2.5">
        {Array.from({ length: lines }).map((_, i) => (
          <motion.div
            key={i}
            animate={pulseAnimation}
            className={cn(
              "h-3.5 bg-[#F2F0EB] rounded-[3px]",
              i === 0 ? "w-full" : i === 1 ? "w-5/6" : "w-3/4"
            )}
          />
        ))}
      </div>
    </div>
  );
}

export function SkeletonSummarizer() {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <div className="text-xs text-ink-secondary flex items-center gap-2 mb-2 font-medium">
        <span className="w-2 h-2 rounded-full bg-brand animate-ping inline-block" />
        Synthesizing academic text across 6 sections...
      </div>
      <SkeletonBlock lines={3} />
      <SkeletonBlock lines={4} />
      <SkeletonBlock lines={4} />
      <SkeletonBlock lines={3} />
      <SkeletonBlock lines={3} />
      <SkeletonBlock lines={3} />
    </div>
  );
}
