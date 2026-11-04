import { cn } from "@/lib/utils";

/**
 * ToolLayout: Responsive tool shell.
 * Part 4.1: Input panel is sticky on the left at desktop (420px wide).
 * The document panel on the right takes the remaining space.
 */
export function ToolLayout({
  title,
  description,
  inputPanel,
  resultPanel,
  className,
}) {
  return (
    <div className={cn("space-y-6", className)}>
      {/* Title & Description Header */}
      <div className="space-y-1">
        <h1 className="font-serif text-2xl sm:text-3xl font-medium text-ink tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="text-xs text-ink-secondary leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {/* Desktop (lg and up): 420px sticky left column + flex-1 right document panel */}
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Left Column: Input and Settings (4.1: sticky on left at desktop, 420px wide) */}
        <div className="w-full lg:w-[420px] lg:shrink-0 lg:sticky lg:top-[72px] self-start space-y-4">
          {inputPanel}
        </div>

        {/* Right Column: Document Panel taking remaining space */}
        <div className="w-full flex-1 min-w-0 space-y-4">
          {resultPanel}
        </div>
      </div>
    </div>
  );
}
