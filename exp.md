# Churn Reaper — Detailed Hackathon Presentation Script

> Use this as a direct speaking script.  
> Recommended duration: **8–10 minutes + 2 minutes Q&A**.

---

## 0) Opening (30–40 sec)

**Script:**

Good [morning/afternoon], everyone. We are Team **Churn Reaper**.

Our problem statement is simple but high-impact: telecom and subscription businesses lose revenue every month because churn signals are detected too late or are not actionable.

So we built an end-to-end system that answers 4 questions in one flow:
1. Who is likely to churn?
2. Why are they at risk?
3. What should we do next?
4. What is the financial impact in INR?

---

## 1) Problem & Business Value (50–60 sec)

**Script:**

Traditional churn dashboards often stop at a probability score. That is not enough for business teams.

Our system converts prediction into **decision support**:
- risk probability + risk band,
- feature-level explanation,
- AI/rule-based retention actions,
- static and dynamic ROI.

So instead of “this customer has 78% churn risk,” we provide “here is why, here are 3 actions, and here is the projected money impact.”

---

## 2) How churn prediction actually happens (Technical flow) (2 min)

**Script:**

Let me walk through the exact pipeline implemented in our code.

### 2.1 Training pipeline (`backend/train_model.py`)
- Dataset: `data/telco_churn.csv` with **7,043 rows**.
- Preprocessing:
  - drop customer ID columns,
  - convert `TotalCharges` to numeric,
  - map target `Churn` as Yes=1, No=0,
  - label-encode categorical columns.
- Train/test split: 80/20, stratified, `random_state=42`.
- Imbalance handling: **SMOTE** on training set.
- Model: **XGBoostClassifier** (`n_estimators=200`, `max_depth=6`, `learning_rate=0.1`).
- Artifacts saved:
  - `models/churn_model.pkl`
  - `models/label_encoders.pkl`
  - `models/feature_names.pkl`
  - `models/sample_data.pkl`

### 2.2 Inference pipeline (`backend/predict.py`)
- Frontend calls `POST /predict`.
- Backend:
  - loads model artifacts,
  - preprocesses incoming customer payload to exact training schema,
  - handles unseen category values safely,
  - predicts churn probability via `predict_proba`.

Risk mapping used in code:
- **LOW**: < 40%
- **MEDIUM**: 40–70%
- **HIGH**: > 70%

### 2.2A Super-simple pipeline flow (say this in demo)

**Script:**

Think of it like a production line:

1. **Input collection (Frontend Form)**
  - User enters customer fields like tenure, contract type, monthly charges, support/security usage.

2. **API call (`POST /predict`)**
  - Frontend sends JSON payload to FastAPI backend.

3. **Preprocessing (`predict.py::_preprocess_customer`)**
  - Convert numbers (`tenure`, `MonthlyCharges`, `TotalCharges`).
  - Encode categorical values using saved label encoders.
  - Reorder columns exactly as training feature order.

4. **Model scoring (`model.predict_proba`)**
  - XGBoost returns churn probability.
  - Example: probability = 0.82 → churn probability shown as **82%**.

5. **Risk band mapping (`_risk_band`)**
  - < 40: LOW, 40–70: MEDIUM, >70: HIGH.

6. **Explainability layer (`explainer.py`)**
  - SHAP computes feature-level contributions for this customer.
  - We get “which features pushed risk up/down”.

7. **Action layer (`recommendations.py`, `groq_explainer.py`)**
  - Generate retention offers (AI first, rules as fallback).
  - Generate human explanation text.

8. **Finance layer (ROI)**
  - Compute static ROI and dynamic ROI.
  - Show potential revenue at risk and projected savings in INR.

9. **Unified response to UI**
  - Frontend receives one response containing probability, risk, SHAP factors, recommendations, and ROI blocks.

### 2.2B Code-to-output mapping (very judge friendly)

**Script:**

- `backend/main.py` → receives request at `/predict`
- `backend/predict.py` → preprocessing + model inference + response assembly
- `backend/explainer.py` → SHAP values and feature importance
- `backend/groq_explainer.py` → natural-language explanation + AI strategy
- `backend/recommendations.py` → rule fallback + static/dynamic ROI
- `frontend/src/pages/Predict.jsx` → renders final business output cards

### 2.2C One-customer walkthrough (example narration)

**Script:**

Suppose a customer has:
- tenure = 4 months,
- month-to-month contract,
- monthly charges around ₹98,
- no tech support,
- no online security.

Pipeline result:
- model gives high churn probability,
- SHAP highlights contract + tenure + pricing/support factors,
- system proposes retention actions,
- ROI panels show if the retention spend is financially justified.

So prediction is not just a number — it becomes a complete decision package.

### 2.3 Explainability (`backend/explainer.py`)
- Uses **SHAP TreeExplainer**.
- Returns per-customer SHAP values and global feature importance.
- This gives transparent “why” behind every score.

---

## 3) AI layer + Recommendation engine (AI Usage) (1.5 min)

**Script:**

Our AI usage is not cosmetic. It is integrated into business output.

- `backend/groq_explainer.py` uses Groq LLM to generate:
  - plain-English churn explanation,
  - structured retention strategy (JSON offers),
  - executive summary text.
- We enforce risk-safe wording logic for LOW-risk profiles to avoid contradiction.
- INR currency context is enforced in prompts.

Critically, we designed fallback reliability:
- If LLM is unavailable or output is invalid, `backend/recommendations.py` falls back to deterministic business rules.

So the product remains usable and stable even without external AI runtime success.

---

## 4) Integration architecture (Integration criterion) (1 min)

**Script:**

This is a full-stack integrated system:
- **Frontend**: React + Vite + Tailwind + Recharts
- **Backend**: FastAPI + Python
- **ML**: XGBoost + SHAP
- **LLM**: Groq API (with graceful fallback)

Live API endpoints:
- `POST /predict`
- `GET /feature-importance`
- `GET /dashboard-summary`
- `GET /sample-customer`
- `GET /health`

Deployment integration:
- frontend on Vercel,
- backend on Render,
- CORS configured for cross-origin production requests.

---

## 5) Financial logic (ROI) (1 min)

**Script:**

We built two ROI modes:

### Static ROI
- CLV = MonthlyCharges × 24
- Revenue at Risk = CLV × Churn Probability
- Retention Cost = MonthlyCharges × 0.2 × 3
- ROI Ratio = Revenue at Risk / Retention Cost

### Dynamic ROI
- Starts from baseline churn probability,
- parses expected impact % from recommended actions,
- combines impacts multiplicatively,
- estimates action costs from textual offer details,
- returns adjusted churn, projected revenue saved, and dynamic ROI.

This ties ML prediction directly to business decision economics.

---

## 6) Dataset analysis: what is “cheap” vs “expensive”? (Data-backed answer) (1.5 min)

**Script:**

We analyzed `MonthlyCharges` and `TotalCharges` from our actual dataset.

### 6.1 MonthlyCharges distribution (7,043 customers)
- Min: **₹18.25**
- Mean: **₹64.76**
- Median: **₹70.35**
- Q1 (25th percentile): **₹35.50**
- Q3 (75th percentile): **₹89.85**
- P90: **₹102.60**
- Max: **₹118.75**

### 6.2 Practical pricing bands (based on quartiles)
- **Cheap:** ≤ ₹35.50
- **Moderate:** ₹35.50 to ₹89.85
- **Expensive:** > ₹89.85
- (Optional “Very Expensive” marker: > ₹102.60, i.e., top 10%)

### 6.3 Churn behavior by these bands
- Cheap band: 1,762 customers, churn rate **11.24%**
- Moderate band: 3,523 customers, churn rate **31.02%**
- Expensive band: 1,758 customers, churn rate **32.88%**

### 6.4 Why our rule uses ~₹70 threshold
In fallback recommendation rules, we mark high-bill pressure when `MonthlyCharges > 70`.
Data supports this:
- customers above ₹70: **50.87%**
- churn rate above ₹70: **35.36%**
- churn rate at/below ₹70: **17.40%**

So bill pressure is a strong churn signal in this dataset.

---

## 7) Model quality evidence (Technical Depth criterion) (40–50 sec)

**Script:**

Using the saved production model on a reproducible holdout split, we observed:
- **Accuracy:** 0.7736
- **Precision:** 0.5682
- **Recall:** 0.6123
- **F1:** 0.5894
- **AUC-ROC:** 0.8206

AUC above 0.82 is strong for this kind of churn problem, and explainability + ROI layers make it operationally useful.

---

## 8) Mapping to judging criteria (direct scoring narrative) (1.5 min)

> Based on visible criteria in the judging page screenshot.

### A) Technical Depth (20 pts)
**Script:**
- We implemented an end-to-end ML pipeline with preprocessing, class-imbalance correction via SMOTE, XGBoost training, saved inference artifacts, SHAP explainability, and ROI simulation logic.
- We also have robust API architecture and deterministic fallback behavior.

### B) AI Usage (20 pts)
**Script:**
- AI is integrated in explanation generation and retention strategy generation, not just a chatbot wrapper.
- Output is structured, constrained, and validated; plus risk-safe communication for LOW-risk users.

### C) Integration (15 pts)
**Script:**
- Multi-system integration across frontend, FastAPI backend, ML model artifacts, SHAP, and Groq.
- Production deployment with working cross-origin flow and health endpoints.

### D) Demo Quality (10 pts)
**Script:**
- Live demo shows: input → prediction → explanation → recommendations → static/dynamic ROI in one flow.
- The result is reproducible through documented endpoints and sample customer API.

### E) Innovation (10 pts)
**Script:**
- We combine predictive ML + explainability + generative recommendation + financial decisioning in one actionable interface.
- Dynamic ROI from recommendation text is a differentiator beyond standard churn dashboards.

---

## 9) Live demo script (60–90 sec)

**Script:**

Now I’ll run a quick demo:
1. Open Predict page.
2. Use sample customer autofill.
3. Run prediction.
4. Show churn probability + risk level.
5. Explain top SHAP drivers.
6. Show recommended actions.
7. Switch static ROI and dynamic ROI.
8. Conclude with projected savings and action priority.

---

## 10) Closing (20 sec)

**Script:**

To summarize: Churn Reaper does not stop at prediction. It delivers **explainable, action-ready, and ROI-linked** churn intelligence for real retention decisions.

Thank you.

---

## Quick Q&A cheat sheet (optional)

### Q1) Why XGBoost?
Because churn data is mixed numeric + categorical-encoded and XGBoost gives strong tabular performance with good probability outputs.

### Q2) How do you avoid black-box concerns?
SHAP provides local and global feature attribution, and we expose those values in API/UI.

### Q3) What if LLM fails?
System degrades gracefully to rule-based recommendations; core prediction and ROI still work.

### Q4) Why these pricing bands?
Bands are dataset-derived from quartiles (`Q1=₹35.50`, `Q3=₹89.85`) and supported by churn-rate separation.
