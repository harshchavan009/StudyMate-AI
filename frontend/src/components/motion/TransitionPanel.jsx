import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";

export function TransitionPanel({
  children,
  className,
  transition = { duration: 0.2, ease: "easeOut" },
  variants,
  activeIndex,
  ...motionProps
}) {
  const defaultVariants = {
    enter: { opacity: 0, x: 12 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -12 },
  };

  const activeVariants = variants || defaultVariants;

  return (
    <div className={cn("relative", className)}>
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
          {children[activeIndex]}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

