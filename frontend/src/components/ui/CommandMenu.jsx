import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  BookOpen,
  HelpCircle,
  PenLine,
  Lightbulb,
  Home,
  Trash2,
  Activity,
  ArrowRight,
  X,
} from "lucide-react";
import { getRecentSessions, clearRecentSessions, formatTimeAgo } from "@/lib/storage";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const CORE_TOOLS = [
  {
    id: "tool-home",
    title: "Home",
    category: "Tools",
    description: "Overview and recent sessions",
    icon: Home,
    path: "/",
  },
  {
    id: "tool-summarizer",
    title: "Summarizer",
    category: "Tools",
    description: "Generate structured 6-section academic summaries",
    icon: BookOpen,
    path: "/summarizer",
  },
  {
    id: "tool-quiz",
    title: "Quiz Generator",
    category: "Tools",
    description: "Practice multiple choice questions and flashcards",
    icon: HelpCircle,
    path: "/quiz",
  },
  {
    id: "tool-improver",
    title: "Answer Improver",
    category: "Tools",
    description: "Phrase-level polish and tracked revisions without added facts",
    icon: PenLine,
    path: "/answer-improver",
  },
  {
    id: "tool-explainer",
    title: "Concept Explainer",
    category: "Tools",
    description: "Intuitive step-by-step explanations across 3 depth levels",
    icon: Lightbulb,
    path: "/concept-explainer",
  },
];

export function CommandMenu({ isOpen, onClose }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSessions, setRecentSessions] = useState([]);
  const [statusMessage, setStatusMessage] = useState(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Load recent sessions whenever the menu opens
  useEffect(() => {
    if (isOpen) {
      setRecentSessions(getRecentSessions());
      setQuery("");
      setSelectedIndex(0);
      setStatusMessage(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Handle system status check action
  const handleCheckHealth = async () => {
    setStatusMessage("Checking backend connection...");
    try {
      const res = await api.getHealth();
      setStatusMessage(`System ${res.status === "healthy" ? "Online" : "Reported: " + res.status}`);
      setTimeout(() => setStatusMessage(null), 2500);
    } catch {
      setStatusMessage("Backend unreachable. Please verify server is running.");
      setTimeout(() => setStatusMessage(null), 2500);
    }
  };

  // Build searchable items list
  const allItems = useMemo(() => {
    const items = [];

    // 1. Core navigation tools
    CORE_TOOLS.forEach((tool) => {
      items.push({
        id: tool.id,
        title: tool.title,
        subtitle: tool.description,
        category: "Tools",
        icon: tool.icon,
        onSelect: () => {
          navigate(tool.path);
          onClose();
        },
      });
    });

    // 2. Recent study sessions
    recentSessions.forEach((s) => {
      const toolMap = {
        summarizer: { name: "Summarizer", path: "/summarizer", icon: BookOpen },
        quiz: { name: "Quiz Generator", path: "/quiz", icon: HelpCircle },
        improver: { name: "Answer Improver", path: "/answer-improver", icon: PenLine },
        explainer: { name: "Concept Explainer", path: "/concept-explainer", icon: Lightbulb },
      };
      const info = toolMap[s.tool] || { name: s.toolName || "Tool", path: "/", icon: BookOpen };
      const Icon = info.icon;

      items.push({
        id: `session-${s.id}`,
        title: s.title || "Untitled Session",
        subtitle: `${info.name} · ${formatTimeAgo(s.timestamp)}`,
        category: "Recent Sessions",
        icon: Icon,
        onSelect: () => {
          navigate(info.path, { state: { session: s } });
          onClose();
        },
      });
    });

    // 3. Quick Actions
    items.push({
      id: "action-health",
      title: "Check System Status",
      subtitle: "Verify live backend service and connection",
      category: "Actions",
      icon: Activity,
      onSelect: handleCheckHealth,
    });

    if (recentSessions.length > 0) {
      items.push({
        id: "action-clear-history",
        title: "Clear Recent Sessions",
        subtitle: "Remove all locally stored history entries",
        category: "Actions",
        icon: Trash2,
        onSelect: () => {
          clearRecentSessions();
          setRecentSessions([]);
          setStatusMessage("Recent sessions cleared.");
          setTimeout(() => setStatusMessage(null), 2000);
        },
      });
    }

    return items;
  }, [recentSessions, navigate, onClose]);

  // Filter items matching query
  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allItems;
    return allItems.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
    );
  }, [allItems, query]);

  // Keep selectedIndex within bounds
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Keyboard navigation within command menu
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev <= 0 ? filteredItems.length - 1 : prev - 1
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          filteredItems[selectedIndex].onSelect();
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filteredItems, selectedIndex, onClose]);

  // Auto-scroll highlighted item into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector(`[data-active="true"]`);
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command Menu"
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-start justify-center pt-16 sm:pt-24 px-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-xl bg-white border border-ink-border rounded-panel shadow-2xl overflow-hidden flex flex-col max-h-[75vh] animate-in fade-in-0 zoom-in-95 duration-150">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-ink-border bg-white">
          <Search className="w-4 h-4 text-ink-subtle shrink-0" strokeWidth={1.75} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command, tool name, or study session..."
            className="flex-1 bg-transparent text-xs sm:text-sm text-ink placeholder:text-ink-subtle outline-none"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="p-1 rounded text-ink-subtle hover:text-ink hover:bg-[#F5F4F0]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 bg-[#F5F4F0] border border-ink-border/60 rounded text-[10px] font-mono text-ink-subtle">
              Esc
            </kbd>
          )}
        </div>

        {/* Temporary Feedback Message */}
        {statusMessage && (
          <div className="px-4 py-2 bg-[#EEF1FB] border-b border-brand/20 text-xs text-brand font-medium">
            {statusMessage}
          </div>
        )}

        {/* Search Results List */}
        <div ref={listRef} className="overflow-y-auto p-2 divide-y divide-ink-border/40">
          {filteredItems.length === 0 ? (
            <div className="py-8 text-center space-y-1">
              <p className="text-xs sm:text-sm font-medium text-ink">
                No matching results found
              </p>
              <p className="text-xs text-ink-subtle">
                Try searching for "summarizer", "quiz", "improver", or "explainer".
              </p>
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const Icon = item.icon || ArrowRight;
              return (
                <button
                  key={item.id}
                  type="button"
                  data-active={isSelected}
                  onClick={item.onSelect}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded text-left transition-colors",
                    isSelected
                      ? "bg-[#EEF1FB] text-brand"
                      : "text-ink hover:bg-[#FAF9F6]"
                  )}
                >
                  <div
                    className={cn(
                      "p-1.5 rounded shrink-0",
                      isSelected
                        ? "bg-brand text-white"
                        : "bg-[#F5F4F0] text-ink-secondary"
                    )}
                  >
                    <Icon className="w-4 h-4" strokeWidth={1.75} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={cn(
                          "text-xs sm:text-sm font-medium truncate",
                          isSelected ? "text-brand" : "text-ink"
                        )}
                      >
                        {item.title}
                      </span>
                      <span className="text-[10px] font-sans tracking-[0.04em] text-ink-subtle shrink-0">
                        {item.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-ink-secondary truncate">
                      {item.subtitle}
                    </p>
                  </div>

                  {isSelected && (
                    <ArrowRight className="w-3.5 h-3.5 text-brand shrink-0" strokeWidth={2} />
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Command Menu Footer */}
        <div className="px-4 py-2 bg-[#FCFBFA] border-t border-ink-border flex items-center justify-between text-[11px] text-ink-subtle">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1 py-0.5 bg-[#EAE8E3] rounded text-[10px] font-mono text-ink">↑</kbd>{" "}
              <kbd className="px-1 py-0.5 bg-[#EAE8E3] rounded text-[10px] font-mono text-ink">↓</kbd> to navigate
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-[#EAE8E3] rounded text-[10px] font-mono text-ink">Enter</kbd> to select
            </span>
          </div>
          <span>
            <kbd className="px-1.5 py-0.5 bg-[#EAE8E3] rounded text-[10px] font-mono text-ink">Esc</kbd> to close
          </span>
        </div>
      </div>
    </div>
  );
}
