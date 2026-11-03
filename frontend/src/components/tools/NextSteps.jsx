import { ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/Card";

/**
 * Cross-tool continuous study navigation (F4).
 * Navigates between study tools prefilling source notes or concept topics
 * without triggering an automatic API request.
 */
export function NextSteps({ steps = [] }) {
  if (!steps || steps.length === 0) return null;

  return (
    <Card className="p-5 border border-brand/20 bg-[#FCFBFA] space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-sm font-semibold text-ink">
          Next steps for this material
        </h3>
        <span className="text-[11px] font-sans tracking-[0.04em] text-ink-subtle">
          Continue studying
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {steps.map((step, idx) => {
          const Icon = step.icon || ArrowRight;
          return (
            <button
              key={idx}
              type="button"
              onClick={step.onClick}
              className="flex items-start gap-3 p-3 text-left bg-white border border-ink-border hover:border-brand rounded transition-all group hover:shadow-sm"
            >
              <div className="p-2 rounded bg-[#EEF1FB] text-brand group-hover:bg-brand group-hover:text-white transition-colors shrink-0 mt-0.5">
                <Icon className="w-4 h-4" strokeWidth={1.75} />
              </div>
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-1 text-xs font-semibold text-ink group-hover:text-brand transition-colors">
                  <span>{step.title}</span>
                  <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" strokeWidth={2} />
                </div>
                <p className="text-[11px] text-ink-secondary leading-normal line-clamp-2">
                  {step.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
}
