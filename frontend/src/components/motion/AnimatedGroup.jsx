import React, { useMemo } from "react";
import { motion, useReducedMotion } from "motion/react";

/**
 * AnimatedGroup: Staggered entry animation component (M3).
 * Animates child elements with opacity fade and 8px rise with 60ms stagger.
 */
export function AnimatedGroup({
  children,
  className,
  variants,
  stagger = 0.06,
  as = "div",
  asChild = "div",
}) {
  const shouldReduceMotion = useReducedMotion();

  const containerVariants = useMemo(() => {
    if (shouldReduceMotion) {
      return { hidden: {}, visible: {} };
    }
    if (variants?.container) return variants.container;
    return {
      hidden: {},
      visible: {
        transition: {
          staggerChildren: stagger,
        },
      },
    };
  }, [variants, stagger, shouldReduceMotion]);

  const itemVariants = useMemo(() => {
    if (shouldReduceMotion) {
      return {
        hidden: { opacity: 1, y: 0 },
        visible: { opacity: 1, y: 0 },
      };
    }
    if (variants?.item) return variants.item;
    return {
      hidden: { opacity: 0, y: 8 },
      visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.25, ease: "easeOut" },
      },
    };
  }, [variants, shouldReduceMotion]);

  const MotionComponent = useMemo(
    () => motion.create(as),
    [as]
  );
  const MotionChild = useMemo(
    () => motion.create(asChild),
    [asChild]
  );

  return (
    <MotionComponent
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className={className}
    >
      {React.Children.map(children, (child, index) => {
        if (!child) return null;
        return (
          <MotionChild key={index} variants={itemVariants}>
            {child}
          </MotionChild>
        );
      })}
    </MotionComponent>
  );
}
