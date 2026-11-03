import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { HelpCircle, RefreshCw, CheckCircle2, XCircle, ArrowRight, RotateCcw, Check, Sparkles, FileText, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { FieldCounter } from "@/components/ui/FieldCounter";
import { ToolLayout } from "@/components/layout/ToolLayout";
import { InputPanel } from "@/components/ui/InputPanel";
import { ResultPanel } from "@/components/ui/ResultPanel";
import { TransitionPanel } from "@/components/motion/TransitionPanel";
import { Disclosure, DisclosureTrigger, DisclosureContent } from "@/components/motion/Disclosure";
import { ScoreCounter } from "@/components/tools/ScoreCounter";
import { NextSteps } from "@/components/tools/NextSteps";
import { usePageMeta } from "@/lib/usePageMeta";
import { useOnlineStatus } from "@/lib/useOnlineStatus";
import { api } from "@/lib/api";
import { saveRecentSession, saveDraft, getDraft, clearDraft } from "@/lib/storage";
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

const QUIZ_SECTIONS = [
  { title: "Multiple Choice Questions", description: "Four-option questions targeting core mechanisms from your notes." },
  { title: "Progress tracker", description: "Navigation tracking answered and pending questions." },
  { title: "Instant Feedback", description: "Immediate review showing correct answers and rationales." },
  { title: "Answer Explanations", description: "Clear explanations clarifying the underlying concepts." },
  { title: "Your score and a review of every question", description: "Review each question with detailed explanations." },
];

const ACTIVE_QUIZ_STORAGE_KEY = "studymate_active_quiz_v1";

/**
 * Shuffles 4 options per question on the client while tracking the correct answer (C7).
 */
function shuffleQuestions(questions) {
  if (!Array.isArray(questions)) return [];
  return questions.map((q) => {
    const originalCorrect = q.options[q.correct_index];
    const shuffled = [...q.options].sort(() => Math.random() - 0.5);
    const newCorrectIdx = shuffled.indexOf(originalCorrect);
    return {
      ...q,
      options: shuffled,
      correct_index: newCorrectIdx,
    };
  });
}

export function QuizGenerator() {
  usePageMeta(
    "Quiz Generator",
    "Generate practice multiple choice questions with answers and explanations from your study notes."
  );

  const location = useLocation();
  const navigate = useNavigate();
  const isOnline = useOnlineStatus();
  const [text, setText] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [count, setCount] = useState(5);
  const [status, setStatus] = useState("empty"); // empty | loading | playing | finished | error
  const [error, setError] = useState(null);
  const [quizData, setQuizData] = useState(null);
  const [limits, setLimits] = useState({ min: 20, max: 10000, focus_max: 200 });
  const [focus, setFocus] = useState("");
  const draftTimerRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Quiz taking state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [explanationOpen, setExplanationOpen] = useState(false);
  const questionHeadingRef = useRef(null);

  // F1: Dual Study Modes ("quiz" vs "flashcards") from same questions
  const [studyMode, setStudyMode] = useState("quiz");
  const [flashcardDeck, setFlashcardDeck] = useState([]);
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [reviewAgainQueue, setReviewAgainQueue] = useState([]);
  const [masteredCards, setMasteredCards] = useState(new Set());
  const [flashcardRound, setFlashcardRound] = useState(1);
  const [flashcardsDone, setFlashcardsDone] = useState(false);

  const initFlashcards = (qs) => {
    setFlashcardDeck(qs || []);
    setFlashcardIndex(0);
    setIsFlipped(false);
    setReviewAgainQueue([]);
    setMasteredCards(new Set());
    setFlashcardRound(1);
    setFlashcardsDone(false);
  };

  const handleFlipCard = () => {
    setIsFlipped((f) => !f);
  };

  const advanceFlashcard = (nextQueue, nextMastered) => {
    setIsFlipped(false);
    if (flashcardIndex + 1 < flashcardDeck.length) {
      setFlashcardIndex((i) => i + 1);
    } else {
      if (nextQueue.length > 0) {
        setFlashcardDeck(nextQueue);
        setReviewAgainQueue([]);
        setFlashcardIndex(0);
        setFlashcardRound((r) => r + 1);
      } else {
        setFlashcardsDone(true);
      }
    }
  };

  const handleGotIt = () => {
    const currentCard = flashcardDeck[flashcardIndex];
    if (!currentCard) return;
    const nextMastered = new Set(masteredCards).add(currentCard.question);
    setMasteredCards(nextMastered);
    advanceFlashcard(reviewAgainQueue, nextMastered);
  };

  const handleReviewAgain = () => {
    const currentCard = flashcardDeck[flashcardIndex];
    if (!currentCard) return;
    const nextQueue = [...reviewAgainQueue, currentCard];
    setReviewAgainQueue(nextQueue);
    advanceFlashcard(nextQueue, masteredCards);
  };

  const handleRestartFlashcards = () => {
    initFlashcards(quizData?.questions || []);
  };

  // Load limits from backend /api/config
  useEffect(() => {
    api.getConfig()
      .then((cfg) => {
        if (cfg?.quiz) {
          setLimits({
            min: cfg.quiz.min,
            max: cfg.quiz.max,
            focus_max: cfg.quiz.focus_max || 200,
          });
        }
      })
      .catch(() => {});
  }, []);

  // Restore session from navigation, active quiz, or draft (C7: progress survives refresh)
  useEffect(() => {
    if (location.state?.session) {
      const { input, result } = location.state.session;
      if (input) setText(input);
      if (result?.questions) {
        setQuizData(result);
        initFlashcards(result.questions);
        setStatus("playing");
        setCurrentIndex(0);
        setUserAnswers({});
      }
    } else if (location.state?.prefill) {
      setText(location.state.prefill);
      if (location.state.focus) setFocus(location.state.focus);
      setStatus("empty");
      setQuizData(null);
      setTimeout(() => {
        const el = document.getElementById("quiz-input");
        if (el) el.focus();
      }, 50);
    } else {
      try {
        const savedActive = localStorage.getItem(ACTIVE_QUIZ_STORAGE_KEY);
        if (savedActive) {
          const parsed = JSON.parse(savedActive);
          if (parsed && parsed.quizData && parsed.status === "playing") {
            setQuizData(parsed.quizData);
            initFlashcards(parsed.quizData.questions);
            setUserAnswers(parsed.userAnswers || {});
            setCurrentIndex(parsed.currentIndex || 0);
            setStatus("playing");
            if (parsed.text) setText(parsed.text);
            return;
          }
        }
      } catch {}

      const draft = getDraft("quiz");
      if (draft && typeof draft === "string") {
        setText(draft);
      }
    }
  }, [location.state]);

  // Persist active quiz progress across refresh (C7)
  useEffect(() => {
    if (status === "playing" && quizData) {
      try {
        localStorage.setItem(
          ACTIVE_QUIZ_STORAGE_KEY,
          JSON.stringify({ quizData, userAnswers, currentIndex, status, text })
        );
      } catch {}
    } else if (status === "finished" || status === "empty") {
      try {
        localStorage.removeItem(ACTIVE_QUIZ_STORAGE_KEY);
      } catch {}
    }
  }, [status, quizData, userAnswers, currentIndex, text]);

  // Debounced autosave draft (500ms)
  const handleTextChange = (e) => {
    const val = e.target.value;
    setText(val);
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(() => {
      if (val.trim()) {
        saveDraft("quiz", val);
      } else {
        clearDraft("quiz");
      }
    }, 500);
  };

  const charCount = text.length;
  const isTooShort = charCount > 0 && charCount < limits.min;
  const isTooLong = charCount > limits.max;
  const isValid = isOnline && charCount >= limits.min && charCount <= limits.max;

  // Disabled reason for submit button (A7 / C6)
  let disabledReason = "";
  if (!isOnline) {
    disabledReason = "You are currently offline. Check your network connection.";
  } else if (status === "loading") {
    disabledReason = "Generating quiz questions, please wait...";
  } else if (charCount === 0) {
    disabledReason = `Enter at least ${limits.min} characters to generate a practice quiz.`;
  } else if (isTooShort) {
    disabledReason = `Enter at least ${limits.min} characters (${limits.min - charCount} more needed).`;
  } else if (isTooLong) {
    disabledReason = `Text exceeds the maximum limit by ${(charCount - limits.max).toLocaleString()} characters.`;
  }

  const handleGenerate = async (e) => {
    if (e) e.preventDefault();
    if (!isValid || status === "loading") return;

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setStatus("loading");
    setError(null);
    setCurrentIndex(0);
    setUserAnswers({});
    setExplanationOpen(false);

    try {
      const data = await api.generateQuiz(
        text.trim(),
        difficulty,
        Number(count),
        focus.trim() || null,
        {
          signal: controller.signal,
        }
      );

      // C7: Shuffle options per question on the client while preserving correct answer
      const shuffledQuestions = shuffleQuestions(data.questions);
      const preparedData = {
        ...data,
        questions: shuffledQuestions,
      };

      setQuizData(preparedData);
      initFlashcards(preparedData.questions);
      setStatus("playing");
      saveRecentSession({
        tool: "quiz",
        toolName: "Quiz Generator",
        title: `${difficulty.toUpperCase()} Quiz (${preparedData.questions.length} Qs)`,
        input: text,
        result: preparedData,
      });
    } catch (err) {
      if (err.name === "AbortError" || err.message === "Request was cancelled.") {
        setStatus(quizData ? "playing" : "empty");
      } else {
        setError(err.message || "Failed to generate quiz. Please try again.");
        setStatus("error");
      }
    } finally {
      abortControllerRef.current = null;
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
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
    saveDraft("quiz", SAMPLE_TEXT);
    setStatus("empty");
    setQuizData(null);
  };

  const handleClear = () => {
    setText("");
    setFocus("");
    clearDraft("quiz");
    try {
      localStorage.removeItem(ACTIVE_QUIZ_STORAGE_KEY);
    } catch {}
    setStatus("empty");
    setQuizData(null);
    setError(null);
    setUserAnswers({});
    setCurrentIndex(0);
  };

  // Keyboard navigation for active quiz (keys 1-4, Enter)
  useEffect(() => {
    if (status !== "playing" || !quizData?.questions) return;

    const handleQuizKeyboard = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

      const q = quizData.questions[currentIndex];
      const isAnswered = userAnswers[currentIndex] !== undefined;

      if (!isAnswered && ["1", "2", "3", "4"].includes(e.key)) {
        const optionIdx = parseInt(e.key, 10) - 1;
        if (q && optionIdx < q.options.length) {
          e.preventDefault();
          handleSelectAnswer(optionIdx);
        }
      }

      if (isAnswered && e.key === "Enter") {
        e.preventDefault();
        handleNextQuestion();
      }
    };

    window.addEventListener("keydown", handleQuizKeyboard);
    return () => window.removeEventListener("keydown", handleQuizKeyboard);
  }, [status, currentIndex, userAnswers, quizData]);

  // Flashcards keyboard accessibility (Space to flip, 1 to review again, 2 to got it)
  useEffect(() => {
    if (studyMode !== "flashcards" || flashcardsDone || !flashcardDeck.length) return;

    const handleKey = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

      if (e.code === "Space") {
        e.preventDefault();
        handleFlipCard();
      } else if (isFlipped) {
        if (e.key === "1" || e.key.toLowerCase() === "r") {
          e.preventDefault();
          handleReviewAgain();
        } else if (e.key === "2" || e.key.toLowerCase() === "g" || e.key === "Enter") {
          e.preventDefault();
          handleGotIt();
        }
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [studyMode, flashcardsDone, flashcardDeck, flashcardIndex, isFlipped, reviewAgainQueue, masteredCards]);

  const handleSelectAnswer = (optionIdx) => {
    if (userAnswers[currentIndex] !== undefined) return;
    setUserAnswers((prev) => ({
      ...prev,
      [currentIndex]: optionIdx,
    }));
    setExplanationOpen(true);
  };

  const handleNextQuestion = () => {
    if (!quizData?.questions) return;
    if (currentIndex < quizData.questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setExplanationOpen(false);
      // Focus move to next question heading (C11)
      setTimeout(() => {
        if (questionHeadingRef.current) {
          questionHeadingRef.current.focus();
        }
      }, 50);
    } else {
      setStatus("finished");
    }
  };

  // C7: "Retry missed questions" (reuses the same questions, zero API call)
  const handleRetryMissedQuestions = () => {
    if (!quizData?.questions) return;
    const missedQuestions = quizData.questions.filter((q, idx) => {
      return userAnswers[idx] !== q.correct_index;
    });

    if (missedQuestions.length === 0) return;

    setQuizData({
      ...quizData,
      questions: missedQuestions,
    });
    setUserAnswers({});
    setCurrentIndex(0);
    setExplanationOpen(false);
    setStatus("playing");
  };

  // C7: "New quiz"
  const handleNewQuiz = () => {
    handleClear();
  };

  const questions = quizData?.questions || [];
  const currentQuestion = questions[currentIndex];
  const answeredCount = Object.keys(userAnswers).length;

  const score = Object.entries(userAnswers).reduce((acc, [qIdx, ansIdx]) => {
    const q = questions[parseInt(qIdx, 10)];
    return q && q.correct_index === ansIdx ? acc + 1 : acc;
  }, 0);

  const missedCount = questions.length - score;

  const rawMarkdown = quizData
    ? `# Practice Quiz: ${difficulty.toUpperCase()} (${questions.length} Questions)\n\n` +
      questions
        .map(
          (q, i) =>
            `### Q${i + 1}: ${q.question}\n` +
            q.options.map((opt, optIdx) => `${String.fromCharCode(65 + optIdx)}) ${opt}`).join("\n") +
            `\n\n**Answer:** ${String.fromCharCode(65 + q.correct_index)} - ${q.options[q.correct_index]}\n` +
            `**Explanation:** ${q.explanation}\n`
        )
        .join("\n---\n\n")
    : null;

  const inputPanel = (
    <InputPanel onSubmit={handleGenerate}>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="quiz-input" className="text-xs font-semibold text-ink">
            Study Material
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
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder="Paste lecture notes or textbook chapters to generate practice questions..."
          rows={7}
          disabled={status === "loading"}
          aria-describedby={!isValid ? "submit-disabled-reason" : undefined}
          className={cn(
            "w-full text-xs sm:text-sm font-sans px-3.5 py-2.5 bg-white border rounded resize-y focus:outline-none focus:ring-1 transition-colors leading-relaxed",
            isTooLong
              ? "border-feedback-error focus:border-feedback-error focus:ring-feedback-error"
              : "border-ink-border focus:border-brand focus:ring-brand",
            status === "loading" && "bg-[#F5F4F0]"
          )}
        />

        <FieldCounter
          count={charCount}
          max={limits.max}
          min={limits.min}
          helperText="20 to 10,000 characters."
        />
      </div>

      {/* Difficulty Setting */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-ink block">
          Difficulty Level
        </label>
        <SegmentedControl
          options={DIFFICULTY_OPTIONS}
          value={difficulty}
          onChange={setDifficulty}
          ariaLabel="Select difficulty"
        />
      </div>

      {/* Question Count Setting */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-ink block">
          Number of Questions
        </label>
        <SegmentedControl
          options={COUNT_OPTIONS}
          value={count}
          onChange={(val) => setCount(Number(val))}
          ariaLabel="Select question count"
        />
      </div>

      {/* Focus Topic Setting */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="quiz-focus-input" className="text-xs font-semibold text-ink">
            Focus Topic <span className="font-normal text-ink-subtle">(optional)</span>
          </label>
          <span className="text-[11px] font-mono tabular-nums text-ink-subtle">
            {focus.length} / {limits.focus_max || 200}
          </span>
        </div>
        <input
          id="quiz-focus-input"
          type="text"
          value={focus}
          onChange={(e) => setFocus(e.target.value.slice(0, limits.focus_max || 200))}
          placeholder="e.g. Cache poisoning, state transitions"
          disabled={status === "loading"}
          maxLength={limits.focus_max || 200}
          className="w-full text-xs sm:text-sm font-sans px-3.5 py-2 bg-white border border-ink-border rounded focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors text-ink placeholder:text-ink-subtle/60"
        />
        <p className="text-[11px] text-ink-subtle">
          Directs questions toward this topic while remaining grounded in your notes.
        </p>
      </div>

      {/* Action Buttons & Disabled Reason - Sticky above bottom nav on mobile (C12) */}
      <div className="pt-2 border-t border-ink-border space-y-2 sticky bottom-16 sm:static bg-white/95 sm:bg-transparent backdrop-blur-sm sm:backdrop-blur-none -mx-4 px-4 py-2 sm:mx-0 sm:px-0 sm:py-0 z-10">
        <div className="flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleClear}
            disabled={status === "loading" || !text}
          >
            <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.75} />
            <span>Clear</span>
          </Button>

          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={!isValid || status === "loading"}
            aria-describedby={!isValid ? "submit-disabled-reason" : undefined}
          >
            {status === "loading" ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" strokeWidth={1.75} />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <HelpCircle className="w-3.5 h-3.5" strokeWidth={1.75} />
                <span>{status === "playing" || status === "finished" ? "Regenerate" : "Generate Quiz"}</span>
              </>
            )}
          </Button>
        </div>

        {!isValid && disabledReason && (
          <p
            id="submit-disabled-reason"
            className="text-[11px] text-ink-subtle text-right"
          >
            {disabledReason}
          </p>
        )}

        {isValid && (
          <p className="text-[11px] text-ink-subtle text-right">
            Press <kbd className="px-1.5 py-0.5 bg-[#EAE8E3] border border-ink-border/60 rounded text-[10px] font-mono text-ink shadow-[0_1px_0_rgba(0,0,0,0.06)]">Cmd</kbd> + <kbd className="px-1.5 py-0.5 bg-[#EAE8E3] border border-ink-border/60 rounded text-[10px] font-mono text-ink shadow-[0_1px_0_rgba(0,0,0,0.06)]">Enter</kbd> to submit
          </p>
        )}
      </div>
    </InputPanel>
  );

  const resultPanel = (
    <ResultPanel
      status={status}
      error={error}
      onRetry={() => handleGenerate()}
      onStop={handleStop}
      sections={QUIZ_SECTIONS}
      title="Practice Quiz"
      badge={questions.length > 0 ? `${questions.length} questions` : null}
      rawMarkdown={rawMarkdown}
      filename="studymate-quiz.md"
    >
      {/* Dual Study Mode Switcher (F1) */}
      {(status === "playing" || status === "finished") && questions.length > 0 && (
        <div className="flex items-center justify-between pb-3 border-b border-ink-border">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-ink">Study Mode:</span>
            <SegmentedControl
              options={[
                { label: "Quiz", value: "quiz" },
                { label: "Flashcards", value: "flashcards" },
              ]}
              value={studyMode}
              onChange={setStudyMode}
              ariaLabel="Select study mode"
            />
          </div>
          <span className="text-xs font-sans tabular-nums text-ink-subtle">
            {studyMode === "quiz"
              ? `Question ${currentIndex + 1} of ${questions.length}`
              : `Card ${Math.min(flashcardIndex + 1, flashcardDeck.length)} of ${flashcardDeck.length}`}
          </span>
        </div>
      )}

      {/* Active Quiz Taking State (M4) */}
      {studyMode === "quiz" && status === "playing" && currentQuestion && (
        <div className="space-y-6">
          {/* Progress Strip of N Segments with Icon and Color (M4) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-ink">
                Question {currentIndex + 1} of {questions.length}
              </span>
              <span className="text-ink-subtle">
                {answeredCount} of {questions.length} answered
              </span>
            </div>

            <div className="grid grid-cols-5 sm:grid-cols-10 md:grid-cols-15 gap-1.5 w-full">
              {questions.map((_, idx) => {
                const ans = userAnswers[idx];
                const isCorrect = ans !== undefined && ans === questions[idx].correct_index;
                const isWrong = ans !== undefined && ans !== questions[idx].correct_index;
                const isCurrent = idx === currentIndex;

                return (
                  <div
                    key={idx}
                    className={cn(
                      "h-2.5 rounded-sm flex items-center justify-center transition-colors duration-200 border",
                      isCorrect && "bg-feedback-success border-feedback-success text-white",
                      isWrong && "bg-feedback-error border-feedback-error text-white",
                      isCurrent && ans === undefined && "bg-brand border-brand",
                      idx > currentIndex && ans === undefined && "bg-[#EAE8E3] border-transparent"
                    )}
                    title={`Question ${idx + 1}`}
                  >
                    {isCorrect && <Check className="w-2.5 h-2.5" strokeWidth={2.5} />}
                    {isWrong && <XCircle className="w-2.5 h-2.5" strokeWidth={2.5} />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Question Slide via TransitionPanel (M4: 200ms slide with fade) */}
          <TransitionPanel activeIndex={currentIndex}>
            <div className="space-y-5">
              <Card className="p-6 space-y-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">
                  Multiple Choice Question
                </span>

                <h3
                  ref={questionHeadingRef}
                  tabIndex={-1}
                  className="font-serif text-base sm:text-lg text-ink font-medium leading-snug outline-none"
                >
                  {currentQuestion.question}
                </h3>

                {/* Option Buttons (M4: updates in 150ms) */}
                <div className="space-y-2.5 pt-2">
                  {currentQuestion.options.map((option, optIdx) => {
                    const isSelected = userAnswers[currentIndex] === optIdx;
                    const isAnswered = userAnswers[currentIndex] !== undefined;
                    const isCorrectOption = optIdx === currentQuestion.correct_index;

                    let optionStyle = "border-ink-border hover:border-ink hover:bg-black/[0.01]";
                    if (isAnswered) {
                      if (isCorrectOption) {
                        optionStyle = "border-feedback-success bg-feedback-success/5 text-ink";
                      } else if (isSelected) {
                        optionStyle = "border-feedback-error bg-feedback-error/5 text-ink";
                      } else {
                        optionStyle = "border-ink-border opacity-50";
                      }
                    }

                    return (
                      <button
                        key={optIdx}
                        type="button"
                        onClick={() => handleSelectAnswer(optIdx)}
                        disabled={isAnswered}
                        className={cn(
                          "w-full text-left p-3.5 rounded border text-xs sm:text-sm transition-all duration-150 flex items-center justify-between gap-3 min-h-[44px]",
                          optionStyle
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-5 h-5 flex items-center justify-center rounded bg-[#EAE8E3] text-xs font-sans font-semibold text-ink shrink-0">
                            {String.fromCharCode(65 + optIdx)}
                          </span>
                          <span className="leading-relaxed">{option}</span>
                        </div>

                        {isAnswered && isCorrectOption && (
                          <CheckCircle2 className="w-4 h-4 text-feedback-success shrink-0" strokeWidth={1.75} />
                        )}
                        {isAnswered && isSelected && !isCorrectOption && (
                          <XCircle className="w-4 h-4 text-feedback-error shrink-0" strokeWidth={1.75} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </Card>

              {/* Expandable Explanation via Disclosure (M4) */}
              {userAnswers[currentIndex] !== undefined && (
                <Disclosure open={explanationOpen} className="p-5 bg-[#FCFBFA] border border-ink-border rounded-panel space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-ink">
                      Explanation
                    </span>
                    <button
                      type="button"
                      onClick={() => setExplanationOpen(!explanationOpen)}
                      className="text-[11px] text-brand hover:underline font-medium"
                    >
                      {explanationOpen ? "Collapse" : "Expand"}
                    </button>
                  </div>
                  <DisclosureContent>
                    <p className="text-xs sm:text-sm text-ink-secondary leading-relaxed pt-1">
                      {currentQuestion.explanation}
                    </p>
                  </DisclosureContent>
                </Disclosure>
              )}

              {/* Next Question Navigation */}
              {userAnswers[currentIndex] !== undefined && (
                <div className="flex justify-end pt-2">
                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    onClick={handleNextQuestion}
                  >
                    <span>
                      {currentIndex < questions.length - 1 ? "Next Question" : "Complete Quiz"}
                    </span>
                    <ArrowRight className="w-4 h-4" strokeWidth={1.75} />
                  </Button>
                </div>
              )}
            </div>
          </TransitionPanel>
        </div>
      )}

      {/* Quiz Finished State with Retry Missed Questions & Clickable Strip Review (C7, M4) */}
      {studyMode === "quiz" && status === "finished" && (
        <div className="space-y-6">
          <Card className="p-6 sm:p-8 text-center space-y-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">
              Assessment Results
            </span>

            {/* Score Count-Up over 700ms (M4) */}
            <div className="flex items-baseline justify-center gap-1">
              <span className="font-serif text-4xl sm:text-5xl font-semibold text-ink">
                <ScoreCounter value={score} duration={0.7} />
              </span>
              <span className="text-xl sm:text-2xl text-ink-secondary font-serif">
                / {questions.length}
              </span>
            </div>

            <p className="text-xs text-ink-secondary max-w-sm mx-auto leading-relaxed">
              {score === questions.length
                ? "Flawless score. You demonstrated comprehensive grasp of all tested concepts."
                : score >= questions.length / 2
                ? "Solid performance. Review the questions you missed below to reinforce retention."
                : "Good initial practice. Re-read the source notes and attempt the quiz again."}
            </p>

            {/* Clickable Progress Review Strip (M4) */}
            <div className="pt-2 max-w-md mx-auto">
              <span className="text-xs font-sans tracking-[0.04em] text-ink-subtle block mb-1.5">
                Click a question to view review details
              </span>
              <div className="grid grid-cols-5 sm:grid-cols-10 md:grid-cols-15 gap-1.5 w-full">
                {questions.map((q, idx) => {
                  const isCorrect = userAnswers[idx] === q.correct_index;
                  return (
                    <a
                      key={idx}
                      href={`#review-q-${idx + 1}`}
                      className={cn(
                        "h-6 rounded flex items-center justify-center text-xs font-sans tabular-nums font-medium transition-transform hover:scale-105",
                        isCorrect
                          ? "bg-feedback-success text-white"
                          : "bg-feedback-error text-white"
                      )}
                      title={`Jump to Q${idx + 1} (${isCorrect ? "Correct" : "Missed"})`}
                    >
                      {idx + 1}
                    </a>
                  );
                })}
              </div>
            </div>

            {/* Actions: Retry missed questions (C7) and New quiz (C7) */}
            <div className="pt-4 flex flex-wrap justify-center gap-3">
              {missedCount > 0 && (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleRetryMissedQuestions}
                >
                  <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.75} />
                  <span>Retry Missed Questions ({missedCount})</span>
                </Button>
              )}

              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleNewQuiz}
              >
                <span>New Quiz</span>
              </Button>
            </div>
          </Card>

          {/* Per-Question Detailed Review List */}
          <div className="space-y-3">
            <h3 className="font-serif text-lg font-medium text-ink">
              Detailed Question Review
            </h3>

            {questions.map((q, idx) => {
              const userAns = userAnswers[idx];
              const isCorrect = userAns === q.correct_index;

              return (
                <Card id={`review-q-${idx + 1}`} key={idx} className="p-5 space-y-3 scroll-mt-20">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 flex items-center justify-center rounded bg-[#EAE8E3] text-xs font-sans tabular-nums font-medium text-ink shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <p className="text-xs sm:text-sm font-medium text-ink leading-snug">
                        {q.question}
                      </p>
                    </div>

                    {isCorrect ? (
                      <span className="text-feedback-success flex items-center gap-1 text-[11px] font-semibold shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                        <span>Correct</span>
                      </span>
                    ) : (
                      <span className="text-feedback-error flex items-center gap-1 text-[11px] font-semibold shrink-0">
                        <XCircle className="w-3.5 h-3.5" strokeWidth={1.75} />
                        <span>Missed</span>
                      </span>
                    )}
                  </div>

                  <div className="pl-7 space-y-1.5 text-xs">
                    <p className="text-ink">
                      <strong className="text-ink-secondary">Correct Answer:</strong> {q.options[q.correct_index]}
                    </p>
                    {!isCorrect && userAns !== undefined && (
                      <p className="text-feedback-error">
                        <strong>Your Answer:</strong> {q.options[userAns]}
                      </p>
                    )}
                    <p className="text-ink-secondary leading-relaxed pt-1 border-t border-ink-border/50">
                      {q.explanation}
                    </p>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Next Steps Cross-Tool Study (F4) */}
          <NextSteps
            steps={[
              {
                title: "Summarize these notes",
                description: "Turn your source material into structured exam notes and definitions.",
                icon: FileText,
                onClick: () => navigate("/summarizer", { state: { prefill: text } }),
              },
              {
                title: "Explain a key concept",
                description: focus
                  ? `Break down "${focus}" with intuitive step-by-step guidance.`
                  : "Explore an underlying mechanism or theory with step-by-step guidance.",
                icon: BookOpen,
                onClick: () => navigate("/explainer", { state: { prefill: focus || "" } }),
              },
            ]}
          />
        </div>
      )}

      {/* Flashcards Mode (F1: Dual study mode from same questions) */}
      {studyMode === "flashcards" && (status === "playing" || status === "finished") && (
        <div className="space-y-4">
          {!flashcardsDone && flashcardDeck[flashcardIndex] ? (
            <div className="space-y-4">
              {/* Header with round & review count */}
              <div className="flex items-center justify-between text-xs">
                <span className="font-sans tabular-nums text-ink-secondary">
                  Card {flashcardIndex + 1} of {flashcardDeck.length}
                  {flashcardRound > 1 && (
                    <span className="ml-2 text-brand font-medium">
                      (Review Round {flashcardRound})
                    </span>
                  )}
                </span>
                <span className="text-ink-subtle">
                  {masteredCards.size} mastered · {reviewAgainQueue.length} for review
                </span>
              </div>

              {/* Flashcard with clean front/back states */}
              <Card
                onClick={handleFlipCard}
                className={cn(
                  "p-6 sm:p-8 cursor-pointer min-h-[240px] flex flex-col justify-between transition-all duration-120 select-none border border-ink-border rounded-panel hover:border-brand/40 shadow-sm",
                  isFlipped ? "bg-[#FCFBFA]" : "bg-white"
                )}
                role="button"
                tabIndex={0}
                aria-label={isFlipped ? "Answer side. Click to flip back." : "Question side. Click or press Space to reveal answer."}
              >
                {!isFlipped ? (
                  // Front / Question Side
                  <div className="space-y-4 my-auto">
                    <span className="text-xs font-sans tracking-[0.04em] text-ink-subtle uppercase block">
                      Question
                    </span>
                    <h3 className="font-serif text-lg sm:text-xl font-medium text-ink leading-relaxed">
                      {flashcardDeck[flashcardIndex].question}
                    </h3>
                    <div className="pt-4 text-center">
                      <span className="text-xs text-brand font-medium">
                        Click card or press <kbd className="px-1.5 py-0.5 bg-[#EAE8E3] border border-ink-border/60 rounded text-[10px] font-mono text-ink shadow-[0_1px_0_rgba(0,0,0,0.06)]">Space</kbd> to reveal answer
                      </span>
                    </div>
                  </div>
                ) : (
                  // Back / Answer Side
                  <div className="space-y-4 my-auto">
                    <div className="space-y-1">
                      <span className="text-xs font-sans tracking-[0.04em] text-feedback-success font-semibold uppercase block">
                        Correct Answer
                      </span>
                      <p className="font-serif text-lg sm:text-xl font-medium text-ink">
                        {flashcardDeck[flashcardIndex].options[flashcardDeck[flashcardIndex].correct_index]}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-ink-border/60 space-y-1">
                      <span className="text-xs font-semibold text-ink-secondary block">
                        Explanation
                      </span>
                      <p className="text-xs sm:text-sm text-ink-secondary leading-relaxed">
                        {flashcardDeck[flashcardIndex].explanation}
                      </p>
                    </div>
                  </div>
                )}
              </Card>

              {/* Action Buttons for Flipped State */}
              {isFlipped ? (
                <div className="flex items-center justify-between gap-4 pt-1">
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    onClick={handleReviewAgain}
                    className="flex-1"
                    title="Mark to review again in next round (Shortcut: 1 or R)"
                  >
                    <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.75} />
                    <span>Review again (1)</span>
                  </Button>

                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    onClick={handleGotIt}
                    className="flex-1"
                    title="Mark as mastered (Shortcut: 2 or G)"
                  >
                    <Check className="w-3.5 h-3.5" strokeWidth={1.75} />
                    <span>Got it (2)</span>
                  </Button>
                </div>
              ) : (
                <div className="text-center pt-1 text-xs text-ink-subtle">
                  Press <kbd className="px-1.5 py-0.5 bg-[#EAE8E3] border border-ink-border/60 rounded text-[10px] font-mono text-ink shadow-[0_1px_0_rgba(0,0,0,0.06)]">Space</kbd> to flip
                </div>
              )}
            </div>
          ) : (
            // Flashcards Completion Screen
            <Card className="p-8 text-center space-y-6">
              <div className="w-12 h-12 rounded-full bg-feedback-success/10 text-feedback-success flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" strokeWidth={1.75} />
              </div>

              <div className="space-y-2">
                <h3 className="font-serif text-2xl font-medium text-ink">
                  Flashcard Set Cleared!
                </h3>
                <p className="text-xs text-ink-secondary max-w-sm mx-auto">
                  You have reviewed all {questions.length} cards and cleared every card marked for review.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto py-2">
                <div className="p-4 bg-[#FAF9F6] border border-ink-border rounded-panel text-center">
                  <span className="text-2xl font-serif font-semibold text-ink block tabular-nums">
                    {questions.length}
                  </span>
                  <span className="text-xs text-ink-subtle">
                    Cards Mastered
                  </span>
                </div>
                <div className="p-4 bg-[#FAF9F6] border border-ink-border rounded-panel text-center">
                  <span className="text-2xl font-serif font-semibold text-ink block tabular-nums">
                    {flashcardRound}
                  </span>
                  <span className="text-xs text-ink-subtle">
                    Rounds Run
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={handleRestartFlashcards}
                >
                  <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.75} />
                  <span>Restart Flashcards</span>
                </Button>

                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  onClick={() => setStudyMode("quiz")}
                >
                  <span>Take Quiz Mode</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" strokeWidth={1.75} />
                </Button>
              </div>

              {/* Next Steps Cross-Tool Study (F4) */}
              <div className="pt-4 border-t border-ink-border text-left">
                <NextSteps
                  steps={[
                    {
                      title: "Summarize these notes",
                      description: "Turn your source material into structured exam notes and definitions.",
                      icon: FileText,
                      onClick: () => navigate("/summarizer", { state: { prefill: text } }),
                    },
                    {
                      title: "Explain a key concept",
                      description: focus
                        ? `Break down "${focus}" with intuitive step-by-step guidance.`
                        : "Explore an underlying mechanism or theory with step-by-step guidance.",
                      icon: BookOpen,
                      onClick: () => navigate("/explainer", { state: { prefill: focus || "" } }),
                    },
                  ]}
                />
              </div>
            </Card>
          )}
        </div>
      )}
    </ResultPanel>
  );

  return (
    <ToolLayout
      title="Quiz Generator"
      description="Convert study notes into four-option multiple choice questions with progress tracking, immediate answers, and detailed explanations."
      inputPanel={inputPanel}
      resultPanel={resultPanel}
    />
  );
}
