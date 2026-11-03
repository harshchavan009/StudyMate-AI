import { cn } from "@/lib/utils";

export function Card({ children, className, as: Component = "div", ...props }) {
  return (
    <Component
      className={cn(
        "bg-white border border-ink-border rounded-lg shadow-hairline p-6",
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}

export function CardHeader({ children, className, ...props }) {
  return (
    <div className={cn("mb-4 space-y-1", className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className, ...props }) {
  return (
    <h3
      className={cn(
        "font-serif text-lg font-medium text-ink tracking-tight",
        className
      )}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardDescription({ children, className, ...props }) {
  return (
    <p
      className={cn("text-xs text-ink-secondary leading-relaxed", className)}
      {...props}
    >
      {children}
    </p>
  );
}

