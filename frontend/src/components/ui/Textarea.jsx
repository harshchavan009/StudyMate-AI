import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export const Textarea = forwardRef(
  (
    {
      label,
      id,
      value = "",
      onChange,
      placeholder,
      minChars = 0,
      maxChars,
      rows = 6,
      error,
      helperText,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    const currentLength = typeof value === "string" ? value.length : 0;
    const isBelowMin = minChars > 0 && currentLength > 0 && currentLength < minChars;
    const isAboveMax = maxChars && currentLength > maxChars;

    return (
      <div className="space-y-1.5 w-full">
        {label && (
          <div className="flex items-center justify-between">
            <label
              htmlFor={id}
              className="text-xs font-semibold text-ink tracking-tight"
            >
              {label}
            </label>
            {maxChars && (
              <span
                className={cn(
                  "text-[11px] tabular-nums",
                  isAboveMax
                    ? "text-feedback-error font-medium"
                    : isBelowMin
                    ? "text-feedback-warning"
                    : "text-ink-subtle"
                )}
              >
                {currentLength} / {maxChars} chars
              </span>
            )}
          </div>
        )}

        <textarea
          ref={ref}
          id={id}
          value={value}
          onChange={onChange}
          rows={rows}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "w-full px-3.5 py-3 text-sm text-ink bg-white border border-ink-border rounded-md shadow-inner transition-colors duration-150 resize-y",
            "placeholder:text-ink-subtle/70",
            "focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand",
            "disabled:opacity-60 disabled:cursor-not-allowed",
            error && "border-feedback-error focus:border-feedback-error focus:ring-feedback-error",
            className
          )}
          {...props}
        />

        {(error || helperText || isBelowMin) && (
          <p
            className={cn(
              "text-xs leading-normal",
              error
                ? "text-feedback-error"
                : isBelowMin
                ? "text-feedback-warning"
                : "text-ink-secondary"
            )}
          >
            {error ||
              (isBelowMin
                ? `Please enter at least ${minChars} characters (${minChars - currentLength} more needed).`
                : helperText)}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";

