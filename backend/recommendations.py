from __future__ import annotations

import re
from typing import Any

from groq_explainer import generate_retention_strategy

DEFAULT_DYNAMIC_DURATION_MONTHS = 3.0
DEFAULT_DYNAMIC_IMPACT_PERCENT = 6.0
DEFAULT_ESTIMATED_COST_FACTOR = 0.08


def _risk_level(churn_probability: float) -> str:
    if churn_probability > 70:
        return "HIGH"
    if churn_probability >= 40:
        return "MEDIUM"
    return "LOW"


def _safe_float(value: Any, default: float = 0.0) -> float:
    try:
        if isinstance(value, str) and not value.strip():
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def _clamp(value: float, min_value: float, max_value: float) -> float:
    return max(min_value, min(max_value, value))


def _extract_duration_months(text: str, default_months: float = DEFAULT_DYNAMIC_DURATION_MONTHS) -> float:
    if not text:
        return float(default_months)

    match = re.search(r"(\d+(?:\.\d+)?)\s*(?:months?|mos?|mo)\b", text, re.IGNORECASE)
    if not match:
        return float(default_months)

    return max(float(match.group(1)), 1.0)


def _extract_inr_amounts(text: str) -> list[float]:
    if not text:
        return []

    values: list[float] = []
    patterns = [
        r"₹\s*([\d,]+(?:\.\d+)?)",
        r"\b(?:inr|rs\.?)\s*([\d,]+(?:\.\d+)?)",
    ]

    for pattern in patterns:
        for raw in re.findall(pattern, text, flags=re.IGNORECASE):
            try:
                values.append(float(str(raw).replace(",", "")))
            except (TypeError, ValueError):
                continue

    return values


def _parse_expected_impact_percent(
    expected_impact: Any,
    default_percent: float = DEFAULT_DYNAMIC_IMPACT_PERCENT,
) -> float:
    text = str(expected_impact or "").strip()
    if not text:
        return default_percent

    percent_values = re.findall(r"(\d+(?:\.\d+)?)\s*%", text)
    numeric_values = percent_values or re.findall(r"(\d+(?:\.\d+)?)", text)
    if not numeric_values:
        return default_percent

    numbers = [float(item) for item in numeric_values]
    if len(numbers) >= 2 and ("-" in text or "to" in text.lower()):
        impact = (numbers[0] + numbers[1]) / 2.0
    else:
        impact = numbers[0]

    return _clamp(impact, 0.0, 90.0)


def _estimate_offer_cost(
    offer: dict[str, Any],
    monthly_charges: float,
    default_duration_months: float = DEFAULT_DYNAMIC_DURATION_MONTHS,
) -> tuple[float, float, str]:
    title = str(offer.get("offer_title", ""))
    detail = str(offer.get("offer_detail", ""))
    reason = str(offer.get("business_reason", ""))
    combined_text = f"{title} {detail} {reason}".strip()
    combined_lower = combined_text.lower()

    duration_months = _extract_duration_months(combined_text, default_duration_months)

    if any(token in combined_lower for token in ["no cost", "at no cost", "free", "complimentary"]):
        return 0.0, duration_months, "free_offer"

    quoted_amounts = _extract_inr_amounts(combined_text)
    if not quoted_amounts:
        estimated_cost = max(monthly_charges, 0.0) * DEFAULT_ESTIMATED_COST_FACTOR * duration_months
        return round(estimated_cost, 2), duration_months, "estimated_default"

    quoted_amount = quoted_amounts[0]
    has_monthly_hint = any(token in combined_lower for token in ["/month", "per month", "monthly"])
    has_duration_hint = bool(
        re.search(r"\bfor\s+\d+(?:\.\d+)?\s*(?:months?|mos?|mo)\b", combined_lower)
    )

    if has_monthly_hint or has_duration_hint:
        total_cost = quoted_amount * duration_months
        return round(total_cost, 2), duration_months, "quoted_monthly"

    return round(quoted_amount, 2), duration_months, "quoted_one_time"


def get_recommendations(
    customer_data: dict[str, Any],
    shap_values: dict[str, float],
    churn_probability: float,
) -> list[dict[str, str]]:
    """Get AI recommendations first; fallback to business rules if AI is unavailable."""
    risk_level = _risk_level(float(churn_probability))

    try:
        ai_offers = generate_retention_strategy(
            customer_data=customer_data,
            churn_probability=float(churn_probability),
            shap_values=shap_values,
            risk_level=risk_level,
        )
        if ai_offers:
            return ai_offers
    except Exception:
        # Graceful fallback to deterministic rule-based recommendations
        pass

    offers: list[dict[str, str]] = []

    if customer_data.get("Contract") == "Month-to-month":
        offers.append(
            {
                "offer_title": "Switch to Annual Plan",
                "offer_detail": "Offer a 20% discount for moving to a 12-month contract.",
                "business_reason": "Longer contracts reduce churn by increasing commitment and stability.",
                "expected_impact": "15-20%",
                "urgency": "HIGH",
            }
        )

    if float(customer_data.get("MonthlyCharges", 0) or 0) > 70:
        offers.append(
            {
                "offer_title": "Bundle Savings Deal",
                "offer_detail": "Provide a bundled package with 15% monthly discount for 3 months.",
                "business_reason": "High-bill customers are price-sensitive; reducing bill shock improves retention.",
                "expected_impact": "10-15%",
                "urgency": "HIGH",
            }
        )

    if customer_data.get("TechSupport") == "No":
        offers.append(
            {
                "offer_title": "Free Tech Support Trial",
                "offer_detail": "Give 3 months of premium technical support at no cost.",
                "business_reason": "Support adoption improves customer experience and lowers service frustration.",
                "expected_impact": "8-12%",
                "urgency": "MEDIUM",
            }
        )

    if float(customer_data.get("tenure", 0) or 0) < 12:
        offers.append(
            {
                "offer_title": "Dedicated Account Manager",
                "offer_detail": "Assign a dedicated onboarding/account manager for proactive check-ins.",
                "business_reason": "Early-tenure customers are most volatile; proactive engagement reduces early churn.",
                "expected_impact": "12-18%",
                "urgency": "HIGH",
            }
        )

    if customer_data.get("OnlineSecurity") == "No":
        offers.append(
            {
                "offer_title": "Free Security Add-on",
                "offer_detail": "Provide online security service free for 6 months.",
                "business_reason": "Security add-ons increase perceived value and stickiness.",
                "expected_impact": "7-10%",
                "urgency": "MEDIUM",
            }
        )

    if customer_data.get("InternetService") == "Fiber optic":
        offers.append(
            {
                "offer_title": "Service Quality Check",
                "offer_detail": "Run a proactive line-quality audit and optimize network performance.",
                "business_reason": "Fiber customers often churn due to reliability/performance issues.",
                "expected_impact": "9-14%",
                "urgency": "HIGH",
            }
        )

    if not offers:
        offers.append(
            {
                "offer_title": "Customer Satisfaction Call",
                "offer_detail": "Schedule a personalized satisfaction call with tailored next-best offer.",
                "business_reason": "Direct human intervention can identify hidden pain points before cancellation.",
                "expected_impact": "5-8%",
                "urgency": "MEDIUM",
            }
        )

    return offers


def calculate_roi(
    monthly_charges: float,
    churn_probability: float,
    tenure: float,
) -> dict[str, float]:
    """Calculate simple retention ROI metrics."""
    monthly_charges = float(monthly_charges or 0)
    churn_probability = float(churn_probability or 0)
    _ = float(tenure or 0)  # retained for future extensions/segmentation

    clv = monthly_charges * 24  # 2-year estimate
    revenue_at_risk = clv * (churn_probability / 100)
    retention_cost = monthly_charges * 0.2 * 3  # 3 months, 20% discount
    roi_ratio = (revenue_at_risk / retention_cost) if retention_cost else 0.0

    return {
        "clv": round(clv, 2),
        "revenue_at_risk": round(revenue_at_risk, 2),
        "retention_cost": round(retention_cost, 2),
        "roi_ratio": round(roi_ratio, 2),
    }


def calculate_dynamic_roi(
    monthly_charges: float,
    churn_probability: float,
    tenure: float,
    recommendations: list[dict[str, Any]] | None,
    default_duration_months: float = DEFAULT_DYNAMIC_DURATION_MONTHS,
) -> dict[str, Any]:
    baseline_roi = calculate_roi(monthly_charges, churn_probability, tenure)

    clv = float(baseline_roi.get("clv", 0.0))
    baseline_revenue_at_risk = float(baseline_roi.get("revenue_at_risk", 0.0))
    baseline_churn_probability = _clamp(_safe_float(churn_probability), 0.0, 100.0)
    normalized_monthly_charges = _safe_float(monthly_charges)

    remaining_probability_ratio = 1.0
    total_retention_cost = 0.0
    offer_breakdown: list[dict[str, Any]] = []

    for index, offer in enumerate(recommendations or []):
        if not isinstance(offer, dict):
            continue

        impact_percent = _parse_expected_impact_percent(offer.get("expected_impact", ""))
        impact_fraction = impact_percent / 100.0
        remaining_probability_ratio *= (1.0 - impact_fraction)

        offer_cost, duration_months, cost_source = _estimate_offer_cost(
            offer=offer,
            monthly_charges=normalized_monthly_charges,
            default_duration_months=default_duration_months,
        )
        total_retention_cost += offer_cost

        offer_breakdown.append(
            {
                "offer_title": str(offer.get("offer_title", f"Offer {index + 1}")),
                "impact_percent": round(impact_percent, 2),
                "duration_months": round(duration_months, 2),
                "cost": round(offer_cost, 2),
                "cost_source": cost_source,
            }
        )

    adjusted_churn_probability = _clamp(
        baseline_churn_probability * remaining_probability_ratio,
        0.0,
        100.0,
    )
    combined_expected_impact = _clamp(
        baseline_churn_probability - adjusted_churn_probability,
        0.0,
        100.0,
    )

    dynamic_revenue_at_risk = round(clv * (adjusted_churn_probability / 100.0), 2)
    projected_revenue_saved = round(
        max(baseline_revenue_at_risk - dynamic_revenue_at_risk, 0.0),
        2,
    )
    total_retention_cost = round(total_retention_cost, 2)
    roi_ratio = round((projected_revenue_saved / total_retention_cost), 2) if total_retention_cost else 0.0

    return {
        "clv": round(clv, 2),
        "revenue_at_risk": dynamic_revenue_at_risk,
        "retention_cost": total_retention_cost,
        "roi_ratio": roi_ratio,
        "baseline_revenue_at_risk": round(baseline_revenue_at_risk, 2),
        "projected_revenue_saved": projected_revenue_saved,
        "baseline_churn_probability": round(baseline_churn_probability, 2),
        "adjusted_churn_probability": round(adjusted_churn_probability, 2),
        "combined_expected_impact": round(combined_expected_impact, 2),
        "recommendations_considered": len(offer_breakdown),
        "default_duration_months": float(default_duration_months),
        "offer_breakdown": offer_breakdown,
    }
