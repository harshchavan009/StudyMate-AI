# StudyMate AI: Live Demonstration & Deployment Guide

This guide provides deployment instructions and an exact 3-minute script for presenting StudyMate AI to evaluators and technical reviewers.

---

## 1. 3-Minute Live Demonstration Script

### Act 1: Overview, Presets, and Design (0:00 to 0:30)
1. **Open the Application**:
   - Highlight the editorial visual system: Source Serif 4 headings, dark navigation sidebar (`#14161B`), warm parchment canvas (`#F2EFE8`), and flat hairline borders (`rgba(22, 24, 29, 0.10)`).
   - Point out the absence of distracting gradients, purple buttons, and emoji icons.
   - Point out the live connection badge in the top bar showing "Online" (verified against `GET /api/health`).
2. **Preset Demonstration**:
   - Locate the Quick Presets row under the input area: "DNS & Networking", "Cellular Respiration", "Monetary Policy", "Judicial Review".
   - Click "DNS & Networking". Notice that it populates authentic study material into the textarea without automatically triggering generation, giving the student complete control.
   - Point out the dynamic character counter with tabular figures.

### Act 2: Validation Errors & Service Failure Handling (0:30 to 1:00)
1. **Input Validation Rejection**:
   - Click the Clear button to empty the textarea.
   - Type "abc" (3 characters) or enter whitespace only.
   - Notice that the Generate button remains disabled, the counter highlights the constraint, and clear helper text explains that notes must be at least 20 characters.
   - Demonstrates strict client and backend Pydantic validation (HTTP 422).
2. **API Service Unavailable Handling (503)**:
   - Demonstrate failure resilience when the Gemini API service is unconfigured or unavailable (or when a bad key is provided).
   - Click Generate: the app displays a clear notification: "The AI service is not configured or unavailable. Please verify your GEMINI_API_KEY."
   - Notice two critical safety features:
     - **Preservation of Student Input**: The textarea content is never cleared or lost on error.
     - **Retry Action**: A dedicated "Retry" button appears inline, allowing students to resubmit immediately once connectivity is restored.

### Act 3: Live Generation Across All Four Academic Utilities (1:00 to 2:15)
With the backend running and `GEMINI_API_KEY` configured with `gemini-3.8-flash`:

1. **Notes Summarizer**:
   - Click the "Cellular Respiration" preset and click **Generate Summary**.
   - Show the 3-stage animated topic processing pipeline: Analyzing Structure -> Grounding Concepts -> Synthesizing Notes.
   - Review the six distinct generated academic sections:
     - 01. Topic Overview
     - 02. Key Concepts (with badge numerals)
     - 03. Important Definitions
     - 04. Important Points
     - 05. Exam Preparation Notes
     - 06. Quick Revision Summary
   - **Copy Markdown**: Click "Copy Markdown", observing the instant confirmed checkmark state.
   - **Regenerate**: Click the "Regenerate" button to request fresh real-time synthesis from Gemini.
   - **Typography Sizer**: Toggle the S / M / L reading size buttons.
2. **Practice Quiz Generator**:
   - Navigate to Quiz Generator via the sidebar or `Cmd + K` palette.
   - Set question count to 5 and difficulty to Medium, then click **Generate Practice Quiz**.
   - Review the live multiple-choice questions with 4 options each.
   - Select an option to see instant color-coded feedback (green for correct, red for incorrect) and conceptual explanations.
   - Toggle to Flashcard Study Mode to review items sequentially.
3. **Answer Improver**:
   - Navigate to Answer Improver.
   - Paste a student draft response and click **Improve Answer**.
   - Review the 4-part critique: Overall Assessment, Specific Strengths, Actionable Improvements, and Polished Revision with inline DiffHighlighter deletions and insertions (with strict anti-hallucination guardrails forbidding invented claims).
4. **Concept Explainer**:
   - Navigate to Concept Explainer.
   - Enter "Recursion in programming", select "Beginner" depth, and click **Explain Concept**.
   - Review the 6-section breakdown with step-by-step intuition, real-world analogies, and revision bullets tailored specifically for beginners.

### Act 4: Mobile Responsiveness & Architecture Verification (2:15 to 3:00)
1. **Mobile Layout Demonstration**:
   - Resize browser to 390px (mobile viewport) or inspect in responsive mode.
   - Show the mobile top bar with hamburger menu trigger.
   - Tap the hamburger icon to reveal the slide-out navigation drawer with frosted glass backdrop blur.
   - Demonstrate single-column touch-friendly input areas and responsive study cards.
2. **Automated Test Suite & Security**:
   - Switch to terminal and run `pytest -v`.
   - Point out all 38 passing tests (validation rules, anti-hallucination prompts, 503/429/502/504 error envelopes, and proxy header rate limiting).

---

## 2. Production Deployment Guide

### A. Deploy Backend to Render
1. Create a new **Web Service** on [Render](https://render.com).
2. Connect your Git repository (`https://github.com/harshchavan009/StudyMate-AI.git`).
3. Configure service settings:
   - **Root Directory**: `backend`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT --proxy-headers --forwarded-allow-ips "*"`
4. Configure Environment Variables:
   - `ENVIRONMENT`: `production`
   - `GEMINI_API_KEY`: `AIza...` (your Google Gemini API key)
   - `GEMINI_MODEL`: `gemini-3.8-flash`
   - `FRONTEND_URL`: `https://your-frontend.vercel.app`
   - `RATE_LIMIT_DEFAULT`: `30/minute`
   - `RATE_LIMIT_AI_ENDPOINTS`: `15/minute`
5. Deploy and copy your backend URL (e.g. `https://studymate-backend.onrender.com`).

### B. Deploy Frontend to Vercel
1. Import your Git repository on [Vercel](https://vercel.com).
2. Configure project settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Configure Environment Variables:
   - `VITE_API_BASE_URL`: `https://studymate-backend.onrender.com`
4. Deploy and verify that the application loads and connects to the backend.

---

## 3. Custom Domain Configuration Guide

1. In your **Vercel Project Dashboard**, navigate to **Settings > Domains**.
2. Enter your custom domain name (e.g., `studymate.example.com` or `example.com`).
3. Add the required DNS records in your domain registrar's DNS management console:
   - For a subdomain (`studymate.example.com`):
     - **Type**: `CNAME`
     - **Name**: `studymate`
     - **Value**: `cname.vercel-dns.com`
   - For an apex domain (`example.com`):
     - **Type**: `A`
     - **Name**: `@`
     - **Value**: `76.76.21.21`
4. Wait for DNS propagation and Vercel automated SSL certificate issuance (typically 2 to 5 minutes).
5. Update `FRONTEND_URL` on Render to match your custom domain so that CORS policies allow requests from your custom domain.
