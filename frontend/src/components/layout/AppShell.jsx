import { useState, useEffect } from "react";
import { Outlet, useLocation, Link } from "react-router-dom";
import { MotionConfig } from "motion/react";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";
import { Footer } from "./Footer";
import { Menu, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const BREADCRUMB_NAMES = {
  "/": "Overview",
  "/summarizer": "Summarizer",
  "/quiz": "Quiz Generator",
  "/answer-improver": "Answer Improver",
  "/concept-explainer": "Concept Explainer",
  "/privacy": "Privacy Policy",
  "/terms": "Terms of Service",
};

export function AppShell() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  // Three states: 'checking' | 'online' | 'unreachable'
  const [healthState, setHealthState] = useState("checking");
  const location = useLocation();

  useEffect(() => {
    let isMounted = true;

    const checkHealth = () => {
      api.getHealth()
        .then((res) => {
          if (isMounted) {
            setHealthState(res.status === "healthy" ? "online" : "unreachable");
          }
        })
        .catch(() => {
          if (isMounted) {
            setHealthState("unreachable");
          }
        });
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const currentToolName = BREADCRUMB_NAMES[location.pathname] || "Page";

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-canvas text-ink flex flex-col font-sans antialiased selection:bg-brand-tint selection:text-brand">
        {/* Desktop Left Sidebar (Fixed 264px, full height with independent scroll) */}
        <Sidebar collapsed={sidebarCollapsed} />

        {/* Main Content Column with left offset matching fixed sidebar */}
        <div
          className={cn(
            "flex-1 flex flex-col min-w-0 transition-[padding] duration-200 pb-16 md:pb-0",
            sidebarCollapsed ? "md:pl-16" : "md:pl-[264px]"
          )}
        >
          {/* Top Bar: sticky, 56px (h-14) */}
          <header className="h-14 border-b border-ink-border bg-white/95 backdrop-blur-sm px-4 sm:px-8 flex items-center justify-between shrink-0 sticky top-0 z-20">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="hidden md:flex p-1.5 rounded-md hover:bg-black/5 text-ink-secondary hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                  <Menu className="w-4 h-4" strokeWidth={1.75} />
                </button>

                {/* Minimal Breadcrumb */}
                <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-ink-secondary">
                  <Link to="/" className="hover:text-ink transition-colors">
                    Home
                  </Link>
                  {location.pathname !== "/" && (
                    <>
                      <ChevronRight className="w-3.5 h-3.5 text-ink-subtle" strokeWidth={1.75} />
                      <span className="text-ink font-medium">{currentToolName}</span>
                    </>
                  )}
                </nav>
              </div>

              {/* Real 3-State Backend Health Indicator */}
              <div className="flex items-center">
                <div
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium border border-ink-border bg-[#FAF9F6]"
                  title={`Backend service: ${healthState}`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      healthState === "online"
                        ? "bg-feedback-success"
                        : healthState === "checking"
                        ? "bg-[#D3D2CA] animate-pulse"
                        : "bg-feedback-warning"
                    }`}
                  />
                  <span className="text-ink-secondary capitalize">
                    {healthState === "online"
                      ? "Online"
                      : healthState === "checking"
                      ? "Checking"
                      : "Unreachable"}
                  </span>
                </div>
              </div>
            </header>

            {/* Scrollable Page Content - Consistent Max Width on every page */}
            <main className="flex-1 overflow-y-auto px-4 py-8 sm:px-8 max-w-7xl w-full mx-auto">
              <Outlet />
            </main>

            {/* Footer */}
            <Footer />
          </div>

        {/* Mobile Bottom Navigation */}
        <MobileNav />
      </div>
    </MotionConfig>
  );
}
