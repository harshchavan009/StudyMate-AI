import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  BookOpen,
  HelpCircle,
  Sparkles,
  Layers,
  Lightbulb,
  Check,
  Plus,
  RefreshCw,
  Download,
  Edit2,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  CheckCircle2,
  XCircle,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { usePageMeta } from "@/lib/usePageMeta";
import { api } from "@/lib/api";
import {
  saveStudySet,
  getStudySetById,
  getStudySets,
  saveRecentSession,
} from "@/lib/storage";
import exampleData from "@/data/exampleSummary.json";
import { cn } from "@/lib/utils";

const DEFAULT_PASSAGE = exampleData?.source_text || `The Domain Name System (DNS) is a hierarchical and decentralized naming system used to identify computers, services, and other resources reachable through the Internet. It translates domain names to numerical IP addresses needed for network protocols. By designating authoritative name servers, DNS provides a distributed, fault-tolerant directory service.`;

export function StudySet() {
  usePageMeta("Study Set Workspace", "A unified workspace for source notes and multi-output study materials.");

  const location = useLocation();
  const navigate = useNavigate();

  // Load initial set or text
  const initialSource = location.state?.sourceText || DEFAULT_PASSAGE;
  const initialSetId = location.state?.setId || null;

  const [setId, setSetId] = useState(initialSetId);
  const [sourceText, setSourceText] = useState(initialSource);
  const [isEditingSource, setIsEditingSource] = useState(false);
  const [editText, setEditText] = useState(initialSource);
  const [sourceRailCollapsed, setSourceRailCollapsed] = useState(false);

  // Floating selection toolbar
  const [selectionRange, setSelectionRange] = useState(null);
  const [selectedText, setSelectedText] = useState("");
  const sourceTextRef = useRef(null);

  // Study Set Outputs
  const [outputs, setOutputs] = useState({
    summary: null,
    quiz: null,
    flashcards: null,
    explanations: [],
  });

  // Tile states: 'idle' | 'generating' | 'ready' | 'error'
  const [states, setStates] = useState({
    summary: "idle",
    quiz: "idle",
    flashcards: "idle",
    term: "idle",
  });

  // Stage labels during generation
  const [stageLabels, setStageLabels] = useState({
    summary: "",
    quiz: "",
    flashcards: "",
    term: "",
  });

  // Active view in center canvas: 'summary' | 'quiz' | 'flashcards' | 'explanation-[index]'
  const [activeView, setActiveView] = useState("summary");
  const [termInput, setTermInput] = useState("");

  // Quiz interactive state
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState({});

  // Flashcards interactive state
  const [cardIndex, setCardIndex] = useState(0);
  const [cardFlipped, setCardFlipped] = useState(false);

  // Load existing set if setId provided
  useEffect(() => {
    if (initialSetId) {
      const existing = getStudySetById(initialSetId);
      if (existing) {
        setSourceText(existing.sourceText);
        setEditText(existing.sourceText);
        setOutputs(existing.outputs || {});
        // Update tile states
        setStates({
          summary: existing.outputs?.summary ? "ready" : "idle",
          quiz: existing.outputs?.quiz ? "ready" : "idle",
          flashcards: existing.outputs?.flashcards ? "ready" : "idle",
          term: existing.outputs?.explanations?.length > 0 ? "ready" : "idle",
        });
        if (existing.outputs?.summary) setActiveView("summary");
        else if (existing.outputs?.quiz) setActiveView("quiz");
        else if (existing.outputs?.flashcards) setActiveView("flashcards");
        else if (existing.outputs?.explanations?.length > 0) setActiveView("explanation-0");
      }
    }
  }, [initialSetId]);

  // Persist study set helper
  const persistSet = (newOutputs, newSource = sourceText) => {
    const record = saveStudySet({
      id: setId,
      sourceText: newSource,
      outputs: newOutputs,
    });
    if (record?.id && !setId) {
      setSetId(record.id);
    }
  };

  // 5.5 Text selection listener
  const handleMouseUp = () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) {
      setSelectionRange(null);
      setSelectedText("");
      return;
    }
    const txt = sel.toString().trim();
    if (txt.length >= 3 && txt.length <= 300) {
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setSelectedText(txt);
      setSelectionRange({
        top: rect.top - 44,
        left: Math.max(10, rect.left + rect.width / 2 - 100),
      });
    } else {
      setSelectionRange(null);
      setSelectedText("");
    }
  };

  // Generators
  const handleGenerateSummary = async () => {
    setStates((s) => ({ ...s, summary: "generating" }));
    setStageLabels((s) => ({ ...s, summary: "Structuring academic sections..." }));
    try {
      const data = await api.summarize(sourceText);
      const updated = { ...outputs, summary: data };
      setOutputs(updated);
      setStates((s) => ({ ...s, summary: "ready" }));
      setActiveView("summary");
      persistSet(updated);
    } catch {
      setStates((s) => ({ ...s, summary: "error" }));
    }
  };

  const handleGenerateQuiz = async (customFocus = null) => {
    setStates((s) => ({ ...s, quiz: "generating" }));
    setStageLabels((s) => ({ ...s, quiz: "Crafting practice questions..." }));
    try {
      const data = await api.generateQuiz(sourceText, "medium", 5, customFocus);
      const updated = { ...outputs, quiz: data };
      setOutputs(updated);
      setQuizAnswers({});
      setQuizIndex(0);
      setStates((s) => ({ ...s, quiz: "ready" }));
      setActiveView("quiz");
      persistSet(updated);
    } catch {
      setStates((s) => ({ ...s, quiz: "error" }));
    }
  };

  const handleGenerateFlashcards = async () => {
    setStates((s) => ({ ...s, flashcards: "generating" }));
    setStageLabels((s) => ({ ...s, flashcards: "Generating active recall cards..." }));
    try {
      // Re-use quiz questions or fetch fresh quiz
      let qData = outputs.quiz;
      if (!qData) {
        qData = await api.generateQuiz(sourceText, "medium", 5);
      }
      const updated = { ...outputs, flashcards: qData.questions };
      setOutputs(updated);
      setCardIndex(0);
      setCardFlipped(false);
      setStates((s) => ({ ...s, flashcards: "ready" }));
      setActiveView("flashcards");
      persistSet(updated);
    } catch {
      setStates((s) => ({ ...s, flashcards: "error" }));
    }
  };

  const handleExplainTerm = async (termToExplain = termInput) => {
    const term = termToExplain.trim();
    if (!term) return;
    setStates((s) => ({ ...s, term: "generating" }));
    setStageLabels((s) => ({ ...s, term: `Explaining "${term}"...` }));
    try {
      const data = await api.explainConcept(term, "intermediate", "Other");
      const currentList = outputs.explanations || [];
      const updatedList = [{ term, result: data }, ...currentList.filter((e) => e.term !== term)];
      const updated = { ...outputs, explanations: updatedList };
      setOutputs(updated);
      setTermInput("");
      setStates((s) => ({ ...s, term: "ready" }));
      setActiveView(`explanation-${0}`);
      persistSet(updated);
    } catch {
      setStates((s) => ({ ...s, term: "error" }));
    }
  };

  // 5.6 Export study set as single markdown file
  const handleExportSet = () => {
    let md = `# Study Set: ${sourceText.slice(0, 50).trim()}\n\n`;
    md += `## Source Notes\n\n${sourceText}\n\n`;

    if (outputs.summary?.raw_markdown) {
      md += `\n---\n\n## Academic Summary\n\n${outputs.summary.raw_markdown}\n\n`;
    }

    if (outputs.quiz?.questions) {
      md += `\n---\n\n## Practice Quiz\n\n`;
      outputs.quiz.questions.forEach((q, idx) => {
        md += `### ${idx + 1}. ${q.question}\n`;
        q.options.forEach((opt, oIdx) => {
          const isCorrect = oIdx === q.correct_index;
          md += `- [${isCorrect ? "x" : " "}] ${opt}\n`;
        });
        md += `\n**Explanation:** ${q.explanation}\n\n`;
      });
    }

    if (outputs.explanations?.length > 0) {
      md += `\n---\n\n## Concept Explanations\n\n`;
      outputs.explanations.forEach((item) => {
        if (item.result?.raw_markdown) {
          md += `${item.result.raw_markdown}\n\n`;
        }
      });
    }

    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `studymate-set-${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 py-2">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-ink-border">
        <div className="space-y-0.5">
          <span className="type-label text-ink-subtle">Workspace</span>
          <h1 className="type-page-title text-ink">Study Set</h1>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportSet}
            disabled={!outputs.summary && !outputs.quiz && !outputs.flashcards && outputs.explanations?.length === 0}
            className="text-xs"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" strokeWidth={1.75} />
            <span>Export Set</span>
          </Button>
        </div>
      </div>

      {/* 5.2 Workspace 3-zone layout at desktop */}
      <div className="flex flex-col lg:flex-row gap-6 items-start min-h-[640px]">
        {/* Zone 1: Left Source Rail (300px, collapsible) */}
        <div
          className={cn(
            "bg-white document-panel-shadow rounded-[12px] border border-[rgba(22,24,29,0.10)] transition-all duration-200 flex flex-col shrink-0",
            sourceRailCollapsed ? "w-full lg:w-12 p-3 items-center" : "w-full lg:w-[300px] p-5"
          )}
          data-testid="source-rail"
        >
          <div className="flex items-center justify-between pb-3 border-b border-ink-border w-full">
            {!sourceRailCollapsed && (
              <span className="type-label text-ink">Source Notes</span>
            )}
            <button
              type="button"
              onClick={() => setSourceRailCollapsed(!sourceRailCollapsed)}
              className="p-1 rounded hover:bg-canvas text-ink-subtle hover:text-ink transition-colors"
              title={sourceRailCollapsed ? "Expand Source Rail" : "Collapse Source Rail"}
            >
              {sourceRailCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>
          </div>

          {!sourceRailCollapsed && (
            <div className="space-y-4 pt-3 flex-1 flex flex-col">
              {isEditingSource ? (
                <div className="space-y-2 flex-1 flex flex-col">
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    rows={12}
                    className="w-full text-xs font-sans p-3 rounded-[6px] border border-ink-border bg-canvas/40 text-ink resize-y leading-relaxed"
                  />
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <Button
                      variant="subtle"
                      size="sm"
                      onClick={() => {
                        setEditText(sourceText);
                        setIsEditingSource(false);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setSourceText(editText);
                        setIsEditingSource(false);
                        persistSet(outputs, editText);
                      }}
                    >
                      Save Notes
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 flex-1 flex flex-col justify-between">
                  {/* Selectable source passage (5.5) */}
                  <div
                    ref={sourceTextRef}
                    onMouseUp={handleMouseUp}
                    className="text-xs sm:text-[13px] text-ink leading-relaxed whitespace-pre-wrap select-text cursor-text max-h-[460px] overflow-y-auto pr-1"
                  >
                    {sourceText}
                  </div>

                  <div className="pt-3 border-t border-ink-border flex items-center justify-between">
                    <span className="text-[11px] text-ink-subtle tabular-nums font-sans">
                      {sourceText.length} characters
                    </span>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setIsEditingSource(true)}
                      className="text-xs py-1 h-7"
                    >
                      <Edit2 className="w-3 h-3 mr-1" />
                      <span>Edit source</span>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 5.5 Floating Selection Toolbar */}
        {selectionRange && (
          <div
            style={{ position: "fixed", top: selectionRange.top, left: selectionRange.left, zIndex: 100 }}
            className="flex items-center gap-1.5 p-1 bg-ink text-white rounded-[6px] shadow-xl animate-fadeIn text-xs"
          >
            <button
              type="button"
              onClick={() => {
                handleGenerateQuiz(selectedText);
                setSelectionRange(null);
              }}
              className="px-2.5 py-1 rounded hover:bg-white/10 font-medium text-white transition-colors"
            >
              Quiz me on this
            </button>
            <span className="text-white/30">|</span>
            <button
              type="button"
              onClick={() => {
                handleExplainTerm(selectedText);
                setSelectionRange(null);
              }}
              className="px-2.5 py-1 rounded hover:bg-white/10 font-medium text-white transition-colors"
            >
              Explain this
            </button>
          </div>
        )}

        {/* Zone 2: Center Canvas (flex-1 active document) */}
        <div
          className="flex-1 w-full min-w-0 bg-white document-panel-shadow rounded-[12px] border border-[rgba(22,24,29,0.10)] p-6 sm:p-8 space-y-6"
          data-testid="center-canvas"
        >
          {/* Active Document Header / Tab Strip */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-ink-border">
            <div className="flex items-center gap-2">
              <h2 className="font-serif text-lg font-medium text-ink">
                {activeView === "summary"
                  ? "Academic Summary"
                  : activeView === "quiz"
                  ? "Practice Quiz"
                  : activeView === "flashcards"
                  ? "Flashcards"
                  : "Concept Explanation"}
              </h2>
            </div>
          </div>

          {/* Canvas Output Rendering */}
          {activeView === "summary" && (
            <div>
              {outputs.summary ? (
                <div className="space-y-6 animate-fadeIn">
                  {/* Topic Overview */}
                  <div className="space-y-2 pb-5 border-b border-ink-border">
                    <h3 className="font-serif text-[20px] font-medium text-ink">
                      Topic Overview
                    </h3>
                    <p className="text-[17px] leading-[1.65] text-ink">
                      {outputs.summary.topic_overview}
                    </p>
                  </div>

                  {/* Key Concepts */}
                  <div className="space-y-3 pb-5 border-b border-ink-border">
                    <h3 className="font-serif text-[20px] font-medium text-ink">
                      Key Concepts
                    </h3>
                    <div className="space-y-3 pt-1">
                      {outputs.summary.key_concepts?.map((c, i) => (
                        <div key={i} className="flex items-start gap-4">
                          <span className="font-serif text-[40px] leading-none text-[#C9C4B8] shrink-0 w-8 text-right font-light tabular-nums">
                            {i + 1}
                          </span>
                          <p className="text-[15px] sm:text-[17px] text-ink pt-1.5 leading-[1.65]">
                            {c}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Definitions */}
                  {outputs.summary.important_definitions?.length > 0 && (
                    <div className="space-y-3 pb-5 border-b border-ink-border">
                      <h3 className="font-serif text-[20px] font-medium text-ink">
                        Important Definitions
                      </h3>
                      <dl className="divide-y divide-ink-border pt-1">
                        {outputs.summary.important_definitions.map((def, i) => (
                          <div key={i} className="py-3 first:pt-0 last:pb-0 space-y-1">
                            <dt className="text-sm font-semibold text-ink">{def.term}</dt>
                            <dd className="pl-4 text-[15px] sm:text-[17px] text-ink-secondary leading-[1.65]">
                              {def.definition}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  )}

                  {/* Points */}
                  {outputs.summary.important_points?.length > 0 && (
                    <div className="space-y-3 pb-5 border-b border-ink-border">
                      <h3 className="font-serif text-[20px] font-medium text-ink">
                        Important Points
                      </h3>
                      <ul className="space-y-2.5 pt-1 text-[15px] sm:text-[17px] text-ink">
                        {outputs.summary.important_points.map((p, i) => (
                          <li key={i} className="flex items-start gap-3">
                            <span className="w-1.5 h-1.5 bg-brand mt-2.5 shrink-0 rounded-none" />
                            <span>{p}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Quick Revision Takeaways */}
                  {outputs.summary.quick_revision_summary && (
                    <div className="space-y-3 pt-1">
                      <h3 className="font-serif text-[20px] font-medium text-ink">
                        Quick Revision Summary
                      </h3>
                      <p className="text-[15px] sm:text-[17px] text-ink leading-[1.65] bg-canvas/40 p-4 rounded-[6px] border border-ink-border">
                        {outputs.summary.quick_revision_summary}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-12 text-center space-y-3">
                  <p className="font-serif text-lg text-ink">Summary not created yet</p>
                  <p className="text-xs text-ink-secondary max-w-sm mx-auto">
                    Click "Summary" on the right rail to generate structured notes from your passage.
                  </p>
                  <Button variant="primary" size="sm" onClick={handleGenerateSummary}>
                    <Plus className="w-4 h-4 mr-1" />
                    <span>Generate Summary</span>
                  </Button>
                </div>
              )}
            </div>
          )}

          {activeView === "quiz" && (
            <div>
              {outputs.quiz?.questions ? (
                <div className="space-y-6 animate-fadeIn">
                  {/* Active Question */}
                  {outputs.quiz.questions[quizIndex] && (
                    <div className="space-y-5">
                      <div className="flex items-center justify-between text-xs text-ink-subtle">
                        <span>
                          Question {quizIndex + 1} of {outputs.quiz.questions.length}
                        </span>
                      </div>

                      <h3 className="font-serif text-[24px] text-ink font-medium leading-snug">
                        {outputs.quiz.questions[quizIndex].question}
                      </h3>

                      <div className="space-y-2.5">
                        {outputs.quiz.questions[quizIndex].options.map((opt, oIdx) => {
                          const isPicked = quizAnswers[quizIndex] === oIdx;
                          const isAnswered = quizAnswers[quizIndex] !== undefined;
                          const isCorrect = oIdx === outputs.quiz.questions[quizIndex].correct_index;

                          let style = "border-ink-border hover:border-ink";
                          if (isAnswered) {
                            if (isCorrect) style = "border-feedback-success bg-feedback-success/5 font-medium";
                            else if (isPicked) style = "border-feedback-error bg-feedback-error/5";
                            else style = "border-ink-border opacity-50";
                          }

                          return (
                            <button
                              key={oIdx}
                              type="button"
                              onClick={() => {
                                if (!isAnswered) {
                                  setQuizAnswers({ ...quizAnswers, [quizIndex]: oIdx });
                                }
                              }}
                              className={cn(
                                "w-full text-left px-4 h-14 min-h-[56px] rounded-[6px] border text-sm flex items-center justify-between gap-3 transition-colors",
                                style
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <span className="w-7 h-7 flex items-center justify-center rounded-[4px] bg-[#EAE8E3] text-xs font-semibold text-ink shrink-0 border border-ink-border/50">
                                  {String.fromCharCode(65 + oIdx)}
                                </span>
                                <span>{opt}</span>
                              </div>
                              {isAnswered && isCorrect && <CheckCircle2 className="w-4 h-4 text-feedback-success" />}
                              {isAnswered && isPicked && !isCorrect && <XCircle className="w-4 h-4 text-feedback-error" />}
                            </button>
                          );
                        })}
                      </div>

                      {/* Docked bottom feedback bar */}
                      {quizAnswers[quizIndex] !== undefined && (
                        <div className="p-4 bg-canvas/50 border border-ink-border rounded-[6px] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <p className="text-xs text-ink-secondary leading-relaxed">
                            {outputs.quiz.questions[quizIndex].explanation}
                          </p>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => {
                              if (quizIndex < outputs.quiz.questions.length - 1) {
                                setQuizIndex(quizIndex + 1);
                              } else {
                                setQuizIndex(0);
                              }
                            }}
                            className="shrink-0"
                          >
                            <span>
                              {quizIndex < outputs.quiz.questions.length - 1 ? "Next Question" : "Restart Quiz"}
                            </span>
                            <ArrowRight className="w-3.5 h-3.5 ml-1" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-12 text-center space-y-3">
                  <p className="font-serif text-lg text-ink">Quiz not created yet</p>
                  <p className="text-xs text-ink-secondary max-w-sm mx-auto">
                    Click "Quiz" on the right rail to generate practice questions.
                  </p>
                  <Button variant="primary" size="sm" onClick={() => handleGenerateQuiz()}>
                    <Plus className="w-4 h-4 mr-1" />
                    <span>Generate Quiz</span>
                  </Button>
                </div>
              )}
            </div>
          )}

          {activeView === "flashcards" && (
            <div>
              {outputs.flashcards && outputs.flashcards.length > 0 ? (
                <div className="space-y-6 animate-fadeIn max-w-lg mx-auto py-4">
                  <div className="flex items-center justify-between text-xs text-ink-subtle">
                    <span>
                      Card {cardIndex + 1} of {outputs.flashcards.length}
                    </span>
                    <span>Click card to flip</span>
                  </div>

                  <div
                    onClick={() => setCardFlipped(!cardFlipped)}
                    className="p-8 min-h-[220px] bg-canvas/40 border border-ink-border rounded-panel flex flex-col justify-between cursor-pointer hover:border-brand transition-colors select-none text-center"
                  >
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-subtle block">
                      {cardFlipped ? "Answer" : "Question"}
                    </span>

                    <p className="font-serif text-lg sm:text-xl text-ink font-medium my-auto leading-relaxed">
                      {cardFlipped
                        ? outputs.flashcards[cardIndex].options[outputs.flashcards[cardIndex].correct_index]
                        : outputs.flashcards[cardIndex].question}
                    </p>

                    <span className="text-[11px] text-brand">
                      {cardFlipped ? "Click to see question" : "Click to see answer"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setCardFlipped(false);
                        setCardIndex(Math.max(0, cardIndex - 1));
                      }}
                      disabled={cardIndex === 0}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setCardFlipped(false);
                        setCardIndex(Math.min(outputs.flashcards.length - 1, cardIndex + 1));
                      }}
                      disabled={cardIndex === outputs.flashcards.length - 1}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center space-y-3">
                  <p className="font-serif text-lg text-ink">Flashcards not created yet</p>
                  <p className="text-xs text-ink-secondary max-w-sm mx-auto">
                    Generate flashcards for active recall practice from your passage.
                  </p>
                  <Button variant="primary" size="sm" onClick={handleGenerateFlashcards}>
                    <Plus className="w-4 h-4 mr-1" />
                    <span>Generate Flashcards</span>
                  </Button>
                </div>
              )}
            </div>
          )}

          {activeView.startsWith("explanation-") && (
            <div>
              {(() => {
                const idx = parseInt(activeView.replace("explanation-", ""), 10);
                const expl = outputs.explanations?.[idx];
                if (!expl) return <p className="text-xs text-ink-secondary">Select an explained term.</p>;

                return (
                  <div className="space-y-6 animate-fadeIn">
                    <div className="space-y-1 pb-4 border-b border-ink-border">
                      <span className="type-label text-brand">Concept Breakdown</span>
                      <h3 className="font-serif text-[24px] font-medium text-ink">
                        {expl.term}
                      </h3>
                    </div>

                    <div className="space-y-4">
                      {expl.result?.explanation_steps?.map((step, sIdx) => (
                        <div key={sIdx} className="p-4 bg-canvas/30 border border-ink-border rounded-[6px] space-y-1.5">
                          <h4 className="text-sm font-semibold text-ink">
                            {step.step_number}. {step.title}
                          </h4>
                          <p className="text-xs sm:text-[14px] text-ink-secondary leading-relaxed">
                            {step.explanation}
                          </p>
                        </div>
                      ))}
                    </div>

                    {expl.result?.intuitive_analogy && (
                      <div className="p-4 bg-brand-tint/30 border-l-[3px] border-l-brand border-y border-r border-ink-border rounded-r-[6px] space-y-1">
                        <span className="text-xs font-semibold text-ink">Analogy</span>
                        <p className="text-xs sm:text-[13px] text-ink-secondary leading-relaxed">
                          {expl.result.intuitive_analogy}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* Zone 3: Right Create Rail (260px) */}
        <div
          className="w-full lg:w-[260px] shrink-0 space-y-3"
          data-testid="create-rail"
        >
          <span className="type-label text-ink-subtle block px-1">Study Outputs</span>

          {/* 1. Summary Tile */}
          <div
            onClick={() => {
              if (states.summary === "ready") setActiveView("summary");
              else if (states.summary === "idle") handleGenerateSummary();
            }}
            className={cn(
              "p-4 rounded-panel border transition-all cursor-pointer flex flex-col justify-between min-h-[88px]",
              activeView === "summary" && states.summary === "ready"
                ? "border-brand bg-white ring-1 ring-brand shadow-sm"
                : states.summary === "ready"
                ? "border-ink-border bg-white hover:border-brand"
                : states.summary === "generating"
                ? "border-brand/40 bg-brand-tint/20 cursor-wait"
                : "border-dashed border-ink-border bg-white/60 hover:bg-white hover:border-ink-border"
            )}
            data-testid="tile-summary"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-brand" strokeWidth={1.75} />
                <h4 className="font-serif text-sm font-medium text-ink">Summary</h4>
              </div>
              {states.summary === "ready" && (
                <Check className="w-4 h-4 text-feedback-success" strokeWidth={2.5} />
              )}
            </div>

            <div className="pt-2 text-xs">
              {states.summary === "ready" ? (
                <span className="text-ink-secondary">6 sections ready</span>
              ) : states.summary === "generating" ? (
                <div className="space-y-1">
                  <span className="text-[11px] text-brand block truncate">
                    {stageLabels.summary}
                  </span>
                  <div className="h-1 bg-brand/20 rounded-full overflow-hidden">
                    <div className="h-full bg-brand w-2/3 animate-pulse" />
                  </div>
                </div>
              ) : states.summary === "error" ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleGenerateSummary();
                  }}
                  className="text-feedback-error hover:underline flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" /> Retry
                </button>
              ) : (
                <span className="text-ink-subtle flex items-center gap-1">
                  <Plus className="w-3 h-3" /> Generate summary
                </span>
              )}
            </div>
          </div>

          {/* 2. Quiz Tile */}
          <div
            onClick={() => {
              if (states.quiz === "ready") setActiveView("quiz");
              else if (states.quiz === "idle") handleGenerateQuiz();
            }}
            className={cn(
              "p-4 rounded-panel border transition-all cursor-pointer flex flex-col justify-between min-h-[88px]",
              activeView === "quiz" && states.quiz === "ready"
                ? "border-brand bg-white ring-1 ring-brand shadow-sm"
                : states.quiz === "ready"
                ? "border-ink-border bg-white hover:border-brand"
                : states.quiz === "generating"
                ? "border-brand/40 bg-brand-tint/20 cursor-wait"
                : "border-dashed border-ink-border bg-white/60 hover:bg-white hover:border-ink-border"
            )}
            data-testid="tile-quiz"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-brand" strokeWidth={1.75} />
                <h4 className="font-serif text-sm font-medium text-ink">Quiz</h4>
              </div>
              {states.quiz === "ready" && (
                <Check className="w-4 h-4 text-feedback-success" strokeWidth={2.5} />
              )}
            </div>

            <div className="pt-2 text-xs">
              {states.quiz === "ready" ? (
                <span className="text-ink-secondary">
                  {outputs.quiz?.questions?.length || 5} questions ready
                </span>
              ) : states.quiz === "generating" ? (
                <div className="space-y-1">
                  <span className="text-[11px] text-brand block truncate">
                    {stageLabels.quiz}
                  </span>
                  <div className="h-1 bg-brand/20 rounded-full overflow-hidden">
                    <div className="h-full bg-brand w-2/3 animate-pulse" />
                  </div>
                </div>
              ) : states.quiz === "error" ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleGenerateQuiz();
                  }}
                  className="text-feedback-error hover:underline flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" /> Retry
                </button>
              ) : (
                <span className="text-ink-subtle flex items-center gap-1">
                  <Plus className="w-3 h-3" /> Generate quiz
                </span>
              )}
            </div>
          </div>

          {/* 3. Flashcards Tile */}
          <div
            onClick={() => {
              if (states.flashcards === "ready") setActiveView("flashcards");
              else if (states.flashcards === "idle") handleGenerateFlashcards();
            }}
            className={cn(
              "p-4 rounded-panel border transition-all cursor-pointer flex flex-col justify-between min-h-[88px]",
              activeView === "flashcards" && states.flashcards === "ready"
                ? "border-brand bg-white ring-1 ring-brand shadow-sm"
                : states.flashcards === "ready"
                ? "border-ink-border bg-white hover:border-brand"
                : states.flashcards === "generating"
                ? "border-brand/40 bg-brand-tint/20 cursor-wait"
                : "border-dashed border-ink-border bg-white/60 hover:bg-white hover:border-ink-border"
            )}
            data-testid="tile-flashcards"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-brand" strokeWidth={1.75} />
                <h4 className="font-serif text-sm font-medium text-ink">Flashcards</h4>
              </div>
              {states.flashcards === "ready" && (
                <Check className="w-4 h-4 text-feedback-success" strokeWidth={2.5} />
              )}
            </div>

            <div className="pt-2 text-xs">
              {states.flashcards === "ready" ? (
                <span className="text-ink-secondary">
                  {outputs.flashcards?.length || 5} cards ready
                </span>
              ) : states.flashcards === "generating" ? (
                <div className="space-y-1">
                  <span className="text-[11px] text-brand block truncate">
                    {stageLabels.flashcards}
                  </span>
                  <div className="h-1 bg-brand/20 rounded-full overflow-hidden">
                    <div className="h-full bg-brand w-2/3 animate-pulse" />
                  </div>
                </div>
              ) : states.flashcards === "error" ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleGenerateFlashcards();
                  }}
                  className="text-feedback-error hover:underline flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" /> Retry
                </button>
              ) : (
                <span className="text-ink-subtle flex items-center gap-1">
                  <Plus className="w-3 h-3" /> Generate cards
                </span>
              )}
            </div>
          </div>

          {/* 4. Explain a Term Tile (5.4: input box inside where user types term and presses Enter) */}
          <div
            className="p-4 rounded-panel border border-ink-border bg-white space-y-3"
            data-testid="tile-explain-term"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-brand" strokeWidth={1.75} />
                <h4 className="font-serif text-sm font-medium text-ink">Explain a term</h4>
              </div>
              {outputs.explanations?.length > 0 && (
                <span className="text-[11px] font-sans tabular-nums text-brand font-semibold">
                  {outputs.explanations.length}
                </span>
              )}
            </div>

            {/* Input box */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleExplainTerm(termInput);
              }}
              className="space-y-2"
            >
              <input
                type="text"
                value={termInput}
                onChange={(e) => setTermInput(e.target.value)}
                placeholder="Type term from text & Enter..."
                className="w-full text-xs font-sans px-2.5 py-1.5 rounded-[4px] border border-ink-border bg-canvas/40 text-ink focus:bg-white focus:outline-none focus:border-brand"
              />
              {states.term === "generating" && (
                <p className="text-[10px] text-brand truncate animate-pulse">
                  {stageLabels.term}
                </p>
              )}
            </form>

            {/* List of already explained terms */}
            {outputs.explanations?.length > 0 && (
              <div className="space-y-1 pt-1 border-t border-ink-border/50 max-h-32 overflow-y-auto">
                {outputs.explanations.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveView(`explanation-${idx}`)}
                    className={cn(
                      "w-full text-left px-2 py-1 rounded text-xs truncate flex items-center justify-between gap-1 transition-colors",
                      activeView === `explanation-${idx}`
                        ? "bg-brand-tint text-brand font-semibold"
                        : "hover:bg-canvas text-ink"
                    )}
                  >
                    <span className="truncate">{item.term}</span>
                    <Check className="w-3 h-3 text-feedback-success shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
