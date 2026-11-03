import { NavLink, useLocation } from "react-router-dom";
import { BookOpen, HelpCircle, PenLine, Lightbulb, Home } from "lucide-react";
import { AnimatedBackground } from "@/components/motion/AnimatedBackground";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { path: "/", label: "Home", icon: Home },
  { path: "/summarizer", label: "Summarizer", icon: BookOpen },
  { path: "/quiz", label: "Quiz Generator", icon: HelpCircle },
  { path: "/answer-improver", label: "Answer Improver", icon: PenLine },
  { path: "/concept-explainer", label: "Concept Explainer", icon: Lightbulb },
];

export function Sidebar({ collapsed }) {
  const location = useLocation();

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col fixed left-0 top-0 bottom-0 h-screen border-r border-ink-border bg-white transition-[width] duration-200 select-none z-30 overflow-y-auto shrink-0",
        collapsed ? "w-16" : "w-[264px]"
      )}
    >
      {/* Wordmark Header with Custom SVG Mark */}
      <div className="h-14 px-4 flex items-center border-b border-ink-border">
        <NavLink to="/" className="flex items-center gap-2.5 overflow-hidden group">
          <div className="w-5 h-5 shrink-0 flex items-center justify-center">
            <svg className="w-5 h-5" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <path d="M4 6.5C4 5.67157 4.67157 5 5.5 5H14.5C15.3284 5 16 5.67157 16 6.5V26.5C16 25.6716 15.3284 25 14.5 25H5.5C4.67157 25 4 25.6716 4 26.5V6.5Z" fill="#1F3FBF"/>
              <path d="M28 6.5C28 5.67157 27.3284 5 26.5 5H17.5C16.6716 5 16 5.67157 16 6.5V26.5C16 25.6716 16.6716 25 17.5 25H26.5C27.3284 25 28 25.6716 28 26.5V6.5Z" fill="#1F3FBF" opacity="0.88"/>
              <line x1="8" y1="10" x2="12" y2="10" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="8" y1="14" x2="12" y2="14" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="8" y1="18" x2="11" y2="18" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="20" y1="10" x2="24" y2="10" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="20" y1="14" x2="24" y2="14" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="20" y1="18" x2="23" y2="18" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          {!collapsed && (
            <span className="font-serif text-lg font-medium tracking-tight text-ink group-hover:text-brand transition-colors">
              StudyMate AI
            </span>
          )}
        </NavLink>
      </div>

      {/* Navigation Links with AnimatedBackground */}
      <div className="flex-1 py-4 px-3 space-y-1">
        <div className="px-3 pb-2">
          {!collapsed && (
            <span className="text-[11px] font-medium tracking-wider text-ink-subtle uppercase">
              Tools
            </span>
          )}
        </div>

        <AnimatedBackground
          defaultValue={location.pathname}
          className="bg-brand-tint rounded-md"
          transition={{ type: "tween", ease: "easeOut", duration: 0.18 }}
        >
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <NavLink
                key={item.path}
                data-id={item.path}
                to={item.path}
                className={cn(
                  "w-full h-10 flex items-center justify-start text-left gap-3 px-4 text-xs font-medium rounded-md transition-colors",
                  isActive
                    ? "text-brand font-semibold"
                    : "text-ink-secondary hover:text-ink"
                )}
                title={collapsed ? item.label : undefined}
              >
                <Icon
                  className={cn("w-4 h-4 shrink-0", isActive ? "text-brand" : "text-ink-subtle")}
                  strokeWidth={1.75}
                />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            );
          })}
        </AnimatedBackground>
      </div>
    </aside>
  );
}
