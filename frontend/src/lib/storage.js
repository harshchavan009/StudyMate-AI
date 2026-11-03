const SESSIONS_STORAGE_KEY = "studymate_recent_sessions_v1";
const DRAFTS_PREFIX = "studymate_draft_v1_";

/**
 * Save a session to local history (capped at 20 items, newest first).
 */
export function saveRecentSession({ tool, toolName, title, input, result }) {
  try {
    const raw = localStorage.getItem(SESSIONS_STORAGE_KEY);
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

    // Keep up to 20 recent items, newest first, drop oldest
    const filtered = existing.filter((item) => item.title !== newItem.title);
    const updated = [newItem, ...filtered].slice(0, 20);
    localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(updated));
    return newItem;
  } catch (err) {
    // Gracefully handle storage quota or privacy mode errors
    return null;
  }
}

/**
 * Retrieve recent sessions from localStorage.
 */
export function getRecentSessions() {
  try {
    const raw = localStorage.getItem(SESSIONS_STORAGE_KEY);
    if (!raw) return [];
    const items = JSON.parse(raw);
    return Array.isArray(items) ? items : [];
  } catch (err) {
    return [];
  }
}

/**
 * Delete a single session from local history.
 */
export function deleteRecentSession(id) {
  try {
    const raw = localStorage.getItem(SESSIONS_STORAGE_KEY);
    if (!raw) return [];
    const existing = JSON.parse(raw);
    const updated = existing.filter((item) => item.id !== id);
    localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    return [];
  }
}

/**
 * Clear all recent sessions.
 */
export function clearRecentSessions() {
  try {
    localStorage.removeItem(SESSIONS_STORAGE_KEY);
  } catch (err) {
    // Ignore
  }
}

/**
 * Draft autosave utilities (C3 & A6)
 */
export function saveDraft(toolKey, data) {
  try {
    if (!toolKey) return;
    localStorage.setItem(`${DRAFTS_PREFIX}${toolKey}`, JSON.stringify(data));
  } catch (err) {
    // Ignore storage quota errors
  }
}

export function getDraft(toolKey) {
  try {
    if (!toolKey) return null;
    const raw = localStorage.getItem(`${DRAFTS_PREFIX}${toolKey}`);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    return null;
  }
}

export function clearDraft(toolKey) {
  try {
    if (!toolKey) return;
    localStorage.removeItem(`${DRAFTS_PREFIX}${toolKey}`);
  } catch (err) {
    // Ignore
  }
}

/**
 * Formats a timestamp into human-readable relative duration.
 */
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
