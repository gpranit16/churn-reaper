from __future__ import annotations

import pickle
from pathlib import Path

import pandas as pd
from imblearn.over_sampling import SMOTE
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from xgboost import XGBClassifier

ROOT_DIR = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT_DIR / "data" / "telco_churn.csv"
MODELS_DIR = ROOT_DIR / "models"

CATEGORICAL_COLUMNS = [
    "gender",
    "Partner",
    "Dependents",
    "PhoneService",
    "MultipleLines",
    "InternetService",
    "OnlineSecurity",
    "OnlineBackup",
    "DeviceProtection",
    "TechSupport",
    "StreamingTV",
    "StreamingMovies",
    "Contract",
    "PaperlessBilling",
    "PaymentMethod",
]


def load_and_preprocess_data() -> tuple[pd.DataFrame, pd.Series, dict[str, LabelEncoder]]:
    """Load churn data and apply preprocessing required for model training."""
    if not DATA_PATH.exists():
        raise FileNotFoundError(f"Dataset not found at: {DATA_PATH}")

    df = pd.read_csv(DATA_PATH)

    # Drop customer identifier column (supports both common casings)
    id_cols = [col for col in ("CustomerID", "customerID") if col in df.columns]
    if id_cols:
        df = df.drop(columns=id_cols)

    # Convert TotalCharges to float, replacing empty strings/spaces with 0
    df["TotalCharges"] = pd.to_numeric(
        df["TotalCharges"].astype(str).str.strip().replace("", "0"),
        errors="coerce",
    ).fillna(0.0)

    # Convert target to binary
    df["Churn"] = df["Churn"].map({"Yes": 1, "No": 0}).astype(int)

    # Label encode selected categorical columns
    label_encoders: dict[str, LabelEncoder] = {}
    for col in CATEGORICAL_COLUMNS:
        if col in df.columns:
            encoder = LabelEncoder()
            df[col] = encoder.fit_transform(df[col].astype(str))
            label_encoders[col] = encoder

    X = df.drop(columns=["Churn"])
    y = df["Churn"]
    return X, y, label_encoders


def train_model() -> dict[str, float]:
    """Train the XGBoost model, evaluate metrics, and persist artifacts."""
    MODELS_DIR.mkdir(parents=True, exist_ok=True)

    X, y, label_encoders = load_and_preprocess_data()
    feature_names = X.columns.tolist()

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=42,
        stratify=y,
    )

    smote = SMOTE(random_state=42)
    X_train_balanced, y_train_balanced = smote.fit_resample(X_train, y_train)

    model = XGBClassifier(
        n_estimators=200,
        max_depth=6,
        learning_rate=0.1,
        random_state=42,
        objective="binary:logistic",
        eval_metric="logloss",
        n_jobs=-1,
    )
    model.fit(X_train_balanced, y_train_balanced)

    y_pred = model.predict(X_test)
    y_proba = model.predict_proba(X_test)[:, 1]

    metrics = {
        "accuracy": accuracy_score(y_test, y_pred),
        "precision": precision_score(y_test, y_pred, zero_division=0),
        "recall": recall_score(y_test, y_pred, zero_division=0),
        "f1": f1_score(y_test, y_pred, zero_division=0),
        "auc_roc": roc_auc_score(y_test, y_proba),
    }

    print("\nModel Performance:")
    print(f"Accuracy : {metrics['accuracy']:.4f}")
    print(f"Precision: {metrics['precision']:.4f}")
    print(f"Recall   : {metrics['recall']:.4f}")
    print(f"F1 Score : {metrics['f1']:.4f}")
    print(f"AUC-ROC  : {metrics['auc_roc']:.4f}")

    with open(MODELS_DIR / "label_encoders.pkl", "wb") as f:
        pickle.dump(label_encoders, f)

    with open(MODELS_DIR / "churn_model.pkl", "wb") as f:
        pickle.dump(model, f)

    with open(MODELS_DIR / "feature_names.pkl", "wb") as f:
        pickle.dump(feature_names, f)

    sample_size = min(500, len(X_train))
    sample_data = X_train.sample(n=sample_size, random_state=42).reset_index(drop=True)
    with open(MODELS_DIR / "sample_data.pkl", "wb") as f:
        pickle.dump(sample_data, f)

    print(f"\nSaved model artifacts to: {MODELS_DIR}")
    return metrics


if __name__ == "__main__":
    train_model()
