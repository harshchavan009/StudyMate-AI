# StudyMate AI

StudyMate AI turns unorganized notes, lectures, and draft responses into structured summaries, active-recall quizzes, phrase-level answer improvements, and clear concept breakdowns.

Built with React 18, Tailwind CSS, Motion components, and a FastAPI backend powered by the Google Gemini API.

---

## Key Features

1. **Academic Summarizer**:
   - Organizes raw lecture notes into 6 exact sections: Topic Overview, Key Concepts, Important Definitions, Important Points, Exam Preparation Notes, and Quick Revision Summary.
   - Responsive split-view layout at 1280px and wider, stacked layout below 1280px.
   - Skeletons mirror output structure during generation.
   - Sequential top-to-bottom entrance using AnimatedGroup.
   - Clear, Generate, Copy output, Regenerate, and Retry on error.
   - Single-click markdown export.

2. **Practice Quiz Generator**:
   - Multiple choice questions across three difficulty levels: Easy, Medium, and Hard.
   - Selectable question count (5, 10, or 15 questions).
   - Progress tracker advancing per question.
   - Directional question slide transitions via TransitionPanel.
   - Instant visual answer validation with expandable pedagogical explanations via Disclosure.
   - Final score animated count-up with per-question review breakdown.
   - Full keyboard accessibility (keys 1 to 4 to choose options, Enter to advance).

3. **Answer Improver**:
   - Evaluates draft exam answers (10 to 5,000 characters) with optional subject or topic context (max 200 characters).
   - Strictly preserves the student's original arguments and facts without introducing outside assertions.
   - Generates 4 exact sections: Original Answer Feedback, Improved Answer, Key Improvements Made, and Suggestions for Further Improvement.
   - Side-by-side comparative layout on wide screens, stacked toggle on smaller screens.
   - Subtly highlighted phrase substitutions illustrating vocabulary and clarity improvements via DiffHighlighter.
   - Concrete phrase substitution table detailing original phrasing, revised substitution, and specific rationale.

4. **Multi-Level Concept Explainer**:
   - Explains academic concepts (3 to 300 characters) across subject domains and three depth levels:
     - Beginner: Everyday intuitive analogies, accessible vocabulary, and foundational steps.
     - Intermediate: Formal mechanisms, college-level terminology, and process dynamics.
     - Advanced: Theoretical rigor, mathematical formulations, and boundary conditions.
   - Generates 6 exact sections: Introduction, Detailed Explanation, Step-by-Step Understanding, Practical Example, Real-World Applications, and Quick Revision Points.
   - Structural re-flow crossfade across depth levels via TransitionPanel.

5. **Real Dashboard Experience**:
   - Home dashboard features a real Recent Sessions history saved to client localStorage with try/catch safety.
   - Session restore: clicking any recent session re-opens the tool with your input and results intact.
   - Clear history button to wipe local data instantly.
   - Honest three-step "How it works" guide and real UI output preview card.
   - Zero fake reviews, zero fake user counts, and zero synthetic logos.

---

## Design System and Motion Guidelines

- **Background Canvas**: Warm off-white (`#FAF9F6`).
- **Cards and Panels**: Pure white (`#FFFFFF`) with a 1px hairline border (`#E5E5DF`) and soft hairline shadow.
- **Ink and Text**: Near-black ink (`#16181D`) for headings and body, `#525866` for secondary descriptions, and `#7E8695` for subtle meta text.
- **Accent**: ONE solid deep blue (`#1F3FBF`) used sparingly for primary buttons, links, and focus rings. Zero gradients, no purple or violet.
- **Disabled Controls**: Neutral grey (`#E5E5DF` background, `#7E8695` text), avoiding washed-out tints of the accent.
- **Typography**: Self-hosted via Fontsource. `Source Serif 4` for page titles and section headings paired with `Inter` for interface controls and body reading. Optimal reading width set to 65-75 characters (`max-w-prose: 70ch`).
- **Buttons and Radii**: Rectangular with a 6px to 8px radius (`rounded`, `rounded-md`). Pill buttons are strictly prohibited.
- **Icons**: Lucide icons only with consistent 1.75px stroke width. Emoji are never used as icons.
- **App Shell**: Unified `max-w-7xl` container so headings never shift between pages. Minimal top bar with breadcrumbs and a real three-state `/api/health` badge (`checking`, `online`, `unreachable`).
- **Single Source of Truth Config**: Input limits read directly from `GET /api/config` so the frontend and backend validation never disagree.
- **Motion System**: Built on Motion components (`AnimatedBackground`, `AnimatedGroup`, `TransitionPanel`, `Disclosure`). All animations are wrapped in `MotionConfig` with `reducedMotion="user"` so users with reduced motion preferences receive immediate, non-animated state changes.
- **Zero Em Dashes**: Clean punctuation using commas, periods, or colons across all UI copy, docs, and comments.

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
│   │       ├── endpoints.py     # Route handlers for all study tools and /api/config
│   │       └── rate_limit.py    # SlowAPI rate limiter and 429 handler
│   ├── tests/
│   │   ├── conftest.py          # Pytest fixtures and test client
│   │   └── test_api.py          # 16 automated test cases
│   ├── .env.example             # Safe environment variable template
│   ├── render.yaml              # Render deployment blueprint
│   └── requirements.txt         # Pinned backend Python dependencies
├── frontend/
│   ├── public/
│   │   ├── favicon.svg          # Custom vector SVG book wordmark icon
│   │   ├── favicon.png          # 32x32 PNG fallback
│   │   ├── apple-touch-icon.png # 180x180 Apple icon
│   │   ├── og-image.png         # Real 16:9 UI Open Graph card (1200x675)
│   │   └── robots.txt           # Search crawler directives
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/          # AppShell, Sidebar, MobileNav, Footer
│   │   │   ├── motion/          # Pure JSX motion components
│   │   │   ├── ui/              # Button, Card, SegmentedControl, Textarea, Alert, SkeletonBlock
│   │   │   └── tools/           # DiffHighlighter, ScoreCounter
│   │   ├── lib/
│   │   │   ├── api.js           # Typed fetch client with 429/422 handling and getConfig()
│   │   │   ├── storage.js       # Try/catch localStorage manager for recent sessions
│   │   │   ├── usePageMeta.js   # Dynamic per-page title and meta description hook
│   │   │   └── utils.js         # cn() helper using clsx and tailwind-merge
│   │   ├── pages/               # Home, Summarizer, Quiz, Improver, Explainer, Legal
│   │   ├── App.jsx              # Router configuration
│   │   ├── index.css            # Tailwind directives and reduced motion fallbacks
│   │   └── main.jsx             # React DOM root with Fontsource CSS
│   ├── .env.example
│   ├── jsconfig.json            # Path alias configuration (@)
│   ├── package.json             # Pinned frontend dependencies
│   ├── tailwind.config.js       # Styling configuration
│   ├── vercel.json              # Vercel rewrites and security headers
│   └── vite.config.js           # Vite build configuration
├── LAUNCH.md                    # Production launch readiness checklist
├── SECURITY_AUDIT.md            # Completed 13-point security review report
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
# Edit .env to add your GEMINI_API_KEY (required for AI features; returns HTTP 503 if unconfigured)

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
All 16 test cases cover:
- Health check and security headers verification.
- Central config endpoint (`/api/config`) limits verification.
- Pydantic input length, format, and type validations.
- 6-section academic summarizer structure.
- Multiple choice quiz generation.
- Answer improver 4-section breakdown, DiffHighlighter phrases, and fact retention.
- Concept explainer 6-section breakdown and multi-level depth.
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

The Privacy Policy (`frontend/src/pages/PrivacyPolicy.jsx`) and Terms and Conditions (`frontend/src/pages/Terms.jsx`) pages describe how the application operates: text is sent over an encrypted HTTPS connection to the Gemini API, no persistent database or user accounts are used, recent session history is stored locally in the browser, and no data is sold.

Before public production launch, review these legal documents and replace the contact placeholders (`[Insert Contact Name / Organization Name]`, `[Insert Contact Email Address]`, `[Insert Contact Postal Address]`) with your official contact information.
