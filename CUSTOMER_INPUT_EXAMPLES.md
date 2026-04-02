# Customer Input Examples (Model-Calibrated)

This file gives **many practical customer input examples** and their expected outputs from the current model artifacts.

> Calibration note: values below are generated from the current model in `models/`. If you retrain (`train_model.py`), probabilities can shift.

## Risk mapping used by backend

From `backend/predict.py`:

- `LOW` if probability `< 40`
- `MEDIUM` if probability is `40` to `70`
- `HIGH` if probability `> 70`

---

## Base payload template (full input schema)

Use this as a starting point and apply scenario overrides.

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
  "MonthlyCharges": 75.0,
  "TotalCharges": 1800.0
}
```

---

## Master scenario catalog (25 examples)

| ID | Type | Key input highlights | Expected output |
|---|---|---|---|
| L1 | Loyal-Low | tenure 72, contract Two year, security/support Yes | **0.14% LOW** |
| L2 | Loyal-Low | tenure 60, contract One year, DSL, support Yes | **7.87% LOW** |
| L3 | Loyal-Low | tenure 65, InternetService No, contract Two year | **0.19% LOW** |
| M1 | Medium-Watch | tenure 18, month-to-month, fiber, support Yes | **24.37% LOW** |
| M2 | Medium-Watch | tenure 20, One year, monthly 98, support/security No | **72.62% HIGH** |
| M3 | Medium-Watch | senior 1, month-to-month, DSL, e-check | **98.37% HIGH** |
| H1 | High-Risk | tenure 2, month-to-month, fiber, no support/security | **97.57% HIGH** |
| H2 | High-Risk | tenure 4, monthly 110, month-to-month | **99.03% HIGH** |
| H3 | High-Risk | tenure 10, monthly 102, month-to-month | **97.37% HIGH** |
| H4 | High-Risk | tenure 6, monthly 118, streaming-heavy | **94.14% HIGH** |
| P1 | Payment-Compare | month-to-month, monthly 80, bank transfer | **96.43% HIGH** |
| P2 | Payment-Compare | same profile, electronic check | **96.40% HIGH** |
| I1 | Internet-Compare | DSL baseline | **92.93% HIGH** |
| I2 | Internet-Compare | Fiber baseline | **96.29% HIGH** |
| I3 | Internet-Compare | No internet baseline | **9.65% LOW** |
| C1 | Contract-Compare | Month-to-month | **94.69% HIGH** |
| C2 | Contract-Compare | One year | **36.95% LOW** |
| C3 | Contract-Compare | Two year | **14.91% LOW** |
| O1 | Outlier-Test | monthly 20000, two-year, no internet | **39.55% LOW** |
| S1 | Security-Compare | security No, support Yes | **75.16% HIGH** |
| S2 | Security-Compare | security Yes, support Yes | **40.33% MEDIUM** |
| T1 | TechSupport-Compare | support No, security Yes | **63.49% MEDIUM** |
| T2 | TechSupport-Compare | support Yes, security Yes | **40.33% MEDIUM** |
| N1 | New-Customer | tenure 1, month-to-month, no addons | **97.46% HIGH** |
| N2 | New-Customer | tenure 1, One year + support/security Yes | **8.41% LOW** |

---

## Dynamic ROI snapshots (live API check on 2026-04-02)

The examples below were tested against current `/predict` response format with both ROI outputs:

- `roi_data` (static ROI)
- `dynamic_roi_data` (recommendation-driven ROI)

> Important: Dynamic ROI can vary run-to-run when AI recommendation text changes (cost/duration/impact wording affects parsing).

| ID | Scenario | Churn / Risk | Static ROI | Dynamic ROI | Static Cost (₹) | Dynamic Cost (₹) | Adjusted Churn | Projected Savings (₹) |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| R1 | HighRisk_Baseline | 94.90% HIGH | 37.96x | 0.12x | 51.00 | 3894.00 | 72.22% | 462.66 |
| R2 | LowRisk_LongContract | 0.09% LOW | 0.04x | 0.00x | 12.00 | 6400.00 | 0.08% | 0.05 |
| R3 | MediumWatch | 40.33% MEDIUM | 16.13x | 0.83x | 52.80 | 303.36 | 28.38% | 252.30 |
| R4 | HighRisk_Expensive | 96.95% HIGH | 38.78x | 3.38x | 66.00 | 236.40 | 66.72% | 798.18 |

Interpretation shortcut:
- Static ROI = fixed baseline assumption (20% discount, 3 months)
- Dynamic ROI = recommendation text se parsed actual-ish cost/impact model

---

## Detailed examples by archetype (with input overrides)

Below, apply these overrides to the base payload.

### A) Loyal / protected customers

#### L1 — Very stable long-term customer

```json
{
  "tenure": 72,
  "Contract": "Two year",
  "MonthlyCharges": 89,
  "InternetService": "Fiber optic",
  "OnlineSecurity": "Yes",
  "TechSupport": "Yes",
  "OnlineBackup": "Yes",
  "DeviceProtection": "Yes",
  "PaymentMethod": "Bank transfer (automatic)",
  "Partner": "Yes"
}
```

Expected:
- Probability: **~0.14%**
- Risk: **LOW**
- Top factors observed: `tenure`, `Contract`, `OnlineSecurity` (all reducing risk)

#### L2 — Loyal but moderate package

```json
{
  "tenure": 60,
  "Contract": "One year",
  "MonthlyCharges": 55,
  "InternetService": "DSL",
  "OnlineSecurity": "Yes",
  "TechSupport": "Yes",
  "PaymentMethod": "Credit card (automatic)",
  "Partner": "Yes"
}
```

Expected:
- Probability: **~7.87%**
- Risk: **LOW**

#### N2 — New customer but protected by contract + support

```json
{
  "tenure": 1,
  "Contract": "One year",
  "MonthlyCharges": 70,
  "InternetService": "DSL",
  "OnlineSecurity": "Yes",
  "TechSupport": "Yes"
}
```

Expected:
- Probability: **~8.41%**
- Risk: **LOW**

---

### B) Medium watchlist customers

#### S2 — Security enabled, still month-to-month

```json
{
  "tenure": 30,
  "Contract": "Month-to-month",
  "MonthlyCharges": 88,
  "InternetService": "Fiber optic",
  "OnlineSecurity": "Yes",
  "TechSupport": "Yes"
}
```

Expected:
- Probability: **~40.33%**
- Risk: **MEDIUM**

#### T1 — Same profile but support removed

```json
{
  "tenure": 30,
  "Contract": "Month-to-month",
  "MonthlyCharges": 88,
  "InternetService": "Fiber optic",
  "OnlineSecurity": "Yes",
  "TechSupport": "No"
}
```

Expected:
- Probability: **~63.49%**
- Risk: **MEDIUM**

---

### C) High-risk customers

#### H1 — New + month-to-month + no support

```json
{
  "tenure": 2,
  "Contract": "Month-to-month",
  "MonthlyCharges": 95,
  "InternetService": "Fiber optic",
  "OnlineSecurity": "No",
  "TechSupport": "No"
}
```

Expected:
- Probability: **~97.57%**
- Risk: **HIGH**

#### H2 — Very expensive early-tenure account

```json
{
  "tenure": 4,
  "Contract": "Month-to-month",
  "MonthlyCharges": 110,
  "InternetService": "Fiber optic",
  "OnlineSecurity": "No",
  "TechSupport": "No",
  "PaymentMethod": "Electronic check"
}
```

Expected:
- Probability: **~99.03%**
- Risk: **HIGH**

#### N1 — Brand-new customer with weak retention signals

```json
{
  "tenure": 1,
  "Contract": "Month-to-month",
  "MonthlyCharges": 70,
  "InternetService": "DSL",
  "OnlineSecurity": "No",
  "TechSupport": "No"
}
```

Expected:
- Probability: **~97.46%**
- Risk: **HIGH**

---

### D) Contract effect examples

These are especially useful for business teams.

#### C1 — Month-to-month

```json
{
  "tenure": 24,
  "Contract": "Month-to-month",
  "MonthlyCharges": 85,
  "InternetService": "Fiber optic",
  "OnlineSecurity": "No",
  "TechSupport": "No"
}
```

Expected: **~94.69% HIGH**

#### C2 — One-year

```json
{
  "tenure": 24,
  "Contract": "One year",
  "MonthlyCharges": 85,
  "InternetService": "Fiber optic",
  "OnlineSecurity": "No",
  "TechSupport": "No"
}
```

Expected: **~36.95% LOW**

#### C3 — Two-year

```json
{
  "tenure": 24,
  "Contract": "Two year",
  "MonthlyCharges": 85,
  "InternetService": "Fiber optic",
  "OnlineSecurity": "No",
  "TechSupport": "No"
}
```

Expected: **~14.91% LOW**

---

### E) Internet-service effect examples

#### I1 — DSL

```json
{
  "tenure": 24,
  "Contract": "Month-to-month",
  "MonthlyCharges": 72,
  "InternetService": "DSL",
  "OnlineSecurity": "No",
  "TechSupport": "No"
}
```

Expected: **~92.93% HIGH**

#### I2 — Fiber optic

```json
{
  "tenure": 24,
  "Contract": "Month-to-month",
  "MonthlyCharges": 92,
  "InternetService": "Fiber optic",
  "OnlineSecurity": "No",
  "TechSupport": "No"
}
```

Expected: **~96.29% HIGH**

#### I3 — No internet service

```json
{
  "tenure": 24,
  "Contract": "Month-to-month",
  "MonthlyCharges": 25,
  "InternetService": "No",
  "OnlineSecurity": "No internet service",
  "TechSupport": "No internet service",
  "OnlineBackup": "No internet service",
  "DeviceProtection": "No internet service",
  "StreamingTV": "No internet service",
  "StreamingMovies": "No internet service"
}
```

Expected: **~9.65% LOW**

---

### F) Outlier / edge behavior

#### O1 — Out-of-distribution price input

```json
{
  "tenure": 21,
  "Contract": "Two year",
  "MonthlyCharges": 20000,
  "InternetService": "No",
  "OnlineSecurity": "Yes",
  "TechSupport": "Yes"
}
```

Expected:
- Probability: **~39.55%**
- Risk: **LOW** (close to threshold)

Interpretation:
- Very large unrealistic values can produce non-intuitive combinations. Treat such inputs as stress tests, not normal customer profiles.

---

## Practical usage guidance

- For product QA, focus on **risk band + explanation consistency**, not exact decimal probability.
- For financial QA, compare **Static ROI vs Dynamic ROI** for same payload using ROI toggle.
- After model retraining, re-run these scenarios and refresh this document.
- Keep `TotalCharges ≈ tenure × MonthlyCharges` for realistic testing.
