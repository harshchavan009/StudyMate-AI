import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BookOpen, HelpCircle, PenLine, Lightbulb, ArrowRight, Trash2, Clock, Check, ChevronDown } from "lucide-react";
import { motion } from "motion/react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Disclosure, DisclosureTrigger, DisclosureContent } from "@/components/motion/Disclosure";
import { usePageMeta } from "@/lib/usePageMeta";
import { getRecentSessions, clearRecentSessions, formatTimeAgo } from "@/lib/storage";

const TOOLS = [
  {
    path: "/summarizer",
    title: "Summarizer",
    icon: BookOpen,
    description:
      "Paste lecture notes or textbook chapters to generate a six-section summary: overview, concepts, definitions, key points, exam notes, and revision points.",
  },
  {
    path: "/quiz",
    title: "Quiz Generator",
    icon: HelpCircle,
    description:
      "Convert study notes into four-option multiple choice questions with progress tracking, immediate answers, and detailed explanations.",
  },
  {
    path: "/answer-improver",
    title: "Answer Improver",
    icon: PenLine,
    description:
      "Paste your draft exam response to see structural feedback, side-by-side wording refinements, and suggestions without adding outside facts.",
  },
  {
    path: "/concept-explainer",
    title: "Concept Explainer",
    icon: Lightbulb,
    description:
      "Break down difficult theories and mechanisms into step-by-step guides calibrated across beginner, intermediate, and advanced levels.",
  },
];

const HOW_IT_WORKS_STEPS = [
  {
    step: "1",
    title: "Paste notes or enter a topic",
    description: "Provide your lecture text, draft answer, or a concept you want to master. Character limits are validated live.",
  },
  {
    step: "2",
    title: "Choose a dedicated tool",
    description: "Select from Summarizer, Quiz Generator, Answer Improver, or Concept Explainer depending on your current study goal.",
  },
  {
    step: "3",
    title: "Review, practice, and copy",
    description: "Read clean academic documents, take interactive self-tests, or copy formatted markdown with one click.",
  },
];

const FAQS = [
  {
    q: "How does StudyMate AI process text?",
    a: "Your study material is sent over an encrypted HTTPS connection to the backend, which communicates with the Gemini API using structured academic prompts. The response is validated against strict Pydantic schemas before rendering in your browser.",
  },
  {
    q: "Are my study notes or personal answers saved on a database?",
    a: "No. StudyMate AI does not use a database or user accounts. All processing happens in-memory for the duration of the request. Recent session history is stored only in your own browser using localStorage, and you can clear it anytime.",
  },
  {
    q: "How are quizzes validated?",
    a: "Every quiz is checked against a strict schema requiring four options and a valid answer index. If the response does not pass validation, the backend retries automatically before returning results.",
  },
  {
    q: "What are the input character limits?",
    a: "To ensure fast and reliable responses, study notes accept 20 to 20,000 characters, student answers accept 10 to 5,000 characters, and concept queries accept 3 to 300 characters.",
  },
];

const TOOL_PATH_MAP = {
  summarizer: "/summarizer",
  quiz: "/quiz",
  improver: "/answer-improver",
  explainer: "/concept-explainer",
};

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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="space-y-12 py-2"
    >
      {/* Hero Section */}
      <section className="space-y-4 pt-4 sm:pt-6">
        <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-medium tracking-tight text-ink leading-tight max-w-3xl">
          Paste your notes. Get a summary, a practice quiz, a clearer answer, or a plain explanation.
        </h1>
        <p className="text-base sm:text-lg text-ink-secondary max-w-2xl leading-relaxed">
          StudyMate AI turns your raw study material into structured exam notes, interactive recall quizzes, phrase-level answer improvements, and step-by-step conceptual breakdowns.
        </p>
      </section>

      {/* Feature Cards Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          return (
            <Link
              key={tool.path}
              to={tool.path}
              className="group p-6 bg-white border border-ink-border rounded-lg transition-colors duration-150 hover:border-ink flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="text-brand">
                  <Icon className="w-5 h-5" strokeWidth={1.75} />
                </div>
                <h2 className="font-serif text-lg font-medium text-ink group-hover:text-brand transition-colors">
                  {tool.title}
                </h2>
                <p className="text-xs text-ink-secondary leading-relaxed">
                  {tool.description}
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-ink-border/60 flex items-center gap-1.5 text-xs font-medium text-brand">
                <span>Open {tool.title}</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          );
        })}
      </section>

      {/* Real UI Preview of Authentic Generated Output */}
      <section className="space-y-3 pt-4">
        <div className="space-y-1">
          <h2 className="font-serif text-xl sm:text-2xl font-medium text-ink tracking-tight">
            Clean, Structured Output
          </h2>
          <p className="text-xs text-ink-secondary">
            Results read like prepared academic documents rather than conversational chat bubbles.
          </p>
        </div>

        <div className="p-6 bg-white border border-ink-border rounded-lg space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-ink-border text-xs">
            <span className="font-semibold text-ink">Example Summary: Operating System Kernels</span>
            <span className="text-[11px] text-ink-subtle">6 output sections</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 bg-[#FCFBFA] border border-ink-border rounded space-y-1.5">
              <strong className="text-ink block font-serif text-sm">Topic Overview</strong>
              <p className="text-ink-secondary text-[11px] leading-relaxed">
                The kernel arbitrates system resources between user applications and bare physical hardware, enforcing fault isolation boundaries.
              </p>
            </div>

            <div className="p-4 bg-[#FCFBFA] border border-ink-border rounded space-y-1.5">
              <strong className="text-ink block font-serif text-sm">Key Concepts</strong>
              <p className="text-ink-secondary text-[11px] leading-relaxed">
                Supervisor vs user privilege levels, virtual memory address translation, and process scheduling algorithms.
              </p>
            </div>

            <div className="p-4 bg-[#FCFBFA] border border-ink-border rounded space-y-1.5">
              <strong className="text-ink block font-serif text-sm">Important Definitions</strong>
              <p className="text-ink-secondary text-[11px] leading-relaxed">
                <span className="font-medium text-ink">Microkernel:</span> An architecture delegating drivers and file services to isolated user space processes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works (Three-step guide) */}
      <section className="space-y-4 pt-4 border-t border-ink-border">
        <div className="space-y-1">
          <h2 className="font-serif text-xl sm:text-2xl font-medium text-ink tracking-tight">
            How It Works
          </h2>
          <p className="text-xs text-ink-secondary">
            A three-step workflow designed for focused revision.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {HOW_IT_WORKS_STEPS.map((step) => (
            <div
              key={step.step}
              className="p-5 bg-white border border-ink-border rounded-lg space-y-2"
            >
              <div className="w-6 h-6 flex items-center justify-center bg-[#EAE8E3] text-ink font-semibold rounded text-xs">
                {step.step}
              </div>
              <h3 className="text-sm font-semibold text-ink">
                {step.title}
              </h3>
              <p className="text-xs text-ink-secondary leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Recent Sessions (Real data from localStorage) */}
      <section className="space-y-4 pt-4 border-t border-ink-border">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="font-serif text-xl sm:text-2xl font-medium text-ink tracking-tight">
              Recent Sessions
            </h2>
            <p className="text-xs text-ink-secondary">
              Study sessions generated in your current browser session. Stored locally without cloud tracking.
            </p>
          </div>

          {recentSessions.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearHistory}
              className="text-ink-subtle hover:text-feedback-error"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear history</span>
            </Button>
          )}
        </div>

        {recentSessions.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {recentSessions.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleOpenSession(item)}
                className="p-4 bg-white border border-ink-border rounded-lg text-left hover:border-ink transition-colors flex items-start justify-between gap-3 group"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-brand bg-brand-tint px-1.5 py-0.5 rounded">
                      {item.toolName || item.tool}
                    </span>
                    <span className="text-[11px] text-ink-subtle flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTimeAgo(item.timestamp)}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-ink truncate group-hover:text-brand transition-colors">
                    {item.title}
                  </p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-ink-subtle group-hover:text-ink shrink-0 mt-1 transition-transform group-hover:translate-x-0.5" />
              </button>
            ))}
          </div>
        ) : (
          <div className="p-6 bg-white border border-dashed border-ink-border rounded-lg text-center space-y-1">
            <p className="text-xs font-medium text-ink">
              No recent study sessions yet
            </p>
            <p className="text-xs text-ink-secondary max-w-sm mx-auto">
              Your generated summaries, quizzes, improved answers, and concept explanations will appear here automatically.
            </p>
          </div>
        )}
      </section>

      {/* Frequently Asked Questions */}
      <section className="space-y-6 pt-4 border-t border-ink-border">
        <div className="space-y-1">
          <h2 className="font-serif text-xl sm:text-2xl font-medium text-ink tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-xs text-ink-secondary">
            Clear information about data handling, model validation, and usage limits.
          </p>
        </div>

        <div className="divide-y divide-ink-border border-y border-ink-border">
          {FAQS.map((faq, idx) => (
            <Disclosure key={idx} className="py-4">
              <DisclosureTrigger className="w-full flex items-center justify-between text-left group">
                <span className="text-sm font-medium text-ink group-hover:text-brand transition-colors">
                  {faq.q}
                </span>
                <ChevronDown className="w-4 h-4 text-ink-subtle group-hover:text-ink transition-transform duration-200" />
              </DisclosureTrigger>
              <DisclosureContent className="pt-2 text-xs text-ink-secondary leading-relaxed">
                <p>{faq.a}</p>
              </DisclosureContent>
            </Disclosure>
          ))}
        </div>
      </section>
    </motion.div>
  );
}
