import { useState, useEffect } from "react";
import { Outlet, useLocation, Link } from "react-router-dom";
import { MotionConfig, motion, AnimatePresence } from "motion/react";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";
import { Footer } from "./Footer";
import { ProgressiveBlur } from "@/components/motion/ProgressiveBlur";
import { CommandMenu } from "@/components/ui/CommandMenu";
import { Menu, ChevronRight, Search } from "lucide-react";
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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [commandMenuOpen, setCommandMenuOpen] = useState(false);
  // Three states: 'checking' | 'online' | 'unreachable'
  const [healthState, setHealthState] = useState("checking");
  const location = useLocation();

  // Global Cmd+K / Ctrl+K keyboard shortcut (F6)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandMenuOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  // Wake backend and verify health state once on load (C5)
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
      {/* Skip to Main Content Link for Keyboard Accessibility (C11) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-brand focus:text-white focus:rounded focus:text-xs focus:font-semibold focus:shadow-md"
      >
        Skip to main content
      </a>

      <div className="min-h-screen bg-canvas text-ink flex flex-col font-sans antialiased selection:bg-brand-tint selection:text-brand">
        {/* Desktop Sidebar (>= 1024px) & Mobile Drawer (< 1024px) (C12) */}
        <Sidebar
          collapsed={sidebarCollapsed}
          drawerOpen={drawerOpen}
          onClose={() => setDrawerOpen(false)}
        />

        {/* Main Content Column with left offset matching desktop sidebar */}
        <div
          className={cn(
            "flex-1 flex flex-col min-w-0 transition-[padding] duration-200 pb-16 lg:pb-0",
            sidebarCollapsed ? "lg:pl-16" : "lg:pl-[264px]"
          )}
        >
          {/* Top Bar: sticky, 56px (h-14) with Progressive Blur edge (M7) */}
          <div className="sticky top-0 z-20">
            <header className="h-14 border-b border-ink-border bg-white/95 backdrop-blur-sm px-4 sm:px-8 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                {/* Mobile hamburger button (< 1024px) opens drawer; desktop button collapses sidebar */}
                <button
                  type="button"
                  onClick={() => {
                    if (window.innerWidth < 1024) {
                      setDrawerOpen(!drawerOpen);
                    } else {
                      setSidebarCollapsed(!sidebarCollapsed);
                    }
                  }}
                  className="p-1.5 rounded-md hover:bg-black/5 text-ink-secondary hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  aria-label={
                    drawerOpen
                      ? "Close navigation drawer"
                      : sidebarCollapsed
                      ? "Expand sidebar"
                      : "Toggle navigation"
                  }
                >
                  <Menu className="w-4 h-4" strokeWidth={1.75} />
                </button>

                {/* Minimal Breadcrumb */}
                <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-ink-secondary">
                  <Link to="/" className="hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand rounded">
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

              {/* Right Header: Search Shortcut + Real 3-State Backend Health Indicator */}
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setCommandMenuOpen(true)}
                  className="hidden sm:inline-flex items-center gap-2 px-2.5 py-1 rounded text-xs text-ink-secondary hover:text-ink bg-[#FAF9F6] border border-ink-border hover:border-brand/40 transition-colors"
                  title="Search commands and recent sessions (Cmd+K)"
                  aria-label="Open command menu"
                >
                  <Search className="w-3.5 h-3.5 text-ink-subtle" strokeWidth={1.75} />
                  <span>Search or jump...</span>
                  <kbd className="px-1.5 py-0.5 bg-[#EAE8E3] border border-ink-border/60 rounded text-[10px] font-mono text-ink shadow-[0_1px_0_rgba(0,0,0,0.06)]">
                    ⌘K
                  </kbd>
                </button>

                <div
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium border border-ink-border bg-[#FAF9F6]"
                  title={`Backend service: ${healthState}`}
                >
                  <span
                    className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      healthState === "online" && "bg-feedback-success",
                      healthState === "checking" && "bg-[#D3D2CA] animate-pulse",
                      healthState === "unreachable" && "bg-feedback-warning"
                    )}
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

            {/* Progressive Blur edge at sticky top bar edge (M7) */}
            <ProgressiveBlur direction="bottom" />
          </div>

          {/* Route Change Transition: 150ms fade with 4px rise (M2) */}
          <AnimatePresence mode="wait">
            <motion.main
              key={location.pathname}
              id="main-content"
              tabIndex={-1}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="flex-1 overflow-y-auto px-4 py-8 sm:px-8 max-w-7xl w-full mx-auto focus:outline-none"
            >
              <Outlet />
            </motion.main>
          </AnimatePresence>

          {/* Footer */}
          <Footer />
        </div>

        {/* Mobile Bottom Navigation (below 1024px) */}
        <div className="lg:hidden">
          <MobileNav />
        </div>

        {/* Global Command Menu (Cmd/Ctrl + K) (F6) */}
        <CommandMenu
          isOpen={commandMenuOpen}
          onClose={() => setCommandMenuOpen(false)}
        />
      </div>
    </MotionConfig>
  );
}
