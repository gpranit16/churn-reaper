from __future__ import annotations

import pickle
from functools import lru_cache
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
import shap

ROOT_DIR = Path(__file__).resolve().parents[1]
MODELS_DIR = ROOT_DIR / "models"


def _normalize_shap_values(raw_values: Any) -> np.ndarray:
    """Normalize SHAP output across SHAP/XGBoost versions to shape (n_samples, n_features)."""
    if isinstance(raw_values, list):
        if len(raw_values) == 2:
            return np.asarray(raw_values[1])
        return np.asarray(raw_values[0])

    values = np.asarray(raw_values)

    # Some versions return shape: (n_samples, n_features, n_classes)
    if values.ndim == 3:
        class_idx = 1 if values.shape[-1] > 1 else 0
        return values[:, :, class_idx]

    return values


def _extract_base_value(expected_value: Any) -> float:
    if isinstance(expected_value, (list, tuple, np.ndarray)):
        arr = np.asarray(expected_value).flatten()
        if arr.size == 0:
            return 0.0
        if arr.size > 1:
            return float(arr[-1])
        return float(arr[0])
    return float(expected_value)


@lru_cache(maxsize=1)
def _load_artifacts() -> dict[str, Any]:
    with open(MODELS_DIR / "churn_model.pkl", "rb") as f:
        model = pickle.load(f)

    with open(MODELS_DIR / "feature_names.pkl", "rb") as f:
        feature_names = pickle.load(f)

    with open(MODELS_DIR / "sample_data.pkl", "rb") as f:
        sample_data = pickle.load(f)

    explainer = shap.TreeExplainer(model)

    return {
        "model": model,
        "feature_names": feature_names,
        "sample_data": sample_data,
        "explainer": explainer,
    }


def get_global_importance() -> list[dict[str, float]]:
    """Return top 10 globally important features from SHAP values on sample_data."""
    artifacts = _load_artifacts()
    feature_names: list[str] = artifacts["feature_names"]
    sample_data: pd.DataFrame = artifacts["sample_data"][feature_names].copy()
    explainer = artifacts["explainer"]

    shap_values = _normalize_shap_values(explainer.shap_values(sample_data))
    importance_scores = np.abs(shap_values).mean(axis=0)

    ranked = sorted(
        zip(feature_names, importance_scores, strict=False),
        key=lambda item: item[1],
        reverse=True,
    )[:10]

    return [
        {"feature": feature, "importance": round(float(score), 4)}
        for feature, score in ranked
    ]


def get_shap_explanation(customer_df: pd.DataFrame) -> dict[str, Any]:
    """Return row-level SHAP values, base value, and prediction probability."""
    artifacts = _load_artifacts()
    model = artifacts["model"]
    feature_names: list[str] = artifacts["feature_names"]
    explainer = artifacts["explainer"]

    prepared_df = customer_df.copy()
    prepared_df = prepared_df.reindex(columns=feature_names, fill_value=0)

    shap_values = _normalize_shap_values(explainer.shap_values(prepared_df))
    row_shap = shap_values[0]

    base_value = _extract_base_value(explainer.expected_value)
    prediction_probability = float(model.predict_proba(prepared_df)[0, 1])

    shap_dict = {
        feature: float(value)
        for feature, value in zip(feature_names, row_shap, strict=False)
    }

    return {
        "shap_values": shap_dict,
        "base_value": round(base_value, 6),
        "prediction_probability": round(prediction_probability, 6),
    }


if __name__ == "__main__":
    artifacts = _load_artifacts()
    print("Top 10 features by SHAP importance:")
    print(get_global_importance())

    sample_row = artifacts["sample_data"].head(1)
    print("\nSingle-row SHAP explanation:")
    print(get_shap_explanation(sample_row))
