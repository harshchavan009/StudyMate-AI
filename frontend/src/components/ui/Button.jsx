import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export const Button = forwardRef(
  (
    {
      children,
      variant = "primary",
      size = "md",
      className,
      disabled,
      type = "button",
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium transition-colors duration-150 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:bg-[#E5E5DF] disabled:text-[#7E8695] disabled:border-transparent disabled:cursor-not-allowed disabled:shadow-none select-none";

    const variants = {
      primary:
        "bg-brand text-white hover:bg-brand-hover active:bg-brand-active border border-transparent shadow-sm",
      secondary:
        "bg-white text-ink border border-ink-border hover:border-ink-border-hover hover:bg-black/[0.01] active:bg-black/[0.03]",
      subtle:
        "bg-transparent text-ink-secondary hover:text-ink hover:bg-black/[0.04] active:bg-black/[0.08]",
      danger:
        "bg-feedback-error text-white hover:bg-[#9B1C1C] active:bg-[#771515]",
    };

    const sizes = {
      sm: "h-8 px-3 text-xs gap-1.5",
      md: "h-9 px-4 text-sm gap-2",
      lg: "h-11 px-5 text-base gap-2.5",
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
