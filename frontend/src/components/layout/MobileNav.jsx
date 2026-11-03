import { NavLink, useLocation } from "react-router-dom";
import { BookOpen, HelpCircle, PenLine, Lightbulb, Home } from "lucide-react";
import { AnimatedBackground } from "@/components/motion/AnimatedBackground";
import { cn } from "@/lib/utils";

const MOBILE_NAV_ITEMS = [
  { path: "/", label: "Home", icon: Home },
  { path: "/summarizer", label: "Summarizer", icon: BookOpen },
  { path: "/quiz", label: "Quiz", icon: HelpCircle },
  { path: "/answer-improver", label: "Improver", icon: PenLine },
  { path: "/concept-explainer", label: "Explainer", icon: Lightbulb },
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
        className="bg-brand-tint rounded-md"
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
                "flex flex-col items-center justify-center py-1 px-2.5 rounded-md transition-colors",
                isActive ? "text-brand font-semibold" : "text-ink-secondary"
              )}
            >
              <Icon className="w-4 h-4 mb-0.5" strokeWidth={1.75} />
              <span className="text-[10px] tracking-tight">{item.label}</span>
            </NavLink>
          );
        })}
      </AnimatedBackground>
    </nav>
  );
}
