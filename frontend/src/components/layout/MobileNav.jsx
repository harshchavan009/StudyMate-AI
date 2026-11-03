import { NavLink, useLocation } from "react-router-dom";
import { BookOpen, HelpCircle, PenLine, Lightbulb, Home } from "lucide-react";
import { AnimatedBackground } from "@/components/motion/AnimatedBackground";
import { cn } from "@/lib/utils";

const MOBILE_NAV_ITEMS = [
  { path: "/", label: "Home", icon: Home },
  { path: "/summarizer", label: "Summary", icon: BookOpen },
  { path: "/quiz", label: "Quiz", icon: HelpCircle },
  { path: "/answer-improver", label: "Improve", icon: PenLine },
  { path: "/concept-explainer", label: "Explain", icon: Lightbulb },
];

export function MobileNav() {
  const location = useLocation();

  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-md border-t border-ink-border px-2 z-40 flex items-center justify-around shadow-sm"
    >
      <AnimatedBackground
        defaultValue={location.pathname}
        className="bg-brand-tint rounded-[6px] border border-brand/10"
        transition={{ type: "tween", ease: "easeOut", duration: 0.18 }}
      >
        {MOBILE_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <NavLink
              key={item.path}
              data-id={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center py-1.5 px-3 rounded-md transition-colors",
                isActive ? "text-brand font-semibold" : "text-ink-secondary"
              )}
            >
              <Icon className="w-4 h-4 mb-1" strokeWidth={isActive ? 2 : 1.75} />
              <span className="text-[10px] tracking-tight">{item.label}</span>
            </NavLink>
          );
        })}
      </AnimatedBackground>
    </nav>
  );
}
