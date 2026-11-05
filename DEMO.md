# StudyMate AI: Live Demonstration & Deployment Guide

This guide provides deployment instructions and a script for presenting StudyMate AI to evaluators.

---

## 1. 3-Minute Live Demonstration Script

### Act 1: Overview & Editorial Design (0:00 - 0:45)
1. **Open the Home Page**:
   - Highlight the editorial visual system: Source Serif 4 headings, dark navigation sidebar (`#14161B`), warm parchment canvas (`#F2EFE8`), and flat hairline borders.
   - Point out the absence of distracting gradients, purple buttons, or emoji icons.
   - Note the backend health status badge in the top bar showing "Online".
2. **Preset Demonstration**:
   - Click one of the quick preset pills under the input area (e.g., "DNS Resolution").
   - Notice that it loads authentic study material into the textarea without automatically triggering generation, giving the student control.
   - Point out the dynamic character counter with tabular figures.

### Act 2: Notes Summarizer & Real AI Output (0:45 - 1:45)
1. **Generate Academic Summary**:
   - Click **Generate Summary**.
   - Show the 3-stage animated topic processing pipeline (Analyzing Structure -> Grounding Concepts -> Synthesizing Notes).
   - If `GEMINI_API_KEY` is active, review the six distinct generated sections:
     - 01. Topic Overview
     - 02. Key Concepts (numbered with badge numerals)
     - 03. Important Definitions
     - 04. Important Points
     - 05. Exam Preparation Notes
     - 06. Quick Revision Summary
   - Demonstrate the **Copy Markdown** action (displays confirmed "Copied" checkmark).
   - Demonstrate the **S / M / L Text Size** switcher to adjust reading comfort.

### Act 3: Practice Quiz Generator & Study Tools (1:45 - 2:30)
1. **Interactive Quiz**:
   - Navigate to the **Quiz Generator**.
   - Click **View a sample result** to demonstrate the study runner.
   - Answer a question: select an option to see instant color-coded feedback (green for correct, red for incorrect) and the detailed conceptual rationale.
   - Demonstrate the **Dual Mode Switcher**: toggle between the Multiple Choice runner and interactive Flashcard study mode.

### Act 4: Architecture & Security Verification (2:30 - 3:00)
1. **Command Menu**:
   - Press `Cmd + K` (or `Ctrl + K`) to invoke the global command palette and jump between tools.
2. **Review Security & Integrity**:
   - Highlight that the student's raw text is processed in memory by the Gemini API and never stored on a database.
   - Show the 30 passing automated tests in the terminal (`pytest`).

---

## 2. Production Deployment Guide

### A. Deploy Backend to Render
1. Create a new **Web Service** on [Render](https://render.com).
2. Connect your Git repository.
3. Configure the service settings:
   - **Root Directory**: `backend`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT --proxy-headers --forwarded-allow-ips "*"`
4. Configure Environment Variables:
   - `ENVIRONMENT`: `production`
   - `GEMINI_API_KEY`: `AIza...` (your Google Gemini API key)
   - `FRONTEND_URL`: `https://your-frontend.vercel.app` (or custom domain)
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
4. Wait for DNS propagation and Vercel's automated SSL certificate issuance (typically 2-5 minutes).
5. Update `FRONTEND_URL` on Render to match your custom domain so that CORS policies allow requests from your custom domain.
