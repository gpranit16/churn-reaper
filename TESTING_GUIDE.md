# Churn Predictor — End-to-End Testing Guide (Current Build, INR)

This guide validates the **current codebase behavior** (backend + frontend) using INR formatting and the latest routing/API setup.

## 1) Start services (recommended commands)

### Backend (CMD)

```cmd
cd /d C:\Users\gupta\OneDrive\Desktop\ChurnPredictor\backend
..\venv\Scripts\python.exe main.py
```

Expected:
- API on `http://127.0.0.1:8000`
- Swagger on `http://127.0.0.1:8000/docs`

### Frontend (second CMD)

```cmd
cd /d C:\Users\gupta\OneDrive\Desktop\ChurnPredictor\frontend
npm run dev -- --host 127.0.0.1 --port 5173
```

Open:
- `http://127.0.0.1:5173`

> Note: In dev mode, frontend now uses `/api` proxy to backend.

---

## 2) Quick API sanity checks

In a third CMD/PowerShell:

```cmd
curl http://127.0.0.1:8000/health
curl http://127.0.0.1:8000/sample-customer
curl http://127.0.0.1:8000/feature-importance
curl http://127.0.0.1:8000/dashboard-summary
```

Expected:
- `/health` => `{"status":"ok"}`
- `/sample-customer` => valid payload
- `/feature-importance` => `top_features` list
- `/dashboard-summary` => `analytics`, `feature_importance`, `executive_summary`

### Validate ROI payload shape (`/predict`)

Run:

```cmd
curl http://127.0.0.1:8000/sample-customer > sample_customer.json
curl -X POST http://127.0.0.1:8000/predict -H "Content-Type: application/json" --data-binary "@sample_customer.json"
```

Expected fields in response:
- `roi_data` (static ROI)
- `dynamic_roi_data` (new dynamic ROI)

---

## 3) Predict risk-band truth (important)

Current backend thresholds in `predict.py`:
- **LOW**: probability `< 40`
- **MEDIUM**: `40` to `70`
- **HIGH**: `> 70`

So seeing `28.05%` with risk level `LOW` is **not contradictory**.

---

## 4) Predict scenario tests (updated, non-contradictory)

### Scenario A — Low risk (validated)

Use:
- Tenure: `72`
- Monthly Charges: `₹20000`
- Contract: `Two year`
- Internet Service: `No`
- Tech Support: `Yes`
- Online Security: `Yes`

Current observed output in this build:
- `LOW`, around `2.13%` (can vary after retraining)

### Scenario B — High risk (validated)

Use:
- Tenure: `2`
- Monthly Charges: `₹8500`
- Contract: `Month-to-month`
- Internet Service: `Fiber optic`
- Tech Support: `No`
- Online Security: `No`

Current observed output in this build:
- `HIGH`, around `93.38%` (can vary after retraining)

Additional UI checks:
- explanation text renders
- SHAP chart (`Top Factors Affecting Churn`) renders
- recommendations list renders
- ROI block renders in INR
- ROI toggle works (`Static ROI` / `Dynamic ROI`) and financial values switch

---

## 5) Groq verification (is AI explanation active?)

Run:

```cmd
curl http://127.0.0.1:8000/sample-customer > sample_customer.json
curl -X POST http://127.0.0.1:8000/predict -H "Content-Type: application/json" --data-binary "@sample_customer.json"
```

Interpretation:
- If explanation is very specific and recommendations are model-generated (not fixed rule templates), Groq path is active.
- If Groq fails, backend gracefully falls back to deterministic explanation/rule-based offers.

---

## 6) Dashboard checks (current behavior)

Open: `http://127.0.0.1:5173/dashboard`

Expected:
- Dashboard should render charts/KPIs.
- If live refresh fails, UI shows a status banner and continues with cached fallback analytics.
- Dashboard should no longer remain on indefinite loading state.

---

## 7) Responsive + navigation checks

- Sidebar is closed by default.
- Menu button opens sidebar.
- Overlay / close icon / link click closes sidebar.
- No permanent left-offset blank space when sidebar is closed.
- Predict and Dashboard pages remain readable on mobile widths.

---

## 8) Troubleshooting quick list

- **Dashboard blank / stuck**
	- Ensure backend is running on `127.0.0.1:8000`
	- Use `127.0.0.1:5173` for frontend URL
	- Hard refresh once (`Ctrl + F5`)

- **Groq not working**
	- Check `backend/.env` has `GROQ_API_KEY`
	- Ensure `GROQ_MODEL_NAME` is active (default now: `llama-3.1-8b-instant`)

- **Dynamic ROI not appearing in UI**
	- Restart backend after code changes (`main.py` runs with `reload=False`)
	- Confirm `/predict` response contains `dynamic_roi_data`

- **Python module errors**
	- Use `..\venv\Scripts\python.exe` from `backend` folder (this env has project deps)

---

## 9) Shutdown

- Stop backend: `Ctrl + C`
- Stop frontend: `Ctrl + C`
