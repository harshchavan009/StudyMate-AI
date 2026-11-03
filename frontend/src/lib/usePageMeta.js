import { useEffect } from "react";

export function usePageMeta(title, description) {
  useEffect(() => {
    if (title) {
      document.title = `${title} | StudyMate AI`;
    }

    if (description) {
      let meta = document.querySelector('meta[name="description"]');
      if (!meta) {
        meta = document.createElement("meta");
        meta.name = "description";
        document.head.appendChild(meta);
      }
      meta.setAttribute("content", description);
    }
  }, [title, description]);
}
