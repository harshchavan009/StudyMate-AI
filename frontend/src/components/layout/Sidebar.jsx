import { useState, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { BookOpen, HelpCircle, PenLine, Lightbulb, Home, Layers, Clock, ArrowRight, X } from "lucide-react";
import { AnimatedBackground } from "@/components/motion/AnimatedBackground";
import { getRecentSessions } from "@/lib/storage";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { path: "/", label: "Home", icon: Home },
  { path: "/study-set", label: "Study Sets", icon: Layers },
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
          "fixed left-0 top-0 bottom-0 h-screen border-r border-white/10 bg-[#14161B] transition-all duration-200 select-none z-50 flex flex-col overflow-y-auto shrink-0",
          // Below 1024px (lg): slide-in drawer
          "lg:z-30",
          drawerOpen ? "translate-x-0 shadow-xl w-[248px]" : "-translate-x-full lg:translate-x-0",
          // At 1024px and wider: standard sidebar
          collapsed ? "lg:w-16" : "lg:w-[248px]"
        )}
      >
        {/* Wordmark Header with Custom Monogram SVG & Close Button on Mobile Drawer */}
        <div className="h-14 px-4 flex items-center justify-between border-b border-white/10 shrink-0">
          <NavLink
            to="/"
            onClick={handleLinkClick}
            className="flex items-center gap-2.5 overflow-hidden group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded"
          >
            {/* Custom Monogram SVG (2.4) */}
            <div className="w-5 h-5 shrink-0 flex items-center justify-center">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="2" y="2" width="20" height="20" rx="4.5" fill="#1F3FBF" />
                <path d="M7 7.5H15.5C16.3284 7.5 17 8.17157 17 9C17 9.82843 16.3284 10.5 15.5 10.5H8.5C7.67157 10.5 7 11.1716 7 12C7 12.8284 7.67157 13.5 8.5 13.5H17" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" />
                <circle cx="12" cy="17.5" r="1.25" fill="#FFFFFF" />
              </svg>
            </div>
            {(!collapsed || drawerOpen) && (
              <span className="font-serif text-lg font-medium tracking-tight text-white group-hover:text-white/90 transition-colors">
                StudyMate AI
              </span>
            )}
          </NavLink>

          {/* Close button inside mobile drawer (below 1024px) */}
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-md hover:bg-white/10 text-[#9A9DA5] hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            aria-label="Close navigation drawer"
          >
            <X className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </div>

        {/* Navigation Links: Full-width flex rows, items-center, justify-start, gap 12px, h-10, pl-4 (1.1, 1.2) */}
        <div className="flex-1 py-4 px-2 space-y-1">
          <div className="px-3 pb-2">
            {(!collapsed || drawerOpen) && (
              <span className="text-[11px] font-medium tracking-[0.04em] text-[#9A9DA5] uppercase">
                Tools
              </span>
            )}
          </div>

          <nav className="space-y-1" aria-label="Tools navigation">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={handleLinkClick}
                  className={({ isActive }) =>
                    cn(
                      "w-full h-10 relative flex items-center justify-start text-left text-sm font-sans pl-4 pr-3 rounded-[6px] transition-colors duration-120 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand overflow-hidden",
                      isActive
                        ? "bg-white/[0.08] text-white font-medium"
                        : "text-[#9A9DA5] hover:text-[#E9E6DF] hover:bg-white/[0.05] font-normal"
                    )
                  }
                  title={collapsed && !drawerOpen ? item.label : undefined}
                >
                  {({ isActive }) => (
                    <>
                      {/* Active Indicator: 3px wide, full height of row (h-10), flush with left edge (1.2) */}
                      {isActive && (
                        <span
                          className="absolute left-0 top-0 bottom-0 w-[3px] bg-white pointer-events-none"
                          aria-hidden="true"
                          data-testid="active-indicator"
                        />
                      )}
                      <Icon
                        className={cn(
                          "w-[18px] h-[18px] shrink-0",
                          isActive ? "text-white" : "text-[#9A9DA5]"
                        )}
                        strokeWidth={1.75}
                      />
                      {(!collapsed || drawerOpen) && (
                        <span className="ml-[12px] truncate nav-item-label" data-testid="nav-label">
                          {item.label}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Bottom of Sidebar: Up to 3 Recent Sessions, Help & Local Storage Notice (2.1) */}
        {(!collapsed || drawerOpen) && (
          <div className="p-3 border-t border-white/10 space-y-3 mt-auto shrink-0 bg-[#14161B]">
            {recentSessions.length > 0 && (
              <div className="space-y-1.5">
                <div className="px-1 flex items-center justify-between text-xs font-sans tracking-[0.04em] text-[#9A9DA5]">
                  <span>Recent</span>
                  <Clock className="w-3 h-3" strokeWidth={1.75} />
                </div>
                <div className="space-y-1">
                  {recentSessions.slice(0, 3).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleOpenRecent(item)}
                      className="w-full text-left px-2.5 py-1.5 rounded hover:bg-white/[0.06] transition-colors flex items-center justify-between gap-2 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                      title={item.title}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-medium text-[#E9E6DF] truncate group-hover:text-white transition-colors">
                          {item.title}
                        </p>
                        <span className="text-[10px] text-[#9A9DA5] block">
                          {item.toolName || item.tool}
                        </span>
                      </div>
                      <ArrowRight className="w-3 h-3 text-[#9A9DA5] group-hover:text-white shrink-0 transition-transform group-hover:translate-x-0.5" strokeWidth={1.75} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs px-1">
              <NavLink
                to="/help"
                className="text-[#9A9DA5] hover:text-[#E9E6DF] transition-colors flex items-center gap-1 font-medium"
              >
                <HelpCircle className="w-3.5 h-3.5" strokeWidth={1.75} />
                <span>Help & FAQs</span>
              </NavLink>
              <span className="text-[10px] text-[#9A9DA5]/70">
                Saved in this browser
              </span>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
