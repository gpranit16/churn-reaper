import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import GlassCard from '../components/GlassCard';
import { formatINR, formatIndianNumber } from '../utils/currency';
import { Calculator, ArrowRight, TrendingUp, CheckCircle2 } from 'lucide-react';

export default function ROISimulator() {
  const [params, setParams] = useState({
    customers: 500,
    arpu: 7000,
    retentionCost: 2500,
    targetRate: 20,
  });

  const handleChange = (e) => {
    setParams((prev) => ({ ...prev, [e.target.name]: Number(e.target.value) }));
  };

  const {
    revenueAtRisk,
    customersSaved,
    revenueSaved,
    campaignCost,
    netROIValue,
    roiPercentage,
    breakEvenRate,
    marginVsBreakEven,
    valueBreakdown,
    scenarioData,
  } = useMemo(() => {
    const revenueAtRiskValue = params.customers * params.arpu * 12;
    const customersSavedValue = Math.round(params.customers * (params.targetRate / 100));
    const revenueSavedValue = customersSavedValue * params.arpu * 12;
    const campaignCostValue = params.customers * params.retentionCost;
    const netValue = revenueSavedValue - campaignCostValue;
    const roiPct = campaignCostValue > 0 ? ((netValue / campaignCostValue) * 100).toFixed(0) : 0;

    const breakEven = params.arpu > 0 ? (params.retentionCost / (params.arpu * 12)) * 100 : 0;

    const breakdown = [
      { label: 'Exposed ARR', amount: revenueAtRiskValue },
      { label: 'Protected ARR', amount: revenueSavedValue },
      { label: 'Campaign Cost', amount: campaignCostValue },
      { label: 'Net Gain', amount: netValue },
    ];

    const scenarios = Array.from({ length: 10 }, (_, index) => {
      const rate = (index + 1) * 5;
      const saved = Math.round(params.customers * (rate / 100));
      const value = (saved * params.arpu * 12) - campaignCostValue;
      return {
        rate,
        netImpact: Math.round(value),
      };
    });

    return {
      revenueAtRisk: revenueAtRiskValue,
      customersSaved: customersSavedValue,
      revenueSaved: revenueSavedValue,
      campaignCost: campaignCostValue,
      netROIValue: netValue,
      roiPercentage: roiPct,
      breakEvenRate: breakEven,
      marginVsBreakEven: params.targetRate - breakEven,
      valueBreakdown: breakdown,
      scenarioData: scenarios,
    };
  }, [params]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <header className="rounded-xl border border-white/[0.08] bg-surface p-5 sm:p-6 shadow-panel flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-brand-light">
              Financial Economics Lab
            </span>
            <span className="text-white/[0.2] text-xs">/</span>
            <span className="text-xs text-on-surface-muted">Scenario Sensitivity</span>
          </div>
          <h1 className="font-sans text-xl sm:text-2xl font-bold text-white tracking-tight">
            Retention ROI &amp; Budget Optimization Calculator
          </h1>
          <p className="text-xs sm:text-sm text-on-surface-variant mt-1 max-w-3xl">
            Simulate retention campaign payback horizons, break-even save rates, and bottom-line margin expansion in INR.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.08] bg-surface-low text-xs font-mono text-on-surface-variant">
            <Calculator size={13} className="text-brand-light" />
            Active Model: 12M Horizon
          </span>
        </div>
      </header>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Column: Sliders & Parameter Control */}
        <section className="xl:col-span-4 space-y-6">
          <GlassCard paddingClass="p-5 sm:p-6" className="space-y-5">
            <div className="pb-3 border-b border-white/[0.08]">
              <h3 className="font-sans text-base font-semibold text-white tracking-tight">
                Campaign Variables
              </h3>
              <p className="text-xs text-on-surface-muted mt-0.5">
                Adjust cohort size, customer revenue, and retention budget
              </p>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <div className="flex justify-between items-baseline">
                  <label className="font-mono text-[11px] uppercase tracking-wider text-on-surface-variant">
                    Target High-Risk Accounts
                  </label>
                  <span className="font-mono text-xs font-bold text-brand-light tabular-numbers">
                    {formatIndianNumber(params.customers)}
                  </span>
                </div>
                <input
                  type="range"
                  name="customers"
                  min="100"
                  max="5000"
                  step="100"
                  value={params.customers}
                  onChange={handleChange}
                  className="w-full accent-brand h-1.5 bg-surface-low rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-baseline">
                  <label className="font-mono text-[11px] uppercase tracking-wider text-on-surface-variant">
                    Average Monthly Revenue (ARPU)
                  </label>
                  <span className="font-mono text-xs font-bold text-white tabular-numbers">
                    {formatINR(params.arpu)}
                  </span>
                </div>
                <input
                  type="range"
                  name="arpu"
                  min="1000"
                  max="25000"
                  step="500"
                  value={params.arpu}
                  onChange={handleChange}
                  className="w-full accent-brand h-1.5 bg-surface-low rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-baseline">
                  <label className="font-mono text-[11px] uppercase tracking-wider text-on-surface-variant">
                    Offer Budget Per Account
                  </label>
                  <span className="font-mono text-xs font-bold text-white tabular-numbers">
                    {formatINR(params.retentionCost)}
                  </span>
                </div>
                <input
                  type="range"
                  name="retentionCost"
                  min="500"
                  max="15000"
                  step="250"
                  value={params.retentionCost}
                  onChange={handleChange}
                  className="w-full accent-brand h-1.5 bg-surface-low rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-baseline">
                  <label className="font-mono text-[11px] uppercase tracking-wider text-on-surface-variant">
                    Target Save Rate
                  </label>
                  <span className="font-mono text-xs font-bold text-emerald-400 tabular-numbers">
                    {params.targetRate}%
                  </span>
                </div>
                <input
                  type="range"
                  name="targetRate"
                  min="5"
                  max="60"
                  step="1"
                  value={params.targetRate}
                  onChange={handleChange}
                  className="w-full accent-emerald-500 h-1.5 bg-surface-low rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>

            {/* Formula Reference box */}
            <div className="p-3.5 rounded-lg bg-surface-low border border-white/[0.06] space-y-1.5 text-xs">
              <span className="block font-mono text-[10px] text-on-surface-muted uppercase tracking-wider">
                Break-Even Threshold
              </span>
              <p className="text-on-surface-variant">
                Minimum save rate required for positive ROI:{' '}
                <strong className="text-white font-mono">{breakEvenRate.toFixed(1)}%</strong>
              </p>
              <p className="text-[11px] text-on-surface-muted">
                {marginVsBreakEven >= 0 ? (
                  <span className="text-emerald-400">✓ Target rate is +{marginVsBreakEven.toFixed(1)}% above break-even.</span>
                ) : (
                  <span className="text-red-400">⚠ Target rate is below break-even by {Math.abs(marginVsBreakEven).toFixed(1)}%.</span>
                )}
              </p>
            </div>
          </GlassCard>
        </section>

        {/* Right Column: Key ROI Metrics & Sensitivity Curves */}
        <section className="xl:col-span-8 space-y-6">
          {/* 4 Financial Outcome Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="p-4 rounded-xl bg-surface border border-white/[0.08] shadow-panel space-y-1">
              <span className="block font-mono text-[10px] text-on-surface-muted uppercase tracking-wider">
                Exposed ARR
              </span>
              <span className="font-mono text-lg font-bold text-white tabular-numbers">
                {formatINR(revenueAtRisk)}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-surface border border-white/[0.08] shadow-panel space-y-1">
              <span className="block font-mono text-[10px] text-on-surface-muted uppercase tracking-wider">
                Campaign Budget
              </span>
              <span className="font-mono text-lg font-bold text-white tabular-numbers">
                {formatINR(campaignCost)}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-surface border border-white/[0.08] shadow-panel space-y-1">
              <span className="block font-mono text-[10px] text-emerald-400/80 uppercase tracking-wider">
                Net Annual Value
              </span>
              <span className={`font-mono text-lg font-bold tabular-numbers ${netROIValue > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatINR(netROIValue)}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-surface border border-white/[0.08] shadow-panel space-y-1">
              <span className="block font-mono text-[10px] text-brand-light uppercase tracking-wider font-semibold">
                Expected ROI
              </span>
              <span className={`font-mono text-2xl font-bold tabular-numbers ${netROIValue > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {roiPercentage}%
              </span>
            </div>
          </div>

          {/* Value Breakdown & Sensitivity Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Waterfall Value Breakdown */}
            <GlassCard paddingClass="p-5 sm:p-6" className="space-y-4">
              <div className="pb-3 border-b border-white/[0.06]">
                <h3 className="font-sans text-base font-semibold text-white tracking-tight">
                  Financial Waterfall
                </h3>
                <p className="text-xs text-on-surface-muted mt-0.5">
                  Cost vs preserved annual revenue comparison
                </p>
              </div>

              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={valueBreakdown} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="2 2" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis
                      tickFormatter={(val) => `₹${(val / 100000).toFixed(1)}L`}
                      tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(val) => [formatINR(val), 'Amount']}
                      contentStyle={{
                        backgroundColor: '#0c1017',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: '8px',
                        color: '#f1f5f9',
                        fontFamily: 'JetBrains Mono',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="amount" radius={[4, 4, 0, 0]} barSize={24}>
                      {valueBreakdown.map((entry, idx) => (
                        <Cell
                          key={`cell-${idx}`}
                          fill={idx === 2 ? '#ef4444' : idx === 3 ? '#10b981' : '#0284c7'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>

            {/* Sensitivity Curve */}
            <GlassCard paddingClass="p-5 sm:p-6" className="space-y-4">
              <div className="pb-3 border-b border-white/[0.06]">
                <h3 className="font-sans text-base font-semibold text-white tracking-tight">
                  Save Rate Sensitivity Curve
                </h3>
                <p className="text-xs text-on-surface-muted mt-0.5">
                  Net payoff projection across 5%–50% save rates
                </p>
              </div>

              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={scenarioData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="2 2" stroke="rgba(255,255,255,0.05)" />
                    <XAxis
                      dataKey="rate"
                      tickFormatter={(val) => `${val}%`}
                      tick={{ fill: '#94a3b8', fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tickFormatter={(val) => `₹${(val / 100000).toFixed(1)}L`}
                      tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(val) => [formatINR(val), 'Net Gain']}
                      labelFormatter={(val) => `Save Rate: ${val}%`}
                      contentStyle={{
                        backgroundColor: '#0c1017',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: '8px',
                        color: '#f1f5f9',
                        fontFamily: 'JetBrains Mono',
                        fontSize: '12px',
                      }}
                    />
                    <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" strokeDasharray="3 3" />
                    <Line
                      type="monotone"
                      dataKey="netImpact"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={{ r: 3, fill: '#10b981' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>
          </div>
        </section>
      </div>
    </div>
  );
}
