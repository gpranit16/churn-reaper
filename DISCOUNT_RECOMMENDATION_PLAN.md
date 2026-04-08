# Post-Prediction Discount Recommendation Plan (Judge-Ready)

Use this plan **after `Run Prediction`** to answer:  
1) what discount to offer,  
2) when to offer it,  
3) how we justify static ROI assumptions.

---

## 1) Why this plan exists

Your model gives:
- `churn_probability`
- `risk_level` (LOW / MEDIUM / HIGH)
- customer profile fields (`MonthlyCharges`, `Contract`, `tenure`, `TechSupport`, etc.)

This playbook converts that output into **discount action + business justification**.

---

## 2) Dataset-backed price bands (INR)

From `data/telco_churn.csv`:
- Q1 MonthlyCharges: **₹35.50**
- Median MonthlyCharges: **₹70.35**
- Q3 MonthlyCharges: **₹89.85**
- P90 MonthlyCharges: **₹102.60**

### Practical segments
- **Cheap:** `<= ₹35.50`
- **Moderate:** `₹35.50 to ₹89.85`
- **Expensive:** `> ₹89.85`
- **Very Expensive (optional):** `> ₹102.60`

### Churn rates by band (dataset)
- Cheap: **11.24%**
- Moderate: **31.02%**
- Expensive: **32.88%**

This is why aggressive retention is focused more on higher-charge customers.

---

## 3) Discount decision matrix (after prediction)

## A) LOW risk (`churn_probability < 40`)
**Goal:** protect margin, avoid unnecessary discounting.

- Cheap: **0% discount** (use value-add only)
- Moderate: **0–5% for 1 month** only if competitor threat exists
- Expensive: **5% for 1 month max**, preferably non-cash perks

Preferred offers:
- free support onboarding
- service quality check
- add-on trial

---

## B) MEDIUM risk (`40–70`)
**Goal:** targeted incentive with controlled cost.

- Cheap: **5% × 2 months**
- Moderate: **10% × 2 months**
- Expensive: **12–15% × 2 months**

Escalate to upper bound when:
- `Contract = Month-to-month`
- `TechSupport = No`
- `OnlineSecurity = No`

---

## C) HIGH risk (`> 70`)
**Goal:** prevent churn now, then lock retention.

- Cheap: **10% × 3 months** + annual-plan migration push
- Moderate: **15% × 3 months** + annual-plan migration push
- Expensive: **20% × 3 months** baseline
- Very Expensive and very high risk (`>85`) with low tenure (`<6`): **25% × 3 months cap** with manager approval

Always bundle with:
- contract conversion incentive,
- proactive support,
- service quality intervention.

---

## 4) Rule triggers from your current codebase

Your fallback recommendation logic already aligns with this:
- `Contract == Month-to-month` → annual plan discount offer
- `MonthlyCharges > 70` → bundle savings offer
- `TechSupport == No` → free support trial
- `tenure < 12` → proactive account manager
- `OnlineSecurity == No` → security add-on offer

So this matrix is not theoretical — it matches current implementation behavior.

---

## 5) Static ROI defense (for judge questions)

Current static ROI formula in code:
- `CLV = MonthlyCharges × 24`
- `Revenue at Risk = CLV × (churn_probability/100)`
- `Retention Cost = MonthlyCharges × 0.2 × 3`

So static mode assumes **20% discount for 3 months** (baseline policy).

### Why this is valid
1. It provides a consistent baseline across customers.
2. It approximates a common telecom retention offer structure.
3. It is intentionally simple for fast decision support.
4. Dynamic ROI exists to replace this with offer-specific costs/impacts.

### Cost intuition under static mode
Retention cost per customer = `0.6 × MonthlyCharges`

- At Q1 (₹35.50): **₹21.30**
- At Median (₹70.35): **₹42.21**
- At Q3 (₹89.85): **₹53.91**
- At P90 (₹102.60): **₹61.56**

This helps explain “how much discount spend” is assumed in static mode.

---

## 6) Operational guardrails (recommended)

- Hard cap: no discount above **25%** without approval.
- Do not offer >5% discount for LOW risk unless strategic account.
- Prioritize non-cash interventions before discount for cheap segment.
- For expensive + high-risk segment, include service quality and support actions (not discount only).
- Re-check customer after 30 days; downgrade discount if risk reduces.

---

## 7) 30-second answer for judges (ready-to-speak)

"After prediction, we don’t give the same discount to everyone. We segment by risk and billing band from our dataset. Cheap customers mostly get non-cash retention or minimal discounts, medium-risk gets controlled 5–15% offers, and high-risk expensive customers get stronger 20% 3-month interventions with a cap and approval flow. Our static ROI uses a baseline 20% for 3 months for consistency, and dynamic ROI refines this using recommendation-specific impact and cost, so we have both simplicity and realism." 

---

## 8) Quick mapping table (presentation slide friendly)

| Risk | Cheap (<=₹35.50) | Moderate (₹35.50–₹89.85) | Expensive (>₹89.85) |
|---|---:|---:|---:|
| LOW (<40) | 0% | 0–5% x 1 mo | 5% x 1 mo |
| MEDIUM (40–70) | 5% x 2 mo | 10% x 2 mo | 12–15% x 2 mo |
| HIGH (>70) | 10% x 3 mo | 15% x 3 mo | 20% x 3 mo (up to 25% with approval) |

