/**
 * Typed client API utilities for StudyMate AI.
 */

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(message, status, data = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...options.headers,
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const isJson = response.headers.get("content-type")?.includes("application/json");
    const data = isJson ? await response.json() : null;

    if (!response.ok) {
      if (response.status === 429) {
        throw new ApiError(
          data?.detail || "Rate limit reached. Please wait a minute before trying again.",
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
      throw new ApiError(
        data?.detail || `Request failed with status ${response.status}`,
        response.status,
        data
      );
    }

    return data;
  } catch (err) {
    if (err instanceof ApiError) {
      throw err;
    }
    throw new ApiError(
      "Unable to connect to the backend server. Please verify the service is running.",
      0
    );
  }
}

export const api = {
  getHealth: () => request("/api/health"),
  summarize: (text) => request("/api/summarize", { method: "POST", body: JSON.stringify({ text }) }),
  generateQuiz: (text, difficulty, question_count) =>
    request("/api/quiz", {
      method: "POST",
      body: JSON.stringify({ text, difficulty, question_count }),
    }),
  improveAnswer: (question, draft_answer) =>
    request("/api/improve-answer", {
      method: "POST",
      body: JSON.stringify({ question, draft_answer }),
    }),
  explainConcept: (concept, level, context = null) =>
    request("/api/explain-concept", {
      method: "POST",
      body: JSON.stringify({ concept, level, context }),
    }),
};

