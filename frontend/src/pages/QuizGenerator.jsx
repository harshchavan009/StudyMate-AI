import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { HelpCircle, RefreshCw, CheckCircle2, XCircle, ArrowRight, RotateCcw, Copy, Check } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { TransitionPanel } from "@/components/motion/TransitionPanel";
import { Disclosure, DisclosureTrigger, DisclosureContent } from "@/components/motion/Disclosure";
import { AnimatedGroup } from "@/components/motion/AnimatedGroup";
import { ScoreCounter } from "@/components/tools/ScoreCounter";
import { usePageMeta } from "@/lib/usePageMeta";
import { api } from "@/lib/api";
import { saveRecentSession } from "@/lib/storage";
import { cn } from "@/lib/utils";

const SAMPLE_TEXT = `Mitochondria are membrane-bound cell organelles that generate most of the chemical energy needed to power biochemical reactions. This chemical energy is stored in a small molecule called adenosine triphosphate (ATP). 

Mitochondria contain an outer membrane, an intermembrane space, an inner membrane folded into cristae, and an internal matrix space. Cellular respiration proceeds through three major stages: glycolysis in the cytosol, the citric acid cycle (Krebs cycle) in the mitochondrial matrix, and oxidative phosphorylation along the inner mitochondrial membrane. The electron transport chain creates a proton gradient across the inner membrane, which drives ATP synthase to produce ATP through chemiosmosis.`;

const DIFFICULTY_OPTIONS = [
  { label: "Easy", value: "easy" },
  { label: "Medium", value: "medium" },
  { label: "Hard", value: "hard" },
];

const COUNT_OPTIONS = [
  { label: "5 Questions", value: 5 },
  { label: "10 Questions", value: 10 },
  { label: "15 Questions", value: 15 },
];

export function QuizGenerator() {
  usePageMeta(
    "Quiz Generator",
    "Generate practice multiple choice questions with answers and explanations from your study notes."
  );

  const location = useLocation();
  const [text, setText] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [count, setCount] = useState(5);
  const [status, setStatus] = useState("initial"); // initial | loading | playing | finished | error
  const [error, setError] = useState(null);
  const [quizData, setQuizData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [limits, setLimits] = useState({ min: 20, max: 20000 });

  // Quiz taking state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [explanationOpen, setExplanationOpen] = useState(false);

  useEffect(() => {
    if (location.state?.session) {
      const { input, result } = location.state.session;
      if (input) setText(input);
      if (result?.questions) {
        setQuizData(result);
        setStatus("playing");
        setCurrentIndex(0);
        setUserAnswers({});
      }
    }
  }, [location.state]);

  useEffect(() => {
    api.getConfig()
      .then((cfg) => {
        if (cfg?.quiz) {
          setLimits({ min: cfg.quiz.min, max: cfg.quiz.max });
        }
      })
      .catch(() => {});
  }, []);

  const charCount = text.length;
  const isTooShort = charCount > 0 && charCount < limits.min;
  const isTooLong = charCount > limits.max;
  const isValid = charCount >= limits.min && charCount <= limits.max;

  const handleGenerate = async (e) => {
    if (e) e.preventDefault();
    if (!isValid || status === "loading") return;

    setStatus("loading");
    setError(null);
    setCurrentIndex(0);
    setUserAnswers({});
    setExplanationOpen(false);

    try {
      const data = await api.generateQuiz(text.trim(), difficulty, count);
      setQuizData(data);
      setStatus("playing");
      saveRecentSession({
        tool: "quiz",
        toolName: "Quiz Generator",
        title: `${difficulty.toUpperCase()} Quiz: ${text.split("\n")[0].slice(0, 50)}`,
        input: text,
        result: data,
      });
    } catch (err) {
      setError(err.message || "Failed to generate quiz. Please try again.");
      setStatus("error");
    }
  };

  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleGenerate();
    }
  };

  const handleUseExample = () => {
    setText(SAMPLE_TEXT);
    setStatus("initial");
    setQuizData(null);
  };

  const handleClear = () => {
    setText("");
    setStatus("initial");
    setQuizData(null);
    setError(null);
  };

  const currentQuestion = quizData?.questions?.[currentIndex];
  const hasAnsweredCurrent = userAnswers[currentIndex] !== undefined;
  const totalQuestions = quizData?.questions?.length || 0;

  const handleSelectOption = (optIdx) => {
    if (hasAnsweredCurrent) return;
    setUserAnswers((prev) => ({ ...prev, [currentIndex]: optIdx }));
    setExplanationOpen(true);
  };

  const handleNextQuestion = () => {
    if (currentIndex + 1 < totalQuestions) {
      setCurrentIndex((prev) => prev + 1);
      setExplanationOpen(false);
    } else {
      setStatus("finished");
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setUserAnswers({});
    setExplanationOpen(false);
    setStatus("playing");
  };

  const correctCount = quizData?.questions?.reduce((acc, q, idx) => {
    return userAnswers[idx] === q.correct_index ? acc + 1 : acc;
  }, 0) || 0;

  const scorePercentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  const handleCopyQuiz = () => {
    if (!quizData?.questions) return;
    const lines = quizData.questions.map((q, i) => {
      const opts = q.options.map((o, oIdx) => `   ${String.fromCharCode(65 + oIdx)}. ${o}`).join("\n");
      return `${i + 1}. ${q.question}\n${opts}\n   Answer: ${String.fromCharCode(65 + q.correct_index)}\n   Explanation: ${q.explanation}\n`;
    });
    navigator.clipboard.writeText(lines.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Keyboard navigation when taking quiz
  useEffect(() => {
    if (status !== "playing" || !currentQuestion) return;

    const onKey = (e) => {
      if (["1", "2", "3", "4"].includes(e.key) && !hasAnsweredCurrent) {
        handleSelectOption(parseInt(e.key, 10) - 1);
      } else if (e.key === "Enter" && hasAnsweredCurrent) {
        handleNextQuestion();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [status, currentQuestion, hasAnsweredCurrent, currentIndex]);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="space-y-1">
        <h1 className="font-serif text-2xl sm:text-3xl font-medium text-ink tracking-tight">
          Quiz Generator
        </h1>
        <p className="text-xs text-ink-secondary">
          Generate multiple choice practice questions with instant answer feedback and step-by-step explanations.
        </p>
      </div>

      {/* Split view at 1280px (xl:), stacked below */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* Left Column: Input and Configuration */}
        <div className="xl:col-span-5 space-y-4">
          <Card className="p-5 sm:p-6 space-y-4">
            <form onSubmit={handleGenerate} className="space-y-4">
              <div className="flex items-center justify-between">
                <label htmlFor="quiz-input" className="text-xs font-semibold text-ink">
                  Source Material
                </label>
                <button
                  type="button"
                  onClick={handleUseExample}
                  className="text-[11px] text-brand hover:underline font-medium"
                >
                  Use an example
                </button>
              </div>

              <textarea
                id="quiz-input"
                rows={9}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Paste study material or notes to generate questions from (minimum 20 characters)..."
                disabled={status === "loading" || status === "playing"}
                className={cn(
                  "w-full px-3.5 py-2.5 text-xs sm:text-sm text-ink bg-white border rounded-md transition-colors resize-y leading-relaxed",
                  "placeholder:text-ink-subtle/70 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand",
                  isTooShort && "border-feedback-warning",
                  isTooLong && "border-feedback-error",
                  !isTooShort && !isTooLong && "border-ink-border"
                )}
              />

              {/* Inline Character Count & Validation Hint */}
              <div className="flex items-center justify-between text-[11px]">
                <span
                  className={cn(
                    isTooShort
                      ? "text-feedback-warning"
                      : isTooLong
                      ? "text-feedback-error"
                      : "text-ink-subtle"
                  )}
                >
                  {isTooShort
                    ? `Enter at least ${limits.min} characters (${limits.min - charCount} more needed)`
                    : isTooLong
                    ? `Exceeds limit of ${limits.max} characters`
                    : "Press Cmd or Ctrl + Enter to submit"}
                </span>
                <span className="tabular-nums text-ink-subtle">
                  {charCount} / {limits.max}
                </span>
              </div>

              {/* Settings: Difficulty & Question Count */}
              <div className="space-y-3 pt-2 border-t border-ink-border">
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-ink block">Difficulty</span>
                  <SegmentedControl
                    options={DIFFICULTY_OPTIONS}
                    value={difficulty}
                    onChange={(val) => setDifficulty(val)}
                    ariaLabel="Select difficulty"
                  />
                </div>

                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-ink block">Number of Questions</span>
                  <SegmentedControl
                    options={COUNT_OPTIONS}
                    value={count}
                    onChange={(val) => setCount(Number(val))}
                    ariaLabel="Select question count"
                  />
                </div>
              </div>

              {/* Actions: Clear, Generate */}
              <div className="flex items-center justify-between pt-3 border-t border-ink-border">
                {text.length > 0 && status !== "loading" ? (
                  <Button type="button" variant="subtle" size="sm" onClick={handleClear}>
                    Clear
                  </Button>
                ) : (
                  <div />
                )}

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={!isValid || status === "loading" || status === "playing"}
                >
                  {status === "loading" ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" strokeWidth={1.75} />
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <HelpCircle className="w-4 h-4" strokeWidth={1.75} />
                      <span>Generate Quiz</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Card>

          {/* Error Alert with Retry */}
          {status === "error" && (
            <Alert variant="error" title="Quiz Generation Error" onClose={() => setStatus("initial")}>
              <div className="space-y-2">
                <p>{error}</p>
                <Button variant="secondary" size="sm" onClick={handleGenerate}>
                  <RefreshCw className="w-3.5 h-3.5" strokeWidth={1.75} />
                  <span>Retry</span>
                </Button>
              </div>
            </Alert>
          )}
        </div>

        {/* Right Column: Quiz Preview / Interactive Quiz Runner / Results */}
        <div className="xl:col-span-7 space-y-4">
          {/* INITIAL EMPTY STATE */}
          {status === "initial" && (
            <Card className="p-6 space-y-4 border-dashed">
              <div className="space-y-1">
                <h3 className="font-serif text-base font-medium text-ink">
                  Quiz Preview
                </h3>
                <p className="text-xs text-ink-secondary">
                  Your generated practice quiz will appear here. The quiz workflow includes:
                </p>
              </div>

              <ol className="space-y-2 text-xs text-ink-secondary border-t border-ink-border pt-4">
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-brand min-w-[1.25rem]">1.</span>
                  <div>
                    <span className="font-medium text-ink">One Question at a Time</span>: Focused single-question display with keyboard shortcuts (1 to 4).
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-brand min-w-[1.25rem]">2.</span>
                  <div>
                    <span className="font-medium text-ink">Progress Rail</span>: Live indicator showing exact progress across your questions.
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-brand min-w-[1.25rem]">3.</span>
                  <div>
                    <span className="font-medium text-ink">Immediate Answer Feedback</span>: Visual green or red indicators after selection.
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-brand min-w-[1.25rem]">4.</span>
                  <div>
                    <span className="font-medium text-ink">Expandable Explanations</span>: Detailed rationale explaining why the correct choice is right.
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-brand min-w-[1.25rem]">5.</span>
                  <div>
                    <span className="font-medium text-ink">Final Review Screen</span>: Score calculation and question-by-question breakdown.
                  </div>
                </li>
              </ol>
            </Card>
          )}

          {/* LOADING STATE */}
          {status === "loading" && (
            <div className="space-y-4" aria-busy="true" aria-live="polite">
              <div className="text-xs text-ink-secondary flex items-center gap-2 mb-1">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-brand" strokeWidth={1.75} />
                <span>Generating and validating {count} questions at {difficulty} level...</span>
              </div>
              <Card className="p-6 space-y-4">
                <div className="h-4 bg-[#EAE8E3] rounded w-1/4 animate-pulse" />
                <div className="h-5 bg-[#F2F0EB] rounded w-4/5 animate-pulse" />
                <div className="space-y-2 pt-2">
                  <div className="h-10 bg-[#FAF9F6] border border-ink-border rounded-md animate-pulse" />
                  <div className="h-10 bg-[#FAF9F6] border border-ink-border rounded-md animate-pulse" />
                  <div className="h-10 bg-[#FAF9F6] border border-ink-border rounded-md animate-pulse" />
                  <div className="h-10 bg-[#FAF9F6] border border-ink-border rounded-md animate-pulse" />
                </div>
              </Card>
            </div>
          )}

          {/* PLAYING STATE: Step-by-Step Question Runner */}
          {status === "playing" && currentQuestion && (
            <div className="space-y-4" aria-live="polite">
              {/* Progress Rail */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-ink-secondary">
                  <span className="font-medium text-ink">
                    Question {currentIndex + 1} of {totalQuestions}
                  </span>
                  <span className="tabular-nums font-semibold text-brand">
                    {Math.round(((currentIndex + 1) / totalQuestions) * 100)}%
                  </span>
                </div>
                <div className="h-1.5 w-full bg-[#EAE8E3] rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-brand origin-left"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: (currentIndex + 1) / totalQuestions }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                  />
                </div>
              </div>

              {/* Question Card via TransitionPanel */}
              <Card className="p-6 space-y-5">
                <TransitionPanel activeIndex={currentIndex} className="w-full">
                  {quizData.questions.map((q, qIndex) => (
                    <div key={q.id} className="space-y-5">
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-brand">
                          Question {qIndex + 1}
                        </span>
                        <h3 className="font-serif text-base sm:text-lg font-medium text-ink leading-snug">
                          {q.question}
                        </h3>
                      </div>

                      {/* 4 Options */}
                      <div className="space-y-2" role="radiogroup" aria-label="Question options">
                        {q.options.map((option, optIdx) => {
                          const isSelected = userAnswers[qIndex] === optIdx;
                          const isCorrect = optIdx === q.correct_index;
                          const hasAnswered = userAnswers[qIndex] !== undefined;

                          let stateClass = "border-ink-border hover:border-ink hover:bg-black/[0.01]";
                          if (hasAnswered) {
                            if (isCorrect) {
                              stateClass = "border-feedback-success bg-feedback-success-bg text-ink";
                            } else if (isSelected) {
                              stateClass = "border-feedback-error bg-feedback-error-bg text-ink";
                            } else {
                              stateClass = "border-ink-border/40 opacity-50 text-ink-secondary";
                            }
                          }

                          return (
                            <button
                              key={optIdx}
                              type="button"
                              disabled={hasAnswered}
                              onClick={() => handleSelectOption(optIdx)}
                              className={cn(
                                "w-full text-left p-3 rounded-md border text-xs sm:text-sm font-medium transition-colors duration-150 flex items-start gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                                stateClass
                              )}
                            >
                              <span
                                className={cn(
                                  "w-5 h-5 rounded-[4px] border flex items-center justify-center text-xs shrink-0 mt-0.5",
                                  hasAnswered && isCorrect
                                    ? "bg-feedback-success text-white border-feedback-success"
                                    : hasAnswered && isSelected
                                    ? "bg-feedback-error text-white border-feedback-error"
                                    : "border-ink-border bg-[#F5F4F0] text-ink-secondary"
                                )}
                              >
                                {String.fromCharCode(65 + optIdx)}
                              </span>
                              <span className="flex-1 leading-relaxed">{option}</span>
                              {hasAnswered && isCorrect && (
                                <CheckCircle2 className="w-4 h-4 text-feedback-success shrink-0 mt-0.5" />
                              )}
                              {hasAnswered && isSelected && !isCorrect && (
                                <XCircle className="w-4 h-4 text-feedback-error shrink-0 mt-0.5" />
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* Explanation Drawer via Disclosure */}
                      {hasAnsweredCurrent && (
                        <Disclosure open={explanationOpen} onOpenChange={setExplanationOpen}>
                          <DisclosureTrigger className="w-full text-left pt-1">
                            <div className="flex items-center gap-2 text-xs font-semibold text-brand hover:underline cursor-pointer">
                              <span>{userAnswers[currentIndex] === q.correct_index ? "Correct answer" : "Explanation"}</span>
                              <span>·</span>
                              <span className="text-[11px] font-normal text-ink-secondary">Click to toggle</span>
                            </div>
                          </DisclosureTrigger>
                          <DisclosureContent className="pt-2">
                            <div className="p-3.5 rounded-md bg-[#FAF9F6] border border-ink-border text-xs text-ink-secondary leading-relaxed space-y-1">
                              <span className="font-semibold text-ink block">Explanation:</span>
                              <p>{q.explanation}</p>
                            </div>
                          </DisclosureContent>
                        </Disclosure>
                      )}

                      {/* Next / Finish Button */}
                      <div className="flex items-center justify-between pt-4 border-t border-ink-border">
                        <span className="text-[11px] text-ink-subtle hidden sm:inline">
                          Keyboard: 1 to 4 to choose, Enter to continue
                        </span>
                        <Button
                          variant="primary"
                          size="md"
                          disabled={!hasAnsweredCurrent}
                          onClick={handleNextQuestion}
                          className="ml-auto"
                        >
                          <span>{currentIndex + 1 === totalQuestions ? "Finish Quiz" : "Next Question"}</span>
                          <ArrowRight className="w-4 h-4" strokeWidth={1.75} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </TransitionPanel>
              </Card>
            </div>
          )}

          {/* FINISHED STATE: Results & Review */}
          {status === "finished" && (
            <div className="space-y-4">
              <Card className="p-6 text-center space-y-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">
                  Quiz Completed
                </span>
                <h3 className="font-serif text-3xl font-medium text-ink">
                  Score:{" "}
                  <span className="text-brand font-bold">
                    <ScoreCounter from={0} to={scorePercentage} duration={0.8} />%
                  </span>
                </h3>
                <p className="text-xs text-ink-secondary">
                  You got {correctCount} of {totalQuestions} questions correct.
                </p>

                <div className="flex items-center justify-center gap-2 pt-2">
                  <Button variant="secondary" size="sm" onClick={handleRestart}>
                    <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.75} />
                    <span>Try Again</span>
                  </Button>
                  <Button variant="secondary" size="sm" onClick={handleCopyQuiz}>
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-feedback-success" strokeWidth={1.75} />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" strokeWidth={1.75} />
                        <span>Copy Questions</span>
                      </>
                    )}
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setStatus("initial");
                      setQuizData(null);
                    }}
                  >
                    <span>New Quiz</span>
                  </Button>
                </div>
              </Card>

              {/* Per-Question Breakdown List */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-ink-subtle uppercase tracking-wider block">
                  Question Breakdown
                </span>
                <AnimatedGroup className="space-y-2">
                  {quizData.questions.map((q, qIdx) => {
                    const userChoice = userAnswers[qIdx];
                    const isPassed = userChoice === q.correct_index;

                    return (
                      <Card key={q.id} className="p-4 space-y-1.5">
                        <div className="flex items-start gap-2.5">
                          {isPassed ? (
                            <CheckCircle2 className="w-4 h-4 text-feedback-success shrink-0 mt-0.5" />
                          ) : (
                            <XCircle className="w-4 h-4 text-feedback-error shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1 text-xs space-y-1">
                            <div className="font-serif text-sm font-medium text-ink">
                              {qIdx + 1}. {q.question}
                            </div>
                            <div className="text-ink-secondary">
                              <span className="font-medium text-ink">Your answer:</span>{" "}
                              <span className={isPassed ? "text-feedback-success" : "text-feedback-error"}>
                                {userChoice !== undefined ? q.options[userChoice] : "Unanswered"}
                              </span>
                            </div>
                            {!isPassed && (
                              <div className="text-ink-secondary">
                                <span className="font-medium text-ink">Correct answer:</span>{" "}
                                <span className="text-feedback-success font-medium">
                                  {q.options[q.correct_index]}
                                </span>
                              </div>
                            )}
                            <p className="text-ink-subtle pt-1 border-t border-ink-border/50">
                              {q.explanation}
                            </p>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </AnimatedGroup>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
