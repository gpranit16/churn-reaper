from __future__ import annotations

import pickle
from functools import lru_cache
from pathlib import Path
from typing import Any

import pandas as pd

from explainer import get_shap_explanation
from groq_explainer import explain_churn_reason
from recommendations import calculate_dynamic_roi, calculate_roi, get_recommendations

ROOT_DIR = Path(__file__).resolve().parents[1]
MODELS_DIR = ROOT_DIR / "models"

YES_NO_MAP = {
    "yes": 1,
    "no": 0,
}


@lru_cache(maxsize=1)
def _load_artifacts() -> dict[str, Any]:
    with open(MODELS_DIR / "churn_model.pkl", "rb") as f:
        model = pickle.load(f)

    with open(MODELS_DIR / "label_encoders.pkl", "rb") as f:
        label_encoders = pickle.load(f)

    with open(MODELS_DIR / "feature_names.pkl", "rb") as f:
        feature_names = pickle.load(f)

    return {
        "model": model,
        "label_encoders": label_encoders,
        "feature_names": feature_names,
    }


def _safe_float(value: Any, default: float = 0.0) -> float:
    try:
        if isinstance(value, str) and not value.strip():
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def _encode_value_with_fallback(encoder: Any, value: Any) -> int:
    classes = [str(cls) for cls in encoder.classes_]
    value_str = str(value)

    if value_str not in classes:
        value_str = classes[0]

    return int(encoder.transform([value_str])[0])


def _preprocess_customer(customer_dict: dict[str, Any], feature_names: list[str], label_encoders: dict[str, Any]) -> pd.DataFrame:
    data = dict(customer_dict)

    # Drop optional ID keys if sent by client
    data.pop("customerID", None)
    data.pop("CustomerID", None)

    # Convert generic Yes/No for non-label-encoded fields
    for key, value in list(data.items()):
        if key in label_encoders:
            continue
        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized in YES_NO_MAP:
                data[key] = YES_NO_MAP[normalized]

    # Numeric cleanup
    data["SeniorCitizen"] = int(_safe_float(data.get("SeniorCitizen", 0)))
    data["tenure"] = int(_safe_float(data.get("tenure", 0)))
    data["MonthlyCharges"] = _safe_float(data.get("MonthlyCharges", 0))
    data["TotalCharges"] = _safe_float(data.get("TotalCharges", 0))

    df = pd.DataFrame([data])

    # Apply saved label encoders for categorical columns used in training
    for col, encoder in label_encoders.items():
        if col not in df.columns:
            df[col] = str(encoder.classes_[0])
        df[col] = df[col].apply(lambda x: _encode_value_with_fallback(encoder, x))

    # Ensure exact feature ordering
    df = df.reindex(columns=feature_names, fill_value=0)
    return df


def _risk_band(churn_probability: float) -> tuple[str, str]:
    if churn_probability > 70:
        return "HIGH", "red"
    if 40 <= churn_probability <= 70:
        return "MEDIUM", "yellow"
    return "LOW", "green"


def predict_churn(customer_dict: dict[str, Any]) -> dict[str, Any]:
    artifacts = _load_artifacts()
    model = artifacts["model"]
    label_encoders = artifacts["label_encoders"]
    feature_names = artifacts["feature_names"]

    processed_df = _preprocess_customer(customer_dict, feature_names, label_encoders)

    churn_probability = float(model.predict_proba(processed_df)[0, 1] * 100)
    risk_level, risk_color = _risk_band(churn_probability)

    shap_result = get_shap_explanation(processed_df)
    shap_values = shap_result.get("shap_values", {})

    try:
        churn_explanation = explain_churn_reason(
            customer_data=customer_dict,
            shap_values=shap_values,
            churn_probability=churn_probability,
            risk_level=risk_level,
        )
    except Exception:
        churn_explanation = (
            f"This customer is in the {risk_level} churn-risk group with an estimated churn probability "
            f"of {round(churn_probability, 2)}%. The risk appears tied to current contract structure, "
            "price sensitivity, and service-support profile."
        )

    recommendations = get_recommendations(
        customer_data=customer_dict,
        shap_values=shap_values,
        churn_probability=churn_probability,
    )

    roi_data = calculate_roi(
        monthly_charges=_safe_float(customer_dict.get("MonthlyCharges", 0)),
        churn_probability=churn_probability,
        tenure=_safe_float(customer_dict.get("tenure", 0)),
    )

    dynamic_roi_data = calculate_dynamic_roi(
        monthly_charges=_safe_float(customer_dict.get("MonthlyCharges", 0)),
        churn_probability=churn_probability,
        tenure=_safe_float(customer_dict.get("tenure", 0)),
        recommendations=recommendations,
    )

    return {
        "churn_probability": round(churn_probability, 2),
        "risk_level": risk_level,
        "risk_color": risk_color,
        "churn_explanation": churn_explanation,
        "shap_values": shap_values,
        "recommendations": recommendations,
        "roi_data": roi_data,
        "dynamic_roi_data": dynamic_roi_data,
    }
