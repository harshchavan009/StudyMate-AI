import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * TransitionPanel: 200ms horizontal slide with fade for sequential questions/panels (M4).
 * Supports both array of children and single child keyed by activeIndex.
 */
export function TransitionPanel({
  children,
  className,
  transition = { duration: 0.2, ease: "easeOut" },
  variants,
  activeIndex = 0,
  ...motionProps
}) {
  const defaultVariants = {
    enter: { opacity: 0, x: 16 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -16 },
  };

  const activeVariants = variants || defaultVariants;
  const content = Array.isArray(children) ? children[activeIndex] : children;

  return (
    <div className={cn("relative overflow-hidden", className)}>
      <AnimatePresence initial={false} mode="wait" custom={motionProps.custom}>
        <motion.div
          key={activeIndex}
          variants={activeVariants}
          transition={transition}
          initial="enter"
          animate="center"
          exit="exit"
          {...motionProps}
        >
          {content}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
