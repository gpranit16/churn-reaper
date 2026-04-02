# `main.py` — API entrypoint (what + why)

Source: `backend/main.py`

## Brief (why this file exists)

`main.py` is the web layer for the project. It turns model/explainer logic into HTTP endpoints that frontend pages can call.

Without this file, there is no backend API contract for Predict, Dashboard, or health checks.

## Brief (what this file does)

- Creates a FastAPI app (`Churn Predictor API`, version `1.0.0`)
- Enables permissive CORS for frontend development
- Defines `CustomerData` schema with defaults (predict payload can be partial)
- Exposes endpoints:
  - `POST /predict`
  - `GET /feature-importance`
  - `GET /health`
  - `GET /dashboard-summary`
  - `GET /sample-customer`

## Detailed flow by endpoint

### `POST /predict`

1. Validates request against `CustomerData`
2. Calls `predict.predict_churn(customer.model_dump())`
3. Returns consolidated response:
   - probability/risk
   - explanation
   - SHAP values
   - recommendations
   - static ROI (`roi_data`)
   - dynamic ROI (`dynamic_roi_data`)

If any exception occurs, returns `HTTP 500` with details.

### `GET /feature-importance`

1. Calls `explainer.get_global_importance()`
2. Returns `{"top_features": [...]}`

### `GET /health`

Simple readiness endpoint returning `{"status": "ok"}`.

### `GET /dashboard-summary`

1. Loads global feature importance
2. Builds fixed analytics snapshot:
   - `total_customers: 7043`
   - `high_risk_count: 1200`
   - `medium_risk_count: 1800`
   - `revenue_at_risk: 23572000`
   - `top_churn_reason: "Contract type"`
3. Calls `generate_executive_summary(..., use_llm=False)`
4. Returns analytics + feature importance + summary

### `GET /sample-customer`

Returns a realistic high-risk-style payload used by frontend auto-fill and testing.

## Why dashboard summary uses `use_llm=False`

This is a reliability choice. Dashboard should load instantly and should not block on external LLM availability.

Predict path still uses Groq where available.

## Runtime config

When run directly:

- Host: `0.0.0.0`
- Port: `8000`
- Reload: `False`

Because reload is disabled, restart backend after backend code changes to expose new response fields.

Command used by this repo:

```cmd
cd /d C:\Users\gupta\OneDrive\Desktop\ChurnPredictor\backend
..\venv\Scripts\python.exe main.py
```
