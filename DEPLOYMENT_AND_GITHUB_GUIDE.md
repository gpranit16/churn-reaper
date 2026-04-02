# Complete Deployment + GitHub Guide (Backend + Frontend)

This guide covers:

1. Local run (backend + frontend)
2. Deploy backend
3. Deploy frontend
4. Push project to GitHub

All steps are written for Windows users.

---

## 1) Before you start

Install these first:

- Git
- Python 3.11+ (recommended)
- Node.js 18+
- npm

Project folders used:

- Backend: `backend/`
- Frontend: `frontend/`
- Model files: `models/`

Important:

- Push this as **one single repo** (backend + frontend together).
- Do **not** create separate GitHub repos for backend/frontend unless you intentionally want split deployments.

---

## 2) Run locally (to confirm everything works)

## Start backend

From project root:

```cmd
cd /d C:\Users\gupta\OneDrive\Desktop\ChurnPredictor\backend
..\venv\Scripts\python.exe main.py
```

Check:

- `http://127.0.0.1:8000/health`
- `http://127.0.0.1:8000/docs`

## Start frontend (new terminal)

```cmd
cd /d C:\Users\gupta\OneDrive\Desktop\ChurnPredictor\frontend
npm install
npm run dev
```

Open:

- `http://localhost:5173` (or port shown in terminal)

---

## 3) Required environment variables

## Backend env (`backend/.env`)

```env
GROQ_API_KEY=your_key_here
GROQ_MODEL_NAME=llama-3.1-8b-instant
GROQ_TIMEOUT_SECONDS=6
GROQ_MAX_RETRIES=0
CORS_ALLOW_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
CORS_ALLOW_CREDENTIALS=false
```

If `GROQ_API_KEY` is missing, app still works using fallback logic.

## Frontend env for production (`frontend/.env.production`)

```env
VITE_API_BASE_URL=https://your-backend-domain.com
VITE_BACKEND_FALLBACK_URL=https://your-backend-domain.com
```

Replace with your real backend URL after deployment.

---

## 4) Deploy backend (Render example)

## A) Push code to GitHub first (section 6 below)

## B) Create Render Web Service

- Platform: Render
- New -> Web Service
- Connect your GitHub repo

Settings:

- Root Directory: `backend`
- Environment: `Python`
- Build Command: `pip install -r requirements.txt`
- Start Command: `python main.py`

Set environment variables in Render dashboard:

- `GROQ_API_KEY`
- `GROQ_MODEL_NAME`
- `GROQ_TIMEOUT_SECONDS`
- `GROQ_MAX_RETRIES`
- `CORS_ALLOW_ORIGINS` (set your frontend URL, e.g. `https://your-frontend.vercel.app`)
- `CORS_ALLOW_CREDENTIALS` (`false` unless you explicitly need credentials/cookies)

Important:

- Backend now supports cloud port via `PORT` env (already handled in code)
- Ensure `models/` folder and `.pkl` artifacts are committed to repo

After deploy, test:

- `https://your-backend-domain.com/health`
- `https://your-backend-domain.com/docs`

---

## 5) Deploy frontend (Vercel example)

- Platform: Vercel
- New Project -> import same GitHub repo

Settings:

- Framework: Vite
- Root Directory: `frontend`
- Build Command: `npm run build`
- Output Directory: `dist`

Environment variables in Vercel:

- `VITE_API_BASE_URL=https://your-backend-domain.com`
- `VITE_BACKEND_FALLBACK_URL=https://your-backend-domain.com`

After backend deploy, update `CORS_ALLOW_ORIGINS` to include your Vercel domain.

Deploy and open your Vercel URL.

Test in browser:

1. Open Predict page
2. Run sample prediction
3. Confirm explanation, recommendations, SHAP chart, ROI section are visible
4. Toggle Static ROI / Dynamic ROI

---

## 6) Push project to GitHub (complete flow)

From project root:

```cmd
cd /d C:\Users\gupta\OneDrive\Desktop\ChurnPredictor
git init
git add .
git commit -m "Initial commit - churn predictor"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

If repo already exists and remote is set:

```cmd
git add .
git commit -m "Update docs and deployment setup"
git push
```

---

## 7) After deployment: quick final checklist

- Backend `/health` returns `{"status":"ok"}`
- Frontend can call backend successfully
- Predict endpoint returns both:
  - `roi_data`
  - `dynamic_roi_data`
- SHAP chart is visible
- ROI toggle works in UI

---

## 8) Common problems and fixes

### Problem: Frontend shows network error

Fix:
- confirm backend URL is correct in frontend env
- redeploy frontend after env update
- ensure backend `CORS_ALLOW_ORIGINS` includes frontend domain

### Problem: Dynamic ROI not visible

Fix:
- restart backend after backend code changes
- check `/predict` response contains `dynamic_roi_data`

### Problem: Deployment fails on backend

Fix:
- ensure `backend/requirements.txt` is present
- ensure model files are committed in `models/`

---

## 9) Recommended docs to share with team

- `NON_TECHNICAL_GUIDE.md` (business users)
- `DYNAMIC_ROI_WORKING.md` (simple ROI explanation)
- `TESTING_GUIDE.md` (QA/testing)
- `backend/docs/run_and_test.md` (developer operations)
