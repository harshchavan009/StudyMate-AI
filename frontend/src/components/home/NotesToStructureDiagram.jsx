/**
 * NotesToStructureDiagram: Custom SVG diagram illustrating the transformation
 * from raw unstructured notes into clean, structured academic documents.
 * Strict design constraints: consistent 1.5px strokes, ink and accent only, zero stock art.
 */
export function NotesToStructureDiagram({ className }) {
  return (
    <div className={className}>
      <svg
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
          {/* Fragmented, uneven lines */}
          <line x1="35" y1="50" x2="155" y2="50" stroke="#16181D" strokeWidth="1.5" strokeOpacity="0.3" strokeLinecap="round" />
          <line x1="35" y1="62" x2="135" y2="62" stroke="#16181D" strokeWidth="1.5" strokeOpacity="0.3" strokeLinecap="round" />
          <line x1="35" y1="74" x2="165" y2="74" stroke="#16181D" strokeWidth="1.5" strokeOpacity="0.3" strokeLinecap="round" />
          <line x1="35" y1="86" x2="115" y2="86" stroke="#16181D" strokeWidth="1.5" strokeOpacity="0.3" strokeLinecap="round" />
          <line x1="35" y1="98" x2="145" y2="98" stroke="#16181D" strokeWidth="1.5" strokeOpacity="0.3" strokeLinecap="round" />
          <line x1="35" y1="110" x2="95" y2="110" stroke="#16181D" strokeWidth="1.5" strokeOpacity="0.3" strokeLinecap="round" />
        </g>

        {/* Transition / Transformation Arrow & Logic Node */}
        <g id="transform-flow">
          <path
            d="M205 70 H275"
            stroke="#1F3FBF"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <circle cx="280" cy="70" r="16" stroke="#1F3FBF" strokeWidth="1.5" fill="#EEF1FB" />
          <path
            d="M275 66 L285 70 L275 74"
            stroke="#1F3FBF"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M300 70 H370"
            stroke="#1F3FBF"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <polygon points="372,70 366,66 366,74" fill="#1F3FBF" />
          <text
            x="280"
            y="98"
            textAnchor="middle"
            fontFamily="Inter, sans-serif"
            fontSize="9"
            fontWeight="500"
            fill="#1F3FBF"
          >
            VALIDATE & SYNTHESIZE
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
          {/* Header pill & title */}
          <rect x="405" y="27" width="55" height="12" rx="3" fill="#EEF1FB" />
          <text
            x="432"
            y="36"
            textAnchor="middle"
            fontFamily="Inter, sans-serif"
            fontSize="8"
            fontWeight="600"
            fill="#1F3FBF"
          >
            SECTION 01
          </text>
          <line x1="468" y1="33" x2="620" y2="33" stroke="#16181D" strokeWidth="1.5" strokeLinecap="round" />

          {/* Structured section 1 */}
          <line x1="405" y1="48" x2="640" y2="48" stroke="#16181D" strokeWidth="1.5" strokeOpacity="0.4" strokeLinecap="round" />
          <line x1="405" y1="58" x2="580" y2="58" stroke="#16181D" strokeWidth="1.5" strokeOpacity="0.4" strokeLinecap="round" />

          {/* Section 2 Divider */}
          <line x1="405" y1="70" x2="645" y2="70" stroke="#16181D" strokeWidth="1.5" strokeOpacity="0.1" />

          {/* Structured section 2 bullets */}
          <rect x="405" y="78" width="55" height="12" rx="3" fill="#EEF1FB" />
          <text
            x="432"
            y="87"
            textAnchor="middle"
            fontFamily="Inter, sans-serif"
            fontSize="8"
            fontWeight="600"
            fill="#1F3FBF"
          >
            SECTION 02
          </text>

          {/* Bullets with accent nodes */}
          <circle cx="410" cy="100" r="2" fill="#1F3FBF" />
          <line x1="418" y1="100" x2="560" y2="100" stroke="#16181D" strokeWidth="1.5" strokeOpacity="0.5" strokeLinecap="round" />
          <circle cx="410" cy="112" r="2" fill="#1F3FBF" />
          <line x1="418" y1="112" x2="620" y2="112" stroke="#16181D" strokeWidth="1.5" strokeOpacity="0.5" strokeLinecap="round" />
        </g>
      </svg>
    </div>
  );
}
