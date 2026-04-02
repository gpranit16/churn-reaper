from __future__ import annotations

import os
from typing import Any

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from explainer import get_global_importance
from groq_explainer import generate_executive_summary
from predict import predict_churn

app = FastAPI(title="Churn Predictor API", version="1.0.0")

_cors_origins_env = os.getenv(
    "CORS_ALLOW_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174",
)
_cors_allow_origins = [origin.strip() for origin in _cors_origins_env.split(",") if origin.strip()]

_cors_allow_credentials = os.getenv("CORS_ALLOW_CREDENTIALS", "false").lower() == "true"
if "*" in _cors_allow_origins and _cors_allow_credentials:
    # CORS spec does not allow wildcard origin with credentials.
    _cors_allow_credentials = False

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_allow_origins,
    allow_credentials=_cors_allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)


class CustomerData(BaseModel):
    gender: str = "Female"
    SeniorCitizen: int = 0
    Partner: str = "No"
    Dependents: str = "No"
    tenure: int = 12
    PhoneService: str = "Yes"
    MultipleLines: str = "No"
    InternetService: str = "Fiber optic"
    OnlineSecurity: str = "No"
    OnlineBackup: str = "No"
    DeviceProtection: str = "No"
    TechSupport: str = "No"
    StreamingTV: str = "No"
    StreamingMovies: str = "No"
    Contract: str = "Month-to-month"
    PaperlessBilling: str = "Yes"
    PaymentMethod: str = "Electronic check"
    MonthlyCharges: float = 85.0
    TotalCharges: float | str = 1020.0


@app.post("/predict")
def predict(customer: CustomerData) -> dict[str, Any]:
    try:
        return predict_churn(customer.model_dump())
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {exc}") from exc


@app.get("/feature-importance")
def feature_importance() -> dict[str, Any]:
    try:
        return {"top_features": get_global_importance()}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Importance calculation failed: {exc}") from exc


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/dashboard-summary")
def dashboard_summary() -> dict[str, Any]:
    try:
        importance = get_global_importance()
        analytics_data = {
            "total_customers": 7043,
            "high_risk_count": 1200,
            "medium_risk_count": 1800,
            "revenue_at_risk": 23572000,
            "top_churn_reason": "Contract type",
        }
        summary = generate_executive_summary(analytics_data, use_llm=False)

        return {
            "executive_summary": summary,
            "feature_importance": importance,
            "analytics": analytics_data,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Dashboard summary failed: {exc}") from exc


@app.get("/sample-customer")
def sample_customer() -> dict[str, Any]:
    return {
        "gender": "Female",
        "SeniorCitizen": 1,
        "Partner": "No",
        "Dependents": "No",
        "tenure": 4,
        "PhoneService": "Yes",
        "MultipleLines": "Yes",
        "InternetService": "Fiber optic",
        "OnlineSecurity": "No",
        "OnlineBackup": "No",
        "DeviceProtection": "No",
        "TechSupport": "No",
        "StreamingTV": "Yes",
        "StreamingMovies": "Yes",
        "Contract": "Month-to-month",
        "PaperlessBilling": "Yes",
        "PaymentMethod": "Electronic check",
        "MonthlyCharges": 98.45,
        "TotalCharges": 395.2,
    }


if __name__ == "__main__":
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
