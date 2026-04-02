# Churn Reaper

A simple, practical churn prediction system for telecom/customer-retention teams.

This project helps you answer:

- **Which customer is likely to leave?**
- **Why is that customer at risk?**
- **What action should we take now?**
- **What is the financial impact of that risk?**

---

## What this project gives you

### For business teams

- Clear churn probability (in %)
- Risk label: **LOW / MEDIUM / HIGH**
- Human-friendly explanation (not just model numbers)
- Suggested retention actions
- **Static ROI** estimate in INR

### For technical teams

- FastAPI backend for prediction APIs
- React + Vite frontend for interactive dashboard and prediction UI
- SHAP explainability for model transparency
- Reusable model artifacts (`.pkl`) for stable inference

---

## Business logic (simple explanation)

## 1) Risk scoring

The model returns churn probability, then maps it to a risk band:

- **LOW**: probability < 40
- **MEDIUM**: probability 40 to 70
- **HIGH**: probability > 70

## 2) Why a customer is at risk

The app uses SHAP to identify top factors affecting that customer.
Examples: contract type, monthly charge, tenure, support/security adoption.

## 3) What to do next

The app suggests retention actions:

- AI-generated strategy (when API key is available)
- Rule-based fallback (when AI is unavailable)

## 4) Financial impact (Static ROI)

This project uses a **Static ROI baseline** for business decision support.

Formulas:

- `CLV = MonthlyCharges × 24`
- `Revenue at Risk = CLV × (Churn Probability / 100)`
- `Retention Cost = MonthlyCharges × 0.2 × 3`
- `ROI Ratio = Revenue at Risk / Retention Cost`

In plain words: this is a benchmark using a fixed 20% retention discount for 3 months.

---

## How the system works (end-to-end)

1. User enters customer details in frontend.
2. Frontend sends data to backend `/predict`.
3. Backend preprocesses data to match training schema.
4. Model predicts churn probability.
5. SHAP calculates top contributing factors.
6. Explanation + recommendations are generated.
7. Static ROI metrics are computed.
8. One response is sent back to frontend and displayed in UI cards/charts.

---

## Tech stack

### Backend

- Python
- FastAPI
- scikit-learn
- XGBoost
- SHAP
- Groq API (optional for richer text recommendations)

### Frontend

- React
- Vite
- Tailwind CSS
- Recharts

---

## Project structure

```text
ChurnPredictor/
├── backend/
│   ├── main.py
│   ├── predict.py
│   ├── recommendations.py
│   ├── explainer.py
│   ├── groq_explainer.py
│   ├── train_model.py
│   ├── requirements.txt
│   └── docs/
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── services/
│   ├── package.json
│   └── vite.config.js
├── models/
│   ├── churn_model.pkl
│   ├── label_encoders.pkl
│   ├── feature_names.pkl
│   └── sample_data.pkl
├── data/
│   └── telco_churn.csv
└── README.md
```

---

## Run locally (step-by-step)

These steps are Windows-friendly.

## 0) Prerequisites

Install:

- Git
- Python 3.11+
- Node.js 18+
- npm

## 1) Clone project

```cmd
git clone https://github.com/gpranit16/churn-reaper.git
cd churn-reaper
```

## 2) Backend setup

```cmd
cd backend
python -m venv ..\venv
..\venv\Scripts\python.exe -m pip install --upgrade pip
..\venv\Scripts\python.exe -m pip install -r requirements.txt
```

Create `backend/.env` with (example):

```env
GROQ_API_KEY=your_key_here
GROQ_MODEL_NAME=llama-3.1-8b-instant
GROQ_TIMEOUT_SECONDS=6
GROQ_MAX_RETRIES=0
CORS_ALLOW_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
CORS_ALLOW_CREDENTIALS=false
```

Start backend:

```cmd
..\venv\Scripts\python.exe main.py
```

Backend should be available at:

- `http://127.0.0.1:8000/health`
- `http://127.0.0.1:8000/docs`

## 3) Frontend setup (new terminal)

```cmd
cd frontend
npm install
npm run dev
```

Open the URL shown in terminal (usually `http://localhost:5173`).

## 4) Quick API checks (optional)

```cmd
curl http://127.0.0.1:8000/health
curl http://127.0.0.1:8000/sample-customer
curl http://127.0.0.1:8000/feature-importance
```

---

## Common issues and fixes

### Frontend says network error

- Confirm backend is running on `127.0.0.1:8000`
- Confirm frontend is running and opened on the shown port
- Hard refresh browser (`Ctrl + F5`)

### CORS error after deployment

- Add frontend domain in backend env `CORS_ALLOW_ORIGINS`
- Redeploy backend

### AI explanation not appearing

- Check `GROQ_API_KEY`
- If missing/invalid, fallback text still works (app does not fully break)

### New code changes not visible in backend

- Restart backend (server currently runs with `reload=False`)

---

## API endpoints

- `GET /health`
- `GET /sample-customer`
- `GET /feature-importance`
- `GET /dashboard-summary`
- `POST /predict`

`POST /predict` returns:

- churn probability + risk level
- explanation text
- SHAP values
- recommendations
- static ROI data

---

## Why this project is valuable

- Converts raw ML output into clear business actions
- Helps prioritize retention budget by risk and impact
- Gives explainability (why this customer, why now)
- Works even if AI service is unavailable (fallback logic)

---

## Related docs in this repo

- `NON_TECHNICAL_GUIDE.md`
- `TESTING_GUIDE.md`
- `CUSTOMER_INPUT_EXAMPLES.md`
- `CHURN_PREDICTION_WORKING_AND_FIELD_IMPACT.md`
- `backend/docs/`

---

If you want, I can also add badges, architecture diagram, and screenshot section in this README for an even stronger GitHub landing page.
