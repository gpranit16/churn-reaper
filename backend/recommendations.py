from __future__ import annotations

import os
import re
from typing import Any

from groq_explainer import generate_retention_strategy

DEFAULT_DYNAMIC_DURATION_MONTHS = 3.0
DEFAULT_DYNAMIC_IMPACT_PERCENT = 6.0
DEFAULT_ESTIMATED_COST_FACTOR = 0.08

MONTHLY_CHARGES_Q1 = 35.5
MONTHLY_CHARGES_Q3 = 89.85
MONTHLY_CHARGES_P90 = 102.6
MAX_DISCOUNT_PERCENT = 25.0

USE_AI_RECOMMENDATIONS = os.getenv("USE_AI_RECOMMENDATIONS", "false").lower() == "true"


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


def _format_inr(amount: float) -> str:
    return f"₹{round(float(amount), 2):,.2f}"


def _price_band(monthly_charges: float) -> str:
    if monthly_charges <= MONTHLY_CHARGES_Q1:
        return "CHEAP"
    if monthly_charges > MONTHLY_CHARGES_P90:
        return "VERY_EXPENSIVE"
    if monthly_charges > MONTHLY_CHARGES_Q3:
        return "EXPENSIVE"
    return "MODERATE"


def _discount_policy(
    risk_level: str,
    monthly_charges: float,
    churn_probability: float,
    tenure: float,
    contract: str,
) -> tuple[float, float, str, str]:
    band = _price_band(monthly_charges)

    if risk_level == "LOW":
        discount_map = {
            "CHEAP": 0.0,
            "MODERATE": 5.0,
            "EXPENSIVE": 5.0,
            "VERY_EXPENSIVE": 5.0,
        }
        duration = 1.0
        urgency = "LOW"
    elif risk_level == "MEDIUM":
        discount_map = {
            "CHEAP": 5.0,
            "MODERATE": 10.0,
            "EXPENSIVE": 12.0,
            "VERY_EXPENSIVE": 15.0,
        }
        duration = 2.0
        urgency = "MEDIUM"
    else:
        discount_map = {
            "CHEAP": 10.0,
            "MODERATE": 15.0,
            "EXPENSIVE": 20.0,
            "VERY_EXPENSIVE": 22.0,
        }
        duration = 3.0
        urgency = "HIGH"

    discount_percent = discount_map[band]

    # Escalation for volatile profiles
    if risk_level != "LOW" and str(contract) == "Month-to-month":
        discount_percent += 2.0
    if risk_level == "HIGH" and float(tenure or 0) < 6:
        discount_percent += 1.0
    if risk_level == "HIGH" and band == "VERY_EXPENSIVE" and churn_probability > 85 and float(tenure or 0) < 6:
        discount_percent = 25.0

    discount_percent = _clamp(discount_percent, 0.0, MAX_DISCOUNT_PERCENT)
    return discount_percent, duration, urgency, band


def _impact_range_from_discount(discount_percent: float, risk_level: str) -> str:
    risk_base = {"LOW": 3.0, "MEDIUM": 7.0, "HIGH": 11.0}.get(risk_level, 7.0)
    low = _clamp(risk_base + (discount_percent * 0.35), 2.0, 35.0)
    high = _clamp(low + 4.0, 4.0, 40.0)
    return f"{int(round(low))}-{int(round(high))}%"


def _offers_look_practical(offers: list[dict[str, str]], monthly_charges: float) -> bool:
    if not offers:
        return False

    monthly_charges = max(_safe_float(monthly_charges), 0.0)

    for offer in offers[:3]:
        text = " ".join(
            [
                str(offer.get("offer_title", "")),
                str(offer.get("offer_detail", "")),
                str(offer.get("business_reason", "")),
            ]
        ).lower()
        expected_impact = str(offer.get("expected_impact", ""))

        if "$" in text or "usd" in text:
            return False
        if not re.search(r"\d+(?:\.\d+)?\s*%", expected_impact):
            return False

        # Reject impossible monthly reductions/credits against customer bill.
        if monthly_charges > 0:
            amounts = _extract_inr_amounts(text)
            is_monthly_offer = any(
                token in text
                for token in ["/month", "per month", "monthly", "month"]
            )

            if is_monthly_offer:
                for amount in amounts:
                    if amount > monthly_charges:
                        return False
                    if "discount" in text and amount > (monthly_charges * 0.6):
                        return False

    return True


def _build_policy_recommendations(
    customer_data: dict[str, Any],
    churn_probability: float,
) -> list[dict[str, str]]:
    risk_level = _risk_level(float(churn_probability))
    monthly_charges = _safe_float(customer_data.get("MonthlyCharges", 0.0))
    tenure = _safe_float(customer_data.get("tenure", 0.0))
    contract = str(customer_data.get("Contract", ""))
    tech_support = str(customer_data.get("TechSupport", ""))
    online_security = str(customer_data.get("OnlineSecurity", ""))

    discount_percent, duration_months, urgency, band = _discount_policy(
        risk_level=risk_level,
        monthly_charges=monthly_charges,
        churn_probability=float(churn_probability),
        tenure=tenure,
        contract=contract,
    )

    monthly_saving = monthly_charges * (discount_percent / 100.0)
    discounted_bill = max(monthly_charges - monthly_saving, 0.0)

    offers: list[dict[str, str]] = []

    if discount_percent > 0:
        offers.append(
            {
                "offer_title": "Targeted Retention Discount",
                "offer_detail": (
                    f"Offer {int(round(discount_percent))}% discount ({_format_inr(monthly_saving)}/month) "
                    f"for {int(round(duration_months))} months. New monthly bill approx {_format_inr(discounted_bill)}/month."
                ),
                "business_reason": (
                    f"{band.replace('_', ' ').title()} bill profile with {risk_level} churn risk needs a calibrated price intervention, not a fixed generic offer."
                ),
                "expected_impact": _impact_range_from_discount(discount_percent, risk_level),
                "urgency": urgency,
            }
        )
    else:
        offers.append(
            {
                "offer_title": "Value Assurance Plan",
                "offer_detail": "No direct discount is recommended for this profile. Use non-cash retention levers and monitor for 30 days.",
                "business_reason": "Low-risk and low-bill profiles are better retained with service assurance than margin-eroding discounts.",
                "expected_impact": "3-6%",
                "urgency": "LOW",
            }
        )

    support_target_pct = {"LOW": 0.08, "MEDIUM": 0.12, "HIGH": 0.16}.get(risk_level, 0.1)
    support_floor = 10.0 if monthly_charges <= 40 else 20.0
    support_cap = max(monthly_charges * 0.35, support_floor)
    if monthly_charges > 0:
        support_cap = min(support_cap, monthly_charges)
        support_floor = min(support_floor, support_cap)
    else:
        support_floor = 0.0
        support_cap = 0.0
    support_credit = _clamp(monthly_charges * support_target_pct, support_floor, support_cap)
    support_duration = 2.0 if risk_level != "HIGH" else 3.0
    support_impact = "6-12%" if tech_support == "No" or online_security == "No" else "3-7%"
    offers.append(
        {
            "offer_title": "Support + Security Retention Credit",
            "offer_detail": (
                f"Provide retention credit of {_format_inr(support_credit)}/month for {int(round(support_duration))} months toward tech support and security add-ons."
            ),
            "business_reason": "Support/security adoption reduces service friction and improves long-term stickiness in churn-prone segments.",
            "expected_impact": support_impact,
            "urgency": "MEDIUM" if risk_level == "LOW" else "HIGH",
        }
    )

    if contract == "Month-to-month":
        migration_floor = 49.0 if monthly_charges <= 50 else 99.0
        migration_cap = max(monthly_charges * 3.0, migration_floor)
        migration_credit = _clamp(monthly_charges * (1.2 if risk_level == "HIGH" else 1.0), migration_floor, migration_cap)
        migration_impact = "10-18%" if risk_level in {"MEDIUM", "HIGH"} else "5-9%"
        offers.append(
            {
                "offer_title": "Annual Plan Migration Bonus",
                "offer_detail": (
                    f"If customer shifts to annual contract, apply one-time bill credit of {_format_inr(migration_credit)} and lock current tariff."
                ),
                "business_reason": "Month-to-month tenure is a major churn driver; contract lock-in improves retention predictability.",
                "expected_impact": migration_impact,
                "urgency": "HIGH" if risk_level == "HIGH" else "MEDIUM",
            }
        )
    else:
        loyalty_floor = 29.0 if monthly_charges <= 50 else 59.0
        loyalty_cap = max(monthly_charges * 1.5, loyalty_floor)
        loyalty_credit = _clamp(monthly_charges * 0.6, loyalty_floor, loyalty_cap)
        offers.append(
            {
                "offer_title": "Loyalty Protection Credit",
                "offer_detail": f"Apply one-time loyalty credit of {_format_inr(loyalty_credit)} linked to next billing cycle completion.",
                "business_reason": "For contracted users, small loyalty incentives preserve value while controlling discount leakage.",
                "expected_impact": "4-8%",
                "urgency": "MEDIUM",
            }
        )

    return offers[:3]


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
    """Return practical retention recommendations.

    Default behavior is policy-driven (deterministic and customer-specific).
    Optional AI output can be enabled via USE_AI_RECOMMENDATIONS=true, but only
    if the generated offers pass practicality checks.
    """
    risk_level = _risk_level(float(churn_probability))
    monthly_charges = _safe_float(customer_data.get("MonthlyCharges", 0.0))

    # For low-risk or low-bill profiles, deterministic policy is safer and more practical.
    if risk_level == "LOW" or monthly_charges <= 50:
        return _build_policy_recommendations(
            customer_data=customer_data,
            churn_probability=float(churn_probability),
        )

    if USE_AI_RECOMMENDATIONS:
        try:
            ai_offers = generate_retention_strategy(
                customer_data=customer_data,
                churn_probability=float(churn_probability),
                shap_values=shap_values,
                risk_level=risk_level,
            )
            if _offers_look_practical(ai_offers, monthly_charges=monthly_charges):
                return ai_offers[:3]
        except Exception:
            pass

    return _build_policy_recommendations(
        customer_data=customer_data,
        churn_probability=float(churn_probability),
    )


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
