from __future__ import annotations

import io
import pickle
from functools import lru_cache
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
import shap
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from xgboost import XGBClassifier

from explainer import _normalize_shap_values, get_shap_explanation
from groq_explainer import explain_churn_reason
from recommendations import calculate_dynamic_roi, calculate_roi, get_recommendations

ROOT_DIR = Path(__file__).resolve().parents[1]
MODELS_DIR = ROOT_DIR / "models"

YES_NO_MAP = {
    "yes": 1,
    "no": 0,
}

DRIVER_ACTIONS = {
    "Contract": "Offer an annual or two-year contract with loyalty pricing.",
    "tenure": "Run an early-engagement campaign to build habit and perceived value.",
    "MonthlyCharges": "Offer plan optimization or bundle discounts to lower monthly cost.",
    "TotalCharges": "Recognize long-term value with a high-value loyalty offer.",
    "InternetService": "Offer faster or more reliable internet at a promotional price.",
    "TechSupport": "Offer a tech support add-on with a first-month discount.",
    "OnlineSecurity": "Offer an online security add-on with a first-month discount.",
    "OnlineBackup": "Offer an online backup add-on with a first-month discount.",
    "DeviceProtection": "Offer a device protection add-on with a first-month discount.",
    "StreamingTV": "Bundle streaming TV with current services at a discount.",
    "StreamingMovies": "Bundle streaming movies with current services at a discount.",
    "PaymentMethod": "Offer automatic payments with a small discount or bill credit.",
    "PaperlessBilling": "Incentivize paperless billing adoption with a monthly credit.",
    "MultipleLines": "Offer a multi-line bundle discount to reinforce service stickiness.",
    "PhoneService": "Attach a value-add calling feature or international add-on.",
    "gender": "Personalize offers based on segment and usage patterns.",
    "SeniorCitizen": "Offer senior-friendly plans and priority support.",
    "Partner": "Offer a companion line discount to reinforce two-person plans.",
    "Dependents": "Offer family bundle discounts that include dependents.",
}
DEFAULT_DRIVER_ACTION = "Run a targeted retention offer for this customer's top churn driver."


def _risk_band(churn_probability: float) -> tuple[str, str]:
    """
    Unified risk band helper across the entire application.
    Accepts probability in 0-100 range.
    LOW: probability < 40%
    MEDIUM: 40% <= probability <= 70%
    HIGH: probability > 70%
    """
    if churn_probability > 70:
        return "HIGH", "red"
    if churn_probability >= 40:
        return "MEDIUM", "yellow"
    return "LOW", "green"


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

    from recommendations import evaluate_retention_strategy

    retention_strategy = evaluate_retention_strategy(
        customer_data=customer_dict,
        churn_probability=churn_probability,
        shap_values=shap_values,
    )

    return {
        "churn_probability": round(churn_probability, 2),
        "risk_level": risk_level,
        "risk_color": risk_color,
        "churn_explanation": churn_explanation,
        "shap_values": shap_values,
        "recommendations": recommendations,
        "retention_strategy": retention_strategy,
        "roi_data": roi_data,
        "dynamic_roi_data": dynamic_roi_data,
    }


def _detect_customer_id_column(df: pd.DataFrame, user_selected: str | None = None) -> str | None:
    if user_selected and user_selected in df.columns:
        return user_selected

    id_names = {"customerid", "customer_id", "id", "client_id", "user_id"}
    lower_cols = {str(col).lower().strip(): col for col in df.columns}

    for name in id_names:
        if name in lower_cols:
            return lower_cols[name]

    for col in df.columns:
        col_lower = str(col).lower().strip()
        if any(key in col_lower for key in ("customerid", "customer_id", "client_id")):
            return col

    return None


def _native(value: Any) -> Any:
    if pd.isna(value):
        return None
    if isinstance(value, np.integer):
        return int(value)
    if isinstance(value, np.floating):
        return float(value)
    if isinstance(value, np.bool_):
        return bool(value)
    return value


def predict_dataset(
    csv_content: str,
    target_column: str,
    customer_id_column: str | None = None,
    positive_class: str = "Yes",
) -> dict[str, Any]:
    """
    Train a churn classification model on the uploaded CSV dataset
    and predict churn probability for all rows using vectorized inference.
    """
    # Parse CSV
    try:
        df = pd.read_csv(io.StringIO(csv_content))
    except Exception as exc:
        raise ValueError(f"Failed to parse CSV: {exc}") from exc

    if df.empty or len(df) == 0:
        raise ValueError("Uploaded CSV is empty.")

    if len(df.columns) < 2:
        raise ValueError("Uploaded CSV must contain at least a feature column and a target column.")

    # Validate target column
    if target_column not in df.columns:
        raise ValueError(f"Target column '{target_column}' not found in dataset.")

    # Detect customer ID column if not specified
    if not customer_id_column or customer_id_column not in df.columns:
        customer_id_column = _detect_customer_id_column(df, customer_id_column)

    # Process target column
    raw_target = df[target_column].dropna()
    unique_targets = raw_target.unique()

    if len(unique_targets) != 2:
        raise ValueError(
            f"Target column '{target_column}' must have exactly 2 distinct classes, but found {len(unique_targets)}: {list(unique_targets)[:5]}"
        )

    # Identify positive and negative class
    pos_str = str(positive_class).strip().lower()
    target_str_map = {str(u).strip().lower(): u for u in unique_targets}

    if pos_str in target_str_map:
        matched_pos = target_str_map[pos_str]
    else:
        # Fallback heuristic
        matched_pos = unique_targets[1] if str(unique_targets[0]).strip().lower() in ("no", "0", "false", "f") else unique_targets[0]

    y_series = (df[target_column].astype(str).str.strip().str.lower() == str(matched_pos).strip().lower()).astype(int)

    # Build feature matrix
    cols_to_drop = [target_column]
    if customer_id_column and customer_id_column in df.columns:
        cols_to_drop.append(customer_id_column)

    feature_df = df.drop(columns=cols_to_drop).copy()

    if feature_df.shape[1] == 0:
        raise ValueError("No feature columns available after removing target and ID columns.")

    # Generic Preprocessing: Numeric vs Categorical
    X_processed = pd.DataFrame(index=df.index)
    numeric_imputers: dict[str, float] = {}
    label_encoders: dict[str, LabelEncoder] = {}

    for col in feature_df.columns:
        col_series = feature_df[col]
        # Check if numeric or convertible to numeric
        numeric_converted = pd.to_numeric(col_series, errors="coerce")
        valid_numeric_count = numeric_converted.notna().sum()
        non_empty_count = col_series.replace(r"^\s*$", np.nan, regex=True).notna().sum()

        is_numeric = (
            col_series.dtype in (np.int64, np.int32, np.float64, np.float32)
            or (non_empty_count > 0 and (valid_numeric_count / non_empty_count) >= 0.8)
        )

        if is_numeric:
            median_val = float(numeric_converted.median()) if not np.isnan(numeric_converted.median()) else 0.0
            numeric_imputers[col] = median_val
            X_processed[col] = numeric_converted.fillna(median_val)
        else:
            # Categorical
            clean_cat = col_series.fillna("Missing").astype(str).str.strip()
            le = LabelEncoder()
            X_processed[col] = le.fit_transform(clean_cat)
            label_encoders[col] = le

    feature_names = list(X_processed.columns)

    # Stratified Train/Test split
    try:
        X_train, X_test, y_train, y_test = train_test_split(
            X_processed, y_series, test_size=0.2, random_state=42, stratify=y_series
        )
    except ValueError:
        X_train, X_test, y_train, y_test = train_test_split(
            X_processed, y_series, test_size=0.2, random_state=42
        )

    # Train isolated XGBoost model
    model = XGBClassifier(
        n_estimators=150,
        max_depth=5,
        learning_rate=0.08,
        random_state=42,
        objective="binary:logistic",
        eval_metric="logloss",
        n_jobs=-1,
    )
    model.fit(X_train, y_train)

    # Evaluate on test set
    y_test_proba = model.predict_proba(X_test)[:, 1]
    y_test_pred = (y_test_proba >= 0.5).astype(int)

    accuracy = float(accuracy_score(y_test, y_test_pred))
    precision = float(precision_score(y_test, y_test_pred, zero_division=0))
    recall = float(recall_score(y_test, y_test_pred, zero_division=0))
    f1 = float(f1_score(y_test, y_test_pred, zero_division=0))

    try:
        auc_roc = float(roc_auc_score(y_test, y_test_proba))
    except Exception:
        auc_roc = None

    # Vectorized Prediction on FULL dataset
    y_all_proba = model.predict_proba(X_processed)[:, 1]
    y_all_pred = (y_all_proba >= 0.5).astype(int)

    # Compute SHAP values for driver detection
    try:
        explainer = shap.TreeExplainer(model)
        shap_matrix = _normalize_shap_values(explainer.shap_values(X_processed, check_additivity=False))
        # Find feature with max positive impact on churn
        top_driver_indices = np.argmax(shap_matrix, axis=1)
    except Exception:
        shap_matrix = None
        top_driver_indices = None

    total_rows = len(df)
    churn_rate = float(y_series.mean() * 100)
    missing_values = int(df.isnull().sum().sum())

    # Pre-extract values for fast serialization
    cid_series = None
    if customer_id_column and customer_id_column in df.columns:
        cid_series = df[customer_id_column].fillna("").astype(str).str.strip().tolist()

    raw_records = df.to_dict(orient="records")

    customer_results: list[dict[str, Any]] = []

    for i in range(total_rows):
        if cid_series and cid_series[i]:
            cid_val = cid_series[i]
        else:
            cid_val = f"CUST-{i+1:04d}"

        prob_pct = round(float(y_all_proba[i]) * 100, 2)
        risk_level, risk_color = _risk_band(prob_pct)

        top_driver = None
        recommended_action = DEFAULT_DRIVER_ACTION
        customer_shap_dict: dict[str, float] = {}

        if top_driver_indices is not None and shap_matrix is not None:
            best_idx = int(top_driver_indices[i])
            top_driver = feature_names[best_idx]
            recommended_action = DRIVER_ACTIONS.get(top_driver, DEFAULT_DRIVER_ACTION)
            row_shaps = shap_matrix[i]
            for fn, sv in zip(feature_names, row_shaps, strict=False):
                customer_shap_dict[fn] = round(float(sv), 4)
        else:
            top_driver = feature_names[0] if feature_names else "General Profile"

        raw_row = raw_records[i]
        row_raw_features = {
            k: _native(v)
            for k, v in raw_row.items()
            if k not in (customer_id_column, target_column)
        }

        # Build customer-specific retention recommendation
        monthly_charges = _safe_float(row_raw_features.get("MonthlyCharges", 85.0))
        urgency = "HIGH" if risk_level == "HIGH" else ("MEDIUM" if risk_level == "MEDIUM" else "LOW")
        cust_recs = [
            {
                "offer_title": f"Targeted Retention: {top_driver}",
                "offer_detail": recommended_action,
                "business_reason": f"Customer is in {risk_level} churn risk with primary sensitivity in {top_driver}.",
                "urgency": urgency,
                "expected_impact": "-12% churn risk",
                "estimated_cost": f"₹{round(monthly_charges * 0.15, 2)}/mo",
            }
        ]

        customer_results.append({
            "customer_id": cid_val,
            "churn_probability": prob_pct,
            "risk_level": risk_level,
            "risk_color": risk_color,
            "prediction": int(y_all_pred[i]),
            "top_driver": top_driver,
            "recommended_action": recommended_action,
            "features": row_raw_features,
            "shap_values": customer_shap_dict,
            "recommendations": cust_recs,
            "churn_explanation": f"Top churn driver: {top_driver}. {recommended_action}",
        })

    dataset_summary = {
        "rows": total_rows,
        "features": len(feature_names),
        "churn_rate": round(churn_rate, 2),
        "missing_values": missing_values,
    }

    model_summary = {
        "model_used": "XGBoost",
        "accuracy": round(accuracy, 4),
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1": round(f1, 4),
        "roc_auc": round(auc_roc, 4) if auc_roc is not None else None,
    }

    return {
        "datasetSummary": dataset_summary,
        "modelSummary": model_summary,
        "customerResults": customer_results,
        "targetColumn": target_column,
        "customerIdColumn": customer_id_column,
        "positiveClass": str(matched_pos),
    }
