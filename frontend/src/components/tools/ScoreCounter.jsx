import { useEffect, useRef } from "react";
import { animate } from "motion/react";

export function ScoreCounter({ from = 0, to = 0, duration = 0.6 }) {
  const nodeRef = useRef();

  useEffect(() => {
    const node = nodeRef.current;
    if (!node) return;

    const controls = animate(from, to, {
      duration,
      ease: "easeOut",
      onUpdate(value) {
        node.textContent = Math.round(value);
      },
    });

    return () => controls.stop();
  }, [from, to, duration]);

  return <span ref={nodeRef} className="tabular-nums">{from}</span>;
}
