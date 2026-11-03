# StudyMate AI

StudyMate AI turns unorganized notes, lectures, and draft responses into structured summaries, active-recall quizzes, diagnostic feedback, and clear concept breakdowns.

Built with React 18, Tailwind CSS, Motion Primitives, and a FastAPI backend powered by the Google Gemini API.

---

## Key Features

1. **Academic Summarizer**:
   - Synthesizes raw lecture notes into 6 distinct sections: Core Takeaway, Key Concepts and Principles, Detailed Structural Breakdown, Essential Terminology, Practical Applications, and Self-Check Review Questions.
   - Skeletons mirror output structure during generation.
   - Sequential top-to-bottom entrance using AnimatedGroup.
   - Single-click markdown export.

2. **Practice Quiz Generator**:
   - Multiple choice questions calibrated across three difficulty tiers: Easy, Medium, and Hard.
   - Selectable question count (5, 10, or 15).
   - Real-time progress rail.
   - Directional question slide transitions via TransitionPanel.
   - Instant visual answer validation with expandable pedagogical explanations via Disclosure.
   - Final score animated count-up with per-question review breakdown.
   - Full keyboard accessibility (keys 1 to 4 to choose options, Enter to advance).

3. **Diagnostic Answer Improver**:
   - Evaluates draft exam answers against homework or essay prompts.
   - Side-by-side comparative layout on desktop, responsive stacked toggle on mobile.
   - Subtly highlighted phrase substitutions illustrating vocabulary and clarity improvements.
   - Rubric scoring with before-and-after progression.
   - Actionable critique divided into Demonstrated Strengths, Identified Weaknesses, and Missing Key Points.

4. **Multi-Level Concept Explainer**:
   - Explains academic concepts across three depth tiers:
     - Beginner: Everyday intuitive analogies, accessible vocabulary, and foundational steps.
     - Intermediate: Formal mechanisms, college-level terminology, and process dynamics.
     - Advanced: Theoretical rigor, mathematical formulations, and boundary conditions.
   - Structural re-flow crossfade across difficulty tiers via TransitionPanel.
   - Six structured breakdown cards revealed sequentially.

---

## Design System and Motion Guidelines

- **Background Canvas**: Warm off-white (`#FAF9F6`).
- **Cards and Panels**: Pure white (`#FFFFFF`) with a 1px hairline border (`#E5E5DF`) and soft hairline shadow.
- **Ink and Text**: Near-black ink (`#16181D`) for headings and body, `#525866` for secondary descriptions, and `#7E8695` for subtle meta text.
- **Accent**: ONE solid deep blue (`#1F3FBF`) used sparingly for primary buttons, links, and focus rings. Zero gradients, no purple or violet.
- **Typography**: `Newsreader` display serif for page titles paired with `Inter` clean sans-serif for interface controls and body reading.
- **Buttons and Radii**: Rectangular with a 6px to 8px radius (`rounded-md`, `rounded-lg`). Pill buttons are strictly prohibited.
- **Icons**: Lucide icons only with consistent 1.75px stroke width. Emoji are never used as icons.
- **Motion System**: Built on Motion Primitives (`AnimatedBackground`, `AnimatedGroup`, `TransitionPanel`, `Disclosure`). All animations are wrapped in `MotionConfig` with `reducedMotion="user"` so users with reduced motion preferences receive immediate, non-animated state changes.

---

## Architecture and Project Structure

```
StudyMate AI/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI entry, CORS, security headers, lifecycle
│   │   ├── config.py            # Validated environment settings
│   │   ├── prompts.py           # Gemini prompt contracts (zero em dashes)
│   │   ├── schemas.py           # Pydantic v2 input and output models
│   │   ├── services/
│   │   │   └── gemini_service.py # Gemini client, schema validation, bounded retries
│   │   └── api/
│   │       ├── endpoints.py     # Route handlers for all study tools
│   │       └── rate_limit.py    # SlowAPI rate limiter and 429 handler
│   ├── tests/
│   │   ├── conftest.py          # Pytest fixtures and test client
│   │   └── test_api.py          # 15 automated test cases
│   ├── .env.example             # Safe environment variable template
│   ├── render.yaml              # Render deployment blueprint
│   └── requirements.txt         # Pinned backend Python dependencies
├── frontend/
│   ├── public/
│   │   ├── favicon.svg          # Vector SVG icon
│   │   ├── favicon.png          # 32x32 PNG fallback
│   │   ├── apple-touch-icon.png # 180x180 Apple icon
│   │   ├── og-image.png         # Real UI Open Graph card
│   │   └── robots.txt           # Search crawler directives
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/          # AppShell, Sidebar, MobileNav, Footer
│   │   │   ├── motion/          # Pure JSX Motion Primitives
│   │   │   ├── ui/              # Button, Card, SegmentedControl, Textarea, Alert
│   │   │   └── tools/           # DiffHighlighter, ScoreCounter
│   │   ├── lib/
│   │   │   ├── api.js           # Typed fetch client with 429/422 handling
│   │   │   └── utils.js         # cn() helper using clsx and tailwind-merge
│   │   ├── pages/               # Home, Summarizer, Quiz, Improver, Explainer, Legal
│   │   ├── App.jsx              # Router configuration
│   │   ├── index.css            # Tailwind directives and reduced motion fallbacks
│   │   └── main.jsx             # React DOM root
│   ├── .env.example
│   ├── jsconfig.json            # Path alias configuration (@)
│   ├── package.json             # Pinned frontend dependencies
│   ├── tailwind.config.js       # Design tokens configuration
│   ├── vercel.json              # Vercel rewrites and security headers
│   └── vite.config.js           # Vite build configuration
├── LAUNCH.md                    # Production launch readiness checklist
├── SECURITY_AUDIT.md            # Verified 13-point security review report
└── README.md
```

---

## Local Development Setup

### Prerequisites
- Python 3.10+ (tested on Python 3.14.3)
- Node.js 18+ (tested on Node v20.20.2)
- npm 9+ (tested on npm 10.8.2)

### 1. Backend Setup
```bash
cd backend

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env to add your GEMINI_API_KEY (optional for local testing; mock engine runs if unset)

# Start FastAPI backend server
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
The backend API will be available at `http://127.0.0.1:8000`.

### 2. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Default points to http://localhost:8000

# Start Vite development server
npm run dev
```
The frontend application will be available at `http://localhost:5173`.

---

## Running Automated Tests

### Backend Test Suite
```bash
cd backend
source venv/bin/activate
pytest -v
```
All 15 test cases cover:
- Health check and security headers verification.
- Pydantic input length, format, and type validations.
- 6-section academic summarizer structure.
- Calibrated multiple choice quiz generation.
- Answer improver diagnostic breakdown and diff phrases.
- Concept explainer multi-level structural calibration.
- Em dash substitution and JSON sanitization.
- SlowAPI IP-based rate limiting (429 response verification).

### Frontend Production Build
```bash
cd frontend
npm run build
```
Builds production-ready static assets into `frontend/dist/`.

### Security Audits
```bash
# Frontend dependency check
cd frontend
npm audit

# Backend dependency check
cd backend
./venv/bin/pip-audit
```
Both audits report 0 known security vulnerabilities.

---

## Production Deployment

### Backend on Render
1. Connect this repository to Render as a new Web Service.
2. Select Root Directory: `backend`.
3. Set Build Command: `pip install -r requirements.txt`.
4. Set Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
5. Set Environment Variables:
   - `ENVIRONMENT`: `production`
   - `GEMINI_API_KEY`: Your Google Gemini API key.
   - `FRONTEND_URL`: Your Vercel production domain (e.g., `https://your-domain.com`).
   - `RATE_LIMIT_DEFAULT`: `30/minute`
   - `RATE_LIMIT_AI_ENDPOINTS`: `15/minute`

### Frontend on Vercel
1. Import this repository into Vercel.
2. Select Root Directory: `frontend`.
3. Framework Preset: `Vite`.
4. Build Command: `npm run build`.
5. Output Directory: `dist`.
6. Set Environment Variable:
   - `VITE_API_BASE_URL`: Your live Render backend URL (e.g., `https://studymate-api.onrender.com`).
7. `frontend/vercel.json` automatically configures SPA routing rewrites and applies production Content-Security-Policy, HSTS, and X-Frame-Options headers.

---

## Important Legal Notice

The Privacy Policy (`frontend/src/pages/PrivacyPolicy.jsx`) and Terms and Conditions (`frontend/src/pages/Terms.jsx`) pages describe how the application operates: text is sent over an encrypted HTTPS connection to the Gemini API, no persistent database or user accounts are used, and no data is sold.

Before public production launch, review these legal documents and replace the contact placeholders (`[Insert Contact Name / Organization Name]`, `[Insert Contact Email Address]`, `[Insert Contact Postal Address]`) with your official contact information.

