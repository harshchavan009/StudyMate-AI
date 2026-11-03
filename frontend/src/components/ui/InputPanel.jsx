import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

export function InputPanel({
  children,
  onSubmit,
  className,
}) {
  return (
    <Card className={cn("p-6 space-y-4 bg-surface border border-ink-border rounded-panel", className)}>
      <form onSubmit={onSubmit} className="space-y-4">
        {children}
      </form>
    </Card>
  );
}
