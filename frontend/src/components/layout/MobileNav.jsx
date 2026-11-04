import { NavLink, useLocation } from "react-router-dom";
import { BookOpen, HelpCircle, PenLine, Lightbulb, Home, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

const MOBILE_NAV_ITEMS = [
  { path: "/", label: "Home", icon: Home },
  { path: "/study-set", label: "Sets", icon: Layers },
  { path: "/summarizer", label: "Summarize", icon: BookOpen },
  { path: "/quiz", label: "Quiz", icon: HelpCircle },
  { path: "/answer-improver", label: "Improver", icon: PenLine },
  { path: "/concept-explainer", label: "Explain", icon: Lightbulb },
];

/**
 * MobileNav: Bottom navigation bar for mobile and tablet viewports below 1024px.
 * Strict token styling: 44px minimum touch targets, #1F3FBF accent, no pill buttons.
 */
export function MobileNav() {
  const location = useLocation();

  return (
    <nav
      aria-label="Mobile Navigation"
      className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-md border-t border-[rgba(22,24,29,0.10)] px-1 z-40 flex items-center justify-around"
    >
      {MOBILE_NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive =
          item.path === "/"
            ? location.pathname === "/"
            : location.pathname.startsWith(item.path);

        return (
          <NavLink
            key={item.path}
            to={item.path}
            className={cn(
              "flex flex-col items-center justify-center min-h-[44px] flex-1 py-1 px-1 rounded-[6px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
              isActive
                ? "text-brand font-medium bg-[#EEF1FB]"
                : "text-ink-secondary hover:text-ink hover:bg-canvas/60"
            )}
          >
            <Icon className="w-4 h-4 mb-0.5" strokeWidth={1.75} />
            <span className="text-[10px] tracking-tight">{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
