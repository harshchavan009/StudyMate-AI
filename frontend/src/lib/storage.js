const STORAGE_KEY = "studymate_recent_sessions";

export function saveRecentSession({ tool, toolName, title, input, result }) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const existing = raw ? JSON.parse(raw) : [];

    const newItem = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      tool,
      toolName,
      title: title ? title.slice(0, 80).trim() : "Untitled session",
      input,
      result,
      timestamp: Date.now(),
    };

    // Keep up to 10 recent items, newest first
    const updated = [newItem, ...existing.filter((item) => item.title !== newItem.title)].slice(0, 10);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return newItem;
  } catch (err) {
    // Gracefully handle storage quota or privacy mode errors
    return null;
  }
}

export function getRecentSessions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const items = JSON.parse(raw);
    return Array.isArray(items) ? items : [];
  } catch (err) {
    return [];
  }
}

export function clearRecentSessions() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    // Ignore
  }
}

export function formatTimeAgo(timestamp) {
  if (!timestamp) return "";
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDays = Math.floor(diffHour / 24);
  return `${diffDays}d ago`;
}
