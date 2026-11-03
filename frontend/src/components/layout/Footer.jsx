import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-ink-border bg-white py-5 text-xs text-ink-secondary">
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="font-serif font-medium text-ink">StudyMate AI</span>
          <span className="text-ink-subtle">·</span>
          <span>Plain, structured study assistance</span>
        </div>
        <div className="flex items-center gap-5">
          <Link to="/privacy" className="hover:text-ink transition-colors">
            Privacy Policy
          </Link>
          <span className="text-ink-subtle">·</span>
          <Link to="/terms" className="hover:text-ink transition-colors">
            Terms of Service
          </Link>
        </div>
      </div>
    </footer>
  );
}
