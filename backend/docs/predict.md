# `predict.py` in Simple English

Source: `backend/predict.py`

This file is the main brain of single-customer prediction.

When frontend sends customer data, this file does everything and sends one final response back.

---

## What this file does

1. Reads saved ML model files from `models/`
2. Cleans and formats customer input
3. Calculates churn probability
4. Converts probability into risk label
5. Gets SHAP factor values (why model predicted this)
6. Builds plain-language reason (AI or fallback)
7. Builds recommendations (AI or fallback)
8. Calculates **Static ROI**
9. Calculates **Dynamic ROI**
10. Returns one combined JSON response

---

## Risk labels used

- `LOW` = probability < 40
- `MEDIUM` = probability between 40 and 70
- `HIGH` = probability > 70

---

## Why preprocessing is needed

User input can come in different formats. This file standardizes input so it matches model training format.

Example:

- converts text yes/no where needed
- makes sure numeric fields are numbers
- applies saved encoders
- keeps exact same feature order as training

This avoids prediction errors.

---

## Response fields returned by `/predict`

- `churn_probability`
- `risk_level`
- `risk_color`
- `churn_explanation`
- `shap_values`
- `recommendations`
- `roi_data` (Static ROI)
- `dynamic_roi_data` (Dynamic ROI)

---

## Why this design is good

Frontend gets all required data in one API call.

That makes UI faster to build and easier to maintain.
