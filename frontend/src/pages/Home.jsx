import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Trash2, Clock, ChevronDown } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/Button";
import { Disclosure, DisclosureTrigger, DisclosureContent } from "@/components/motion/Disclosure";
import { AnimatedHeroComposition } from "@/components/home/AnimatedHeroComposition";
import { NotesToStructureDiagram } from "@/components/home/NotesToStructureDiagram";
import { usePageMeta } from "@/lib/usePageMeta";
import { getRecentSessions, clearRecentSessions, formatTimeAgo } from "@/lib/storage";
import { cn } from "@/lib/utils";

const TOOLS_INDEX = [
  {
    num: "01",
    path: "/summarizer",
    title: "Summarizer",
    description: "Paste lecture notes or textbook chapters to generate a six-section summary: overview, concepts, definitions, key points, exam notes, and revision points.",
  },
  {
    num: "02",
    path: "/quiz",
    title: "Quiz Generator",
    description: "Convert study notes into four-option multiple choice questions with progress tracking, immediate answers, and detailed explanations.",
  },
  {
    num: "03",
    path: "/answer-improver",
    title: "Answer Improver",
    description: "Paste your draft response to see structural feedback, side-by-side wording refinements, and suggestions without introducing new facts.",
  },
  {
    num: "04",
    path: "/concept-explainer",
    title: "Concept Explainer",
    description: "Break down difficult theories and mechanisms into step-by-step guides for beginner, intermediate, and advanced levels.",
  },
];

const FAQS = [
  {
    q: "How does StudyMate AI process text and handle data?",
    a: "Your study material is sent over an encrypted HTTPS connection to our backend and passed to the Google Gemini API using structured academic prompts. On free API tiers, Google may use prompt and output data to train models per Google Generative AI terms. Do not submit sensitive personal or confidential information. We do not store your inputs on any database.",
  },
  {
    q: "Are my study notes or personal answers saved on a database?",
    a: "No. StudyMate AI does not use a cloud database or user accounts. All processing happens in-memory for the duration of the request. Recent session history is saved locally in your own browser using localStorage, and you can clear it anytime.",
  },
  {
    q: "How are quizzes checked?",
    a: "Every quiz is checked programmatically against a schema requiring four options and a valid answer index. Quizzes check structural shape, not factual accuracy against outside reality. Always check answers against your course material.",
  },
  {
    q: "What are the input character limits?",
    a: "To ensure fast and reliable responses, study notes accept 20 to 10,000 characters, student answers accept 10 to 5,000 characters, and concept queries accept 3 to 300 characters. These limits are served dynamically from the backend configuration.",
  },
];

const TOOL_PATH_MAP = {
  summarizer: "/summarizer",
  quiz: "/quiz",
  improver: "/answer-improver",
  explainer: "/concept-explainer",
};

function FaqItem({ q, a }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Disclosure open={isOpen} onOpenChange={setIsOpen} className="py-4">
      <DisclosureTrigger className="w-full flex items-center justify-between text-left group gap-4 cursor-pointer">
        <span className="text-sm font-medium text-ink group-hover:text-brand transition-colors">
          {q}
        </span>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-ink-subtle group-hover:text-ink transition-transform duration-200 shrink-0",
            isOpen && "rotate-180 text-brand"
          )}
          strokeWidth={1.75}
        />
      </DisclosureTrigger>
      <DisclosureContent className="pt-2 text-xs text-ink-secondary leading-relaxed">
        <p>{a}</p>
      </DisclosureContent>
    </Disclosure>
  );
}

export function Home() {
  usePageMeta(
    "StudyMate AI",
    "Paste your notes. Get a summary, a practice quiz, a clearer answer, or a plain explanation."
  );

  const navigate = useNavigate();
  const [recentSessions, setRecentSessions] = useState([]);

  useEffect(() => {
    setRecentSessions(getRecentSessions());
  }, []);

  const handleClearHistory = () => {
    clearRecentSessions();
    setRecentSessions([]);
  };

  const handleOpenSession = (item) => {
    const targetPath = TOOL_PATH_MAP[item.tool] || "/summarizer";
    navigate(targetPath, { state: { session: item } });
  };

  const hasHistory = recentSessions.length > 0;

  // Recent Sessions Section Component
  const recentSessionsSection = (
    <section className="space-y-4 pt-6 border-t border-ink-border">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="font-serif text-xl sm:text-2xl font-medium text-ink tracking-tight">
            Continue Where You Left Off
          </h2>
          <p className="text-xs text-ink-secondary">
            Saved locally in this browser. Stored across sessions without cloud tracking.
          </p>
        </div>

        {hasHistory && (
          <Button
            variant="subtle"
            size="sm"
            onClick={handleClearHistory}
            className="text-ink-subtle hover:text-feedback-error"
          >
            <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
            <span>Clear history</span>
          </Button>
        )}
      </div>

      {hasHistory ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {recentSessions.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleOpenSession(item)}
              className="p-4 bg-white border border-ink-border rounded-panel text-left hover:border-ink transition-colors flex items-start justify-between gap-3 group"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-brand bg-brand-tint px-1.5 py-0.5 rounded">
                    {item.toolName || item.tool}
                  </span>
                  <span className="text-[11px] text-ink-subtle flex items-center gap-1">
                    <Clock className="w-3 h-3" strokeWidth={1.75} />
                    {formatTimeAgo(item.timestamp)}
                  </span>
                </div>
                <p className="text-xs font-medium text-ink truncate group-hover:text-brand transition-colors">
                  {item.title}
                </p>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-ink-subtle group-hover:text-ink shrink-0 mt-1 transition-transform group-hover:translate-x-1" strokeWidth={1.75} />
            </button>
          ))}
        </div>
      ) : (
        <div className="p-6 bg-white border border-dashed border-ink-border rounded-panel text-center space-y-1">
          <p className="text-xs font-medium text-ink">
            No recent study sessions yet
          </p>
          <p className="text-xs text-ink-secondary max-w-sm mx-auto">
            Your generated summaries, quizzes, improved answers, and concept explanations will appear here automatically.
          </p>
        </div>
      )}
    </section>
  );

  // How It Works Section Component
  const howItWorksSection = (
    <section className="space-y-4 pt-6 border-t border-ink-border">
      <div className="space-y-1">
        <h2 className="font-serif text-xl sm:text-2xl font-medium text-ink tracking-tight">
          How It Works
        </h2>
        <p className="text-xs text-ink-secondary">
          Turn raw study material into structured academic study documents.
        </p>
      </div>

      {/* Custom 1.5px Stroke SVG Diagram (B7) */}
      <div className="p-6 bg-white border border-ink-border rounded-panel">
        <NotesToStructureDiagram className="w-full overflow-hidden" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        <div className="p-5 bg-white border border-ink-border rounded-panel space-y-2">
          <div className="w-6 h-6 flex items-center justify-center bg-[#EAE8E3] text-ink font-semibold rounded text-xs font-sans tabular-nums">
            01
          </div>
          <h3 className="text-sm font-semibold text-ink">
            Paste notes or enter a topic
          </h3>
          <p className="text-xs text-ink-secondary leading-relaxed">
            Provide your raw study notes, draft answer, or target concept.
          </p>
        </div>

        <div className="p-5 bg-white border border-ink-border rounded-panel space-y-2">
          <div className="w-6 h-6 flex items-center justify-center bg-[#EAE8E3] text-ink font-semibold rounded text-xs font-sans tabular-nums">
            02
          </div>
          <h3 className="text-sm font-semibold text-ink">
            Select a dedicated tool
          </h3>
          <p className="text-xs text-ink-secondary leading-relaxed">
            Choose Summarizer, Quiz Generator, Answer Improver, or Concept Explainer depending on your study goal.
          </p>
        </div>

        <div className="p-5 bg-white border border-ink-border rounded-panel space-y-2">
          <div className="w-6 h-6 flex items-center justify-center bg-[#EAE8E3] text-ink font-semibold rounded text-xs font-sans tabular-nums">
            03
          </div>
          <h3 className="text-sm font-semibold text-ink">
            Review, practice, and copy
          </h3>
          <p className="text-xs text-ink-secondary leading-relaxed">
            Study your structured output, test yourself on key points, or export formatted Markdown notes.
          </p>
        </div>
      </div>
    </section>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="space-y-12 py-2"
    >
      {/* Two-Column Hero on Wide Screens (B4) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start pt-4 sm:pt-6">
        {/* Left Column: Headline, subtext, primary CTA & text link */}
        <div className="lg:col-span-7 space-y-6">
          <div className="space-y-4">
            <h1 className="home-headline">
              Paste your notes. Start studying.
            </h1>
            <p className="text-base sm:text-lg text-ink-secondary leading-relaxed max-w-xl">
              Turn lecture notes, readings, and drafts into structured summaries, active-recall quizzes, sentence improvements, and concept explanations.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Link to="/summarizer">
              <Button variant="primary" size="md">
                <span>Open Summarizer</span>
                <ArrowRight className="w-4 h-4 ml-1.5" strokeWidth={1.75} />
              </Button>
            </Link>

            <a
              href="#tools-index"
              className="text-xs text-ink-secondary hover:text-ink font-medium underline underline-offset-4 transition-colors"
            >
              Explore all four study tools
            </a>
          </div>
        </div>

        {/* Right Column: Real Composition of App Output (B6 & M1) */}
        <div className="lg:col-span-5">
          <AnimatedHeroComposition />
        </div>
      </section>

      {/* Tools Section */}
      <section id="tools-index" className="space-y-4 pt-6 border-t border-ink-border">
        <div className="space-y-1">
          <span className="text-xs font-sans tracking-[0.04em] text-ink-subtle">
            Tools
          </span>
          <h2 className="font-serif text-xl sm:text-2xl font-medium text-ink tracking-tight">
            Tools
          </h2>
        </div>

        <div className="divide-y divide-ink-border border-y border-ink-border">
          {TOOLS_INDEX.map((tool) => (
            <Link
              key={tool.path}
              to={tool.path}
              className="py-6 px-3 flex flex-col sm:flex-row sm:items-baseline justify-between gap-3 group hover:bg-[#F3F1EC] transition-colors rounded-panel"
            >
              <div className="flex items-baseline gap-4 sm:gap-6 min-w-0">
                <span className="font-sans tabular-nums text-sm text-ink-subtle shrink-0">
                  {tool.num}
                </span>
                <div className="space-y-1">
                  <h3 className="font-serif text-[28px] font-medium text-ink group-hover:text-brand transition-colors leading-snug">
                    {tool.title}
                  </h3>
                  <p className="text-xs text-ink-secondary leading-relaxed max-w-2xl">
                    {tool.description}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs font-medium text-brand shrink-0 self-end sm:self-center">
                <span>Open</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform duration-150 group-hover:translate-x-1" strokeWidth={1.75} />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* How It Works */}
      {howItWorksSection}

      {/* Continue Where You Left Off (rendered only when history exists) */}
      {hasHistory && recentSessionsSection}

      {/* Frequently Asked Questions */}
      <section className="space-y-6 pt-6 border-t border-ink-border">
        <div className="space-y-1">
          <h2 className="font-serif text-xl sm:text-2xl font-medium text-ink tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-xs text-ink-secondary">
            Clear information about data handling, schema checks, and usage limits.
          </p>
        </div>

        <div className="divide-y divide-ink-border border-y border-ink-border">
          {FAQS.map((faq, idx) => (
            <FaqItem key={idx} q={faq.q} a={faq.a} />
          ))}
        </div>
      </section>
    </motion.div>
  );
}
