# Run + Test Guide (Backend, current build)

This is the updated backend runbook aligned with current code.

## 1) Recommended Python interpreter

Use the project `venv` interpreter (not system Python):

```cmd
C:\Users\gupta\OneDrive\Desktop\ChurnPredictor\venv\Scripts\python.exe
```

## 2) Start backend

```cmd
cd /d C:\Users\gupta\OneDrive\Desktop\ChurnPredictor\backend
..\venv\Scripts\python.exe main.py
```

Expected:
- `http://127.0.0.1:8000/health`
- `http://127.0.0.1:8000/docs`

## 3) Core API smoke tests

```cmd
curl http://127.0.0.1:8000/health
curl http://127.0.0.1:8000/sample-customer
curl http://127.0.0.1:8000/feature-importance
curl http://127.0.0.1:8000/dashboard-summary
```

## 4) Predict smoke test (end-to-end)

```cmd
curl http://127.0.0.1:8000/sample-customer > sample_customer.json
curl -X POST http://127.0.0.1:8000/predict -H "Content-Type: application/json" --data-binary "@sample_customer.json"
```

Check in response:
- `churn_probability`
- `risk_level`
- `churn_explanation`
- `recommendations`
- `roi_data`
- `dynamic_roi_data`

Quick check for both ROI modes via PowerShell:

```powershell
$body = Get-Content .\sample_customer.json -Raw
$resp = Invoke-RestMethod -Uri "http://127.0.0.1:8000/predict" -Method Post -ContentType "application/json" -Body $body
$resp.roi_data
$resp.dynamic_roi_data
```

## 5) Groq-specific checks

In `backend/.env` ensure:

```env
GROQ_API_KEY=...
GROQ_MODEL_NAME=llama-3.1-8b-instant
GROQ_TIMEOUT_SECONDS=6
GROQ_MAX_RETRIES=0
```

Notes:
- Predict path attempts Groq for explanation/recommendations.
- Dashboard summary path intentionally uses deterministic fallback (`use_llm=False`) for stability.

## 6) Frontend-proxy validation (optional but recommended)

If frontend dev server is running on `127.0.0.1:5173`, proxy path should work:

```cmd
curl http://127.0.0.1:5173/api/dashboard-summary
curl http://127.0.0.1:5173/api/sample-customer
```

## 7) Train artifacts (if needed)

```cmd
cd /d C:\Users\gupta\OneDrive\Desktop\ChurnPredictor\backend
..\venv\Scripts\python.exe train_model.py
```

Expected `models/` outputs:
- `churn_model.pkl`
- `label_encoders.pkl`
- `feature_names.pkl`
- `sample_data.pkl`

## 8) Common issues

- `ModuleNotFoundError` (e.g., shap)
  - Cause: wrong interpreter
  - Fix: run with `..\venv\Scripts\python.exe`

- Groq errors (invalid/decommissioned model)
  - Fix: set active `GROQ_MODEL_NAME` in `backend/.env`

- Dynamic ROI missing from API response
  - Cause: backend process is stale (code changed but server not restarted)
  - Fix: restart backend (`main.py` runs with `reload=False`)

- Missing model artifacts
  - Fix: rerun training (`train_model.py`)

## 9) Stop backend

Press `Ctrl + C` in backend terminal.
