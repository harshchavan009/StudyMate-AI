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
        "hidden md:flex flex-col border-r border-ink-border bg-white transition-all duration-200 select-none z-20 shrink-0",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Wordmark Header (No letter-in-a-square) */}
      <div className="h-14 px-4 flex items-center border-b border-ink-border">
        <NavLink to="/" className="flex items-center gap-2 overflow-hidden">
          {!collapsed ? (
            <span className="font-serif text-lg font-semibold tracking-tight text-ink">
              StudyMate AI
            </span>
          ) : (
            <span className="font-serif text-lg font-semibold tracking-tight text-ink">
              S
            </span>
          )}
        </NavLink>
      </div>

      {/* Navigation Links with AnimatedBackground */}
      <div className="flex-1 py-4 px-2 space-y-1">
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
                  "w-full h-9 flex items-center gap-3 px-3 text-xs font-medium rounded-md transition-colors",
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
