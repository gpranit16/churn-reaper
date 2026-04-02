# Churn Predictor — Simple Guide (Non-Technical)

This guide is for business users, managers, and anyone non-technical.

---

## 1) What this project does

This app helps you answer one question:

**"Will this customer likely leave us?"**

It gives you:

- Churn chance in %
- Risk level (LOW / MEDIUM / HIGH)
- Simple explanation in plain text
- Recommended actions to retain the customer
- Financial impact (ROI)

---

## 2) What each page does

### Predict page

Use this page for one customer at a time.

You enter customer details, click **Run Prediction**, and get:

- risk score
- explanation
- top factors affecting churn (chart)
- action recommendations
- ROI metrics

### Dashboard page

Use this page for summary view.

You get:

- total customer snapshot
- risk segments
- top churn drivers
- business summary

---

## 3) Understanding the result in simple words

### Churn Probability

Example: `82%` means high chance the customer may churn.

### Risk Levels

- **LOW**: less than 40%
- **MEDIUM**: 40% to 70%
- **HIGH**: above 70%

### SHAP Factors chart

This chart tells which fields pushed risk up or down.

- Red side / positive effect = increases churn risk
- Green side / negative effect = reduces churn risk

---

## 4) Static ROI vs Dynamic ROI

### Static ROI

This is the old baseline model:

- same assumption for all customers
- fixed 20% discount for 3 months

Good for quick benchmark.

### Dynamic ROI

This is smarter and recommendation-based:

- reads suggested action impact
- reads cost and duration from recommendation text
- recalculates churn + financial impact

Good for real business planning.

### Important

Both are useful:

- Static = benchmark
- Dynamic = practical scenario

---

## 5) Why ROI may look different across customers

Because customer profile and recommended actions are different.

If suggested actions are expensive, Dynamic ROI can be lower.
That is normal and expected.

---

## 6) What to do if numbers look wrong

1. Check if backend is running
2. Run prediction again
3. Make sure customer data is realistic
4. Refresh page
5. If still old values show, restart backend server

---

## 7) One-minute summary for leadership

- This system predicts churn risk per customer.
- It explains the reason in simple language.
- It suggests retention actions.
- It shows financial impact in INR.
- You can compare Static ROI vs Dynamic ROI before taking action.
