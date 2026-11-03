import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-ink-border bg-white py-5 px-4 sm:px-8 text-xs text-ink-secondary">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="font-serif font-medium text-ink">StudyMate AI</span>
          <span>·</span>
          <span>Plain, structured study assistance</span>
        </div>
        <div className="flex items-center gap-5">
          <Link to="/privacy" className="hover:text-ink transition-colors">
            Privacy Policy
          </Link>
          <span>·</span>
          <Link to="/terms" className="hover:text-ink transition-colors">
            Terms of Service
          </Link>
        </div>
      </div>
    </footer>
  );
}
