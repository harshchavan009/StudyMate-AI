import { cn } from "@/lib/utils";

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

      {/* Split view at 1280px and wider, stacked below */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* Left Column: Input and Settings (sticky on wide screens - E4) */}
        <div className="xl:col-span-5 space-y-4 xl:sticky xl:top-[72px] self-start">
          {inputPanel}
        </div>

        {/* Right Column: Results & Documents */}
        <div className="xl:col-span-7 space-y-4 min-w-0">
          {resultPanel}
        </div>
      </div>
    </div>
  );
}
