import { useState, useRef, useEffect } from "react";
import { HelpCircle, RefreshCw, CheckCircle2, XCircle, ArrowRight, RotateCcw, Award } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Textarea";
import { Alert } from "@/components/ui/Alert";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { TransitionPanel } from "@/components/motion/TransitionPanel";
import { Disclosure, DisclosureTrigger, DisclosureContent } from "@/components/motion/Disclosure";
import { AnimatedGroup } from "@/components/motion/AnimatedGroup";
import { ScoreCounter } from "@/components/tools/ScoreCounter";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

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
  const [text, setText] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [count, setCount] = useState(5);
  const [status, setStatus] = useState("initial"); // initial | loading | playing | finished | error
  const [error, setError] = useState(null);
  const [quizData, setQuizData] = useState(null);

  // Active quiz playing state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({}); // { [questionIndex]: selectedOptionIndex }
  const [explanationOpen, setExplanationOpen] = useState(false);

  const handleGenerate = async (e) => {
    if (e) e.preventDefault();
    if (text.trim().length < 20 || status === "loading") return;

    setStatus("loading");
    setError(null);
    setCurrentIndex(0);
    setUserAnswers({});
    setExplanationOpen(false);

    try {
      const data = await api.generateQuiz(text.trim(), difficulty, count);
      setQuizData(data);
      setStatus("playing");
    } catch (err) {
      setError(err.message || "Failed to generate quiz questions. Please try again.");
      setStatus("error");
    }
  };

  const currentQuestion = quizData?.questions?.[currentIndex];
  const hasAnsweredCurrent = userAnswers[currentIndex] !== undefined;
  const currentSelection = userAnswers[currentIndex];
  const totalQuestions = quizData?.questions?.length || 0;

  const handleSelectOption = (optionIndex) => {
    if (hasAnsweredCurrent) return; // Prevent changing answer after selection
    setUserAnswers((prev) => ({
      ...prev,
      [currentIndex]: optionIndex,
    }));
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

  // Calculate score
  const correctCount = quizData?.questions?.reduce((acc, q, idx) => {
    return userAnswers[idx] === q.correct_index ? acc + 1 : acc;
  }, 0) || 0;

  const scorePercentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  // Keyboard navigation for questions
  useEffect(() => {
    if (status !== "playing" || !currentQuestion) return;

    const handleKeyDown = (e) => {
      if (["1", "2", "3", "4"].includes(e.key) && !hasAnsweredCurrent) {
        handleSelectOption(parseInt(e.key, 10) - 1);
      } else if (e.key === "Enter" && hasAnsweredCurrent) {
        handleNextQuestion();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [status, currentQuestion, hasAnsweredCurrent, currentIndex]);

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="space-y-1">
        <h2 className="font-serif text-2xl sm:text-3xl font-medium text-ink tracking-tight">
          Practice Quiz Generator
        </h2>
        <p className="text-xs text-ink-secondary">
          Generate targeted multiple choice questions with calibrated difficulty and progressive answer explanations.
        </p>
      </div>

      {/* Configuration & Input Card (Visible when not actively taking quiz) */}
      {(status === "initial" || status === "loading" || status === "error") && (
        <Card>
          <form onSubmit={handleGenerate} className="space-y-5">
            <Textarea
              id="quiz-source-text"
              label="Source Material or Topic"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste study material, notes, or chapter excerpt to generate questions from (minimum 20 characters)..."
              minChars={20}
              maxChars={20000}
              rows={6}
              disabled={status === "loading"}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink">Difficulty Tier</label>
                <div>
                  <SegmentedControl
                    options={DIFFICULTY_OPTIONS}
                    value={difficulty}
                    onChange={(val) => setDifficulty(val)}
                    ariaLabel="Select difficulty"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink">Question Count</label>
                <div>
                  <SegmentedControl
                    options={COUNT_OPTIONS}
                    value={count}
                    onChange={(val) => setCount(Number(val))}
                    ariaLabel="Select question count"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-ink-border">
              <span className="text-[11px] text-ink-subtle">
                Bounded model validation ensures accurate answer keys.
              </span>
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={text.trim().length < 20 || status === "loading"}
              >
                {status === "loading" ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Building Quiz...</span>
                  </>
                ) : (
                  <>
                    <HelpCircle className="w-4 h-4" />
                    <span>Generate Practice Quiz</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Error Alert with Retry */}
      {status === "error" && (
        <Alert variant="error" title="Quiz Generation Error" onClose={() => setStatus("initial")}>
          <div className="space-y-2">
            <p>{error}</p>
            <Button variant="secondary" size="sm" onClick={handleGenerate} className="mt-1">
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Generation</span>
            </Button>
          </div>
        </Alert>
      )}

      {/* ACTIVE QUIZ RUNNER */}
      {status === "playing" && currentQuestion && (
        <div className="space-y-5" aria-live="polite">
          {/* Progress Rail (scaleX on hairline bar) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-ink-secondary">
              <span className="font-medium text-ink">
                Question {currentIndex + 1} of {totalQuestions}
              </span>
              <span className="tabular-nums font-medium text-brand">
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
          <Card className="p-6 sm:p-8">
            <TransitionPanel activeIndex={currentIndex} className="w-full">
              {quizData.questions.map((q, qIndex) => (
                <div key={q.id} className="space-y-6">
                  <div className="space-y-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-brand">
                      {difficulty.toUpperCase()} LEVEL
                    </span>
                    <h3 className="font-serif text-lg sm:text-xl font-medium text-ink leading-snug">
                      {q.question}
                    </h3>
                  </div>

                  {/* 4 Options Grid */}
                  <div className="space-y-2.5" role="radiogroup" aria-label="Question options">
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
                          stateClass = "border-ink-border/40 opacity-60 text-ink-secondary";
                        }
                      }

                      return (
                        <motion.button
                          key={optIdx}
                          type="button"
                          disabled={hasAnswered}
                          onClick={() => handleSelectOption(optIdx)}
                          className={cn(
                            "w-full text-left p-3.5 sm:p-4 rounded-md border text-xs sm:text-sm font-medium transition-colors duration-150 flex items-start gap-3 relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                            stateClass
                          )}
                          whileTap={hasAnswered ? {} : { scale: 0.99 }}
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
                        </motion.button>
                      );
                    })}
                  </div>

                  {/* Smooth Explanation Expansion via Disclosure */}
                  {hasAnsweredCurrent && (
                    <Disclosure open={explanationOpen} onOpenChange={setExplanationOpen}>
                      <DisclosureTrigger className="w-full text-left pt-2">
                        <div className="flex items-center gap-2 text-xs font-semibold text-brand hover:underline cursor-pointer">
                          <span>{userAnswers[currentIndex] === q.correct_index ? "Correct answer" : "Review explanation"}</span>
                          <span>·</span>
                          <span className="text-[11px] font-normal text-ink-secondary">Click to toggle details</span>
                        </div>
                      </DisclosureTrigger>
                      <DisclosureContent className="pt-2">
                        <div className="p-4 rounded-md bg-[#FAF9F6] border border-ink-border text-xs text-ink-secondary leading-relaxed space-y-1">
                          <div className="font-semibold text-ink">Pedagogical Analysis</div>
                          <p>{q.explanation}</p>
                        </div>
                      </DisclosureContent>
                    </Disclosure>
                  )}

                  {/* Navigation Action */}
                  <div className="flex items-center justify-between pt-4 border-t border-ink-border">
                    <span className="text-[11px] text-ink-subtle hidden sm:inline">
                      Tip: Press 1 to 4 on your keyboard to select an option, Enter for next.
                    </span>
                    <Button
                      variant="primary"
                      size="md"
                      disabled={!hasAnsweredCurrent}
                      onClick={handleNextQuestion}
                      className="ml-auto"
                    >
                      <span>
                        {currentIndex + 1 === totalQuestions ? "Finish Quiz" : "Next Question"}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </TransitionPanel>
          </Card>
        </div>
      )}

      {/* RESULTS SUMMARY SCREEN */}
      {status === "finished" && (
        <div className="space-y-6">
          <Card className="p-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-brand-tint text-brand mx-auto flex items-center justify-center">
              <Award className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">
                Quiz Complete
              </span>
              <h3 className="font-serif text-3xl font-medium text-ink">
                Final Score:{" "}
                <span className="text-brand font-bold">
                  <ScoreCounter from={0} to={scorePercentage} duration={0.8} />%
                </span>
              </h3>
              <p className="text-xs text-ink-secondary">
                You correctly answered {correctCount} out of {totalQuestions} questions at {difficulty} difficulty.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <Button variant="secondary" size="md" onClick={handleRestart}>
                <RotateCcw className="w-4 h-4" />
                <span>Retry Same Quiz</span>
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  setStatus("initial");
                  setQuizData(null);
                }}
              >
                <span>Create New Quiz</span>
              </Button>
            </div>
          </Card>

          {/* Per-Question Breakdown List revealed via AnimatedGroup */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">
              Question Breakdown
            </h4>

            <AnimatedGroup className="space-y-3">
              {quizData.questions.map((q, qIdx) => {
                const userChoice = userAnswers[qIdx];
                const isPassed = userChoice === q.correct_index;

                return (
                  <Card key={q.id} className="p-4 sm:p-5">
                    <div className="flex items-start gap-3">
                      {isPassed ? (
                        <CheckCircle2 className="w-4 h-4 text-feedback-success shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-4 h-4 text-feedback-error shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 space-y-1.5 text-xs">
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
                        <p className="text-ink-subtle pt-1 border-t border-ink-border/50 leading-relaxed">
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
  );
}

