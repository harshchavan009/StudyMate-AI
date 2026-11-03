import React, { useMemo } from "react";
import { motion } from "motion/react";

const defaultContainerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.04,
    },
  },
};

const defaultItemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: "easeOut" },
  },
};

export function AnimatedGroup({
  children,
  className,
  variants,
  as = "div",
  asChild = "div",
}) {
  const containerVariants = variants?.container || defaultContainerVariants;
  const itemVariants = variants?.item || defaultItemVariants;

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

