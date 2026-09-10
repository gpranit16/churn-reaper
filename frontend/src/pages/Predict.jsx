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
  'font-mono text-[11px] text-on-surface-variant uppercase tracking-[0.16em]';
const FORM_CONTROL_CLASS =
  'w-full rounded-xl border border-primary/20 bg-surface-low/80 px-3 py-3 text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all';

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

    // If retention_strategy was not precomputed (e.g. from dataset view), fetch on-demand
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
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      {/* Header */}
      <header className="glass-panel p-6 md:p-8 lg:p-9 relative overflow-hidden">
        <div className="absolute -right-24 -top-24 h-52 w-52 rounded-full bg-primary/15 blur-[90px]" />
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="metric-chip mb-3">
              {isDatasetMode ? 'Dataset Customer Details' : 'Single Customer Analysis'}
            </div>
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight premium-gradient-text">
              {isDatasetMode ? `Customer ${datasetCustomerId}` : 'Churn Risk Prediction'}
            </h2>
            <p className="font-sans text-sm md:text-base text-on-surface mt-2 max-w-3xl leading-relaxed">
              {isDatasetMode
                ? `Inspecting exact dataset row and batch prediction outputs for customer ${datasetCustomerId}.`
                : 'Analyze churn risk with explainable signals, NVIDIA AI-powered retention recommendations, and business economics.'}
            </p>
          </div>

          {isDatasetMode && (
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleBackToDataset}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-primary/40 bg-primary/20 text-primary font-mono text-xs uppercase tracking-[0.14em] hover:bg-primary hover:text-slate-950 transition-all duration-300 shadow-[0_0_15px_rgba(34,211,238,0.25)]"
              >
                <ArrowLeft size={15} />
                Back to Dataset Results
              </button>
              <button
                type="button"
                onClick={handleSwitchToManual}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/15 bg-surface-high/30 text-xs font-mono uppercase tracking-[0.14em] text-on-surface-variant hover:text-on-surface hover:bg-white/5 transition-colors"
              >
                <RefreshCw size={14} />
                Switch to Manual
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Dataset Mode Alert Banner */}
      {isDatasetMode && (
        <div className="glass-panel border-l-4 border-primary p-4 rounded-r-xl flex items-center justify-between gap-4 luxury-border animate-in fade-in duration-300">
          <div className="flex items-center gap-3">
            <UserCheck className="text-primary shrink-0" size={20} />
            <div>
              <p className="font-mono text-xs uppercase tracking-wider text-primary font-bold">
                Dataset Mode — Source of Truth
              </p>
              <p className="font-sans text-xs text-on-surface-variant mt-0.5">
                Displaying batch prediction and explanation generated by the isolated Dataset Analysis model.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleBackToDataset}
            className="text-xs font-mono uppercase tracking-wider text-primary hover:underline shrink-0 hidden sm:inline"
          >
            ← Back to Results Table
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 xl:gap-8 items-start">
        {/* Left Column: Form Inputs */}
        <section className="xl:col-span-5 xl:min-h-[calc(100vh-12rem)]">
          <GlassCard
            glow
            floating={false}
            paddingClass="p-6 md:p-7"
            className="h-full xl:sticky xl:top-24 xl:min-h-[calc(100vh-12rem)]"
          >
            <div className="relative z-10 h-full flex flex-col">
              <div className="flex flex-wrap justify-between items-center gap-3">
                <h3 className="font-sans text-2xl font-semibold text-on-surface">
                  {isDatasetMode ? 'Customer Features' : 'Customer Inputs'}
                </h3>
                {!isDatasetMode && (
                  <button
                    type="button"
                    onClick={handleSample}
                    className="text-xs font-mono uppercase tracking-[0.2em] text-primary hover:text-cyan-300 transition-colors"
                    title="Load Demo Customer"
                  >
                    Auto-fill Sample
                  </button>
                )}
                {isDatasetMode && (
                  <span className="font-mono text-[11px] text-primary uppercase tracking-[0.16em] px-2.5 py-1 rounded bg-primary/10 border border-primary/20">
                    CSV Row Data
                  </span>
                )}
              </div>

              <form onSubmit={handleSubmit} className="mt-6 flex-1 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                  <div className="space-y-2">
                    <label className={FORM_LABEL_CLASS}>Tenure (Months)</label>
                    <input
                      type="number"
                      name="tenure"
                      value={formData.tenure ?? ''}
                      onChange={handleChange}
                      disabled={isDatasetMode}
                      className={`${FORM_CONTROL_CLASS} ${isDatasetMode ? 'opacity-85 cursor-not-allowed bg-surface-low/40' : ''}`}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className={FORM_LABEL_CLASS}>Monthly Charges (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      name="MonthlyCharges"
                      value={formData.MonthlyCharges ?? ''}
                      onChange={handleChange}
                      disabled={isDatasetMode}
                      className={`${FORM_CONTROL_CLASS} ${isDatasetMode ? 'opacity-85 cursor-not-allowed bg-surface-low/40' : ''}`}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className={FORM_LABEL_CLASS}>Contract Type</label>
                    {isDatasetMode ? (
                      <input
                        type="text"
                        value={formData.Contract || ''}
                        disabled
                        className={`${FORM_CONTROL_CLASS} opacity-85 cursor-not-allowed bg-surface-low/40`}
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

                  <div className="space-y-2">
                    <label className={FORM_LABEL_CLASS}>Internet Service</label>
                    {isDatasetMode ? (
                      <input
                        type="text"
                        value={formData.InternetService || ''}
                        disabled
                        className={`${FORM_CONTROL_CLASS} opacity-85 cursor-not-allowed bg-surface-low/40`}
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

                  <div className="space-y-2">
                    <label className={FORM_LABEL_CLASS}>Tech Support</label>
                    {isDatasetMode ? (
                      <input
                        type="text"
                        value={formData.TechSupport || ''}
                        disabled
                        className={`${FORM_CONTROL_CLASS} opacity-85 cursor-not-allowed bg-surface-low/40`}
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

                  <div className="space-y-2">
                    <label className={FORM_LABEL_CLASS}>Online Security</label>
                    {isDatasetMode ? (
                      <input
                        type="text"
                        value={formData.OnlineSecurity || ''}
                        disabled
                        className={`${FORM_CONTROL_CLASS} opacity-85 cursor-not-allowed bg-surface-low/40`}
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

                  <div className="space-y-2">
                    <label className={FORM_LABEL_CLASS}>Payment Method</label>
                    {isDatasetMode ? (
                      <input
                        type="text"
                        value={formData.PaymentMethod || ''}
                        disabled
                        className={`${FORM_CONTROL_CLASS} opacity-85 cursor-not-allowed bg-surface-low/40`}
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

                  <div className="space-y-2">
                    <label className={FORM_LABEL_CLASS}>Paperless Billing</label>
                    {isDatasetMode ? (
                      <input
                        type="text"
                        value={formData.PaperlessBilling || ''}
                        disabled
                        className={`${FORM_CONTROL_CLASS} opacity-85 cursor-not-allowed bg-surface-low/40`}
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

                  <div className="space-y-2 md:col-span-2 xl:col-span-1">
                    <label className={FORM_LABEL_CLASS}>Senior Citizen</label>
                    {isDatasetMode ? (
                      <input
                        type="text"
                        value={Number(formData.SeniorCitizen) === 1 ? 'Yes (1)' : 'No (0)'}
                        disabled
                        className={`${FORM_CONTROL_CLASS} opacity-85 cursor-not-allowed bg-surface-low/40`}
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

                <div className="p-4 rounded-xl bg-surface-high/25 border border-primary/15">
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant mb-1">Total Charges</p>
                  <p className="text-sm text-on-surface leading-relaxed">
                    Charges:{' '}
                    <span className="text-primary font-semibold">
                      {formatINR(Number(formData.TotalCharges || (Number(formData.tenure || 0) * Number(formData.MonthlyCharges || 0))), 2)}
                    </span>
                  </p>
                </div>

                {!isDatasetMode ? (
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3.5 rounded-xl bg-primary text-slate-950 font-bold text-sm tracking-[0.11em] transition-all duration-300 shadow-[0_0_24px_rgba(34,211,238,0.28)] hover:bg-cyan-300 disabled:opacity-50"
                  >
                    {isLoading ? 'Analyzing...' : 'Run Prediction'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleBackToDataset}
                    className="w-full py-3.5 rounded-xl bg-primary text-slate-950 font-bold text-sm tracking-[0.11em] transition-all duration-300 shadow-[0_0_24px_rgba(34,211,238,0.28)] hover:bg-cyan-300"
                  >
                    ← Back to Dataset Results
                  </button>
                )}
              </form>
            </div>
          </GlassCard>
        </section>

        {/* Right Column: Prediction Results & Insights */}
        <section className="xl:col-span-7 flex flex-col gap-6 xl:min-h-[calc(100vh-12rem)]">
          {error && (
            <div className="glass-panel border-l-4 border-tertiary p-5 rounded-r-xl luxury-border">
              <p className="font-mono text-tertiary text-sm">{error}</p>
            </div>
          )}

          {isLoading && !result && (
            <div className="glass-card rounded-2xl min-h-[520px] xl:min-h-[calc(100vh-16rem)] border border-primary/20 flex items-center justify-center">
              <p className="font-mono text-primary tracking-[0.16em] text-xs uppercase animate-pulse">Analyzing customer profile...</p>
            </div>
          )}

          {!result && !isLoading && !error && (
            <div className="flex-1 glass-card rounded-2xl flex items-center justify-center border border-dashed border-primary/20 min-h-[520px] xl:min-h-[calc(100vh-16rem)]">
              <p className="font-mono text-on-surface-variant tracking-[0.12em] text-xs text-center px-8 leading-relaxed uppercase">
                Fill the form and run prediction to view results
              </p>
            </div>
          )}

          {result && !isLoading && (
            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-700">
              {/* Churn Probability Banner */}
              <div className="glass-panel p-6 md:p-7 rounded-2xl relative overflow-hidden group luxury-border">
                <div
                  className={`absolute top-0 right-0 h-56 w-56 rounded-full blur-[90px] -mr-20 -mt-20 transition-opacity duration-1000 opacity-25 ${
                    result.risk_level === 'HIGH' ? 'bg-tertiary' : 'bg-primary'
                  }`}
                />
                <div className="metric-chip mb-4">
                  {isDatasetMode ? 'Batch Churn Probability' : 'Churn Probability'}
                </div>
                <div className="relative z-10 flex items-end gap-4 flex-wrap">
                  <p
                    className={`font-display text-5xl md:text-6xl font-bold tracking-tight ${
                      result.risk_level === 'HIGH'
                        ? 'text-tertiary risk-glow-text'
                        : result.risk_level === 'MEDIUM'
                        ? 'text-yellow-400'
                        : 'text-green-400 glow-text'
                    }`}
                  >
                    {result.churn_probability}%
                  </p>
                  <p className="text-on-surface text-sm md:text-base pb-2">
                    Risk Level:{' '}
                    <span
                      className={`font-bold px-2 py-0.5 rounded text-xs font-mono uppercase ${
                        result.risk_level === 'HIGH'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : result.risk_level === 'MEDIUM'
                          ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                          : 'bg-green-500/20 text-green-400 border border-green-500/30'
                      }`}
                    >
                      {result.risk_level}
                    </span>
                  </p>
                </div>
                <div className="relative z-10 mt-4 font-sans text-on-surface text-sm md:text-[15px] leading-relaxed">
                  {result.churn_explanation}
                </div>
              </div>

              {/* SHAP Factors Chart */}
              {hasShapValues && <ShapFactorsChart shapValues={result.shap_values} maxFeatures={8} />}

              {/* PRODUCTION SAAS RETENTION STRATEGY & ECONOMICS SECTION */}
              <div className="rounded-2xl border border-white/[0.08] bg-[#0b1322]/90 backdrop-blur-md p-6 sm:p-7 space-y-6 shadow-xl">
                {/* Section Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-white/[0.07]">
                  <div>
                    <h3 className="font-sans text-lg sm:text-xl font-bold text-white tracking-tight">
                      Retention Strategy &amp; Economics
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      AI-generated retention offers evaluated with backend financial economics
                    </p>
                  </div>
                  {retentionStrategy && (
                    <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-medium bg-slate-800/80 text-slate-300 border border-slate-700/60">
                        <Sparkles size={12} className="text-cyan-400" />
                        {retentionStrategy.provider === 'nvidia' ? 'NVIDIA Nemotron' : 'Deterministic Rules'}
                      </span>
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-mono font-medium bg-cyan-950/40 text-cyan-300 border border-cyan-800/40">
                        24M Horizon · 60% Margin
                      </span>
                    </div>
                  )}
                </div>

                {loadingRetention && !retentionStrategy && (
                  <div className="py-12 text-center space-y-3">
                    <div className="h-7 w-7 mx-auto rounded-full border-2 border-cyan-500/20 border-t-cyan-400 animate-spin" />
                    <p className="font-mono text-xs text-slate-400 animate-pulse">
                      Evaluating retention offers &amp; customer economics...
                    </p>
                  </div>
                )}

                {retentionStrategy && (
                  <>
                    {/* 1. Customer Financial Profile (Horizontal summary with clean dividers) */}
                    {retentionStrategy.customer_economics && (
                      <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4 sm:p-5">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-2 divide-y sm:divide-y-0 sm:divide-x divide-white/[0.06]">
                          <div className="sm:px-3 first:pl-0">
                            <span className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">
                              Remaining Horizon
                            </span>
                            <span className="text-base sm:text-lg font-bold text-slate-200">
                              {retentionStrategy.customer_economics.remaining_months}{' '}
                              <span className="text-xs font-normal text-slate-400 font-sans">Months</span>
                            </span>
                          </div>
                          <div className="pt-3 sm:pt-0 sm:px-3">
                            <span className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">
                              Future Revenue
                            </span>
                            <span className="text-base sm:text-lg font-bold text-slate-200">
                              {formatINR(retentionStrategy.customer_economics.future_revenue)}
                            </span>
                          </div>
                          <div className="pt-3 sm:pt-0 sm:px-3">
                            <span className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">
                              Revenue at Risk
                            </span>
                            <span className="text-base sm:text-lg font-bold text-amber-400">
                              {formatINR(retentionStrategy.customer_economics.expected_revenue_at_risk)}
                            </span>
                          </div>
                          <div className="pt-3 sm:pt-0 sm:px-3 last:pr-0">
                            <span className="block text-[10px] font-mono text-cyan-400 uppercase tracking-wider mb-1 font-semibold">
                              Profit at Risk
                            </span>
                            <span className="text-lg sm:text-xl font-bold text-cyan-300">
                              {formatINR(retentionStrategy.customer_economics.expected_profit_at_risk)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 2. Recommended Action (Focal decision panel) */}
                    {retentionStrategy.best_offer && (
                      <div
                        className={`rounded-xl border p-5 sm:p-6 space-y-4 transition-all ${
                          retentionStrategy.decision_code === 'RETAIN'
                            ? 'bg-gradient-to-b from-cyan-950/25 to-slate-900/40 border-cyan-500/30 shadow-[0_4px_20px_rgba(0,0,0,0.25)]'
                            : 'bg-slate-900/50 border-slate-700/50'
                        }`}
                      >
                        {/* Header Row */}
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                            <Award size={15} />
                            Recommended Strategy Action
                          </span>
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide border ${
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

                        {/* Title & Reason */}
                        <div>
                          <h4 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                            {retentionStrategy.best_offer.title}
                          </h4>
                          <p className="text-xs text-slate-300 mt-1.5 leading-relaxed max-w-3xl">
                            {retentionStrategy.best_offer.reason}
                          </p>
                        </div>

                        {/* Financial Impact Breakdown (Separate Net Benefit & ROI) */}
                        <div className="pt-4 border-t border-white/[0.08]">
                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-white/[0.06]">
                            <div className="sm:px-2 first:pl-0">
                              <span className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">
                                Retention Cost
                              </span>
                              <span className="text-base font-semibold text-slate-200">
                                {formatINR(retentionStrategy.best_offer.retention_cost)}
                              </span>
                            </div>
                            <div className="pt-3 sm:pt-0 sm:px-2">
                              <span className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">
                                Scenario Success
                              </span>
                              <span className="text-base font-semibold text-cyan-300">
                                {retentionStrategy.best_offer.scenario_success_rate}%
                              </span>
                            </div>
                            <div className="pt-3 sm:pt-0 sm:px-2">
                              <span className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">
                                Value Protected
                              </span>
                              <span className="text-base font-semibold text-slate-200">
                                {formatINR(retentionStrategy.best_offer.expected_value_protected)}
                              </span>
                            </div>
                            <div className="pt-3 sm:pt-0 sm:px-2">
                              <span className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">
                                Net Benefit
                              </span>
                              <span
                                className={`text-base font-bold ${
                                  retentionStrategy.best_offer.net_benefit > 0 ? 'text-emerald-400' : 'text-rose-400'
                                }`}
                              >
                                {formatINR(retentionStrategy.best_offer.net_benefit)}
                              </span>
                            </div>
                            <div className="pt-3 sm:pt-0 sm:px-2 last:pr-0">
                              <span className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1 font-semibold">
                                Expected ROI
                              </span>
                              <span
                                className={`text-xl font-bold tracking-tight ${
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

                    {/* 3. All Evaluated Strategy Options (Clean 3-scenario comparison grid) */}
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400">
                          Evaluated Strategy Scenarios (3 Options)
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {retentionStrategy.offers.map((offer, idx) => {
                          const isBest =
                            retentionStrategy.best_offer &&
                            offer.type === retentionStrategy.best_offer.type;

                          return (
                            <div
                              key={idx}
                              className={`rounded-xl border p-4 sm:p-5 flex flex-col justify-between transition-all ${
                                isBest
                                  ? 'bg-cyan-950/15 border-cyan-500/35 shadow-sm'
                                  : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12]'
                              }`}
                            >
                              <div className="space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-slate-800/80 text-slate-300 border border-slate-700/60">
                                    {offer.type === 'discount'
                                      ? 'Discount'
                                      : offer.type === 'support'
                                      ? 'Support Package'
                                      : 'Contract Switch'}
                                  </span>
                                  {isBest && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-cyan-500/10 text-cyan-300 border border-cyan-500/25 font-semibold">
                                      Recommended
                                    </span>
                                  )}
                                </div>
                                <h5 className="font-semibold text-sm text-slate-100 leading-snug">
                                  {offer.title}
                                </h5>
                                <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                                  {offer.reason}
                                </p>
                              </div>

                              <div className="pt-4 mt-3 border-t border-white/[0.06] space-y-1.5 text-xs font-mono">
                                <div className="flex justify-between">
                                  <span className="text-slate-400">Cost:</span>
                                  <span className="text-slate-200 font-medium">{formatINR(offer.retention_cost)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-400">Scenario Success:</span>
                                  <span className="text-cyan-300">{offer.scenario_success_rate}%</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-400">Value Protected:</span>
                                  <span className="text-slate-200 font-medium">{formatINR(offer.expected_value_protected)}</span>
                                </div>
                                <div className="flex justify-between pt-2 border-t border-white/[0.06]">
                                  <span className="text-slate-400">Net Benefit:</span>
                                  <span className={`font-semibold ${offer.net_benefit > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {formatINR(offer.net_benefit)}
                                  </span>
                                </div>
                                <div className="flex justify-between items-baseline">
                                  <span className="text-slate-400 font-semibold">ROI:</span>
                                  <span className={`text-sm font-bold ${offer.roi > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {offer.roi}x
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* 4. Footnote Disclaimer */}
                    <p className="text-[11px] text-slate-500 italic text-center pt-2">
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