import { NavLink, useLocation } from "react-router-dom";
import { BookOpen, HelpCircle, PenLine, Lightbulb, Home, Shield, FileCheck } from "lucide-react";
import { AnimatedBackground } from "@/components/motion/AnimatedBackground";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { path: "/", label: "Overview", icon: Home },
  { path: "/summarizer", label: "Summarizer", icon: BookOpen },
  { path: "/quiz", label: "Quiz Generator", icon: HelpCircle },
  { path: "/answer-improver", label: "Answer Improver", icon: PenLine },
  { path: "/concept-explainer", label: "Concept Explainer", icon: Lightbulb },
];

export function Sidebar({ collapsed, onToggleCollapse }) {
  const location = useLocation();

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col border-r border-ink-border bg-white transition-all duration-200 select-none z-20 shrink-0",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Brand Header */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-ink-border">
        <NavLink to="/" className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-7 h-7 rounded-[6px] bg-brand text-white flex items-center justify-center font-serif font-bold text-sm shrink-0">
            S
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-none">
              <span className="font-serif text-sm font-semibold tracking-tight text-ink">
                StudyMate AI
              </span>
              <span className="text-[10px] text-ink-subtle mt-0.5">
                Academic Intelligence
              </span>
            </div>
          )}
        </NavLink>
      </div>

      {/* Navigation Links with AnimatedBackground */}
      <div className="flex-1 py-4 px-2 space-y-1">
        <div className="px-2 pb-2">
          {!collapsed && (
            <span className="text-[10px] font-semibold tracking-wider text-ink-subtle uppercase">
              Study Tools
            </span>
          )}
        </div>

        <AnimatedBackground
          defaultValue={location.pathname}
          className="bg-brand-tint rounded-[6px] border border-brand/10"
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
                  "w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-md transition-colors",
                  isActive
                    ? "text-brand font-semibold"
                    : "text-ink-secondary hover:text-ink"
                )}
                title={collapsed ? item.label : undefined}
              >
                <Icon
                  className={cn("w-4 h-4 shrink-0", isActive ? "text-brand" : "text-ink-subtle")}
                  strokeWidth={1.8}
                />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            );
          })}
        </AnimatedBackground>
      </div>

      {/* Footer Meta */}
      <div className="p-3 border-t border-ink-border text-xs text-ink-subtle space-y-2">
        {!collapsed ? (
          <div className="space-y-1.5 px-1">
            <div className="text-[11px] text-ink-secondary font-medium">StudyMate v1.0</div>
            <div className="flex items-center gap-3 text-[11px]">
              <NavLink to="/privacy" className="hover:text-ink transition-colors">
                Privacy
              </NavLink>
              <span>·</span>
              <NavLink to="/terms" className="hover:text-ink transition-colors">
                Terms
              </NavLink>
            </div>
          </div>
        ) : (
          <div className="text-center text-[10px]">v1.0</div>
        )}
      </div>
    </aside>
  );
}
