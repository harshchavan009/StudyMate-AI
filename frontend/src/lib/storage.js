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
 * Reviewed sections tracking per session (F5)
 */
const REVIEWED_SECTIONS_PREFIX = "studymate_reviewed_v1_";

export function getReviewedSections(sessionId) {
  try {
    if (!sessionId) return new Set();
    const raw = localStorage.getItem(`${REVIEWED_SECTIONS_PREFIX}${sessionId}`);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

export function saveReviewedSections(sessionId, reviewedSet) {
  try {
    if (!sessionId) return;
    const array = Array.from(reviewedSet);
    localStorage.setItem(`${REVIEWED_SECTIONS_PREFIX}${sessionId}`, JSON.stringify(array));
  } catch {
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

/**
 * Quiz attempts history (Part 3.3)
 */
const QUIZ_ATTEMPTS_STORAGE_KEY = "studymate_quiz_attempts_v1";

export function saveQuizAttempt({ score, total, title, missedQuestions = [] }) {
  try {
    const raw = localStorage.getItem(QUIZ_ATTEMPTS_STORAGE_KEY);
    const existing = raw ? JSON.parse(raw) : [];
    const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
    const attempt = {
      id: `attempt_${Date.now()}`,
      title: title || "Practice Quiz",
      score,
      total,
      percentage,
      missedQuestions,
      timestamp: Date.now(),
    };
    const updated = [attempt, ...existing].slice(0, 10);
    localStorage.setItem(QUIZ_ATTEMPTS_STORAGE_KEY, JSON.stringify(updated));
    return attempt;
  } catch {
    return null;
  }
}

export function getQuizAttempts() {
  try {
    const raw = localStorage.getItem(QUIZ_ATTEMPTS_STORAGE_KEY);
    if (!raw) return [];
    const items = JSON.parse(raw);
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

export function getLatestMissedQuestions() {
  const attempts = getQuizAttempts();
  if (attempts.length === 0) return [];
  return attempts[0].missedQuestions || [];
}

/**
 * Study sets storage (Part 5.1: max 20 sets, versioned, try/catch)
 */
const STUDY_SETS_STORAGE_KEY = "studymate_study_sets_v1";

export function saveStudySet(setObj) {
  try {
    const raw = localStorage.getItem(STUDY_SETS_STORAGE_KEY);
    const existing = raw ? JSON.parse(raw) : [];
    const id = setObj.id || `set_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const title = setObj.title || setObj.sourceText?.split("\n")[0]?.slice(0, 60)?.trim() || "Untitled Study Set";
    
    const record = {
      id,
      title,
      sourceText: setObj.sourceText || "",
      createdAt: setObj.createdAt || Date.now(),
      updatedAt: Date.now(),
      outputs: setObj.outputs || {}, // { summary, quiz, flashcards, explanations: [] }
    };

    const filtered = existing.filter((s) => s.id !== id);
    const updated = [record, ...filtered].slice(0, 20);
    localStorage.setItem(STUDY_SETS_STORAGE_KEY, JSON.stringify(updated));
    return record;
  } catch {
    return null;
  }
}

export function getStudySets() {
  try {
    const raw = localStorage.getItem(STUDY_SETS_STORAGE_KEY);
    if (!raw) return [];
    const items = JSON.parse(raw);
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

export function getStudySetById(id) {
  const sets = getStudySets();
  return sets.find((s) => s.id === id) || null;
}

export function deleteStudySet(id) {
  try {
    const sets = getStudySets();
    const updated = sets.filter((s) => s.id !== id);
    localStorage.setItem(STUDY_SETS_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

/**
 * Activity in the last 7 days (Part 3.3)
 */
export function getWeekActivity() {
  const sessions = getRecentSessions();
  const sets = getStudySets();
  const attempts = getQuizAttempts();

  // 7 days ending today
  const days = [];
  const now = new Date();

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const dayStart = d.getTime();
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;
    const dayLabel = d.toLocaleDateString("en-US", { weekday: "short" });

    // Count records generated in this day
    const sessionCount = sessions.filter((s) => s.timestamp >= dayStart && s.timestamp < dayEnd).length;
    const setCount = sets.filter((s) => s.createdAt >= dayStart && s.createdAt < dayEnd).length;
    const attemptCount = attempts.filter((a) => a.timestamp >= dayStart && a.timestamp < dayEnd).length;

    days.push({
      dayLabel,
      dateStr: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      count: sessionCount + setCount + attemptCount,
      isToday: i === 0,
    });
  }

  return days;
}

/**
 * Last used relative time by tool (Part 3.2)
 */
export function getLastUsedByTool() {
  const sessions = getRecentSessions();
  const map = {};
  for (const s of sessions) {
    if (s.tool && !map[s.tool]) {
      map[s.tool] = formatTimeAgo(s.timestamp);
    }
  }
  return map;
}
