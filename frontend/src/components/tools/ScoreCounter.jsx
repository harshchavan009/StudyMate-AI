import { useEffect, useRef } from "react";
import { animate, useReducedMotion } from "motion/react";

/**
 * Animated score counter over 700ms using standardized ease (M4).
 * Snaps immediately under prefers-reduced-motion.
 */
export function ScoreCounter({ from = 0, to, value, duration = 0.7 }) {
  const nodeRef = useRef();
  const shouldReduceMotion = useReducedMotion();
  const target = to !== undefined ? to : (value !== undefined ? value : 0);

  useEffect(() => {
    const node = nodeRef.current;
    if (!node) return;

    if (shouldReduceMotion) {
      node.textContent = target;
      return;
    }

    const controls = animate(from, target, {
      duration,
      ease: [0.2, 0, 0, 1],
      onUpdate(val) {
        node.textContent = Math.round(val);
      },
    });

    return () => controls.stop();
  }, [from, target, duration, shouldReduceMotion]);

  return <span ref={nodeRef} className="tabular-nums">{target}</span>;
}

