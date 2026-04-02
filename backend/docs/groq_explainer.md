# `groq_explainer.py` — LLM layer for explanation + strategy (what + why)

Source: `backend/groq_explainer.py`

## Brief (why this file exists)

The model output is numeric; business users need natural-language reasoning and actionable strategy. This module converts prediction context into readable analyst-style output.

## Brief (what this file does)

- Loads `backend/.env`
- Initializes Groq client (if key exists)
- Uses a configurable active model (`GROQ_MODEL_NAME`, default `llama-3.1-8b-instant`)
- Applies timeout/retry controls
- Generates:
	- churn explanation text
	- structured retention offers (JSON)
	- executive summary text

## Environment variables

- `GROQ_API_KEY`
- `GROQ_MODEL_NAME` (default: `llama-3.1-8b-instant`)
- `GROQ_TIMEOUT_SECONDS` (default: `6`)
- `GROQ_MAX_RETRIES` (default: `0`)

## Detailed function behavior

### `_chat(...)`

Centralized call wrapper for Groq chat completions with system prompt and prompt-specific controls.

### `explain_churn_reason(...)`

- Uses profile + SHAP top factors + risk band
- Produces 3–4 sentence plain-English explanation
- Enforces INR context in prompt

### `generate_retention_strategy(...)`

- Requests exactly 3 offers in strict JSON schema
- Parses with `_safe_json_loads(...)`
- Sanitizes each offer field before returning
- Returns `[]` if parsing fails

For best Dynamic ROI quality downstream (`calculate_dynamic_roi`):
- keep `expected_impact` numeric and explicit (e.g., `12-18%`)
- mention INR cost clearly in `offer_detail` when possible (e.g., `₹499/month`)
- include duration text if relevant (e.g., `for 3 months`)

### `generate_executive_summary(analytics_data, use_llm=True)`

- If `use_llm=False` or client missing => deterministic fallback summary
- Otherwise attempts LLM summary and falls back on any exception

## Internal reliability helpers

- `_top_shap_factors(...)`: deterministic top-impact string for prompts
- `_safe_json_loads(...)`: extracts object even if model wraps JSON in extra text
- `_build_executive_summary_fallback(...)`: stable no-network summary

## Current project usage

- Predict flow uses Groq explanation + offer generation when available.
- Dashboard summary path is currently called with `use_llm=False` from `main.py` for fast/stable dashboard loads.

## Why this design is practical

- Keeps user-facing narratives rich when LLM is available.
- Keeps system operational when LLM is unavailable/degraded.
- Makes model swaps simple via env var instead of code rewrite.
