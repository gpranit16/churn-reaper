from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from groq import Groq

BACKEND_DIR = Path(__file__).resolve().parent
ENV_PATH = BACKEND_DIR / ".env"

load_dotenv(ENV_PATH)

MODEL_NAME = os.getenv("GROQ_MODEL_NAME", "llama-3.1-8b-instant")
GROQ_TIMEOUT_SECONDS = float(os.getenv("GROQ_TIMEOUT_SECONDS", "6"))
GROQ_MAX_RETRIES = int(os.getenv("GROQ_MAX_RETRIES", "0"))

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
_CLIENT = (
    Groq(
        api_key=GROQ_API_KEY,
        timeout=GROQ_TIMEOUT_SECONDS,
        max_retries=GROQ_MAX_RETRIES,
    )
    if GROQ_API_KEY
    else None
)


def _get_client() -> Groq:
    if _CLIENT is None:
        raise RuntimeError("GROQ_API_KEY is missing. Add it to backend/.env")
    return _CLIENT


def _chat(prompt: str, temperature: float = 0.3, max_tokens: int = 500) -> str:
    client = _get_client()
    response = client.chat.completions.create(
        model=MODEL_NAME,
        temperature=temperature,
        max_tokens=max_tokens,
        messages=[
            {
                "role": "system",
                "content": "You are an expert telecom retention analyst. Keep outputs concise and practical.",
            },
            {"role": "user", "content": prompt},
        ],
    )
    return (response.choices[0].message.content or "").strip()


def _top_shap_factors(shap_values: dict[str, float], top_n: int = 5) -> str:
    if not shap_values:
        return "Not available"

    sorted_items = sorted(
        shap_values.items(),
        key=lambda item: abs(float(item[1])),
        reverse=True,
    )[:top_n]

    return ", ".join(f"{feature}: {float(value):+.3f}" for feature, value in sorted_items)


def _safe_json_loads(raw_text: str) -> dict[str, Any] | None:
    try:
        return json.loads(raw_text)
    except json.JSONDecodeError:
        match = re.search(r"\{[\s\S]*\}", raw_text)
        if not match:
            return None
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            return None


def _format_inr(value: Any) -> str:
    try:
        amount = int(float(value))
    except (TypeError, ValueError):
        amount = 0
    return f"₹{amount:,}"


def _build_executive_summary_fallback(analytics_data: dict[str, Any]) -> str:
    total_customers = int(analytics_data.get("total_customers") or 0)
    high_risk_count = int(analytics_data.get("high_risk_count") or 0)
    medium_risk_count = int(analytics_data.get("medium_risk_count") or 0)
    revenue_at_risk = _format_inr(analytics_data.get("revenue_at_risk"))
    top_reason = analytics_data.get("top_churn_reason", "contract type")

    return (
        f"Out of {total_customers:,} customers, {high_risk_count:,} are high risk and "
        f"{medium_risk_count:,} are medium risk, putting approximately {revenue_at_risk} in annual revenue at risk. "
        f"The dominant churn driver is {top_reason}. Prioritize targeted contract-conversion offers for high-risk "
        "month-to-month customers this month."
    )


def explain_churn_reason(
    customer_data: dict[str, Any],
    shap_values: dict[str, float],
    churn_probability: float,
    risk_level: str,
) -> str:
    top_factors = _top_shap_factors(shap_values)

    prompt = f"""
You are a customer retention analyst at a
telecom company. A customer has been flagged
by our AI system.

Customer Profile:
- tenure: {customer_data.get('tenure', 'NA')} months
- Contract: {customer_data.get('Contract', 'NA')}
- Monthly Charges (INR): ₹{customer_data.get('MonthlyCharges', 'NA')}
- Internet Service: {customer_data.get('InternetService', 'NA')}
- Tech Support: {customer_data.get('TechSupport', 'NA')}
- Online Security: {customer_data.get('OnlineSecurity', 'NA')}

AI Model Analysis:
- Churn Probability: {round(float(churn_probability), 2)}%
- Risk Level: {risk_level}
- Top factors from SHAP: {top_factors}

Important: Any monetary reference must use Indian Rupees (INR, ₹).

Write a 3-4 sentence plain English explanation
of WHY this customer is likely to churn.
Be specific. Mention actual values.
Do not use technical jargon.
Sound like a human analyst not a robot.

Return only the explanation text.
""".strip()

    return _chat(prompt, temperature=0.4, max_tokens=260)


def generate_retention_strategy(
    customer_data: dict[str, Any],
    churn_probability: float,
    shap_values: dict[str, float],
    risk_level: str,
) -> list[dict[str, str]]:
    customer_summary = {
        "tenure": customer_data.get("tenure"),
        "contract": customer_data.get("Contract"),
        "monthly_charges": customer_data.get("MonthlyCharges"),
        "internet_service": customer_data.get("InternetService"),
        "tech_support": customer_data.get("TechSupport"),
        "online_security": customer_data.get("OnlineSecurity"),
        "risk_level": risk_level,
        "top_shap_factors": _top_shap_factors(shap_values),
    }

    prompt = f"""
You are a customer retention specialist.

Customer at risk data:
{json.dumps(customer_summary, indent=2)}
Churn probability: {round(float(churn_probability), 2)}%

Important: Use Indian currency only (INR, ₹). Do not use USD.

Generate exactly 3 specific retention offers.
Each offer must have:
- offer_title: short title
- offer_detail: what exactly to offer
- business_reason: why this works
- expected_impact: estimated % churn reduction
- urgency: HIGH or MEDIUM or LOW

Respond ONLY in valid JSON format like this:
{{
  "offers": [
    {{
      "offer_title": "...",
      "offer_detail": "...",
      "business_reason": "...",
      "expected_impact": "...",
      "urgency": "HIGH"
    }}
  ]
}}

Return only JSON, no extra text.
""".strip()

    raw_response = _chat(prompt, temperature=0.2, max_tokens=700)
    parsed = _safe_json_loads(raw_response)

    if not parsed or "offers" not in parsed or not isinstance(parsed["offers"], list):
        return []

    sanitized_offers: list[dict[str, str]] = []
    for offer in parsed["offers"]:
        if not isinstance(offer, dict):
            continue
        sanitized_offers.append(
            {
                "offer_title": str(offer.get("offer_title", "Retention Offer")).strip(),
                "offer_detail": str(offer.get("offer_detail", "")).strip(),
                "business_reason": str(offer.get("business_reason", "")).strip(),
                "expected_impact": str(offer.get("expected_impact", "")).strip(),
                "urgency": str(offer.get("urgency", "MEDIUM")).strip().upper(),
            }
        )

    return sanitized_offers


def generate_executive_summary(analytics_data: dict[str, Any], use_llm: bool = True) -> str:
    prompt = f"""
You are preparing a telecom churn executive report.

Input data:
- total_customers: {analytics_data.get('total_customers')}
- high_risk_count: {analytics_data.get('high_risk_count')}
- medium_risk_count: {analytics_data.get('medium_risk_count')}
- revenue_at_risk: {analytics_data.get('revenue_at_risk')}
- top_churn_reason: {analytics_data.get('top_churn_reason')}

Currency rule: interpret revenue values as INR and mention ₹ in the summary.

Generate a 2-3 sentence executive summary
for a business manager report.
Professional tone.
Include specific numbers.
End with one action recommendation.

Return summary text only.
""".strip()

    if not use_llm or _CLIENT is None:
        return _build_executive_summary_fallback(analytics_data)

    try:
        response = _chat(prompt, temperature=0.25, max_tokens=240)
        return response if response else _build_executive_summary_fallback(analytics_data)
    except Exception:
        return _build_executive_summary_fallback(analytics_data)


if __name__ == "__main__":
    demo_customer = {
        "tenure": 5,
        "Contract": "Month-to-month",
        "MonthlyCharges": 96.5,
        "InternetService": "Fiber optic",
        "TechSupport": "No",
        "OnlineSecurity": "No",
    }
    demo_shap = {
        "Contract": 0.612,
        "tenure": 0.451,
        "MonthlyCharges": 0.338,
        "TechSupport": 0.211,
        "OnlineSecurity": 0.184,
    }

    print("Explanation:")
    print(explain_churn_reason(demo_customer, demo_shap, 82.4, "HIGH"))

    print("\nRetention offers:")
    print(generate_retention_strategy(demo_customer, 82.4, demo_shap, "HIGH"))

    print("\nExecutive summary:")
    print(
        generate_executive_summary(
            {
                "total_customers": 7043,
                "high_risk_count": 1200,
                "medium_risk_count": 1800,
                "revenue_at_risk": 284000,
                "top_churn_reason": "Contract type",
            }
        )
    )
