import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Trash2,
  Clock,
  BookOpen,
  HelpCircle,
  PenLine,
  Lightbulb,
  CheckCircle2,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/Button";
import { FieldCounter } from "@/components/ui/FieldCounter";
import { AnimatedHeroComposition } from "@/components/home/AnimatedHeroComposition";
import { NotesToStructureDiagram } from "@/components/home/NotesToStructureDiagram";
import { usePageMeta } from "@/lib/usePageMeta";
import {
  getRecentSessions,
  deleteRecentSession,
  clearRecentSessions,
  getQuizAttempts,
  getLatestMissedQuestions,
  getStudySets,
  getWeekActivity,
  getLastUsedByTool,
  formatTimeAgo,
} from "@/lib/storage";
import exampleData from "@/data/exampleSummary.json";
import { cn } from "@/lib/utils";

const TOOLS = [
  {
    key: "summarizer",
    path: "/summarizer",
    title: "Summarizer",
    description: "Convert notes or textbook excerpts into structured six-part summaries.",
    icon: BookOpen,
  },
  {
    key: "quiz",
    path: "/quiz",
    title: "Quiz Generator",
    description: "Generate multiple-choice practice questions with detailed explanations.",
    icon: HelpCircle,
  },
  {
    key: "improver",
    path: "/answer-improver",
    title: "Answer Improver",
    description: "Refine draft answers with critique, elevated vocabulary, and revisions.",
    icon: PenLine,
  },
  {
    key: "explainer",
    path: "/concept-explainer",
    title: "Concept Explainer",
    description: "Break down difficult academic terms with analogies and real-world examples.",
    icon: Lightbulb,
  },
];

const TOOL_PATH_MAP = {
  summarizer: "/summarizer",
  quiz: "/quiz",
  improver: "/answer-improver",
  explainer: "/concept-explainer",
};

/**
 * Custom hook to count up a number over a specified duration (Part 3.5: 600ms count-up)
 */
function useCountUp(target, duration = 600) {
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!target || target <= 0) {
      setVal(0);
      return;
    }
    let startTimestamp = null;
    let animFrame = null;

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // easeOutQuad
      const ease = 1 - Math.pow(1 - progress, 2);
      setVal(Math.round(ease * target));
      if (progress < 1) {
        animFrame = requestAnimationFrame(step);
      }
    };
    animFrame = requestAnimationFrame(step);
    return () => {
      if (animFrame) cancelAnimationFrame(animFrame);
    };
  }, [target, duration]);

  return val;
}

export function Home() {
  usePageMeta("StudyMate AI", "Structured academic study assistance powered by Gemini.");

  const navigate = useNavigate();
  const [input, setInput] = useState("");
  const [isTouched, setIsTouched] = useState(false);

  // Storage states
  const [recentSessions, setRecentSessions] = useState([]);
  const [quizAttempts, setQuizAttempts] = useState([]);
  const [studySets, setStudySets] = useState([]);
  const [weekActivity, setWeekActivity] = useState([]);
  const [lastUsedMap, setLastUsedMap] = useState({});
  const [chartAnimated, setChartAnimated] = useState(false);

  const loadData = () => {
    const sessions = getRecentSessions();
    const attempts = getQuizAttempts();
    const sets = getStudySets();
    const activity = getWeekActivity();
    const lastUsed = getLastUsedByTool();

    setRecentSessions(sessions);
    setQuizAttempts(attempts);
    setStudySets(sets);
    setWeekActivity(activity);
    setLastUsedMap(lastUsed);
  };

  useEffect(() => {
    loadData();
    // Trigger chart bar growth (Part 3.5: 320ms)
    const t = setTimeout(() => setChartAnimated(true), 50);
    return () => clearTimeout(t);
  }, []);

  const totalHistoryCount = recentSessions.length + quizAttempts.length + studySets.length;
  const isFirstTime = totalHistoryCount === 0;

  // Quiz statistics
  const recentQuizAttempts = quizAttempts.slice(0, 10);
  const avgQuizScore =
    recentQuizAttempts.length > 0
      ? Math.round(
          recentQuizAttempts.reduce((acc, curr) => acc + (curr.percentage || 0), 0) /
            recentQuizAttempts.length
        )
      : 0;
  const animatedAvgScore = useCountUp(avgQuizScore, 600);

  // Missed questions from most recent attempt
  const latestMissed = getLatestMissedQuestions();

  // Continue session (most recent study set or session)
  const latestSet = studySets[0] || null;
  const latestSession = recentSessions[0] || null;

  const handleStartStudySet = (e) => {
    e.preventDefault();
    if (input.trim().length < 20 || input.length > 10000) return;
    navigate("/study-set", { state: { sourceText: input } });
  };

  const handleTryExample = () => {
    if (exampleData?.source_text) {
      setInput(exampleData.source_text);
      setIsTouched(true);
    }
  };

  const handleOpenSession = (item) => {
    const targetPath = TOOL_PATH_MAP[item.tool] || "/summarizer";
    navigate(targetPath, { state: { session: item } });
  };

  const handleDeleteSession = (id, e) => {
    e.stopPropagation();
    deleteRecentSession(id);
    loadData();
  };

  const handleClearAllHistory = () => {
    clearRecentSessions();
    loadData();
  };

  const handleRetryMissed = () => {
    navigate("/quiz", { state: { retryQuestions: latestMissed } });
  };

  let moduleIndex = 0;
  const getModuleDelay = () => {
    const delay = moduleIndex * 0.04;
    moduleIndex += 1;
    return delay;
  };

  return (
    <div className="space-y-10 py-2 max-w-6xl">
      {/* 3.1 Header & Compact Input Panel */}
      <motion.header
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: getModuleDelay(), ease: "easeOut" }}
        className="space-y-4"
      >
        <div className="space-y-2">
          <h1 className="type-dashboard-title text-ink">
            What are you studying today?
          </h1>
          <p className="text-base text-ink-secondary leading-relaxed max-w-2xl">
            Turn lecture notes, readings, and drafts into structured summaries, active-recall quizzes, sentence improvements, and concept explanations.
          </p>
        </div>

        {/* Compact input panel */}
        <div className="p-5 bg-white border border-ink-border rounded-panel space-y-3 shadow-none">
          <label htmlFor="quick-study-input" className="type-label text-ink block">
            Paste Notes or Passage
          </label>
          <textarea
            id="quick-study-input"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setIsTouched(true);
            }}
            placeholder="Paste lecture notes, study guide, or a passage to study (20 to 10,000 characters)..."
            rows={3}
            className="w-full text-sm font-sans p-3 rounded-[6px] border border-ink-border bg-canvas/30 text-ink placeholder:text-ink-subtle focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand transition-colors resize-y min-h-[90px]"
          />

          <FieldCounter
            current={input.length}
            min={20}
            max={10000}
            isTouched={isTouched}
            disabledReason="Enter at least 20 characters to start."
          />

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-3">
              <Button
                variant="primary"
                size="md"
                onClick={handleStartStudySet}
                disabled={input.trim().length < 20 || input.length > 10000}
              >
                <span>Start study set</span>
                <ArrowRight className="w-4 h-4 ml-1.5" strokeWidth={1.75} />
              </Button>

              <button
                type="button"
                onClick={handleTryExample}
                className="text-xs text-brand hover:underline font-medium cursor-pointer"
              >
                Try an example
              </button>
            </div>
            <span className="text-xs text-ink-subtle hidden sm:inline">
              Or jump into an individual tool below
            </span>
          </div>
        </div>
      </motion.header>

      {/* 3.2 Four Tool Tiles for Quick Navigation */}
      <motion.section
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: getModuleDelay(), ease: "easeOut" }}
        className="space-y-3"
      >
        <div className="flex items-center justify-between">
          <span className="type-label text-ink-subtle">Individual Study Tools</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {TOOLS.map((t) => {
            const Icon = t.icon;
            const lastUsed = lastUsedMap[t.key];

            return (
              <Link
                key={t.path}
                to={t.path}
                className="p-4 bg-white border border-ink-border rounded-panel hover:border-brand transition-colors duration-150 flex flex-col justify-between group h-full"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 rounded-[6px] bg-canvas flex items-center justify-center text-ink group-hover:text-brand transition-colors">
                      <Icon className="w-4 h-4" strokeWidth={1.75} />
                    </div>
                    {lastUsed && (
                      <span className="text-[11px] text-ink-subtle flex items-center gap-1">
                        <Clock className="w-3 h-3" strokeWidth={1.75} />
                        {lastUsed}
                      </span>
                    )}
                  </div>
                  <h3 className="font-serif text-[20px] font-medium text-ink group-hover:text-brand transition-colors leading-snug">
                    {t.title}
                  </h3>
                  <p className="text-xs text-ink-secondary leading-relaxed line-clamp-2">
                    {t.description}
                  </p>
                </div>

                <div className="pt-3 mt-2 border-t border-ink-border/50 flex items-center justify-between text-xs font-medium text-brand">
                  <span>Open tool</span>
                  <ArrowRight
                    className="w-3.5 h-3.5 transition-transform duration-150 group-hover:translate-x-1"
                    strokeWidth={1.75}
                  />
                </div>
              </Link>
            );
          })}
        </div>
      </motion.section>

      {/* 3.4 First-Time State: Compact How It Works Strip & Example Output */}
      {isFirstTime && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: getModuleDelay(), ease: "easeOut" }}
          className="space-y-10 pt-4 border-t border-ink-border"
          data-testid="first-time-state"
        >
          {/* How It Works Strip */}
          <section className="space-y-4">
            <div className="space-y-1">
              <span className="type-label text-ink-subtle">How It Works</span>
              <h2 className="type-section text-ink">Turn notes into structured study aids</h2>
              <p className="text-xs text-ink-secondary">
                StudyMate AI parses lecture notes and textbook passages without storing them on a remote server.
              </p>
            </div>

            <div className="p-6 bg-white border border-ink-border rounded-panel">
              <NotesToStructureDiagram className="w-full overflow-hidden" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
              <div className="p-4 bg-white border border-ink-border rounded-panel space-y-1.5">
                <span className="font-sans tabular-nums text-xs font-semibold text-brand">01</span>
                <h3 className="text-sm font-semibold text-ink">Paste your material</h3>
                <p className="text-xs text-ink-secondary leading-relaxed">
                  Provide raw text from lectures, readings, or exam review sheets.
                </p>
              </div>
              <div className="p-4 bg-white border border-ink-border rounded-panel space-y-1.5">
                <span className="font-sans tabular-nums text-xs font-semibold text-brand">02</span>
                <h3 className="text-sm font-semibold text-ink">Select a study objective</h3>
                <p className="text-xs text-ink-secondary leading-relaxed">
                  Generate a structured summary, multiple-choice quiz, or term explanation.
                </p>
              </div>
              <div className="p-4 bg-white border border-ink-border rounded-panel space-y-1.5">
                <span className="font-sans tabular-nums text-xs font-semibold text-brand">03</span>
                <h3 className="text-sm font-semibold text-ink">Review and practice</h3>
                <p className="text-xs text-ink-secondary leading-relaxed">
                  Test your recall, review definitions, and export clean Markdown notes.
                </p>
              </div>
            </div>
          </section>

          {/* Stored Example Output */}
          <section className="space-y-4 pt-4 border-t border-ink-border">
            <div className="space-y-1">
              <span className="type-label text-ink-subtle">Sample Output</span>
              <h2 className="type-section text-ink">Example output from a DNS lecture</h2>
            </div>
            <div className="max-w-2xl bg-white rounded-panel border border-ink-border p-2">
              <AnimatedHeroComposition />
            </div>
          </section>
        </motion.div>
      )}

      {/* 3.3 Real Data Modules (Only rendered if history exists) */}
      {!isFirstTime && (
        <div className="space-y-8 pt-4 border-t border-ink-border" data-testid="dashboard-data-modules">
          {/* Continue Module */}
          {(latestSet || latestSession) && (
            <motion.section
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: getModuleDelay(), ease: "easeOut" }}
              className="space-y-2"
              data-testid="continue-module"
            >
              <div className="flex items-center justify-between">
                <span className="type-label text-ink-subtle">Continue Where You Left Off</span>
              </div>

              {latestSet ? (
                <div
                  onClick={() => navigate("/study-set", { state: { setId: latestSet.id } })}
                  className="p-5 bg-white border border-ink-border rounded-panel hover:border-brand transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                >
                  <div className="space-y-2 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="type-label text-brand bg-brand-tint px-2 py-0.5 rounded-[4px]">
                        Study Set
                      </span>
                      <span className="text-xs text-ink-subtle">
                        Updated {formatTimeAgo(latestSet.updatedAt)}
                      </span>
                    </div>
                    <h3 className="font-serif text-[18px] font-medium text-ink group-hover:text-brand transition-colors truncate">
                      {latestSet.title}
                    </h3>
                    {/* Chips for outputs */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {latestSet.outputs?.summary && (
                        <span className="text-xs px-2 py-0.5 rounded-[4px] bg-canvas text-ink border border-ink-border">
                          Summary done
                        </span>
                      )}
                      {latestSet.outputs?.quiz && (
                        <span className="text-xs px-2 py-0.5 rounded-[4px] bg-canvas text-ink border border-ink-border">
                          Quiz practice ready
                        </span>
                      )}
                      {latestSet.outputs?.flashcards && (
                        <span className="text-xs px-2 py-0.5 rounded-[4px] bg-canvas text-ink border border-ink-border">
                          Flashcards done
                        </span>
                      )}
                      {latestSet.outputs?.explanations?.length > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-[4px] bg-canvas text-ink border border-ink-border">
                          {latestSet.outputs.explanations.length} concepts explained
                        </span>
                      )}
                    </div>
                  </div>

                  <Button variant="primary" size="sm" className="shrink-0 self-start sm:self-center">
                    <span>Resume Study Set</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1.5" strokeWidth={1.75} />
                  </Button>
                </div>
              ) : latestSession ? (
                <div
                  onClick={() => handleOpenSession(latestSession)}
                  className="p-5 bg-white border border-ink-border rounded-panel hover:border-brand transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="type-label text-brand bg-brand-tint px-2 py-0.5 rounded-[4px]">
                        {latestSession.toolName || latestSession.tool}
                      </span>
                      <span className="text-xs text-ink-subtle">
                        {formatTimeAgo(latestSession.timestamp)}
                      </span>
                    </div>
                    <h3 className="font-serif text-[18px] font-medium text-ink group-hover:text-brand transition-colors truncate">
                      {latestSession.title}
                    </h3>
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-xs px-2 py-0.5 rounded-[4px] bg-canvas text-ink border border-ink-border">
                        {latestSession.toolName || "Result"} done
                      </span>
                    </div>
                  </div>

                  <Button variant="secondary" size="sm" className="shrink-0 self-start sm:self-center">
                    <span>Open Result</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1.5" strokeWidth={1.75} />
                  </Button>
                </div>
              ) : null}
            </motion.section>
          )}

          {/* Grid: Quiz Scores SVG Bar Chart & This Week 7-Day Strip */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Quiz scores inline SVG bar chart */}
            {recentQuizAttempts.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: getModuleDelay(), ease: "easeOut" }}
                className="lg:col-span-7 space-y-2"
                data-testid="quiz-scores-module"
              >
                <div className="flex items-center justify-between">
                  <span className="type-label text-ink-subtle">Quiz Performance</span>
                  <span className="text-xs text-ink-secondary">
                    Average: <strong className="font-serif font-medium text-ink tabular-nums text-sm">{animatedAvgScore}%</strong> across last {recentQuizAttempts.length} quizzes
                  </span>
                </div>

                <div className="p-5 bg-white border border-ink-border rounded-panel space-y-4">
                  {/* Inline SVG Bar Chart */}
                  <div className="relative w-full h-[160px]">
                    <svg
                      viewBox="0 0 420 140"
                      className="w-full h-full overflow-visible"
                      aria-hidden="true"
                    >
                      {/* Grid lines and y-axis labels */}
                      <line x1="36" y1="20" x2="410" y2="20" stroke="rgba(22,24,29,0.08)" strokeDasharray="3 3" />
                      <text x="30" y="24" textAnchor="end" className="text-[10px] fill-[#5B6070] font-sans">
                        100%
                      </text>

                      <line x1="36" y1="70" x2="410" y2="70" stroke="rgba(22,24,29,0.08)" strokeDasharray="3 3" />
                      <text x="30" y="74" textAnchor="end" className="text-[10px] fill-[#5B6070] font-sans">
                        50%
                      </text>

                      <line x1="36" y1="120" x2="410" y2="120" stroke="rgba(22,24,29,0.15)" />
                      <text x="30" y="124" textAnchor="end" className="text-[10px] fill-[#5B6070] font-sans">
                        0%
                      </text>

                      {/* SVG Bars with growth transition over 320ms (Part 3.5) */}
                      {recentQuizAttempts.slice().reverse().map((attempt, idx) => {
                        const totalBars = recentQuizAttempts.length;
                        const availableWidth = 360;
                        const barWidth = Math.min(26, Math.max(16, availableWidth / totalBars - 10));
                        const x = 45 + idx * (availableWidth / Math.max(1, totalBars));
                        const maxBarHeight = 100; // between y=120 and y=20
                        const targetHeight = Math.max(4, Math.round(((attempt.percentage || 0) / 100) * maxBarHeight));
                        const barHeight = chartAnimated ? targetHeight : 0;
                        const y = 120 - barHeight;

                        return (
                          <g key={attempt.id} className="group">
                            <rect
                              x={x}
                              y={y}
                              width={barWidth}
                              height={barHeight}
                              rx={3}
                              fill="#1F3FBF"
                              className="transition-all duration-300 ease-out hover:fill-[#1A36A6] cursor-pointer"
                            />
                            <title>{`${attempt.title}: ${attempt.percentage}% (${attempt.score}/${attempt.total})`}</title>
                            <text
                              x={x + barWidth / 2}
                              y={134}
                              textAnchor="middle"
                              className="text-[9px] fill-[#5B6070] font-sans tabular-nums"
                            >
                              {attempt.percentage}%
                            </text>
                          </g>
                        );
                      })}
                    </svg>

                    {/* Visually hidden accessible table for screen readers (Part 3.3) */}
                    <table className="sr-only">
                      <caption>Recent Quiz Scores and Percentages</caption>
                      <thead>
                        <tr>
                          <th scope="col">Quiz Title</th>
                          <th scope="col">Date</th>
                          <th scope="col">Score</th>
                          <th scope="col">Percentage</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentQuizAttempts.map((attempt) => (
                          <tr key={attempt.id}>
                            <td>{attempt.title}</td>
                            <td>{new Date(attempt.timestamp).toLocaleDateString()}</td>
                            <td>{attempt.score} of {attempt.total}</td>
                            <td>{attempt.percentage}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.section>
            )}

            {/* 7-day strip (This week activity) */}
            <motion.section
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: getModuleDelay(), ease: "easeOut" }}
              className={cn("space-y-2", recentQuizAttempts.length > 0 ? "lg:col-span-5" : "lg:col-span-12")}
              data-testid="this-week-module"
            >
              <div className="flex items-center justify-between">
                <span className="type-label text-ink-subtle">This Week Activity</span>
                <span className="text-xs text-ink-secondary">Last 7 days</span>
              </div>

              <div className="p-5 bg-white border border-ink-border rounded-panel">
                <div className="grid grid-cols-7 gap-2 text-center">
                  {weekActivity.map((day, i) => (
                    <div
                      key={i}
                      className={cn(
                        "p-2 rounded-[6px] flex flex-col items-center justify-between min-h-[90px] border transition-colors",
                        day.isToday
                          ? "border-brand bg-brand-tint/30 text-ink"
                          : "border-ink-border/60 bg-canvas/30 text-ink-secondary"
                      )}
                    >
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-subtle">
                        {day.dayLabel}
                      </span>
                      <div className="my-auto">
                        <span
                          className={cn(
                            "font-serif text-lg font-medium tabular-nums",
                            day.count > 0 ? "text-brand" : "text-ink-subtle"
                          )}
                        >
                          {day.count}
                        </span>
                        <span className="text-[10px] block text-ink-subtle">
                          {day.count === 1 ? "result" : "results"}
                        </span>
                      </div>
                      <span className="text-[9px] text-ink-subtle/80 tabular-nums">
                        {day.dateStr}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.section>
          </div>

          {/* Needs Review Module: Missed questions from most recent quiz */}
          {latestMissed.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: getModuleDelay(), ease: "easeOut" }}
              className="space-y-2"
              data-testid="needs-review-module"
            >
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="type-label text-feedback-error">Needs Review</span>
                  <h3 className="font-serif text-[18px] font-medium text-ink">
                    {latestMissed.length} Missed Question{latestMissed.length > 1 ? "s" : ""}
                  </h3>
                </div>
                <Button variant="secondary" size="sm" onClick={handleRetryMissed}>
                  <RotateCcw className="w-3.5 h-3.5 mr-1.5" strokeWidth={1.75} />
                  <span>Retry missed questions</span>
                </Button>
              </div>

              <div className="p-5 bg-white border border-ink-border rounded-panel divide-y divide-ink-border/70">
                {latestMissed.slice(0, 3).map((item, idx) => (
                  <div key={idx} className={cn("space-y-1.5", idx > 0 ? "pt-3 mt-3" : "")}>
                    <p className="text-xs font-medium text-ink">
                      {idx + 1}. {item.question}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      <div className="p-2 rounded bg-feedback-error/10 border border-feedback-error/20 text-feedback-error">
                        <span className="font-semibold block">Your choice:</span>
                        {item.selectedOptionText || "Incorrect"}
                      </div>
                      <div className="p-2 rounded bg-feedback-success/10 border border-feedback-success/20 text-feedback-success">
                        <span className="font-semibold block">Correct answer:</span>
                        {item.correctOptionText || "Correct"}
                      </div>
                    </div>
                    {item.explanation && (
                      <p className="text-[11px] text-ink-secondary pt-0.5">
                        <strong className="text-ink">Explanation:</strong> {item.explanation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </motion.section>
          )}

          {/* Recent Sessions List (Up to 8 items across all tools) */}
          {recentSessions.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: getModuleDelay(), ease: "easeOut" }}
              className="space-y-3"
              data-testid="recent-sessions-module"
            >
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="type-label text-ink-subtle">History</span>
                  <h3 className="font-serif text-[18px] font-medium text-ink">
                    Recent Sessions
                  </h3>
                </div>
                <Button
                  variant="subtle"
                  size="sm"
                  onClick={handleClearAllHistory}
                  className="text-ink-subtle hover:text-feedback-error"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" strokeWidth={1.75} />
                  <span>Clear history</span>
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {recentSessions.slice(0, 8).map((item) => (
                  <div
                    key={item.id}
                    className="p-4 bg-white border border-ink-border rounded-panel flex items-start justify-between gap-3 hover:border-brand/60 transition-colors"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-brand bg-brand-tint px-1.5 py-0.5 rounded-[3px]">
                          {item.toolName || item.tool}
                        </span>
                        <span className="text-[11px] text-ink-subtle flex items-center gap-1">
                          <Clock className="w-3 h-3" strokeWidth={1.75} />
                          {formatTimeAgo(item.timestamp)}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-ink truncate" title={item.title}>
                        {item.title}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 self-center">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleOpenSession(item)}
                        className="text-xs py-1 px-2.5 h-7"
                      >
                        Open
                      </Button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteSession(item.id, e)}
                        className="p-1.5 rounded hover:bg-canvas text-ink-subtle hover:text-feedback-error transition-colors"
                        title="Delete session"
                      >
                        <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.section>
          )}
        </div>
      )}
    </div>
  );
}
