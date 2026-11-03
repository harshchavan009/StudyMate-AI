import { Link } from "react-router-dom";
import { ArrowLeft, Home, BookOpen, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function NotFound() {
  return (
    <div className="max-w-md mx-auto py-16 text-center space-y-6">
      <div className="space-y-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-brand">
          Error 404
        </span>
        <h1 className="font-serif text-3xl font-medium text-ink tracking-tight">
          Page Not Found
        </h1>
        <p className="text-xs text-ink-secondary leading-relaxed">
          The requested study resource or endpoint does not exist. Please return to the overview page or select an available study tool below.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        <Link to="/">
          <Button variant="primary" size="md">
            <Home className="w-4 h-4" />
            <span>Return to Overview</span>
          </Button>
        </Link>
        <Link to="/summarizer">
          <Button variant="secondary" size="md">
            <BookOpen className="w-4 h-4" />
            <span>Open Summarizer</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}

