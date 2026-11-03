import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-ink-border bg-white py-6 px-4 sm:px-8 text-xs text-ink-secondary">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="font-serif font-medium text-ink">StudyMate AI</span>
          <span>·</span>
          <span>Academic synthesis and active recall</span>
        </div>
        <div className="flex items-center gap-6">
          <Link to="/privacy" className="hover:text-ink transition-colors">
            Privacy Policy
          </Link>
          <Link to="/terms" className="hover:text-ink transition-colors">
            Terms of Service
          </Link>
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer noopener"
            className="hover:text-ink transition-colors"
          >
            Documentation
          </a>
        </div>
      </div>
    </footer>
  );
}
