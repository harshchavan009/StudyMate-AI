import { cn } from "@/lib/utils";

/**
 * FieldCounter: Standardized character counter.
 * Format: "1,240 / 10,000" in tabular numerals.
 * Turns amber at 90% and red beyond the limit, accompanied by an explicit text message.
 */
export function FieldCounter({
  count = 0,
  max = 10000,
  min = 0,
  className,
  helperText,
}) {
  const formattedCount = Number(count).toLocaleString();
  const formattedMax = Number(max).toLocaleString();

  const isTooShort = min > 0 && count > 0 && count < min;
  const isTooLong = count > max;
  const ratio = max > 0 ? count / max : 0;
  const isApproaching = !isTooLong && ratio >= 0.9;

  let stateMessage = helperText || "";
  let messageVariant = "normal";

  if (isTooShort) {
    stateMessage = `Minimum ${min} characters required (${min - count} more needed).`;
    messageVariant = "error";
  } else if (isTooLong) {
    const diff = count - max;
    stateMessage = `Maximum ${formattedMax} characters exceeded by ${diff.toLocaleString()}.`;
    messageVariant = "error";
  } else if (isApproaching) {
    const remaining = max - count;
    stateMessage = `Approaching character limit (${remaining.toLocaleString()} remaining).`;
    messageVariant = "warning";
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-2 text-[11px]",
        className
      )}
    >
      <div
        className={cn(
          "transition-colors",
          messageVariant === "error" && "text-feedback-error font-medium",
          messageVariant === "warning" && "text-[#8A5A00] font-medium",
          messageVariant === "normal" && "text-ink-subtle"
        )}
      >
        {stateMessage}
      </div>

      <span
        className={cn(
          "tabular-nums font-sans shrink-0 transition-colors",
          isTooLong
            ? "text-feedback-error font-medium"
            : isApproaching
            ? "text-[#8A5A00] font-medium"
            : "text-ink-subtle"
        )}
        aria-label={`${formattedCount} of ${formattedMax} characters`}
      >
        {formattedCount} / {formattedMax}
      </span>
    </div>
  );
}
