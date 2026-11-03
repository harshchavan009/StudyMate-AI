import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

/**
 * SectionMiniNav: Sticky section navigation on wide screens (C9).
 * Uses IntersectionObserver to highlight whichever section is currently in view.
 * Spec: No entrance animations. Clean instant indicator updates.
 */
export function SectionMiniNav({ sections = [], className = "" }) {
  const [activeSectionId, setActiveSectionId] = useState(sections[0]?.id || "");

  useEffect(() => {
    if (!sections || sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Find visible intersecting entries
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          // Sort by bounding top
          visible.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
          setActiveSectionId(visible[0].target.id);
        }
      },
      {
        rootMargin: "-20% 0px -60% 0px",
        threshold: [0, 0.25, 0.5],
      }
    );

    sections.forEach((sec) => {
      const el = document.getElementById(sec.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [sections]);

  const handleScrollTo = (e, id) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveSectionId(id);
    }
  };

  if (!sections || sections.length === 0) return null;

  return (
    <nav
      aria-label="Document Sections"
      className={cn(
        "hidden xl:block sticky top-20 p-3.5 bg-[#FAF9F6] border border-ink-border rounded-panel text-xs space-y-2 select-none shrink-0 print:hidden",
        className
      )}
    >
      <span className="text-[10px] font-mono uppercase tracking-wider text-ink-subtle font-medium block pb-1 border-b border-ink-border">
        Contents
      </span>

      <ul className="space-y-1">
        {sections.map((sec, idx) => {
          const isActive = activeSectionId === sec.id;
          return (
            <li key={sec.id}>
              <a
                href={`#${sec.id}`}
                onClick={(e) => handleScrollTo(e, sec.id)}
                className={cn(
                  "flex items-center gap-2 py-1 px-1.5 rounded transition-colors text-left",
                  isActive
                    ? "text-brand font-semibold bg-brand-tint"
                    : "text-ink-secondary hover:text-ink hover:bg-black/5"
                )}
              >
                <span className="font-mono text-[10px] opacity-75 shrink-0">
                  0{idx + 1}.
                </span>
                <span className="truncate">{sec.title}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

