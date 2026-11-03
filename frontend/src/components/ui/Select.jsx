import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function Select({
  id,
  label,
  value,
  onChange,
  options = [],
  disabled = false,
  className,
  placeholder = "Select an option",
}) {
  return (
    <div className="space-y-1.5 w-full">
      {label && (
        <label htmlFor={id} className="text-xs font-semibold text-ink block">
          {label}
        </label>
      )}
      <div className="relative w-full">
        <select
          id={id}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={cn(
            "w-full h-9 pl-3 pr-8 text-xs bg-white border border-ink-border rounded text-ink appearance-none cursor-pointer truncate transition-colors",
            "focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand",
            "disabled:bg-[#F5F4F0] disabled:cursor-not-allowed disabled:text-ink-subtle",
            className
          )}
        >
          {options.map((opt) => {
            const val = typeof opt === "string" ? opt : opt.value;
            const lbl = typeof opt === "string" ? opt : opt.label;
            return (
              <option key={val} value={val} className="truncate">
                {lbl}
              </option>
            );
          })}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-ink-subtle">
          <ChevronDown className="w-3.5 h-3.5" strokeWidth={1.75} />
        </div>
      </div>
    </div>
  );
}
