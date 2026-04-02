import { useMemo, useState } from 'react';
import { usePredict } from '../hooks/usePredict';
import GlassCard from '../components/GlassCard';
import ShapFactorsChart from '../components/ShapFactorsChart';
import { formatINR } from '../utils/currency';

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
  const { predict, getSample, result, isLoading, error } = usePredict();
  const [formData, setFormData] = useState(BASE_CUSTOMER_PROFILE);
  const [roiMode, setRoiMode] = useState('static');

  const handleChange = (e) => {
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
    const sample = await getSample();
    if (sample) {
      setFormData((prev) => ({ ...prev, ...sample }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    predict(buildPayload());
  };

  const hasShapValues = useMemo(() => {
    if (!result?.shap_values || typeof result.shap_values !== 'object') return false;
    return Object.keys(result.shap_values).length > 0;
  }, [result]);

  const hasDynamicRoi = useMemo(() => {
    return Boolean(result?.dynamic_roi_data);
  }, [result]);

  const activeRoiData = useMemo(() => {
    if (!result?.roi_data) return null;
    if (roiMode === 'dynamic' && result?.dynamic_roi_data) {
      return result.dynamic_roi_data;
    }
    return result.roi_data;
  }, [result, roiMode]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <header className="glass-panel p-6 md:p-8 lg:p-9 relative overflow-hidden">
        <div className="absolute -right-24 -top-24 h-52 w-52 rounded-full bg-primary/15 blur-[90px]" />
        <div className="relative z-10">
          <div className="metric-chip mb-4">Single Customer Analysis</div>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight premium-gradient-text">
            Churn Risk Prediction
          </h2>
          <p className="font-sans text-sm md:text-base text-on-surface mt-3 max-w-3xl leading-relaxed">
            Analyze churn risk with explainable signals, practical recommendations, and INR impact projections.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 xl:gap-8 items-start">
        <section className="xl:col-span-5 xl:min-h-[calc(100vh-12rem)]">
          <GlassCard
            glow
            floating={false}
            paddingClass="p-6 md:p-7"
            className="h-full xl:sticky xl:top-24 xl:min-h-[calc(100vh-12rem)]"
          >
            <div className="relative z-10 h-full flex flex-col">
              <div className="flex flex-wrap justify-between items-center gap-3">
                <h3 className="font-sans text-2xl font-semibold text-on-surface">Customer Inputs</h3>
                <button
                  type="button"
                  onClick={handleSample}
                  className="text-xs font-mono uppercase tracking-[0.2em] text-primary hover:text-cyan-300 transition-colors"
                  title="Load Demo Customer"
                >
                  Auto-fill Sample
                </button>
              </div>

              <form onSubmit={handleSubmit} className="mt-6 flex-1 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                  <div className="space-y-2">
                    <label className={FORM_LABEL_CLASS}>Tenure (Months)</label>
                    <input
                      type="number"
                      name="tenure"
                      value={formData.tenure}
                      onChange={handleChange}
                      className={FORM_CONTROL_CLASS}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className={FORM_LABEL_CLASS}>Monthly Charges (₹)</label>
                    <input
                      type="number"
                      name="MonthlyCharges"
                      step="0.01"
                      value={formData.MonthlyCharges}
                      onChange={handleChange}
                      className={FORM_CONTROL_CLASS}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className={FORM_LABEL_CLASS}>Contract Type</label>
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
                  </div>

                  <div className="space-y-2">
                    <label className={FORM_LABEL_CLASS}>Internet Service</label>
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
                  </div>

                  <div className="space-y-2">
                    <label className={FORM_LABEL_CLASS}>Tech Support</label>
                    <select
                      name="TechSupport"
                      value={formData.TechSupport}
                      onChange={handleChange}
                      className={FORM_CONTROL_CLASS}
                    >
                      <option value="No">No</option>
                      <option value="Yes">Yes</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className={FORM_LABEL_CLASS}>Online Security</label>
                    <select
                      name="OnlineSecurity"
                      value={formData.OnlineSecurity}
                      onChange={handleChange}
                      className={FORM_CONTROL_CLASS}
                    >
                      <option value="No">No</option>
                      <option value="Yes">Yes</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className={FORM_LABEL_CLASS}>Payment Method</label>
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
                  </div>

                  <div className="space-y-2">
                    <label className={FORM_LABEL_CLASS}>Paperless Billing</label>
                    <select
                      name="PaperlessBilling"
                      value={formData.PaperlessBilling}
                      onChange={handleChange}
                      className={FORM_CONTROL_CLASS}
                    >
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </div>

                  <div className="space-y-2 md:col-span-2 xl:col-span-1">
                    <label className={FORM_LABEL_CLASS}>Senior Citizen</label>
                    <select
                      name="SeniorCitizen"
                      value={formData.SeniorCitizen}
                      onChange={handleChange}
                      className={FORM_CONTROL_CLASS}
                    >
                      <option value={0}>No</option>
                      <option value={1}>Yes</option>
                    </select>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-surface-high/25 border border-primary/15">
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant mb-1">Auto Derived</p>
                  <p className="text-sm text-on-surface leading-relaxed">
                    Estimated Total Charges:{' '}
                    <span className="text-primary font-semibold">{formatINR(Number(formData.tenure || 0) * Number(formData.MonthlyCharges || 0), 2)}</span>
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-surface-high/20 border border-primary/15">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">ROI View</p>
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
                      {roiMode === 'dynamic' ? 'Dynamic' : 'Static'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => setRoiMode('static')}
                      className={`rounded-lg border px-3 py-2 text-xs font-mono uppercase tracking-[0.16em] transition-colors ${
                        roiMode === 'static'
                          ? 'border-primary bg-primary/20 text-primary'
                          : 'border-primary/20 bg-surface-low/60 text-on-surface-variant hover:border-primary/40'
                      }`}
                    >
                      Static ROI
                    </button>
                    <button
                      type="button"
                      onClick={() => setRoiMode('dynamic')}
                      disabled={!hasDynamicRoi}
                      className={`rounded-lg border px-3 py-2 text-xs font-mono uppercase tracking-[0.16em] transition-colors ${
                        roiMode === 'dynamic'
                          ? 'border-primary bg-primary/20 text-primary'
                          : 'border-primary/20 bg-surface-low/60 text-on-surface-variant hover:border-primary/40'
                      } disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                      Dynamic ROI
                    </button>
                  </div>
                  <p className="text-[11px] text-on-surface-variant mt-3 leading-relaxed">
                    {hasDynamicRoi
                      ? 'Dynamic ROI recalculates churn and financial impact using AI recommendation cost + expected impact.'
                      : 'Run prediction to enable dynamic ROI from recommended plans.'}
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 rounded-xl bg-primary text-slate-950 font-bold text-sm tracking-[0.11em] transition-all duration-300 shadow-[0_0_24px_rgba(34,211,238,0.28)] hover:bg-cyan-300 disabled:opacity-50"
                >
                  {isLoading ? 'Analyzing...' : 'Run Prediction'}
                </button>
              </form>
            </div>
          </GlassCard>
        </section>

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
              <div className="glass-panel p-6 md:p-7 rounded-2xl relative overflow-hidden group luxury-border">
                <div className={`absolute top-0 right-0 h-56 w-56 rounded-full blur-[90px] -mr-20 -mt-20 transition-opacity duration-1000 opacity-25 ${result.risk_level === 'HIGH' ? 'bg-tertiary' : 'bg-primary'}`} />
                <div className="metric-chip mb-4">Churn Probability</div>
                <div className="relative z-10 flex items-end gap-4 flex-wrap">
                  <p className={`font-display text-5xl md:text-6xl font-bold tracking-tight ${result.risk_level === 'HIGH' ? 'text-tertiary risk-glow-text' : 'text-primary glow-text'}`}>
                    {result.churn_probability}%
                  </p>
                  <p className="text-on-surface text-sm md:text-base pb-2">
                    Risk Level: <span className="font-semibold">{result.risk_level}</span>
                  </p>
                </div>
                <div className="relative z-10 mt-4 font-sans text-on-surface text-sm md:text-[15px] leading-relaxed">
                  {result.churn_explanation}
                </div>
              </div>

              {hasShapValues && <ShapFactorsChart shapValues={result.shap_values} maxFeatures={8} />}

              {result.recommendations && result.recommendations.length > 0 && (
                <GlassCard floating={false} paddingClass="p-6 md:p-7">
                  <div className="relative z-10">
                    <h3 className="font-sans text-xl font-semibold text-on-surface mb-6 flex items-center gap-3">
                      <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                      Recommended Actions
                    </h3>
                    <div className="space-y-4">
                      {result.recommendations.map((rec, idx) => (
                        <div key={idx} className="bg-surface-high/20 p-5 rounded-xl border border-primary/20 relative overflow-hidden group">
                          <div className="absolute left-0 top-0 h-full w-1 bg-primary/40 group-hover:bg-primary transition-colors" />
                          <div className="flex justify-between items-start mb-2 gap-3">
                            <h4 className="font-medium text-on-surface text-sm">{rec.offer_title}</h4>
                            <span className="font-mono text-[10px] uppercase text-primary tracking-widest bg-primary/10 px-2 py-1 rounded">
                              {rec.urgency || 'MEDIUM'} · {rec.expected_impact}
                            </span>
                          </div>
                          <p className="text-on-surface text-xs mb-1">{rec.offer_detail}</p>
                          <p className="text-on-surface-variant text-[10px] italic">{rec.business_reason}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </GlassCard>
              )}

              {result.roi_data && activeRoiData && (
                <div className="glass-panel p-6 md:p-7 rounded-2xl border-l-2 border-primary luxury-border">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <h3 className="font-sans text-sm font-medium text-primary uppercase tracking-[0.22em]">
                      Financial Impact Projection (INR)
                    </h3>
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-on-surface-variant px-2 py-1 rounded bg-surface-high/25 border border-primary/20">
                      {roiMode === 'dynamic' && hasDynamicRoi ? 'Dynamic ROI' : 'Static ROI'}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="rounded-xl border border-primary/20 bg-surface-high/25 p-4">
                      <p className="font-mono text-[10px] text-on-surface-variant uppercase tracking-[0.2em] mb-2">Revenue at Risk</p>
                      <p className="font-display text-2xl text-on-surface">{formatINR(activeRoiData.revenue_at_risk)}</p>
                    </div>
                    <div className="rounded-xl border border-primary/20 bg-surface-high/25 p-4">
                      <p className="font-mono text-[10px] text-on-surface-variant uppercase tracking-[0.2em] mb-2">Retention Cost</p>
                      <p className="font-display text-2xl text-tertiary">{formatINR(activeRoiData.retention_cost)}</p>
                    </div>
                    <div className="rounded-xl border border-primary/20 bg-surface-high/25 p-4">
                      <p className="font-mono text-[10px] text-on-surface-variant uppercase tracking-[0.2em] mb-2">Estimated CLV</p>
                      <p className="font-display text-2xl text-on-surface">{formatINR(activeRoiData.clv)}</p>
                    </div>
                    <div className="rounded-xl border border-primary/20 bg-surface-high/25 p-4">
                      <p className="font-mono text-[10px] text-on-surface-variant uppercase tracking-[0.2em] mb-2">ROI Ratio</p>
                      <p className="font-display text-2xl text-primary glow-text">{activeRoiData.roi_ratio}x</p>
                    </div>
                  </div>

                  {roiMode === 'dynamic' && hasDynamicRoi && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                      <div className="rounded-lg border border-primary/15 bg-surface-high/20 p-3">
                        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant mb-1">Adjusted Churn</p>
                        <p className="text-sm text-on-surface font-semibold">{activeRoiData.adjusted_churn_probability}%</p>
                      </div>
                      <div className="rounded-lg border border-primary/15 bg-surface-high/20 p-3">
                        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant mb-1">Combined Impact</p>
                        <p className="text-sm text-primary font-semibold">-{activeRoiData.combined_expected_impact}%</p>
                      </div>
                      <div className="rounded-lg border border-primary/15 bg-surface-high/20 p-3">
                        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant mb-1">Projected Savings</p>
                        <p className="text-sm text-on-surface font-semibold">{formatINR(activeRoiData.projected_revenue_saved || 0)}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
