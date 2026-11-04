import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Layers, Plus, Trash2, ArrowRight, BookOpen, HelpCircle, PenLine, Clock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { usePageMeta } from "@/lib/usePageMeta";
import { getStudySets, deleteStudySet, formatTimeAgo } from "@/lib/storage";

export function StudySetList() {
  usePageMeta("Study Sets", "Manage and review your saved study sets and multi-tool outputs.");

  const navigate = useNavigate();
  const [sets, setSets] = useState([]);

  useEffect(() => {
    setSets(getStudySets());
  }, []);

  const handleDelete = (id, e) => {
    e.stopPropagation();
    const updated = deleteStudySet(id);
    setSets(updated);
  };

  const handleOpen = (setId) => {
    navigate(`/study-set/workspace`, { state: { setId } });
  };

  const handleCreateNew = () => {
    navigate(`/study-set/workspace`, { state: { isNew: true } });
  };

  return (
    <div className="space-y-6 py-2 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-ink-border">
        <div className="space-y-1">
          <h1 className="font-serif text-3xl font-medium tracking-tight text-ink">
            Study Sets
          </h1>
          <p className="text-sm text-ink-secondary">
            Your saved multi-tool study collections and generated outputs.
          </p>
        </div>

        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={handleCreateNew}
          className="gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={2} />
          <span>New Study Set</span>
        </Button>
      </div>

      {/* 4.1 Empty State: Exact required phrasing */}
      {sets.length === 0 ? (
        <div className="py-16 px-6 text-center bg-white rounded-[12px] border border-[rgba(22,24,29,0.10)] document-panel-shadow space-y-4 max-w-xl mx-auto">
          <div className="w-12 h-12 mx-auto rounded-full bg-canvas flex items-center justify-center text-ink-subtle border border-ink-border">
            <Layers className="w-6 h-6" strokeWidth={1.5} />
          </div>
          <div className="space-y-1.5">
            <h3 className="font-serif text-lg font-medium text-ink">
              No study sets saved yet.
            </h3>
            <p className="text-xs sm:text-sm text-ink-secondary leading-relaxed">
              No study sets saved yet. Paste notes on Home or open a study tool to create one.
            </p>
          </div>
          <div className="pt-2 flex items-center justify-center gap-3">
            <Link to="/">
              <Button variant="secondary" size="sm">
                Paste notes on Home
              </Button>
            </Link>
            <Button variant="primary" size="sm" onClick={handleCreateNew}>
              Create a new set
            </Button>
          </div>
        </div>
      ) : (
        /* Populated Sets List */
        <div className="space-y-3">
          {sets.map((set) => {
            const outputs = set.outputs || {};
            const hasSummary = Boolean(outputs.summary);
            const hasQuiz = Boolean(outputs.quiz?.questions?.length);
            const hasFlashcards = Boolean(outputs.flashcards?.length);
            const hasImprover = Boolean(outputs.improver);

            const createdDateStr = set.createdAt
              ? new Date(set.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : "Saved in this browser";

            return (
              <div
                key={set.id}
                onClick={() => handleOpen(set.id)}
                className="p-5 bg-white rounded-[12px] border border-[rgba(22,24,29,0.10)] document-panel-shadow hover:border-brand transition-all cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <h2 className="font-serif text-lg font-medium text-ink group-hover:text-brand transition-colors truncate">
                      {set.title || "Untitled Study Set"}
                    </h2>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink-subtle">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      {createdDateStr}
                    </span>

                    {/* Output Chips */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {hasSummary && (
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#EEF1FB] text-[#1F3FBF] border border-[#1F3FBF]/20 flex items-center gap-1">
                          <BookOpen className="w-3 h-3" />
                          Summary
                        </span>
                      )}
                      {hasQuiz && (
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#F5F9F6] text-feedback-success border border-feedback-success/20 flex items-center gap-1">
                          <HelpCircle className="w-3 h-3" />
                          Quiz
                        </span>
                      )}
                      {hasFlashcards && (
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-canvas text-ink-secondary border border-ink-border flex items-center gap-1">
                          <Layers className="w-3 h-3" />
                          Flashcards
                        </span>
                      )}
                      {hasImprover && (
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#EEF1FB] text-[#1F3FBF] border border-[#1F3FBF]/20 flex items-center gap-1">
                          <PenLine className="w-3 h-3" />
                          Improved Answer
                        </span>
                      )}
                      {!hasSummary && !hasQuiz && !hasFlashcards && !hasImprover && (
                        <span className="text-[11px] text-ink-subtle italic">
                          No outputs generated yet
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-ink-border/50">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpen(set.id);
                    }}
                    className="text-xs h-8"
                  >
                    <span>Open</span>
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>

                  <Button
                    type="button"
                    variant="subtle"
                    size="sm"
                    onClick={(e) => handleDelete(set.id, e)}
                    className="text-xs h-8 text-ink-subtle hover:text-feedback-error hover:bg-feedback-error/5"
                    title="Delete study set"
                    aria-label={`Delete ${set.title}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
