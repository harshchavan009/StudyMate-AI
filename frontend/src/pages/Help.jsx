import { useState } from "react";
import { ChevronDown, ArrowRight, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { Disclosure, DisclosureTrigger, DisclosureContent } from "@/components/motion/Disclosure";
import { NotesToStructureDiagram } from "@/components/home/NotesToStructureDiagram";
import { AnimatedHeroComposition } from "@/components/home/AnimatedHeroComposition";
import { usePageMeta } from "@/lib/usePageMeta";
import { cn } from "@/lib/utils";

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

export function Help() {
  usePageMeta("Help & Reference", "Understanding how StudyMate AI structures and processes study material.");

  return (
    <div className="space-y-12 py-2 max-w-5xl">
      <div className="space-y-2">
        <span className="type-label text-ink-subtle">Documentation</span>
        <h1 className="type-page-title text-ink">Help & Reference</h1>
        <p className="text-base text-ink-secondary leading-relaxed max-w-2xl">
          Everything you need to know about how StudyMate AI transforms notes into study aids, our local-first data model, and verification guidance.
        </p>
      </div>

      {/* How it works */}
      <section className="space-y-4 pt-6 border-t border-ink-border">
        <div className="space-y-1">
          <span className="type-label text-ink-subtle">Pipeline</span>
          <h2 className="type-section text-ink">How It Works</h2>
          <p className="text-xs text-ink-secondary">
            Turn raw study material into structured academic study documents.
          </p>
        </div>

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

      {/* Example Output */}
      <section className="space-y-4 pt-6 border-t border-ink-border">
        <div className="space-y-1">
          <span className="type-label text-ink-subtle">Reference Output</span>
          <h2 className="type-section text-ink">Example Output</h2>
          <p className="text-xs text-ink-secondary">
            A real summary generated by StudyMate AI from a DNS lecture excerpt.
          </p>
        </div>

        <div className="max-w-2xl bg-white rounded-panel border border-ink-border p-2">
          <AnimatedHeroComposition />
        </div>
      </section>

      {/* Frequently Asked Questions */}
      <section className="space-y-4 pt-6 border-t border-ink-border">
        <div className="space-y-1">
          <span className="type-label text-ink-subtle">Q&A</span>
          <h2 className="type-section text-ink">Frequently Asked Questions</h2>
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

      {/* Data and privacy notice */}
      <section className="p-5 bg-white border border-ink-border rounded-panel flex items-start gap-4">
        <ShieldCheck className="w-5 h-5 text-feedback-success shrink-0 mt-0.5" strokeWidth={1.75} />
        <div className="space-y-1 text-xs">
          <p className="font-semibold text-ink">Local-First Storage Guarantee</p>
          <p className="text-ink-secondary leading-relaxed">
            All session history and study sets are stored strictly inside your browser's localStorage. No cookies, no user accounts, and no tracking databases are employed. Clear your history at any time from Home or individual tool pages.
          </p>
          <div className="pt-2">
            <Link to="/privacy" className="text-brand hover:underline font-medium inline-flex items-center gap-1">
              <span>Read complete Privacy Policy</span>
              <ArrowRight className="w-3 h-3" strokeWidth={1.75} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

