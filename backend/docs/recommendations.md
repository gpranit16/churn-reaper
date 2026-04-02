# `recommendations.py` — action engine + static/dynamic ROI math (what + why)

Source: `backend/recommendations.py`

## Brief (why this file exists)

Prediction alone churn reduce nahi karta. This module converts risk into concrete retention actions and business-impact financial estimates.

## Brief (what this file does)

- Chooses risk band from probability
- Tries AI-generated offers first
- Falls back to deterministic business rules if AI path fails
- Calculates **Static ROI** (legacy baseline)
- Calculates **Dynamic ROI** (recommendation-driven)

## Detailed behavior

### `_risk_level(churn_probability)`

- `> 70` => `HIGH`
- `>= 40` => `MEDIUM`
- otherwise => `LOW`

### `get_recommendations(customer_data, shap_values, churn_probability)`

1. Derives risk level
2. Calls `generate_retention_strategy(...)` from `groq_explainer.py`
3. If AI returns valid offers, uses them directly
4. Otherwise applies rule-based fallback offers

Current fallback rules include contract upgrade, bundle discount, free support trial, security add-on, service quality checks, etc.

### `calculate_roi(monthly_charges, churn_probability, tenure)` (Static ROI)

Legacy baseline formulas (unchanged):

- `clv = monthly_charges * 24`
- `revenue_at_risk = clv * (churn_probability / 100)`
- `retention_cost = monthly_charges * 0.2 * 3`
- `roi_ratio = revenue_at_risk / retention_cost`

Returns static baseline:
- `clv`, `revenue_at_risk`, `retention_cost`, `roi_ratio`

### `calculate_dynamic_roi(...)` (new)

Dynamic ROI recommendation text se parse karke financials recalculate karta hai.

#### Parsing helpers used

- `_parse_expected_impact_percent(...)`
	- `25%` => `25`
	- `10-15%` => midpoint `12.5`
	- missing => default `6%`

- `_extract_duration_months(...)`
	- reads text like `for 3 months`
	- missing => default `3` months

- `_extract_inr_amounts(...)`
	- reads `₹`, `INR`, `Rs` amounts

- `_estimate_offer_cost(...)`
	- `free/no cost` => `0`
	- quoted monthly amount + duration => monthly total
	- quoted one-time amount => one-time total
	- no quoted cost => fallback estimate:
		- `monthly_charges * 0.08 * duration`

#### Combined-impact churn adjustment

For each offer:

- `impact_fraction = impact_percent / 100`
- `remaining_ratio *= (1 - impact_fraction)`

Then:

- `adjusted_churn_probability = baseline_churn_probability * remaining_ratio`
- `dynamic_revenue_at_risk = clv * adjusted_churn_probability / 100`
- `projected_revenue_saved = baseline_revenue_at_risk - dynamic_revenue_at_risk`
- `dynamic_roi_ratio = projected_revenue_saved / dynamic_retention_cost`

#### Dynamic ROI return fields

- `clv`
- `revenue_at_risk`
- `retention_cost`
- `roi_ratio`
- `baseline_revenue_at_risk`
- `projected_revenue_saved`
- `baseline_churn_probability`
- `adjusted_churn_probability`
- `combined_expected_impact`
- `recommendations_considered`
- `default_duration_months`
- `offer_breakdown`

## Why this design is useful

- AI-first makes actions more context-aware.
- Rule fallback guarantees non-empty recommendations.
- Static ROI stays stable as baseline KPI.
- Dynamic ROI gives recommendation-aware scenario analysis for business teams.
