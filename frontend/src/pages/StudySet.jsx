import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate, useParams, Link } from "react-router-dom";
import {
  BookOpen,
  HelpCircle,
  Layers,
  PenLine,
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
  Printer,
  Sliders,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { usePageMeta } from "@/lib/usePageMeta";
import { api } from "@/lib/api";
import {
  saveStudySet,
  getStudySetById,
  getStudySets,
} from "@/lib/storage";
import exampleData from "@/data/exampleSummary.json";
import { cn } from "@/lib/utils";

const DEFAULT_PASSAGE =
  exampleData?.source_text ||
  `The Domain Name System (DNS) is a hierarchical and decentralized naming system used to identify computers, services, and other resources reachable through the Internet. It translates domain names to numerical IP addresses needed for network protocols. By designating authoritative name servers, DNS provides a distributed, fault-tolerant directory service.`;

export function StudySet() {
  usePageMeta("Study Set", "Unified multi-tool study collection and material generation.");

  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();

  // Determine initial state: from route params or location state
  const targetId = params.id || location.state?.setId || null;
  const isNew = location.state?.isNew || false;
  const initialSource = isNew ? "" : (location.state?.sourceText || "");

  const [setId, setSetId] = useState(targetId);
  const [sourceText, setSourceText] = useState(initialSource || (targetId ? "" : DEFAULT_PASSAGE));
  const [title, setTitle] = useState("");
  const [createdAt, setCreatedAt] = useState(Date.now());
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");

  const [isEditingSource, setIsEditingSource] = useState(isNew);
  const [editText, setEditText] = useState(sourceText);
  const [sourceNotesCollapsed, setSourceNotesCollapsed] = useState(false);

  // Active view in canvas: 'summary' | 'quiz' | 'flashcards' | 'improver'
  const [activeView, setActiveView] = useState("summary");

  // Study Set Outputs
  const [outputs, setOutputs] = useState({
    summary: null,
    quiz: null,
    flashcards: null,
    improver: null,
  });

  // States: 'not_created' | 'generating' | 'ready' | 'failed'
  const [states, setStates] = useState({
    summary: "not_created",
    quiz: "not_created",
    flashcards: "not_created",
    improver: "not_created",
  });

  // Practice Quiz Settings Popover State (4.3)
  const [quizPopoverOpen, setQuizPopoverOpen] = useState(false);
  const [quizCount, setQuizCount] = useState(5);
  const [quizDifficulty, setQuizDifficulty] = useState("medium");

  // Quiz interactive state
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState({});

  // Flashcards interactive state
  const [cardIndex, setCardIndex] = useState(0);
  const [cardFlipped, setCardFlipped] = useState(false);

  // Load existing set if ID provided or find most recent set
  useEffect(() => {
    let existing = null;
    if (targetId && targetId !== "workspace") {
      existing = getStudySetById(targetId);
    } else if (!isNew && !location.state?.sourceText) {
      const allSets = getStudySets();
      if (allSets && allSets.length > 0) {
        existing = allSets[0];
      }
    }

    if (existing) {
      setSetId(existing.id);
      setTitle(existing.title || existing.sourceText?.slice(0, 60)?.trim() || "Untitled Study Set");
      setSourceText(existing.sourceText || "");
      setEditText(existing.sourceText || "");
      setCreatedAt(existing.createdAt || Date.now());
      setOutputs(existing.outputs || {});
      setStates({
        summary: existing.outputs?.summary ? "ready" : "not_created",
        quiz: existing.outputs?.quiz?.questions?.length ? "ready" : "not_created",
        flashcards: existing.outputs?.flashcards?.length ? "ready" : "not_created",
        improver: existing.outputs?.improver ? "ready" : "not_created",
      });
      if (existing.outputs?.summary) setActiveView("summary");
      else if (existing.outputs?.quiz) setActiveView("quiz");
      else if (existing.outputs?.flashcards) setActiveView("flashcards");
      else if (existing.outputs?.improver) setActiveView("improver");
    } else {
      const defaultTxt = location.state?.sourceText || DEFAULT_PASSAGE;
      const autoTitle = defaultTxt.slice(0, 60).trim() || "Untitled Study Set";
      setTitle(autoTitle);
      setTitleDraft(autoTitle);
      setCreatedAt(Date.now());
    }
  }, [targetId, isNew, location.state?.sourceText]);

  // Sync title when sourceText changes if title was default
  useEffect(() => {
    if (!title && sourceText) {
      const auto = sourceText.slice(0, 60).trim() || "Untitled Study Set";
      setTitle(auto);
      setTitleDraft(auto);
    }
  }, [sourceText, title]);

  // Persist study set helper
  const persistSet = (newOutputs, newSource = sourceText, newTitle = title) => {
    const record = saveStudySet({
      id: setId,
      title: newTitle,
      createdAt,
      sourceText: newSource,
      outputs: newOutputs,
    });
    if (record?.id && !setId) {
      setSetId(record.id);
    }
  };

  // Inline Title Editing (4.2: click title or edit icon, Esc cancels, Enter saves)
  const handleStartTitleEdit = () => {
    setTitleDraft(title);
    setIsEditingTitle(true);
  };

  const handleSaveTitle = () => {
    const trimmed = titleDraft.trim() || sourceText.slice(0, 60).trim() || "Untitled Study Set";
    setTitle(trimmed);
    setIsEditingTitle(false);
    persistSet(outputs, sourceText, trimmed);
  };

  const handleCancelTitle = () => {
    setTitleDraft(title);
    setIsEditingTitle(false);
  };

  const handleTitleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSaveTitle();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancelTitle();
    }
  };

  // Output Generators
  const handleGenerateSummary = async () => {
    if (!sourceText.trim()) return;
    setStates((s) => ({ ...s, summary: "generating" }));
    try {
      const data = await api.summarize(sourceText);
      const updated = { ...outputs, summary: data };
      setOutputs(updated);
      setStates((s) => ({ ...s, summary: "ready" }));
      setActiveView("summary");
      persistSet(updated);
    } catch {
      setStates((s) => ({ ...s, summary: "failed" }));
    }
  };

  const handleGenerateQuiz = async (count = quizCount, diff = quizDifficulty) => {
    if (!sourceText.trim()) return;
    setQuizPopoverOpen(false);
    setStates((s) => ({ ...s, quiz: "generating" }));
    try {
      const data = await api.generateQuiz(sourceText, diff, Number(count));
      const updated = { ...outputs, quiz: data };
      setOutputs(updated);
      setQuizAnswers({});
      setQuizIndex(0);
      setStates((s) => ({ ...s, quiz: "ready" }));
      setActiveView("quiz");
      persistSet(updated);
    } catch {
      setStates((s) => ({ ...s, quiz: "failed" }));
    }
  };

  const handleGenerateFlashcards = async () => {
    if (!sourceText.trim()) return;
    setStates((s) => ({ ...s, flashcards: "generating" }));
    try {
      let qData = outputs.quiz;
      if (!qData?.questions?.length) {
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
      setStates((s) => ({ ...s, flashcards: "failed" }));
    }
  };

  const handleGenerateImprover = async () => {
    if (!sourceText.trim()) return;
    setStates((s) => ({ ...s, improver: "generating" }));
    try {
      const data = await api.improveAnswer(sourceText, title);
      const updated = { ...outputs, improver: data };
      setOutputs(updated);
      setStates((s) => ({ ...s, improver: "ready" }));
      setActiveView("improver");
      persistSet(updated);
    } catch {
      setStates((s) => ({ ...s, improver: "failed" }));
    }
  };

  // 4.5 Export study set as single unified Markdown file
  const handleExportSet = () => {
    let md = `# ${title || "Study Set"}\n\n`;
    md += `*Generated by StudyMate AI on ${new Date(createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}*\n\n`;
    md += `## Source Notes\n\n${sourceText}\n\n`;

    if (outputs.summary) {
      md += `\n---\n\n## Summary\n\n`;
      if (outputs.summary.raw_markdown) {
        md += `${outputs.summary.raw_markdown}\n\n`;
      } else {
        md += `### Topic Overview\n${outputs.summary.topic_overview}\n\n`;
      }
    }

    if (outputs.quiz?.questions?.length) {
      md += `\n---\n\n## Practice Quiz\n\n`;
      outputs.quiz.questions.forEach((q, idx) => {
        md += `### Question ${idx + 1}: ${q.question}\n`;
        q.options.forEach((opt, oIdx) => {
          const isCorrect = oIdx === q.correct_index;
          md += `- [${isCorrect ? "x" : " "}] ${opt}\n`;
        });
        md += `\n**Rationale:** ${q.explanation}\n\n`;
      });
    }

    if (outputs.flashcards?.length) {
      md += `\n---\n\n## Flashcards\n\n`;
      outputs.flashcards.forEach((c, idx) => {
        const correctAns = c.options?.[c.correct_index] || "Answer";
        md += `**Card ${idx + 1}:**\n- **Q:** ${c.question}\n- **A:** ${correctAns}\n\n`;
      });
    }

    if (outputs.improver) {
      md += `\n---\n\n## Improved Answer\n\n`;
      md += `### Original Answer Feedback\n${outputs.improver.original_answer_feedback}\n\n`;
      md += `### Improved Answer\n${outputs.improver.improved_answer}\n\n`;
      if (outputs.improver.key_improvements_made?.length) {
        md += `### Key Improvements Made\n`;
        outputs.improver.key_improvements_made.forEach((imp) => {
          md += `- ${imp}\n`;
        });
        md += `\n`;
      }
    }

    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(title || "studymate-set").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  const createdDateStr = new Date(createdAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="space-y-6 py-2 max-w-7xl mx-auto">
      {/* 4.2 Top Header: Editable Title inline, created date below, no 'Workspace' eyebrow */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-ink-border">
        <div className="space-y-1 flex-1 min-w-0">
          {isEditingTitle ? (
            <div className="flex items-center gap-2 max-w-xl">
              <input
                id="inline-title-input"
                type="text"
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onKeyDown={handleTitleKeyDown}
                onBlur={handleSaveTitle}
                autoFocus
                className="font-serif text-2xl sm:text-3xl font-medium tracking-tight text-ink border-b-2 border-brand bg-white px-1.5 py-0.5 rounded focus:outline-none w-full"
                aria-label="Edit study set title"
              />
              <Button size="sm" variant="primary" onClick={handleSaveTitle} className="h-8 px-2.5 text-xs">
                Save
              </Button>
              <Button size="sm" variant="subtle" onClick={handleCancelTitle} className="h-8 px-2.5 text-xs">
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 group">
              <h1
                onClick={handleStartTitleEdit}
                className="font-serif text-2xl sm:text-3xl font-medium tracking-tight text-ink cursor-pointer hover:text-brand transition-colors truncate"
                title="Click to edit title (or press Enter)"
              >
                {title || "Untitled Study Set"}
              </h1>
              <button
                type="button"
                onClick={handleStartTitleEdit}
                className="p-1 rounded text-ink-subtle hover:text-brand opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Rename study set"
                title="Rename study set"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Created date under title */}
          <p className="text-xs text-ink-subtle">
            Created on {createdDateStr}
          </p>
        </div>

        {/* 4.5 Actions: Export Set (Markdown) and Print */}
        <div className="flex items-center gap-2">
          <Link to="/study-set" className="text-xs text-ink-secondary hover:text-ink mr-2">
            Back to Study Sets
          </Link>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleExportSet}
            disabled={!outputs.summary && !outputs.quiz && !outputs.flashcards && !outputs.improver}
            className="text-xs"
            title="Download set as single Markdown file"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" strokeWidth={1.75} />
            <span>Export Set</span>
          </Button>

          <Button
            type="button"
            variant="subtle"
            size="sm"
            onClick={handlePrint}
            className="text-xs"
            title="Print entire study set"
          >
            <Printer className="w-3.5 h-3.5 mr-1.5" strokeWidth={1.75} />
            <span>Print</span>
          </Button>
        </div>
      </div>

      {/* Main Study Set 3-Zone Workspace */}
      <div className="flex flex-col lg:flex-row gap-6 items-start min-h-[640px]">
        {/* Zone 1: Left Source Notes (300px, collapsible) */}
        <div
          className={cn(
            "bg-white document-panel-shadow rounded-[12px] border border-[rgba(22,24,29,0.10)] transition-all duration-200 flex flex-col shrink-0",
            sourceNotesCollapsed ? "w-full lg:w-12 p-3 items-center" : "w-full lg:w-[300px] p-5"
          )}
        >
          <div className="flex items-center justify-between pb-3 border-b border-ink-border w-full">
            {!sourceNotesCollapsed && (
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">
                Source Notes
              </span>
            )}
            <button
              type="button"
              onClick={() => setSourceNotesCollapsed(!sourceNotesCollapsed)}
              className="p-1 rounded hover:bg-canvas text-ink-subtle hover:text-ink transition-colors"
              title={sourceNotesCollapsed ? "Expand source notes" : "Collapse source notes"}
              aria-label={sourceNotesCollapsed ? "Expand source notes" : "Collapse source notes"}
            >
              {sourceNotesCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>
          </div>

          {!sourceNotesCollapsed && (
            <div className="space-y-4 pt-3 flex-1 flex flex-col">
              {isEditingSource ? (
                <div className="space-y-2 flex-1 flex flex-col">
                  <textarea
                    id="source-notes-edit"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    rows={12}
                    className="w-full text-xs font-sans p-3 rounded-[6px] border border-ink-border bg-white text-ink resize-y leading-relaxed focus:outline-none focus:ring-1 focus:ring-brand"
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
                  <div className="text-xs sm:text-[13px] text-ink leading-relaxed whitespace-pre-wrap select-text cursor-text max-h-[460px] overflow-y-auto pr-1">
                    {sourceText || <span className="text-ink-subtle italic">No source notes provided yet.</span>}
                  </div>

                  <div className="pt-3 border-t border-ink-border flex items-center justify-between">
                    <span className="text-[11px] text-ink-subtle tabular-nums font-sans">
                      {sourceText.length} characters
                    </span>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setEditText(sourceText);
                        setIsEditingSource(true);
                      }}
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

        {/* Zone 2: Center Canvas (flex-1 active document) */}
        <div
          className="flex-1 w-full min-w-0 bg-white document-panel-shadow rounded-[12px] border border-[rgba(22,24,29,0.10)] p-6 sm:p-8 space-y-6"
        >
          {/* Active Canvas Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-ink-border">
            <h2 className="font-serif text-xl font-medium text-ink">
              {activeView === "summary"
                ? "Summary"
                : activeView === "quiz"
                ? "Practice Quiz"
                : activeView === "flashcards"
                ? "Flashcards"
                : "Improved Answer"}
            </h2>
          </div>

          {/* 4.4 Canvas Output: Ready display or exact empty canvas phrasing */}
          {activeView === "summary" && (
            <div>
              {outputs.summary ? (
                <div className="space-y-6 animate-fadeIn">
                  <div className="space-y-2 pb-5 border-b border-ink-border">
                    <h3 className="font-serif text-[20px] font-medium text-ink">
                      Topic Overview
                    </h3>
                    <p className="text-[17px] leading-[1.65] text-ink">
                      {outputs.summary.topic_overview}
                    </p>
                  </div>

                  {outputs.summary.key_concepts?.length > 0 && (
                    <div className="space-y-3 pb-5 border-b border-ink-border">
                      <h3 className="font-serif text-[20px] font-medium text-ink">
                        Key Concepts
                      </h3>
                      <div className="space-y-3 pt-1">
                        {outputs.summary.key_concepts.map((c, i) => (
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
                  )}

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
                <div className="py-16 text-center space-y-3">
                  <p className="font-serif text-lg text-ink">No summary yet.</p>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleGenerateSummary}
                    disabled={states.summary === "generating"}
                  >
                    {states.summary === "generating" ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" />
                        <span>Generating...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-1" />
                        <span>Generate summary</span>
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}

          {activeView === "quiz" && (
            <div>
              {outputs.quiz?.questions?.length ? (
                <div className="space-y-6 animate-fadeIn">
                  {outputs.quiz.questions[quizIndex] && (
                    <div className="space-y-5">
                      <div className="flex items-center justify-between text-xs text-ink-subtle">
                        <span>
                          Question {quizIndex + 1} of {outputs.quiz.questions.length}
                        </span>
                        <span>{outputs.quiz.difficulty || "medium"} difficulty</span>
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
                <div className="py-16 text-center space-y-3">
                  <p className="font-serif text-lg text-ink">No practice quiz yet.</p>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setQuizPopoverOpen(true)}
                    disabled={states.quiz === "generating"}
                  >
                    {states.quiz === "generating" ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" />
                        <span>Generating...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-1" />
                        <span>Generate practice quiz</span>
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}

          {activeView === "flashcards" && (
            <div>
              {outputs.flashcards?.length ? (
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
                <div className="py-16 text-center space-y-3">
                  <p className="font-serif text-lg text-ink">No flashcards yet.</p>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleGenerateFlashcards}
                    disabled={states.flashcards === "generating"}
                  >
                    {states.flashcards === "generating" ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" />
                        <span>Generating...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-1" />
                        <span>Generate flashcards</span>
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}

          {activeView === "improver" && (
            <div>
              {outputs.improver ? (
                <div className="space-y-6 animate-fadeIn">
                  <div className="space-y-2 pb-5 border-b border-ink-border">
                    <h3 className="font-serif text-[20px] font-medium text-ink">
                      Original Answer Feedback
                    </h3>
                    <p className="text-[15px] sm:text-[17px] leading-[1.65] text-ink-secondary">
                      {outputs.improver.original_answer_feedback}
                    </p>
                  </div>

                  <div className="space-y-2 pb-5 border-b border-ink-border">
                    <h3 className="font-serif text-[20px] font-medium text-ink">
                      Improved Answer
                    </h3>
                    <p className="text-[15px] sm:text-[17px] leading-[1.65] text-ink bg-canvas/30 p-4 rounded-[6px] border border-ink-border">
                      {outputs.improver.improved_answer}
                    </p>
                  </div>

                  {outputs.improver.key_improvements_made?.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="font-serif text-[20px] font-medium text-ink">
                        Key Improvements Made
                      </h3>
                      <ul className="space-y-2 pt-1 text-sm text-ink">
                        {outputs.improver.key_improvements_made.map((imp, i) => (
                          <li key={i} className="flex items-start gap-2.5">
                            <span className="w-1.5 h-1.5 bg-brand mt-2 shrink-0" />
                            <span>{imp}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-16 text-center space-y-3">
                  <p className="font-serif text-lg text-ink">No improved answer yet.</p>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleGenerateImprover}
                    disabled={states.improver === "generating"}
                  >
                    {states.improver === "generating" ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" />
                        <span>Generating...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-1" />
                        <span>Generate improved answer</span>
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 4.3 Zone 3: Right Action Column
            Uniform white panel surface with hairline separators in exact order:
            1. Summary
            2. Practice Quiz (with Settings popover)
            3. Flashcards
            4. Improved Answer
        */}
        <div className="w-full lg:w-[280px] shrink-0 space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-subtle block px-1">
            Outputs
          </span>

          <div className="bg-white rounded-[12px] border border-[rgba(22,24,29,0.10)] document-panel-shadow divide-y divide-[rgba(22,24,29,0.10)] overflow-hidden">
            {/* Card 1: Summary */}
            <div
              onClick={() => {
                setActiveView("summary");
                if (states.summary === "not_created") handleGenerateSummary();
              }}
              className={cn(
                "p-4 transition-colors cursor-pointer space-y-2",
                activeView === "summary" ? "bg-canvas/50" : "hover:bg-canvas/30"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-brand" strokeWidth={1.75} />
                  <h4 className="font-serif text-sm font-medium text-ink">Summary</h4>
                </div>
                {states.summary === "ready" && (
                  <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#EEF1FB] text-[#1F3FBF] border border-[#1F3FBF]/20">
                    Ready
                  </span>
                )}
                {states.summary === "generating" && (
                  <RefreshCw className="w-3.5 h-3.5 text-brand animate-spin" />
                )}
                {states.summary === "not_created" && (
                  <span className="text-[11px] text-ink-subtle">Not created</span>
                )}
                {states.summary === "failed" && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleGenerateSummary();
                    }}
                    className="text-xs text-feedback-error hover:underline flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" /> Retry
                  </button>
                )}
              </div>
              <p className="text-[11px] text-ink-secondary leading-snug">
                6-section structured academic summary.
              </p>
            </div>

            {/* Card 2: Practice Quiz (with Popover) */}
            <div
              className={cn(
                "p-4 transition-colors cursor-pointer space-y-2 relative",
                activeView === "quiz" ? "bg-canvas/50" : "hover:bg-canvas/30"
              )}
              onClick={() => setActiveView("quiz")}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-brand" strokeWidth={1.75} />
                  <h4 className="font-serif text-sm font-medium text-ink">Practice Quiz</h4>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setQuizPopoverOpen(!quizPopoverOpen);
                    }}
                    className="p-1 rounded hover:bg-canvas text-ink-subtle hover:text-ink"
                    title="Configure quiz settings"
                    aria-label="Configure quiz settings"
                  >
                    <Sliders className="w-3 h-3" />
                  </button>

                  {states.quiz === "ready" && (
                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#F5F9F6] text-feedback-success border border-feedback-success/20">
                      {outputs.quiz?.questions?.length || 5} Qs
                    </span>
                  )}
                  {states.quiz === "generating" && (
                    <RefreshCw className="w-3.5 h-3.5 text-brand animate-spin" />
                  )}
                  {states.quiz === "not_created" && (
                    <span className="text-[11px] text-ink-subtle">Not created</span>
                  )}
                  {states.quiz === "failed" && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleGenerateQuiz();
                      }}
                      className="text-xs text-feedback-error hover:underline flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" /> Retry
                    </button>
                  )}
                </div>
              </div>
              <p className="text-[11px] text-ink-secondary leading-snug">
                Multiple-choice questions with answers and rationales.
              </p>

              {/* 4.3 Practice Quiz Settings Popover */}
              {quizPopoverOpen && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-2 top-12 w-64 bg-white rounded-[8px] p-3 shadow-xl border border-ink-border z-30 space-y-3 animate-fadeIn text-xs"
                >
                  <div className="flex items-center justify-between border-b border-ink-border pb-1.5">
                    <span className="font-semibold text-ink">Quiz Settings</span>
                    <button
                      type="button"
                      onClick={() => setQuizPopoverOpen(false)}
                      className="text-ink-subtle hover:text-ink"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-ink-secondary block">
                      Number of Questions
                    </label>
                    <div className="grid grid-cols-3 gap-1">
                      {[5, 10, 15].map((cnt) => (
                        <button
                          key={cnt}
                          type="button"
                          onClick={() => setQuizCount(cnt)}
                          className={cn(
                            "py-1 rounded border text-center font-medium",
                            quizCount === cnt
                              ? "bg-brand text-white border-brand"
                              : "bg-canvas/50 text-ink hover:bg-canvas"
                          )}
                        >
                          {cnt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-ink-secondary block">
                      Difficulty Level
                    </label>
                    <div className="grid grid-cols-3 gap-1">
                      {["easy", "medium", "hard"].map((diff) => (
                        <button
                          key={diff}
                          type="button"
                          onClick={() => setQuizDifficulty(diff)}
                          className={cn(
                            "py-1 rounded border text-center capitalize font-medium",
                            quizDifficulty === diff
                              ? "bg-brand text-white border-brand"
                              : "bg-canvas/50 text-ink hover:bg-canvas"
                          )}
                        >
                          {diff}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => handleGenerateQuiz(quizCount, quizDifficulty)}
                    className="w-full text-xs h-7 mt-1"
                  >
                    Generate Quiz
                  </Button>
                </div>
              )}
            </div>

            {/* Card 3: Flashcards */}
            <div
              onClick={() => {
                setActiveView("flashcards");
                if (states.flashcards === "not_created") handleGenerateFlashcards();
              }}
              className={cn(
                "p-4 transition-colors cursor-pointer space-y-2",
                activeView === "flashcards" ? "bg-canvas/50" : "hover:bg-canvas/30"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-brand" strokeWidth={1.75} />
                  <h4 className="font-serif text-sm font-medium text-ink">Flashcards</h4>
                </div>
                {states.flashcards === "ready" && (
                  <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-canvas text-ink-secondary border border-ink-border">
                    {outputs.flashcards?.length || 5} cards
                  </span>
                )}
                {states.flashcards === "generating" && (
                  <RefreshCw className="w-3.5 h-3.5 text-brand animate-spin" />
                )}
                {states.flashcards === "not_created" && (
                  <span className="text-[11px] text-ink-subtle">Not created</span>
                )}
                {states.flashcards === "failed" && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleGenerateFlashcards();
                    }}
                    className="text-xs text-feedback-error hover:underline flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" /> Retry
                  </button>
                )}
              </div>
              <p className="text-[11px] text-ink-secondary leading-snug">
                Flippable study cards for active recall.
              </p>
            </div>

            {/* Card 4: Improved Answer */}
            <div
              onClick={() => {
                setActiveView("improver");
                if (states.improver === "not_created") handleGenerateImprover();
              }}
              className={cn(
                "p-4 transition-colors cursor-pointer space-y-2",
                activeView === "improver" ? "bg-canvas/50" : "hover:bg-canvas/30"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PenLine className="w-4 h-4 text-brand" strokeWidth={1.75} />
                  <h4 className="font-serif text-sm font-medium text-ink">Improved Answer</h4>
                </div>
                {states.improver === "ready" && (
                  <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#EEF1FB] text-[#1F3FBF] border border-[#1F3FBF]/20">
                    Ready
                  </span>
                )}
                {states.improver === "generating" && (
                  <RefreshCw className="w-3.5 h-3.5 text-brand animate-spin" />
                )}
                {states.improver === "not_created" && (
                  <span className="text-[11px] text-ink-subtle">Not created</span>
                )}
                {states.improver === "failed" && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleGenerateImprover();
                    }}
                    className="text-xs text-feedback-error hover:underline flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" /> Retry
                  </button>
                )}
              </div>
              <p className="text-[11px] text-ink-secondary leading-snug">
                Academic structural polish preserving original facts.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
