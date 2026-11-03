import { AnimatedBackground } from "@/components/motion/AnimatedBackground";
import { cn } from "@/lib/utils";

export function SegmentedControl({
  options = [],
  value,
  onChange,
  className,
  ariaLabel = "Segmented Options",
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex p-1 bg-[#F0EFEB] rounded-md border border-ink-border",
        className
      )}
    >
      <AnimatedBackground
        defaultValue={value}
        onValueChange={(val) => {
          if (val && val !== value && onChange) {
            onChange(val);
          }
        }}
        className="bg-white rounded-[4px] shadow-sm border border-black/[0.04]"
        transition={{ type: "tween", ease: "easeOut", duration: 0.18 }}
      >
        {options.map((opt) => {
          const isSelected = opt.value === value;
          return (
            <button
              key={opt.value}
              data-id={opt.value}
              type="button"
              role="tab"
              aria-selected={isSelected}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-[4px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                isSelected ? "text-ink font-semibold" : "text-ink-secondary hover:text-ink"
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </AnimatedBackground>
    </div>
  );
}
