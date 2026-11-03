/**
 * Typed client API utilities for StudyMate AI.
 * Handles timeouts (60s), AbortController signals, rate limits, offline state, and clean errors.
 */

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(message, status, data = null, isTimeout = false) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
    this.isTimeout = isTimeout;
  }
}

async function request(endpoint, options = {}) {
  // Offline check
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    throw new ApiError(
      "You are currently offline. Please check your network connection and try again.",
      0
    );
  }

  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...options.headers,
  };

  // 60-second frontend timeout (C4)
  const timeoutMs = options.timeout || 60000;
  const controller = new AbortController();
  const callerSignal = options.signal;

  let timeoutId = null;
  let didTimeout = false;

  if (callerSignal) {
    if (callerSignal.aborted) {
      throw new ApiError("Request was cancelled.", 0);
    }
    callerSignal.addEventListener("abort", () => {
      controller.abort();
    });
  }

  timeoutId = setTimeout(() => {
    didTimeout = true;
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const isJson = response.headers.get("content-type")?.includes("application/json");
    const data = isJson ? await response.json() : null;

    if (!response.ok) {
      if (response.status === 429) {
        throw new ApiError(
          data?.detail || "Rate limit reached. Please wait a minute before submitting again.",
          429,
          data
        );
      }
      if (response.status === 422) {
        const fieldErrors = data?.errors?.map((e) => e.message).join(", ");
        throw new ApiError(
          fieldErrors || data?.detail || "Invalid input submitted.",
          422,
          data
        );
      }
      if (response.status >= 500) {
        throw new ApiError(
          "The AI model server encountered a temporary error. Please retry.",
          response.status,
          data
        );
      }
      throw new ApiError(
        data?.detail || `Request failed with status ${response.status}`,
        response.status,
        data
      );
    }

    return data;
  } catch (err) {
    clearTimeout(timeoutId);

    if (err instanceof ApiError) {
      throw err;
    }

    if (err.name === "AbortError") {
      if (didTimeout) {
        throw new ApiError(
          "The request timed out after 60 seconds. The server may be under heavy load, please retry.",
          408,
          null,
          true
        );
      }
      throw new ApiError("Request was cancelled.", 0);
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      throw new ApiError(
        "You are currently offline. Please check your network connection and try again.",
        0
      );
    }

    throw new ApiError(
      "Unable to connect to the backend server. Please verify the service is running.",
      0
    );
  }
}

export const api = {
  getHealth: (opts) => request("/api/health", opts),
  getConfig: (opts) => request("/api/config", opts),
  summarize: (text, opts) =>
    request("/api/summarize", {
      method: "POST",
      body: JSON.stringify({ text }),
      ...opts,
    }),
  generateQuiz: (text, difficulty, question_count, opts) =>
    request("/api/quiz", {
      method: "POST",
      body: JSON.stringify({ text, difficulty, question_count }),
      ...opts,
    }),
  improveAnswer: (answer, subject_or_topic = null, opts) =>
    request("/api/improve-answer", {
      method: "POST",
      body: JSON.stringify({ answer, subject_or_topic }),
      ...opts,
    }),
  explainConcept: (concept, level, subject = "Other", opts) =>
    request("/api/explain-concept", {
      method: "POST",
      body: JSON.stringify({ concept, level, subject }),
      ...opts,
    }),
};
