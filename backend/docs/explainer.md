# `explainer.py` — SHAP explainability engine (what + why)

Source: `backend/explainer.py`

## Brief (why this file exists)

Model scores alone are not enough for business decisions. `explainer.py` provides explainability for both:

- **Global** importance (dataset-wide)
- **Local** contribution (single-customer prediction)

## Brief (what this file does)

- Loads model + feature metadata + SHAP background sample
- Builds `shap.TreeExplainer(model)` once (cached)
- Normalizes SHAP outputs across library/model shape differences
- Returns top global drivers and row-level contributions

## Detailed flow

### Artifact setup

`_load_artifacts()` loads and caches:
- `churn_model.pkl`
- `feature_names.pkl`
- `sample_data.pkl`
- initialized SHAP explainer

Why: reusing explainer/artifacts reduces repeated setup overhead.

### SHAP output normalization

`_normalize_shap_values(raw_values)` handles:
- list outputs
- 2D arrays
- 3D arrays (`samples x features x classes`)

It always returns a 2D matrix `(n_samples, n_features)`.

Why: SHAP output shape can vary by version and model internals.

### Base value extraction

`_extract_base_value(expected_value)` robustly converts scalar/list/array expected values into one float.

### Global explanation

`get_global_importance()`:
1. computes SHAP on cached sample background
2. calculates mean absolute impact per feature
3. sorts descending
4. returns top 10 with rounded scores

### Local explanation

`get_shap_explanation(customer_df)`:
1. reindexes row to training `feature_names`
2. computes row SHAP vector
3. computes baseline + prediction probability
4. returns feature-contribution dictionary + metadata

## Why this design works

- Consistent shape handling avoids runtime surprises.
- Strict feature ordering prevents invalid explanations.
- Returning dictionary output keeps frontend rendering straightforward.

## Direct-run usage

Running `python explainer.py` prints:
- current global top features
- one sample row explanation
