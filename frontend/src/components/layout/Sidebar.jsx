import { useState, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { BookOpen, HelpCircle, PenLine, Lightbulb, Home, Clock, ArrowRight, X } from "lucide-react";
import { AnimatedBackground } from "@/components/motion/AnimatedBackground";
import { getRecentSessions } from "@/lib/storage";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { path: "/", label: "Home", icon: Home },
  { path: "/summarizer", label: "Summarizer", icon: BookOpen },
  { path: "/quiz", label: "Quiz Generator", icon: HelpCircle },
  { path: "/answer-improver", label: "Answer Improver", icon: PenLine },
  { path: "/concept-explainer", label: "Concept Explainer", icon: Lightbulb },
];

const TOOL_PATH_MAP = {
  summarizer: "/summarizer",
  quiz: "/quiz",
  improver: "/answer-improver",
  explainer: "/concept-explainer",
};

/**
 * Sidebar: Fixed desktop sidebar at >= 1024px (lg:), and accessible slide-in drawer below 1024px (C12).
 */
export function Sidebar({ collapsed = false, drawerOpen = false, onClose = null }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [recentSessions, setRecentSessions] = useState([]);

  useEffect(() => {
    setRecentSessions(getRecentSessions());
  }, [location.pathname]);

  // Close drawer on Escape key (C11)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && drawerOpen && onClose) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [drawerOpen, onClose]);

  const handleOpenRecent = (item) => {
    const targetPath = TOOL_PATH_MAP[item.tool] || "/summarizer";
    if (onClose) onClose();
    navigate(targetPath, { state: { session: item } });
  };

  const handleLinkClick = () => {
    if (onClose) onClose();
  };

  return (
    <>
      {/* Mobile Backdrop Overlay (below 1024px) */}
      {drawerOpen && (
        <div
          onClick={onClose}
          className="lg:hidden fixed inset-0 bg-black/40 z-40 animate-fadeIn"
          aria-hidden="true"
        />
      )}

      {/* Sidebar / Drawer Container */}
      <aside
        id="app-sidebar"
        aria-label="Navigation Sidebar"
        className={cn(
          "fixed left-0 top-0 bottom-0 h-screen border-r border-ink-border bg-white transition-all duration-200 select-none z-50 flex flex-col overflow-y-auto shrink-0",
          // Below 1024px (lg): slide-in drawer
          "lg:z-30",
          drawerOpen ? "translate-x-0 shadow-xl w-[264px]" : "-translate-x-full lg:translate-x-0",
          // At 1024px and wider: standard sidebar
          collapsed ? "lg:w-16" : "lg:w-[264px]"
        )}
      >
        {/* Wordmark Header with Custom SVG Mark & Close Button on Mobile Drawer */}
        <div className="h-14 px-4 flex items-center justify-between border-b border-ink-border shrink-0">
          <NavLink
            to="/"
            onClick={handleLinkClick}
            className="flex items-center gap-2.5 overflow-hidden group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded"
          >
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
            {(!collapsed || drawerOpen) && (
              <span className="font-serif text-lg font-medium tracking-tight text-ink group-hover:text-brand transition-colors">
                StudyMate AI
              </span>
            )}
          </NavLink>

          {/* Close button inside mobile drawer (below 1024px) */}
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-md hover:bg-black/5 text-ink-secondary hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            aria-label="Close navigation drawer"
          >
            <X className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </div>

        {/* Navigation Links with AnimatedBackground & Active Left Bar */}
        <div className="flex-1 py-4 px-3 space-y-1">
          <div className="px-3 pb-2">
            {(!collapsed || drawerOpen) && (
              <span className="text-[11px] font-medium tracking-wider text-ink-subtle uppercase">
                Tools
              </span>
            )}
          </div>

          <AnimatedBackground
            defaultValue={location.pathname}
            className="bg-brand-tint rounded-md"
            innerClassName="justify-start gap-3 h-full px-3.5"
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
                  onClick={handleLinkClick}
                  className={cn(
                    "w-full h-10 relative flex items-center justify-start text-left text-xs rounded-control transition-colors duration-120 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                    isActive
                      ? "text-brand font-semibold"
                      : "text-ink-secondary hover:text-ink font-normal hover:bg-[#F5F4F0]"
                  )}
                  title={collapsed && !drawerOpen ? item.label : undefined}
                >
                  {/* 2px solid accent bar on the left when active (B3 / Carry over a, b) */}
                  {isActive && (
                    <span className="absolute left-0 top-2 bottom-2 w-[2px] bg-brand rounded-r" />
                  )}
                  <Icon
                    className={cn("w-[18px] h-[18px] shrink-0", isActive ? "text-brand" : "text-ink-subtle")}
                    strokeWidth={1.75}
                  />
                  {(!collapsed || drawerOpen) && <span className="truncate">{item.label}</span>}
                </NavLink>
              );
            })}
          </AnimatedBackground>
        </div>

        {/* Bottom of Sidebar: 3 Most Recent Sessions from Real History (B3) */}
        {(!collapsed || drawerOpen) && recentSessions.length > 0 && (
          <div className="p-3 border-t border-ink-border space-y-2 mt-auto shrink-0 bg-white">
            <div className="px-1 flex items-center justify-between text-xs font-sans tracking-[0.04em] text-ink-subtle">
              <span>Recent</span>
              <Clock className="w-3 h-3" strokeWidth={1.75} />
            </div>
            <div className="space-y-1">
              {recentSessions.slice(0, 3).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleOpenRecent(item)}
                  className="w-full text-left px-2.5 py-1.5 rounded hover:bg-[#F3F1EC] transition-colors flex items-center justify-between gap-2 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  title={item.title}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium text-ink truncate group-hover:text-brand transition-colors">
                      {item.title}
                    </p>
                    <span className="text-[10px] text-ink-subtle block">
                      {item.toolName || item.tool}
                    </span>
                  </div>
                  <ArrowRight className="w-3 h-3 text-ink-subtle group-hover:text-ink shrink-0 transition-transform group-hover:translate-x-0.5" strokeWidth={1.75} />
                </button>
              ))}
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
