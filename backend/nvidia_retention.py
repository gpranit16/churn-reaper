from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from retention_config import RETENTION_CONFIG

BACKEND_DIR = Path(__file__).resolve().parent
ENV_PATH = BACKEND_DIR / ".env"
load_dotenv(ENV_PATH)

NVIDIA_BASE_URL = os.getenv("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1").rstrip("/")
NVIDIA_MODEL = os.getenv("NVIDIA_MODEL", "nvidia/nemotron-3.5-lightning-30b-a3b")
NVIDIA_TIMEOUT_SECONDS = float(os.getenv("NVIDIA_TIMEOUT_SECONDS", "12.0"))


def _get_nvidia_api_key() -> str:
    return os.getenv("NVIDIA_API_KEY", "").strip()


def _build_rule_fallback_offers(customer_context: dict[str, Any]) -> list[dict[str, Any]]:
    """Deterministic, business-compliant fallback offers when AI provider is unavailable."""
    risk_level = str(customer_context.get("risk_level", "MEDIUM")).upper()
    contract = str(customer_context.get("contract", "Month-to-month"))
    tech_support = str(customer_context.get("tech_support", "No"))
    online_sec = str(customer_context.get("online_security", "No"))
    top_drivers = customer_context.get("top_shap_drivers", [])
    top_driver_str = top_drivers[0] if top_drivers else "contract or pricing"

    discount_pct = 15.0 if risk_level == "HIGH" else (10.0 if risk_level == "MEDIUM" else 5.0)
    discount_months = 3 if risk_level != "LOW" else 2

    # 1. Targeted Discount
    discount_offer = {
        "type": "discount",
        "title": f"{int(discount_pct)}% Loyalty Discount for {discount_months} Months",
        "discount_percent": float(discount_pct),
        "duration_months": int(discount_months),
        "reason": f"Customer is in {risk_level} churn risk with sensitivity related to {top_driver_str}.",
    }

    # 2. Support / Security Incentive
    support_cost = 25.0 if (tech_support == "No" or online_sec == "No") else 20.0
    support_offer = {
        "type": "support",
        "title": f"Complimentary Tech Support & Security Package (₹{int(support_cost)}/mo for 3 Months)",
        "monthly_cost": float(support_cost),
        "duration_months": 3,
        "reason": "Reinforce service stickiness and resolve potential technical friction.",
    }

    # 3. Contract Upgrade Incentive
    contract_incentive = 150.0 if contract == "Month-to-month" else 100.0
    contract_offer = {
        "type": "contract_upgrade",
        "title": f"₹{int(contract_incentive)} Switch Incentive for 1-Year or 2-Year Contract",
        "one_time_cost": float(contract_incentive),
        "reason": "Incentivize migration away from volatile month-to-month commitment.",
    }

    return [discount_offer, support_offer, contract_offer]


def _validate_and_sanitize_offers(raw_offers: Any, customer_context: dict[str, Any]) -> list[dict[str, Any]]:
    """Validate AI offers strictly against business configuration limits."""
    if not isinstance(raw_offers, list) or len(raw_offers) == 0:
        return _build_rule_fallback_offers(customer_context)

    valid_offers: list[dict[str, Any]] = []

    for offer in raw_offers:
        if not isinstance(offer, dict):
            continue

        offer_type = str(offer.get("type", "")).strip().lower()
        title = str(offer.get("title", "Retention Offer")).strip()
        reason = str(offer.get("reason", "Customer retention plan")).strip()

        if offer_type == "discount":
            pct = float(offer.get("discount_percent", 10.0))
            dur = int(offer.get("duration_months", 3))
            if pct <= 0 or pct > RETENTION_CONFIG.discount.max_percent:
                pct = min(max(pct, 5.0), RETENTION_CONFIG.discount.max_percent)
            if dur <= 0 or dur > RETENTION_CONFIG.discount.max_duration_months:
                dur = min(max(dur, 1), RETENTION_CONFIG.discount.max_duration_months)

            valid_offers.append({
                "type": "discount",
                "title": title or f"{int(pct)}% Discount for {dur} Months",
                "discount_percent": round(pct, 1),
                "duration_months": dur,
                "reason": reason,
            })

        elif offer_type == "support":
            m_cost = float(offer.get("monthly_cost", 20.0))
            dur = int(offer.get("duration_months", 3))
            if m_cost <= 0 or m_cost > RETENTION_CONFIG.support.max_monthly_cost:
                m_cost = min(max(m_cost, 10.0), RETENTION_CONFIG.support.max_monthly_cost)
            if dur <= 0 or dur > RETENTION_CONFIG.support.max_duration_months:
                dur = min(max(dur, 1), RETENTION_CONFIG.support.max_duration_months)

            valid_offers.append({
                "type": "support",
                "title": title or f"Support Package (₹{int(m_cost)}/mo for {dur} Mo)",
                "monthly_cost": round(m_cost, 2),
                "duration_months": dur,
                "reason": reason,
            })

        elif offer_type in ("contract", "contract_upgrade"):
            one_time = float(offer.get("one_time_cost", 100.0))
            if one_time < 0 or one_time > RETENTION_CONFIG.contract.max_one_time_incentive:
                one_time = min(max(one_time, 0.0), RETENTION_CONFIG.contract.max_one_time_incentive)

            valid_offers.append({
                "type": "contract_upgrade",
                "title": title or f"₹{int(one_time)} Annual Contract Upgrade Credit",
                "one_time_cost": round(one_time, 2),
                "reason": reason,
            })

    # If AI produced fewer than 3 valid offers, fill in with rule fallbacks
    fallback = _build_rule_fallback_offers(customer_context)
    existing_types = {o["type"] for o in valid_offers}

    for fb in fallback:
        if len(valid_offers) >= 3:
            break
        if fb["type"] not in existing_types:
            valid_offers.append(fb)
            existing_types.add(fb["type"])

    return valid_offers[:3]


def generate_nvidia_retention_offers(customer_context: dict[str, Any]) -> tuple[list[dict[str, Any]], str]:
    """
    Generate retention offers using NVIDIA AI, or safely fallback to business rules.
    Returns: (list_of_3_offers, provider_name: 'nvidia' | 'fallback_rule')
    """
    api_key = _get_nvidia_api_key()
    if not api_key:
        return _build_rule_fallback_offers(customer_context), "fallback_rule"

    system_prompt = (
        "You are a customer-retention strategy assistant. "
        "Suggest realistic retention actions for this customer. "
        "Stay strictly within the allowed business constraints:\n"
        "- Offer Type 1 ('discount'): maximum discount 15%, maximum duration 3 months.\n"
        "- Offer Type 2 ('support'): maximum monthly cost 30, maximum duration 3 months.\n"
        "- Offer Type 3 ('contract_upgrade'): maximum one-time incentive 150.\n"
        "Respond ONLY with a JSON object in this format:\n"
        "```json\n"
        "{\n"
        '  "offers": [\n'
        '    {"type": "discount", "title": "10% discount for 3 months", "discount_percent": 10, "duration_months": 3, "reason": "..."},\n'
        '    {"type": "support", "title": "Tech support for 3 months", "monthly_cost": 25, "duration_months": 3, "reason": "..."},\n'
        '    {"type": "contract_upgrade", "title": "100 incentive for 1-year contract", "one_time_cost": 100, "reason": "..."}\n'
        "  ]\n"
        "}\n"
        "```\n"
        "Do NOT calculate or output ROI or financial totals. Output valid JSON only."
    )

    user_prompt = f"Customer Profile:\n{json.dumps(customer_context, indent=2)}\nGenerate the 3 allowed retention offers in JSON."

    try:
        from openai import OpenAI

        client = OpenAI(
            base_url=NVIDIA_BASE_URL,
            api_key=api_key,
            timeout=NVIDIA_TIMEOUT_SECONDS,
        )

        response = client.chat.completions.create(
            model=NVIDIA_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.2,
            max_tokens=500,
        )

        content = (response.choices[0].message.content or "").strip()

        # Extract JSON block using regex to handle reasoning tokens
        match = re.search(r"\{[\s\S]*\"offers\"[\s\S]*\}", content)
        if match:
            parsed = json.loads(match.group(0))
            raw_offers = parsed.get("offers", [])
            valid_offers = _validate_and_sanitize_offers(raw_offers, customer_context)
            return valid_offers, "nvidia"

        return _build_rule_fallback_offers(customer_context), "fallback_rule"

    except Exception:
        # Graceful fallback on any network, timeout, or parsing error
        return _build_rule_fallback_offers(customer_context), "fallback_rule"
