import { Link } from "react-router-dom";
import { BookOpen, HelpCircle, PenLine, Lightbulb, ArrowRight, ShieldCheck, Zap, Sliders } from "lucide-react";
import { motion } from "motion/react";
import { Disclosure, DisclosureTrigger, DisclosureContent } from "@/components/motion/Disclosure";
import { ChevronDown } from "lucide-react";

const TOOLS = [
  {
    path: "/summarizer",
    title: "Academic Summarizer",
    icon: BookOpen,
    description:
      "Paste complex lecture notes or articles to produce a 6-part synthesis covering executive takeaways, key principles, detailed breakdowns, definitions, applications, and review questions.",
  },
  {
    path: "/quiz",
    title: "Practice Quiz Generator",
    icon: HelpCircle,
    description:
      "Generate calibrated 4-choice recall questions with difficulty tiers (Easy, Medium, Hard), real-time progress tracking, and instant pedagogical answer explanations.",
  },
  {
    path: "/answer-improver",
    title: "Answer Improver",
    icon: PenLine,
    description:
      "Receive detailed diagnostic feedback on draft exam answers. Compare original vs improved versions side-by-side with phrase substitutions and point breakdowns.",
  },
  {
    path: "/concept-explainer",
    title: "Concept Explainer",
    icon: Lightbulb,
    description:
      "Explore any theory or term across three cognitive levels: Beginner with everyday analogies, Intermediate with formal mechanics, and Advanced with theoretical rigor.",
  },
];

const FAQS = [
  {
    q: "How does StudyMate AI generate responses?",
    a: "Your study text is sent over an encrypted connection to the Gemini API with structured academic prompt templates. The response is parsed into validated sections and rendered directly in your browser without tracking cookies or user profiling.",
  },
  {
    q: "Are my study notes or queries stored on a database?",
    a: "No. StudyMate AI does not use a persistent database or user accounts. All processing occurs in-memory for the duration of the request.",
  },
  {
    q: "How are quizzes validated?",
    a: "Every quiz response is validated against strict Pydantic schemas enforcing four options per question and valid answers. If the model produces an invalid format, the backend automatically performs a bounded retry (up to two retries) before delivering results.",
  },
  {
    q: "Is there a limit on input length?",
    a: "Yes. To ensure high synthesis quality and avoid processing failures, inputs are bounded between 20 and 20,000 characters for study notes, and up to 10,000 characters for student answers.",
  },
];

export function Home() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="space-y-12 max-w-4xl mx-auto py-2"
    >
      {/* Editorial Hero */}
      <section className="space-y-4 pt-4 sm:pt-8 text-center sm:text-left">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-[#EAE8E3] text-ink-secondary text-xs font-medium">
          <span>Academic Study Suite</span>
          <span>·</span>
          <span>Four Dedicated Utilities</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-medium tracking-tight text-ink leading-tight">
          Structured synthesis and active recall for serious students.
        </h1>
        <p className="text-base sm:text-lg text-ink-secondary max-w-2xl leading-relaxed">
          Paste your study notes or questions to generate structured summaries, active-recall quizzes, diagnostic answer improvements, and multi-level concept breakdowns.
        </p>
      </section>

      {/* Feature Cards Grid (Border-color hover only, no lift/tilt) */}
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
                <div className="w-9 h-9 rounded-md bg-brand-tint flex items-center justify-center text-brand">
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
                <span>Launch tool</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          );
        })}
      </section>

      {/* Genuine FAQ with Disclosure */}
      <section className="space-y-6 pt-6 border-t border-ink-border">
        <div className="space-y-1">
          <h2 className="font-serif text-2xl font-medium text-ink tracking-tight">
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
