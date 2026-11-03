import { AlertCircle, CheckCircle2, AlertTriangle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Alert({
  variant = "info",
  title,
  children,
  onClose,
  className,
}) {
  const icons = {
    info: <Info className="w-4 h-4 text-brand shrink-0 mt-0.5" strokeWidth={2} />,
    success: (
      <CheckCircle2 className="w-4 h-4 text-feedback-success shrink-0 mt-0.5" strokeWidth={2} />
    ),
    warning: (
      <AlertTriangle className="w-4 h-4 text-feedback-warning shrink-0 mt-0.5" strokeWidth={2} />
    ),
    error: (
      <AlertCircle className="w-4 h-4 text-feedback-error shrink-0 mt-0.5" strokeWidth={2} />
    ),
  };

  const variants = {
    info: "bg-brand-tint border-brand/20 text-ink",
    success: "bg-feedback-success-bg border-feedback-success/20 text-ink",
    warning: "bg-feedback-warning-bg border-feedback-warning/30 text-ink",
    error: "bg-feedback-error-bg border-feedback-error/30 text-ink",
  };

  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      aria-live={variant === "error" ? "assertive" : "polite"}
      className={cn(
        "flex items-start gap-3 p-3.5 border rounded-md text-xs leading-relaxed relative",
        variants[variant],
        className
      )}
    >
      {icons[variant]}
      <div className="flex-1 space-y-0.5">
        {title && <div className="font-semibold">{title}</div>}
        <div className="text-ink-secondary">{children}</div>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close message"
          className="text-ink-subtle hover:text-ink transition-colors p-0.5 rounded"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
