import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePredict } from '../hooks/usePredict';
import { churnApi } from '../services/api';
import { datasetStore } from '../services/datasetStore';
import GlassCard from '../components/GlassCard';
import ShapFactorsChart from '../components/ShapFactorsChart';
import { formatINR } from '../utils/currency';
import {
  ArrowLeft,
  UserCheck,
  Sparkles,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Coins,
  ShieldCheck,
  Award,
  Zap,
} from 'lucide-react';

const SELECTED_CUSTOMER_KEY = 'selectedDatasetCustomer';

const BASE_CUSTOMER_PROFILE = {
  gender: 'Female',
  SeniorCitizen: 0,
  Partner: 'No',
  Dependents: 'No',
  tenure: 12,
  PhoneService: 'Yes',
  MultipleLines: 'No',
  InternetService: 'Fiber optic',
  OnlineSecurity: 'No',
  OnlineBackup: 'No',
  DeviceProtection: 'No',
  TechSupport: 'No',
  StreamingTV: 'No',
  StreamingMovies: 'No',
  Contract: 'Month-to-month',
  PaperlessBilling: 'Yes',
  PaymentMethod: 'Electronic check',
  MonthlyCharges: 85,
  TotalCharges: 1020,
};

const FORM_LABEL_CLASS =
  'block font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-on-surface-variant mb-1.5';
const FORM_CONTROL_CLASS =
  'w-full rounded-lg border border-white/[0.1] bg-surface-low px-3 py-2 text-sm text-on-surface focus:border-brand-light focus:outline-none focus:ring-1 focus:ring-brand-light/30 transition-colors';

export default function Predict() {
  const navigate = useNavigate();
  const { predict, getSample, result, setResult, isLoading, error } = usePredict();
  const [formData, setFormData] = useState(BASE_CUSTOMER_PROFILE);
  const [isDatasetMode, setIsDatasetMode] = useState(false);
  const [datasetCustomerId, setDatasetCustomerId] = useState('');
  const [retentionStrategy, setRetentionStrategy] = useState(null);
  const [loadingRetention, setLoadingRetention] = useState(false);

  // Check for dataset-selected customer on mount
  useEffect(() => {
    const fromStore = datasetStore.getSelectedCustomer();
    let data = fromStore;
    if (!data) {
      try {
        const stored = sessionStorage.getItem(SELECTED_CUSTOMER_KEY);
        data = stored ? JSON.parse(stored) : null;
      } catch {
        data = null;
      }
    }

    if (data && data.source === 'dataset') {
      setFormData((prev) => ({
        ...prev,
        ...data.formData,
      }));
      setResult(data.result || null);
      setIsDatasetMode(true);
      setDatasetCustomerId(data.customer_id || 'Dataset Customer');
    }
  }, [setResult]);

  // Sync / fetch retention strategy when result is updated
  useEffect(() => {
    if (!result) {
      setRetentionStrategy(null);
      return;
    }

    if (result.retention_strategy) {
      setRetentionStrategy(result.retention_strategy);
      return;
    }

    let isMounted = true;
    const fetchRetention = async () => {
      setLoadingRetention(true);
      try {
        const strategy = await churnApi.getRetentionStrategy({
          customer_data: formData,
          churn_probability: result.churn_probability,
          shap_values: result.shap_values || null,
        });
        if (isMounted) {
          setRetentionStrategy(strategy);
        }
      } catch (err) {
        console.warn('Retention strategy evaluation failed:', err);
      } finally {
        if (isMounted) {
          setLoadingRetention(false);
        }
      }
    };

    fetchRetention();
    return () => {
      isMounted = false;
    };
  }, [result, formData]);

  const handleChange = (e) => {
    if (isDatasetMode) return;
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const buildPayload = () => {
    const tenure = Number(formData.tenure || 0);
    const monthlyCharges = Number(formData.MonthlyCharges || 0);

    const payload = {
      ...BASE_CUSTOMER_PROFILE,
      ...formData,
      SeniorCitizen: Number(formData.SeniorCitizen || 0),
      tenure,
      MonthlyCharges: monthlyCharges,
      TotalCharges: Number((tenure * monthlyCharges).toFixed(2)),
    };

    if (payload.InternetService === 'No') {
      payload.OnlineSecurity = 'No internet service';
      payload.OnlineBackup = 'No internet service';
      payload.DeviceProtection = 'No internet service';
      payload.TechSupport = 'No internet service';
      payload.StreamingTV = 'No internet service';
      payload.StreamingMovies = 'No internet service';
    }

    if (payload.PhoneService === 'No') {
      payload.MultipleLines = 'No phone service';
    }

    return payload;
  };

  const handleSample = async () => {
    if (isDatasetMode) return;
    const sample = await getSample();
    if (sample) {
      setFormData((prev) => ({ ...prev, ...sample }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isDatasetMode) return;
    predict(buildPayload());
  };

  const handleBackToDataset = () => {
    navigate('/dataset-analysis');
  };

  const handleSwitchToManual = () => {
    datasetStore.clearSelectedCustomer();
    setIsDatasetMode(false);
    setDatasetCustomerId('');
    setResult(null);
    setRetentionStrategy(null);
    setFormData(BASE_CUSTOMER_PROFILE);
  };

  const hasShapValues = useMemo(() => {
    if (!result?.shap_values || typeof result.shap_values !== 'object') return false;
    return Object.keys(result.shap_values).length > 0;
  }, [result]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <header className="rounded-xl border border-white/[0.08] bg-surface p-5 sm:p-6 shadow-panel flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-brand-light">
              {isDatasetMode ? 'Batch Dataset Inspection' : 'Single Customer Risk Profiler'}
            </span>
            <span className="text-white/[0.2] text-xs">/</span>
            <span className="text-xs text-on-surface-muted">
              {isDatasetMode ? `Row ID: ${datasetCustomerId}` : 'Live Inference'}
            </span>
          </div>
          <h1 className="font-sans text-xl sm:text-2xl font-bold text-white tracking-tight">
            {isDatasetMode ? `Customer Analysis (${datasetCustomerId})` : 'Customer Churn & Retention Intelligence'}
          </h1>
          <p className="text-xs sm:text-sm text-on-surface-variant mt-1 max-w-3xl">
            {isDatasetMode
              ? `Inspecting batch prediction and explainability scores from dataset row ${datasetCustomerId}.`
              : 'Calculate churn risk with XGBoost, explain drivers with SHAP, and evaluate retention economics with NVIDIA Nemotron.'}
          </p>
        </div>

        {isDatasetMode && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleBackToDataset}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-brand/40 bg-brand/15 text-brand-light text-xs font-semibold hover:bg-brand hover:text-white transition-colors"
            >
              <ArrowLeft size={14} />
              Dataset Table
            </button>
            <button
              type="button"
              onClick={handleSwitchToManual}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.1] bg-surface-low text-xs text-on-surface-variant hover:text-white hover:bg-surface-high transition-colors"
            >
              <RefreshCw size={13} />
              Manual Mode
            </button>
          </div>
        )}
      </header>

      {/* Dataset Mode Alert */}
      {isDatasetMode && (
        <div className="rounded-lg border border-brand/30 bg-brand/10 p-3.5 flex items-center justify-between gap-3 text-xs text-brand-light">
          <div className="flex items-center gap-2.5">
            <UserCheck size={16} className="text-brand-light shrink-0" />
            <span>
              <strong>Dataset Mode Active:</strong> Customer profile fields are read-only to preserve dataset integrity.
            </span>
          </div>
          <button
            type="button"
            onClick={handleBackToDataset}
            className="font-mono underline hover:text-white shrink-0 hidden sm:inline"
          >
            Return to Ledger
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Column: Form Inputs */}
        <section className="xl:col-span-5">
          <GlassCard paddingClass="p-5 sm:p-6" className="space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div>
                <h3 className="font-sans text-base font-semibold text-white tracking-tight">
                  {isDatasetMode ? 'Customer Parameters' : 'Customer Profile Inputs'}
                </h3>
                <p className="text-xs text-on-surface-muted mt-0.5">
                  Input features for the XGBoost model
                </p>
              </div>
              {!isDatasetMode && (
                <button
                  type="button"
                  onClick={handleSample}
                  className="font-mono text-xs text-brand-light hover:underline uppercase tracking-wider"
                  title="Load sample customer profile"
                >
                  Auto-fill Sample
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className={FORM_LABEL_CLASS}>Tenure (Months)</label>
                  <input
                    type="number"
                    name="tenure"
                    value={formData.tenure ?? ''}
                    onChange={handleChange}
                    disabled={isDatasetMode}
                    className={`${FORM_CONTROL_CLASS} ${isDatasetMode ? 'opacity-75 cursor-not-allowed bg-surface-low/50' : ''}`}
                  />
                </div>

                <div>
                  <label className={FORM_LABEL_CLASS}>Monthly Charges (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="MonthlyCharges"
                    value={formData.MonthlyCharges ?? ''}
                    onChange={handleChange}
                    disabled={isDatasetMode}
                    className={`${FORM_CONTROL_CLASS} ${isDatasetMode ? 'opacity-75 cursor-not-allowed bg-surface-low/50' : ''}`}
                  />
                </div>

                <div>
                  <label className={FORM_LABEL_CLASS}>Contract Type</label>
                  {isDatasetMode ? (
                    <input
                      type="text"
                      value={formData.Contract || ''}
                      disabled
                      className={`${FORM_CONTROL_CLASS} opacity-75 cursor-not-allowed bg-surface-low/50`}
                    />
                  ) : (
                    <select
                      name="Contract"
                      value={formData.Contract}
                      onChange={handleChange}
                      className={FORM_CONTROL_CLASS}
                    >
                      <option value="Month-to-month">Month-to-month</option>
                      <option value="One year">One year</option>
                      <option value="Two year">Two year</option>
                    </select>
                  )}
                </div>

                <div>
                  <label className={FORM_LABEL_CLASS}>Internet Service</label>
                  {isDatasetMode ? (
                    <input
                      type="text"
                      value={formData.InternetService || ''}
                      disabled
                      className={`${FORM_CONTROL_CLASS} opacity-75 cursor-not-allowed bg-surface-low/50`}
                    />
                  ) : (
                    <select
                      name="InternetService"
                      value={formData.InternetService}
                      onChange={handleChange}
                      className={FORM_CONTROL_CLASS}
                    >
                      <option value="Fiber optic">Fiber optic</option>
                      <option value="DSL">DSL</option>
                      <option value="No">No</option>
                    </select>
                  )}
                </div>

                <div>
                  <label className={FORM_LABEL_CLASS}>Tech Support</label>
                  {isDatasetMode ? (
                    <input
                      type="text"
                      value={formData.TechSupport || ''}
                      disabled
                      className={`${FORM_CONTROL_CLASS} opacity-75 cursor-not-allowed bg-surface-low/50`}
                    />
                  ) : (
                    <select
                      name="TechSupport"
                      value={formData.TechSupport}
                      onChange={handleChange}
                      className={FORM_CONTROL_CLASS}
                    >
                      <option value="No">No</option>
                      <option value="Yes">Yes</option>
                    </select>
                  )}
                </div>

                <div>
                  <label className={FORM_LABEL_CLASS}>Online Security</label>
                  {isDatasetMode ? (
                    <input
                      type="text"
                      value={formData.OnlineSecurity || ''}
                      disabled
                      className={`${FORM_CONTROL_CLASS} opacity-75 cursor-not-allowed bg-surface-low/50`}
                    />
                  ) : (
                    <select
                      name="OnlineSecurity"
                      value={formData.OnlineSecurity}
                      onChange={handleChange}
                      className={FORM_CONTROL_CLASS}
                    >
                      <option value="No">No</option>
                      <option value="Yes">Yes</option>
                    </select>
                  )}
                </div>

                <div>
                  <label className={FORM_LABEL_CLASS}>Payment Method</label>
                  {isDatasetMode ? (
                    <input
                      type="text"
                      value={formData.PaymentMethod || ''}
                      disabled
                      className={`${FORM_CONTROL_CLASS} opacity-75 cursor-not-allowed bg-surface-low/50`}
                    />
                  ) : (
                    <select
                      name="PaymentMethod"
                      value={formData.PaymentMethod}
                      onChange={handleChange}
                      className={FORM_CONTROL_CLASS}
                    >
                      <option value="Electronic check">Electronic check</option>
                      <option value="Mailed check">Mailed check</option>
                      <option value="Bank transfer (automatic)">Bank transfer (automatic)</option>
                      <option value="Credit card (automatic)">Credit card (automatic)</option>
                    </select>
                  )}
                </div>

                <div>
                  <label className={FORM_LABEL_CLASS}>Paperless Billing</label>
                  {isDatasetMode ? (
                    <input
                      type="text"
                      value={formData.PaperlessBilling || ''}
                      disabled
                      className={`${FORM_CONTROL_CLASS} opacity-75 cursor-not-allowed bg-surface-low/50`}
                    />
                  ) : (
                    <select
                      name="PaperlessBilling"
                      value={formData.PaperlessBilling}
                      onChange={handleChange}
                      className={FORM_CONTROL_CLASS}
                    >
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label className={FORM_LABEL_CLASS}>Senior Citizen</label>
                  {isDatasetMode ? (
                    <input
                      type="text"
                      value={Number(formData.SeniorCitizen) === 1 ? 'Yes (1)' : 'No (0)'}
                      disabled
                      className={`${FORM_CONTROL_CLASS} opacity-75 cursor-not-allowed bg-surface-low/50`}
                    />
                  ) : (
                    <select
                      name="SeniorCitizen"
                      value={formData.SeniorCitizen}
                      onChange={handleChange}
                      className={FORM_CONTROL_CLASS}
                    >
                      <option value={0}>No</option>
                      <option value={1}>Yes</option>
                    </select>
                  )}
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-surface-low border border-white/[0.06] flex items-center justify-between">
                <span className="font-mono text-[11px] text-on-surface-muted uppercase tracking-wider">Calculated Total Charges</span>
                <span className="font-mono text-sm font-semibold text-white">
                  {formatINR(Number(formData.TotalCharges || (Number(formData.tenure || 0) * Number(formData.MonthlyCharges || 0))), 2)}
                </span>
              </div>

              {!isDatasetMode ? (
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 px-6 rounded-lg bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-400 hover:via-blue-500 hover:to-indigo-500 text-white font-bold text-sm tracking-wide shadow-[0_4px_20px_rgba(2,132,199,0.45)] border border-sky-400/40 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Sparkles size={16} className="text-sky-200" />
                  <span>{isLoading ? 'Running Inference...' : 'Calculate Churn Probability'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleBackToDataset}
                  className="w-full py-3.5 px-6 rounded-lg bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-400 hover:via-blue-500 hover:to-indigo-500 text-white font-bold text-sm tracking-wide shadow-[0_4px_20px_rgba(2,132,199,0.45)] border border-sky-400/40 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99]"
                >
                  <Sparkles size={16} className="text-sky-200" />
                  <span>Return to Dataset Results</span>
                </button>
              )}
            </form>
          </GlassCard>
        </section>
        {/* Right Column: Prediction Results & Insights */}
        <section className="xl:col-span-7 space-y-6">
          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs font-mono text-red-400">
              {error}
            </div>
          )}

          {isLoading && !result && (
            <div className="rounded-xl border border-white/[0.08] bg-surface p-12 flex flex-col items-center justify-center gap-3 text-center min-h-[380px]">
              <div className="h-6 w-6 rounded-full border-2 border-brand-light/30 border-t-brand-light animate-spin" />
              <p className="font-mono text-xs text-on-surface-variant uppercase tracking-wider">
                Processing customer profile through XGBoost...
              </p>
            </div>
          )}

          {!result && !isLoading && !error && (
            <div className="rounded-xl border border-dashed border-white/[0.1] bg-surface-low/50 p-12 flex flex-col items-center justify-center gap-2 text-center min-h-[380px]">
              <AlertCircle size={24} className="text-on-surface-muted" />
              <p className="font-sans text-sm font-medium text-on-surface">Ready for Inference</p>
              <p className="font-sans text-xs text-on-surface-muted max-w-sm">
                Adjust parameters on the left or click "Auto-fill Sample", then run prediction to generate risk analytics.
              </p>
            </div>
          )}

          {result && !isLoading && (
            <div className="space-y-6">
              {/* Churn Probability Banner */}
              <GlassCard paddingClass="p-5 sm:p-6" className="space-y-4">
                <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
                  <span className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-on-surface-variant">
                    {isDatasetMode ? 'Batch Model Inference' : 'Churn Probability Score'}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-mono font-semibold uppercase tracking-wider border ${
                      result.risk_level === 'HIGH'
                        ? 'bg-red-500/10 text-red-400 border-red-500/30'
                        : result.risk_level === 'MEDIUM'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    }`}
                  >
                    {result.risk_level} Risk
                  </span>
                </div>

                <div className="flex items-baseline gap-4 flex-wrap">
                  <span
                    className={`font-mono text-5xl lg:text-6xl font-bold tracking-tight tabular-numbers ${
                      result.risk_level === 'HIGH'
                        ? 'text-red-400'
                        : result.risk_level === 'MEDIUM'
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {result.churn_probability}%
                  </span>
                  <div className="text-xs text-on-surface-muted max-w-md leading-relaxed">
                    Estimated probability of customer cancellation within current contractual cycle.
                  </div>
                </div>

                <div className="rounded-lg bg-surface-low p-3.5 border border-white/[0.06] text-xs text-on-surface-variant leading-relaxed">
                  {result.churn_explanation}
                </div>
              </GlassCard>

              {/* SHAP Factors Chart */}
              {hasShapValues && <ShapFactorsChart shapValues={result.shap_values} maxFeatures={8} />}

              {/* RETENTION STRATEGY & ECONOMICS */}
              <div className="rounded-xl border border-white/[0.08] bg-surface p-5 sm:p-6 space-y-5 shadow-panel">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.06]">
                  <div>
                    <h3 className="font-sans text-base sm:text-lg font-semibold text-white tracking-tight">
                      Retention Economics &amp; Strategy
                    </h3>
                    <p className="text-xs text-on-surface-muted mt-0.5">
                      NVIDIA Nemotron retention offers evaluated with backend financial economics
                    </p>
                  </div>
                  {retentionStrategy && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono bg-surface-low text-on-surface-variant border border-white/[0.08]">
                        <Sparkles size={12} className="text-brand-light" />
                        {retentionStrategy.provider === 'nvidia' ? 'NVIDIA Nemotron' : 'Rule Engine'}
                      </span>
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-mono bg-surface-low text-on-surface-muted border border-white/[0.06]">
                        24M Horizon · 60% Margin
                      </span>
                    </div>
                  )}
                </div>

                {loadingRetention && !retentionStrategy && (
                  <div className="py-8 text-center space-y-2">
                    <div className="h-6 w-6 mx-auto rounded-full border-2 border-brand-light/30 border-t-brand-light animate-spin" />
                    <p className="font-mono text-xs text-on-surface-muted">
                      Synthesizing retention offers &amp; calculating ROI...
                    </p>
                  </div>
                )}

                {retentionStrategy && (
                  <>
                    {/* 1. Customer Financial Profile */}
                    {retentionStrategy.customer_economics && (
                      <div className="rounded-lg bg-surface-low border border-white/[0.06] p-4">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-white/[0.06]">
                          <div className="sm:px-2 first:pl-0">
                            <span className="block text-[10px] font-mono text-on-surface-muted uppercase tracking-wider mb-1">
                              Remaining Horizon
                            </span>
                            <span className="font-mono text-base font-bold text-white tabular-numbers">
                              {retentionStrategy.customer_economics.remaining_months}{' '}
                              <span className="text-xs font-normal text-on-surface-muted font-sans">mo</span>
                            </span>
                          </div>
                          <div className="pt-3 sm:pt-0 sm:px-2">
                            <span className="block text-[10px] font-mono text-on-surface-muted uppercase tracking-wider mb-1">
                              Future Revenue
                            </span>
                            <span className="font-mono text-base font-bold text-white tabular-numbers">
                              {formatINR(retentionStrategy.customer_economics.future_revenue)}
                            </span>
                          </div>
                          <div className="pt-3 sm:pt-0 sm:px-2">
                            <span className="block text-[10px] font-mono text-amber-400/80 uppercase tracking-wider mb-1">
                              Revenue at Risk
                            </span>
                            <span className="font-mono text-base font-bold text-amber-400 tabular-numbers">
                              {formatINR(retentionStrategy.customer_economics.expected_revenue_at_risk)}
                            </span>
                          </div>
                          <div className="pt-3 sm:pt-0 sm:px-2 last:pr-0">
                            <span className="block text-[10px] font-mono text-brand-light uppercase tracking-wider mb-1">
                              Profit at Risk
                            </span>
                            <span className="font-mono text-base font-bold text-brand-light tabular-numbers">
                              {formatINR(retentionStrategy.customer_economics.expected_profit_at_risk)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 2. Recommended Action */}
                    {retentionStrategy.best_offer && (
                      <div
                        className={`rounded-xl border p-4 sm:p-5 space-y-3.5 ${
                          retentionStrategy.decision_code === 'RETAIN'
                            ? 'bg-brand/5 border-brand/30 shadow-sm'
                            : 'bg-surface-low border-white/[0.08]'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-brand-light flex items-center gap-1.5">
                            <Award size={14} />
                            Primary Strategic Decision
                          </span>
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono font-semibold tracking-wide border ${
                              retentionStrategy.decision_code === 'RETAIN'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                            }`}
                          >
                            {retentionStrategy.decision_code === 'RETAIN' ? (
                              <>
                                <CheckCircle2 size={13} />
                                RETAIN CUSTOMER
                              </>
                            ) : (
                              <>
                                <XCircle size={13} />
                                DO NOT SPEND
                              </>
                            )}
                          </span>
                        </div>

                        <div>
                          <h4 className="font-sans text-base font-bold text-white tracking-tight">
                            {retentionStrategy.best_offer.title}
                          </h4>
                          <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                            {retentionStrategy.best_offer.reason}
                          </p>
                        </div>

                        <div className="pt-3 border-t border-white/[0.06]">
                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 divide-y sm:divide-y-0 sm:divide-x divide-white/[0.06]">
                            <div className="sm:px-2 first:pl-0">
                              <span className="block text-[10px] font-mono text-on-surface-muted uppercase tracking-wider mb-0.5">
                                Retention Cost
                              </span>
                              <span className="font-mono text-sm font-semibold text-white tabular-numbers">
                                {formatINR(retentionStrategy.best_offer.retention_cost)}
                              </span>
                            </div>
                            <div className="pt-2 sm:pt-0 sm:px-2">
                              <span className="block text-[10px] font-mono text-on-surface-muted uppercase tracking-wider mb-0.5">
                                Scenario Success
                              </span>
                              <span className="font-mono text-sm font-semibold text-brand-light tabular-numbers">
                                {retentionStrategy.best_offer.scenario_success_rate}%
                              </span>
                            </div>
                            <div className="pt-2 sm:pt-0 sm:px-2">
                              <span className="block text-[10px] font-mono text-on-surface-muted uppercase tracking-wider mb-0.5">
                                Value Protected
                              </span>
                              <span className="font-mono text-sm font-semibold text-white tabular-numbers">
                                {formatINR(retentionStrategy.best_offer.expected_value_protected)}
                              </span>
                            </div>
                            <div className="pt-2 sm:pt-0 sm:px-2">
                              <span className="block text-[10px] font-mono text-on-surface-muted uppercase tracking-wider mb-0.5">
                                Net Benefit
                              </span>
                              <span
                                className={`font-mono text-sm font-bold tabular-numbers ${
                                  retentionStrategy.best_offer.net_benefit > 0 ? 'text-emerald-400' : 'text-rose-400'
                                }`}
                              >
                                {formatINR(retentionStrategy.best_offer.net_benefit)}
                              </span>
                            </div>
                            <div className="pt-2 sm:pt-0 sm:px-2 last:pr-0">
                              <span className="block text-[10px] font-mono text-brand-light uppercase tracking-wider mb-0.5 font-semibold">
                                Expected ROI
                              </span>
                              <span
                                className={`font-mono text-base font-bold tabular-numbers ${
                                  retentionStrategy.best_offer.roi > 0 ? 'text-emerald-400' : 'text-rose-400'
                                }`}
                              >
                                {retentionStrategy.best_offer.roi}x
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 3. Evaluated Strategy Comparison */}
                    <div className="space-y-3 pt-1">
                      <span className="text-[11px] font-mono font-medium uppercase tracking-wider text-on-surface-muted">
                        Evaluated Scenario Matrix
                      </span>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {retentionStrategy.offers.map((offer, idx) => {
                          const isBest =
                            retentionStrategy.best_offer &&
                            offer.type === retentionStrategy.best_offer.type;

                          return (
                            <div
                              key={idx}
                              className={`rounded-lg border p-3.5 flex flex-col justify-between space-y-3 transition-all ${
                                isBest
                                  ? 'bg-brand/10 border-brand/35'
                                  : 'bg-surface-low border-white/[0.06]'
                              }`}
                            >
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between gap-1.5">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-surface-high text-on-surface-variant border border-white/[0.08]">
                                    {offer.type === 'discount'
                                      ? 'Discount'
                                      : offer.type === 'support'
                                      ? 'Support'
                                      : 'Contract'}
                                  </span>
                                  {isBest && (
                                    <span className="text-[10px] font-mono font-semibold text-emerald-400 uppercase">
                                      Optimal
                                    </span>
                                  )}
                                </div>
                                <h5 className="font-semibold text-xs text-white leading-snug">
                                  {offer.title}
                                </h5>
                                <p className="text-[11px] text-on-surface-muted leading-relaxed line-clamp-2">
                                  {offer.reason}
                                </p>
                              </div>

                              <div className="pt-2.5 border-t border-white/[0.06] space-y-1 text-[11px] font-mono">
                                <div className="flex justify-between">
                                  <span className="text-on-surface-muted">Cost:</span>
                                  <span className="text-white tabular-numbers">{formatINR(offer.retention_cost)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-on-surface-muted">Success:</span>
                                  <span className="text-brand-light tabular-numbers">{offer.scenario_success_rate}%</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-on-surface-muted">Protected:</span>
                                  <span className="text-white tabular-numbers">{formatINR(offer.expected_value_protected)}</span>
                                </div>
                                <div className="flex justify-between pt-1 border-t border-white/[0.06]">
                                  <span className="text-on-surface-muted">Net:</span>
                                  <span className={`font-semibold tabular-numbers ${offer.net_benefit > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {formatINR(offer.net_benefit)}
                                  </span>
                                </div>
                                <div className="flex justify-between items-baseline">
                                  <span className="text-on-surface-muted">ROI:</span>
                                  <span className={`text-xs font-bold tabular-numbers ${offer.roi > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {offer.roi}x
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <p className="text-[11px] text-on-surface-muted italic text-center pt-1 font-sans">
                      * {retentionStrategy.disclaimer}
                    </p>
                  </>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}