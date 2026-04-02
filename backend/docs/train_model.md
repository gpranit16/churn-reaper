# `train_model.py` — training + artifact generation (what + why)

Source: `backend/train_model.py`

## Brief (why this file exists)

All runtime inference/explainability depends on artifacts produced here. If this file is not run successfully, prediction endpoints cannot work.

## Brief (what this file does)

- Loads and preprocesses Telco churn dataset
- Encodes categorical features
- Splits train/test
- Applies SMOTE on train set
- Trains XGBoost classifier
- Evaluates on untouched test set
- Saves model + metadata artifacts used by backend services

## Detailed pipeline

1. Load `data/telco_churn.csv`
2. Drop ID column (`CustomerID`/`customerID`) if present
3. Clean `TotalCharges` to numeric
4. Map target `Churn` to binary (Yes=1, No=0)
5. Label-encode configured categorical columns
6. Split with `test_size=0.2`, `random_state=42`, `stratify=y`
7. Balance train split with `SMOTE(random_state=42)`
8. Train `XGBClassifier`:
	- `n_estimators=200`
	- `max_depth=6`
	- `learning_rate=0.1`
	- `objective='binary:logistic'`
	- `eval_metric='logloss'`
9. Compute metrics:
	- accuracy
	- precision
	- recall
	- F1
	- AUC-ROC
10. Save artifacts to `models/`

## Artifacts produced

- `churn_model.pkl`
- `label_encoders.pkl`
- `feature_names.pkl`
- `sample_data.pkl` (up to 500 rows for SHAP background)

## Why this design is stable

- SMOTE only on training data avoids leakage.
- Persisting encoders/feature order prevents train-inference mismatch.
- Persisting sample background keeps SHAP explanations consistent.
