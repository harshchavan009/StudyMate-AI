import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Play, RotateCcw } from "lucide-react";

/**
 * NotesToStructureDiagram: Topic-specific animated transformation diagram.
 * Illustrates raw unstructured lecture notes being analyzed, structured,
 * and turned into clean, formatted academic study sections.
 * Built with strict design constraints: consistent 1.5px strokes, ink and accent colors only.
 */
export function NotesToStructureDiagram({ className = "" }) {
  const shouldReduceMotion = useReducedMotion();
  const [cycleKey, setCycleKey] = useState(0);

  const handleReplay = () => {
    setCycleKey((k) => k + 1);
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between text-xs px-1">
        <span className="text-xs font-sans tracking-[0.04em] text-ink-subtle uppercase">
          Topic Transformation Pipeline
        </span>
        <button
          type="button"
          onClick={handleReplay}
          className="inline-flex items-center gap-1.5 text-xs text-ink-subtle hover:text-brand font-medium transition-colors"
          title="Replay flow animation"
        >
          <RotateCcw className="w-3 h-3" strokeWidth={1.75} />
          <span>Replay flow</span>
        </button>
      </div>

      <div className="relative overflow-hidden p-2 sm:p-4 bg-[#FCFBFA] rounded-md border border-ink-border">
        <svg
          key={cycleKey}
          viewBox="0 0 680 140"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-auto max-w-2xl mx-auto"
          aria-hidden="true"
        >
          {/* Left Card: Raw Unstructured Notes */}
          <g id="raw-notes">
            <rect
              x="20"
              y="15"
              width="170"
              height="110"
              rx="8"
              stroke="#16181D"
              strokeWidth="1.5"
              strokeDasharray="4 3"
              fill="#FFFFFF"
            />
            <text
              x="35"
              y="35"
              fontFamily="Inter, sans-serif"
              fontSize="10"
              fontWeight="600"
              fill="#5B6070"
              letterSpacing="0.05em"
            >
              RAW NOTES
            </text>

            {/* Fragmented, uneven lines with staggered pulse animation */}
            {[
              { y: 50, x2: 155, delay: 0 },
              { y: 62, x2: 135, delay: 0.1 },
              { y: 74, x2: 165, delay: 0.2 },
              { y: 86, x2: 115, delay: 0.3 },
              { y: 98, x2: 145, delay: 0.4 },
              { y: 110, x2: 95, delay: 0.5 },
            ].map((line, i) => (
              <motion.line
                key={i}
                x1="35"
                y1={line.y}
                x2={line.x2}
                y2={line.y}
                stroke="#16181D"
                strokeWidth="1.5"
                strokeLinecap="round"
                initial={shouldReduceMotion ? { strokeOpacity: 0.3 } : { strokeOpacity: 0.15, x2: 60 }}
                animate={shouldReduceMotion ? { strokeOpacity: 0.3 } : { strokeOpacity: 0.4, x2: line.x2 }}
                transition={{ duration: 0.6, delay: line.delay, ease: "easeOut" }}
              />
            ))}
          </g>

          {/* Transition / Transformation Arrow & Logic Node */}
          <g id="transform-flow">
            {/* Flow line 1 */}
            <line
              x1="205"
              y1="70"
              x2="265"
              y2="70"
              stroke="#1F3FBF"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeDasharray="3 3"
              className="animate-flow-dash"
            />

            {/* Central Processing Node */}
            <circle
              cx="280"
              cy="70"
              r="16"
              stroke="#1F3FBF"
              strokeWidth="1.5"
              fill="#EEF1FB"
            />

            <motion.circle
              cx="280"
              cy="70"
              r="19"
              stroke="#1F3FBF"
              strokeWidth="1"
              fill="none"
              initial={false}
              animate={shouldReduceMotion ? {} : { scale: [1, 1.15, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
            />

            <path
              d="M276 66 L284 70 L276 74"
              stroke="#1F3FBF"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Flow line 2 */}
            <line
              x1="296"
              y1="70"
              x2="368"
              y2="70"
              stroke="#1F3FBF"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeDasharray="3 3"
              className="animate-flow-dash"
            />
            <polygon points="372,70 365,66 365,74" fill="#1F3FBF" />

            <text
              x="280"
              y="98"
              textAnchor="middle"
              fontFamily="Inter, sans-serif"
              fontSize="9"
              fontWeight="600"
              fill="#1F3FBF"
              letterSpacing="0.04em"
            >
              STRUCTURE
            </text>
          </g>

          {/* Right Card: Structured Academic Output */}
          <g id="structured-document">
            <rect
              x="390"
              y="15"
              width="270"
              height="110"
              rx="8"
              stroke="#16181D"
              strokeWidth="1.5"
              fill="#FFFFFF"
            />

            {/* Section 01 Header */}
            <rect x="405" y="27" width="60" height="12" rx="3" fill="#EEF1FB" />
            <text
              x="435"
              y="36"
              textAnchor="middle"
              fontFamily="Inter, sans-serif"
              fontSize="8"
              fontWeight="600"
              fill="#1F3FBF"
            >
              OVERVIEW
            </text>
            <motion.line
              x1="472"
              y1="33"
              x2="620"
              y2="33"
              stroke="#16181D"
              strokeWidth="1.5"
              strokeLinecap="round"
              initial={shouldReduceMotion ? {} : { pathLength: 0 }}
              animate={shouldReduceMotion ? {} : { pathLength: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            />

            {/* Structured section 1 text bars */}
            <motion.line
              x1="405"
              y1="48"
              x2="640"
              y2="48"
              stroke="#16181D"
              strokeWidth="1.5"
              strokeOpacity="0.4"
              strokeLinecap="round"
              initial={shouldReduceMotion ? {} : { pathLength: 0 }}
              animate={shouldReduceMotion ? {} : { pathLength: 1 }}
              transition={{ duration: 0.5, delay: 0.6 }}
            />
            <motion.line
              x1="405"
              y1="58"
              x2="580"
              y2="58"
              stroke="#16181D"
              strokeWidth="1.5"
              strokeOpacity="0.4"
              strokeLinecap="round"
              initial={shouldReduceMotion ? {} : { pathLength: 0 }}
              animate={shouldReduceMotion ? {} : { pathLength: 1 }}
              transition={{ duration: 0.5, delay: 0.7 }}
            />

            {/* Section 2 Divider */}
            <line x1="405" y1="70" x2="645" y2="70" stroke="#16181D" strokeWidth="1.5" strokeOpacity="0.1" />

            {/* Section 02 Bullets */}
            <rect x="405" y="78" width="65" height="12" rx="3" fill="#EEF1FB" />
            <text
              x="437"
              y="87"
              textAnchor="middle"
              fontFamily="Inter, sans-serif"
              fontSize="8"
              fontWeight="600"
              fill="#1F3FBF"
            >
              KEY POINTS
            </text>

            {/* Bullets with accent nodes */}
            <circle cx="410" cy="100" r="2.5" fill="#1F3FBF" />
            <motion.line
              x1="418"
              y1="100"
              x2="560"
              y2="100"
              stroke="#16181D"
              strokeWidth="1.5"
              strokeOpacity="0.5"
              strokeLinecap="round"
              initial={shouldReduceMotion ? {} : { pathLength: 0 }}
              animate={shouldReduceMotion ? {} : { pathLength: 1 }}
              transition={{ duration: 0.5, delay: 0.9 }}
            />
            <circle cx="410" cy="112" r="2.5" fill="#1F3FBF" />
            <motion.line
              x1="418"
              y1="112"
              x2="620"
              y2="112"
              stroke="#16181D"
              strokeWidth="1.5"
              strokeOpacity="0.5"
              strokeLinecap="round"
              initial={shouldReduceMotion ? {} : { pathLength: 0 }}
              animate={shouldReduceMotion ? {} : { pathLength: 1 }}
              transition={{ duration: 0.5, delay: 1.0 }}
            />
          </g>
        </svg>
      </div>
    </div>
  );
}
