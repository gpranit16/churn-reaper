# How Churn Prediction Works + How Each Field Affects Probability

This document explains:

1. **How the current churn pipeline works end-to-end**
2. **How input fields (including InternetService and related fields) influence churn probability**

All observations below are aligned with the current backend code and model artifacts.

---

## 1) End-to-end system flow (current implementation)

## A. API layer (`backend/main.py`)

- `POST /predict` -> calls `predict.predict_churn(...)`
- `GET /feature-importance` -> global SHAP ranking
- `GET /dashboard-summary` -> deterministic summary + analytics snapshot
- `GET /sample-customer` -> demo payload
- `GET /health` -> readiness

## B. Prediction orchestrator (`backend/predict.py`)

For each customer input:

1. Load cached artifacts (`churn_model.pkl`, `label_encoders.pkl`, `feature_names.pkl`)
2. Preprocess/encode input
3. Run `predict_proba`
4. Assign risk band
5. Compute SHAP local explanation (`explainer.py`)
6. Generate natural-language reason (Groq; fallback if needed)
7. Generate recommendations (Groq-first, fallback rules)
8. Compute static ROI metrics (`roi_data`)
9. Compute dynamic ROI metrics from recommendations (`dynamic_roi_data`)
10. Return one merged response object

## C. Explainability (`backend/explainer.py`)

- Global importance: mean absolute SHAP over sample background
- Local explanation: per-feature SHAP contribution for one row

## D. LLM layer (`backend/groq_explainer.py`)

- Uses `GROQ_MODEL_NAME` (default `llama-3.1-8b-instant`)
- Timeout/retry controlled by env
- Fallback logic prevents endpoint failure when Groq is unavailable

## E. Action + ROI (`backend/recommendations.py`)

- AI recommendations first
- Deterministic rule fallback always available
- Static ROI outputs: `clv`, `revenue_at_risk`, `retention_cost`, `roi_ratio`
- Dynamic ROI outputs additionally include:
  - `adjusted_churn_probability`
  - `combined_expected_impact`
  - `projected_revenue_saved`
  - `offer_breakdown`

---

## 2) Risk-band logic (this resolves the common confusion)

From current code:

- `LOW` if probability `< 40`
- `MEDIUM` if probability is `40..70`
- `HIGH` if probability `> 70`

So examples like `28.05%` with `LOW` are valid and expected.

---

## 3) What drives this model globally (current SHAP ranking)

Top global features from current artifacts:

| Rank | Feature | Importance |
|---|---|---:|
| 1 | Contract | 1.0378 |
| 2 | MonthlyCharges | 0.9734 |
| 3 | tenure | 0.6108 |
| 4 | InternetService | 0.5000 |
| 5 | OnlineSecurity | 0.3702 |
| 6 | TotalCharges | 0.3331 |
| 7 | OnlineBackup | 0.2948 |
| 8 | TechSupport | 0.2911 |
| 9 | PaymentMethod | 0.1915 |
| 10 | StreamingTV | 0.1831 |

Interpretation:
- **Contract**, **price**, and **tenure** are the dominant signals in this trained model.

---

## 4) Field impact analysis methodology

To explain field effects concretely, a **controlled one-variable-at-a-time sweep** was run using this baseline profile:

```json
{
  "gender": "Female",
  "SeniorCitizen": 0,
  "Partner": "No",
  "Dependents": "No",
  "tenure": 24,
  "PhoneService": "Yes",
  "MultipleLines": "No",
  "InternetService": "DSL",
  "OnlineSecurity": "No",
  "OnlineBackup": "No",
  "DeviceProtection": "No",
  "TechSupport": "No",
  "StreamingTV": "No",
  "StreamingMovies": "No",
  "Contract": "Month-to-month",
  "PaperlessBilling": "Yes",
  "PaymentMethod": "Electronic check",
  "MonthlyCharges": 80,
  "TotalCharges": 1920
}
```

Baseline output: **96.4% (HIGH)**.

> Important: effects below are local to this baseline profile. Direction/magnitude can change for other profiles because tree models are interaction-heavy.

---

## 5) How each input field affects probability (observed)

## A) Demographics / household fields

| Field | Value change | Probability | Delta vs baseline | Practical meaning |
|---|---|---:|---:|---|
| gender | Female -> Male | 94.63 | -1.77 | Small effect in this model |
| SeniorCitizen | 0 -> 1 | 94.15 | -2.25 | Mild effect, not dominant |
| Partner | No -> Yes | 90.58 | -5.82 | Partner presence lowered risk in this profile |
| Dependents | No -> Yes | 92.21 | -4.19 | Dependents lowered risk slightly |

## B) Tenure and contract fields (major drivers)

| Field | Value change | Probability | Delta | Interpretation |
|---|---|---:|---:|---|
| tenure | 24 -> 1 | 98.60 | +2.20 | Very new users are riskier |
| tenure | 24 -> 72 | 73.20 | -23.20 | Long tenure reduces risk strongly |
| Contract | Month-to-month -> One year | 44.19 | -52.21 | Big risk drop |
| Contract | Month-to-month -> Two year | 20.96 | -75.44 | Very large risk drop |

## C) Internet + service add-on fields

| Field | Value change | Probability | Delta | Interpretation |
|---|---|---:|---:|---|
| InternetService | DSL -> Fiber optic | 82.03 | -14.37 | Profile-specific reduction here |
| InternetService | DSL -> No | 69.81 | -26.59 | No internet reduced risk strongly in this setup |
| OnlineSecurity | No -> Yes | 78.90 | -17.50 | Security add-on lowers risk |
| OnlineBackup | No -> Yes | 91.85 | -4.55 | Backup lowers risk modestly |
| DeviceProtection | No -> Yes | 85.79 | -10.61 | Device protection lowers risk |
| TechSupport | No -> Yes | 83.87 | -12.53 | Support lowers risk clearly |
| StreamingTV | No -> Yes | 90.20 | -6.20 | Mild lowering in this baseline |
| StreamingMovies | No -> Yes | 84.68 | -11.72 | Lowering in this baseline |

### About `No internet service` variants

For fields like `OnlineSecurity`, `TechSupport`, etc., passing `No internet service` with an inconsistent baseline can increase risk in local tests. This is an interaction artifact, not a universal business rule.

Best practice:
- Keep dependent fields consistent with `InternetService` when doing scenario tests.

## D) Billing and payment fields

| Field | Value change | Probability | Delta | Interpretation |
|---|---|---:|---:|---|
| MonthlyCharges | 80 -> 20 | 60.01 | -36.39 | Lower price cuts risk a lot |
| MonthlyCharges | 80 -> 120 | 99.72 | +3.32 | Higher price pushes risk up |
| PaymentMethod | Electronic check -> Mailed check | 80.46 | -15.94 | Payment-method signal is meaningful |
| PaymentMethod | Electronic check -> Bank transfer | 96.43 | +0.03 | Near neutral in this profile |
| PaperlessBilling | Yes -> No | 96.63 | +0.23 | Very small effect |

## E) TotalCharges field

| Value change | Probability | Delta | Interpretation |
|---|---:|---:|---|
| 1920 -> 100 | 97.38 | +0.98 | Small local effect |
| 1920 -> 8000 | 97.16 | +0.76 | Small local effect |

`TotalCharges` acts partly as a cumulative proxy (tenure × monthly charges), so its marginal impact alone is often smaller than `Contract`, `MonthlyCharges`, and `tenure`.

---

## 6) Practical interpretation rules for business users

- **Most powerful churn reducers in this model**:
  - longer contract term
  - longer tenure
  - lowering effective monthly burden
  - enabling support/security add-ons

- **Highest risk pattern**:
  - short tenure + month-to-month + high monthly charges + low service add-on adoption

- **Do not over-interpret one field in isolation**:
  - the model is non-linear and interaction-driven.

---

## 7) Why predictions may look surprising sometimes

1. Out-of-distribution inputs (e.g., `MonthlyCharges = 20000`) can produce non-intuitive outcomes.
2. Some fields are encoded categorically; effect depends on learned splits, not human intuition alone.
3. Risk labels use fixed thresholds, so probability near `40` or `70` can switch class with small input changes.

---

## 8) Dynamic ROI (new) — practical explanation

Dynamic ROI recommendation text se cost + duration + impact parse karta hai, then churn probability ko recalculate karta hai.

Current implementation highlights:

1. `expected_impact` parse hota hai (`10-15%` -> midpoint `12.5%`)
2. Duration parse hoti hai (`for 3 months`), missing ho to default `3` months
3. INR cost parse hoti hai (`₹`, `INR`, `Rs`)
4. `free/no cost` offers ko zero-cost treat kiya jata hai
5. Cost na mile to fallback estimate use hota hai:
  - `monthly_charges * 0.08 * duration`
6. Combined impact multiplicative apply hota hai to get adjusted churn

Frontend behavior:
- Left panel mein ROI toggle hai: `Static ROI` / `Dynamic ROI`
- Financial Impact card selected mode ke according values switch karta hai

---

## 9) Repro tip

After retraining the model, regenerate:

- scenario outputs (`CUSTOMER_INPUT_EXAMPLES.md`)
- field sensitivity values (this file)

so documentation remains aligned with the active artifacts.
