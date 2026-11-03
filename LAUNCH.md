# StudyMate AI: Production Launch Checklist

This document tracks the deployment and production launch status for StudyMate AI. Items are marked completed only when verified in code, configurations, or automated test pipelines.

---

## 1. Verified & Automated Items (Completed)

- [x] **Custom Favicon Set**:
  - SVG vector monogram: `frontend/public/favicon.svg`
  - 32x32 PNG raster fallback: `frontend/public/favicon.png`
  - 180x180 Apple touch icon: `frontend/public/apple-touch-icon.png`
  - Verified in `frontend/index.html`.

- [x] **Page Titles and Meta Tags**:
  - Concise editorial title: `StudyMate AI - Academic Synthesis and Practice Quizzes`
  - Accurate meta description without marketing buzzwords.
  - Zero "Made with AI", builder watermarks, or generator meta tags in `index.html` or UI markup.

- [x] **Open Graph Image**:
  - Real UI typography graphic generated as `frontend/public/og-image.png` (1200x630).
  - Open Graph tags configured in `frontend/index.html`.

- [x] **Client-Side Routing & 404 Error Handling**:
  - Dedicated 404 recovery page (`frontend/src/pages/NotFound.jsx`) with direct return navigation.
  - Vercel SPA rewrite rule configured in `frontend/vercel.json` (`/.*` -> `/index.html`).

- [x] **Legal Documentation Live and Linked**:
  - Real Privacy Policy page (`/privacy`) describing Gemini API text transmission, in-memory processing, zero tracking cookies, and local storage usage.
  - Real Terms and Conditions page (`/terms`) defining permitted educational use, AI output disclaimers, and liability limits.
  - Both pages linked in desktop sidebar and global footer.

- [x] **Production CORS & Security Headers**:
  - FastAPI middleware configured to allow only the production `FRONTEND_URL` without wildcards.
  - Strict Content-Security-Policy, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, and `Permissions-Policy` applied on both backend middleware and `frontend/vercel.json`.

- [x] **Automated Test Suite & Vulnerability Audits**:
  - Pytest suite: 15 passing test cases.
  - `npm audit`: 0 vulnerabilities.
  - `pip-audit`: 0 vulnerabilities.

---

## 2. Manual Action Items (Required Prior to Launch)

The following steps must be completed manually by the project owner in external provider consoles:

1. **Obtain and Configure Gemini API Key**:
   - Obtain an API key from Google AI Studio (https://aistudio.google.com).
   - In Render Dashboard: Add `GEMINI_API_KEY` to the Web Service environment variables.
   - For local development: Copy `backend/.env.example` to `backend/.env` and paste your key.

2. **Deploy Backend to Render**:
   - Create a new Web Service on Render connected to this repository.
   - Root directory: `backend`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - Set `ENVIRONMENT=production`
   - Set `FRONTEND_URL=https://your-custom-domain.com` (or your Vercel URL)

3. **Deploy Frontend to Vercel**:
   - Import this repository on Vercel.
   - Root directory: `frontend`
   - Framework preset: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Set Environment Variable: `VITE_API_BASE_URL=https://your-backend.onrender.com`

4. **Connect Custom Domain and DNS**:
   - In Vercel Project Settings: Add your custom domain under Domains.
   - In your DNS registrar (e.g., Cloudflare, Namecheap, Google Domains): Add CNAME record pointing to `cname.vercel-dns.com`.
   - Verify automated SSL certificate issuance (HTTPS active).
   - Update `FRONTEND_URL` on Render to match your custom domain.

5. **Fill In Legal Contact Placeholders**:
   - Open `frontend/src/pages/PrivacyPolicy.jsx` and `frontend/src/pages/Terms.jsx`.
   - Replace `[Insert Contact Name / Organization Name]`, `[Insert Contact Email Address]`, and `[Insert Contact Postal Address]` with your actual contact details.
