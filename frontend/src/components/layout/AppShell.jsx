import { useState, useEffect } from "react";
import { Outlet, useLocation, Link } from "react-router-dom";
import { MotionConfig } from "motion/react";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";
import { Footer } from "./Footer";
import { Menu, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api";

const ROUTE_TITLES = {
  "/": "Overview",
  "/summarizer": "Academic Summarizer",
  "/quiz": "Practice Quiz Generator",
  "/answer-improver": "Answer Improver",
  "/concept-explainer": "Concept Explainer",
  "/privacy": "Privacy Policy",
  "/terms": "Terms of Service",
};

export function AppShell() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [apiOnline, setApiOnline] = useState(null);
  const location = useLocation();

  useEffect(() => {
    // Check backend health quietly on initial mount
    api.getHealth()
      .then((res) => setApiOnline(res.status === "healthy"))
      .catch(() => setApiOnline(false));
  }, []);

  const currentTitle = ROUTE_TITLES[location.pathname] || "StudyMate AI";

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-canvas text-ink flex flex-col font-sans antialiased selection:bg-brand-tint selection:text-brand">
        <div className="flex-1 flex overflow-hidden">
          {/* Desktop & Tablet Sidebar */}
          <Sidebar
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          />

          {/* Main Area */}
          <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
            {/* Top Bar */}
            <header className="h-14 border-b border-ink-border bg-white px-4 sm:px-8 flex items-center justify-between shrink-0 sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="hidden md:flex p-1.5 rounded-md hover:bg-black/5 text-ink-secondary hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                  <Menu className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-2">
                  <h1 className="font-serif font-medium text-sm sm:text-base text-ink tracking-tight">
                    {currentTitle}
                  </h1>
                </div>
              </div>

              {/* Status Indicator */}
              <div className="flex items-center gap-3">
                <div
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium border"
                  title={apiOnline ? "Backend connected" : "Backend offline or mock mode active"}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      apiOnline === true
                        ? "bg-feedback-success"
                        : apiOnline === false
                        ? "bg-feedback-warning"
                        : "bg-ink-subtle"
                    }`}
                  />
                  <span className="text-ink-secondary text-[10px]">
                    {apiOnline === true
                      ? "System Online"
                      : apiOnline === false
                      ? "Local Engine"
                      : "Connecting"}
                  </span>
                </div>
              </div>
            </header>

            {/* Scrollable Page Content */}
            <main className="flex-1 overflow-y-auto px-4 py-8 sm:px-8 max-w-6xl w-full mx-auto">
              <Outlet />
            </main>

            {/* Footer */}
            <Footer />
          </div>
        </div>

        {/* Mobile Navigation */}
        <MobileNav />
      </div>
    </MotionConfig>
  );
}

