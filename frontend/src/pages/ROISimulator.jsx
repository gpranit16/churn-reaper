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
      { label: 'Revenue at Risk', amount: revenueAtRiskValue },
      { label: 'Saved Revenue', amount: revenueSavedValue },
      { label: 'Campaign Cost', amount: campaignCostValue },
      { label: 'Net Impact', amount: netValue },
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
    <div className="space-y-8 animate-in fade-in duration-700 pb-12">
      <header className="glass-panel p-6 md:p-8 lg:p-10 relative overflow-hidden">
        <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-indigo-500/25 blur-[90px]" />
        <div className="relative z-10">
          <div className="metric-chip mb-4">ROI Simulator · INR</div>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight premium-gradient-text">Retention ROI Calculator</h2>
          <p className="font-sans text-sm text-on-surface-variant mt-3 max-w-4xl">
            Estimate whether your retention campaign is profitable by adjusting inputs and comparing cost vs saved revenue.
          </p>
        </div>
      </header>

      <GlassCard glow>
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="text-xl font-semibold text-zinc-200 mb-4">How this works</h3>
            <ol className="space-y-3 text-sm text-on-surface-variant list-decimal list-inside">
              <li>Estimate annual revenue exposed to churn using high-risk customer count and monthly revenue.</li>
              <li>Apply your target save rate to estimate how many customers can be retained.</li>
              <li>Calculate saved annual revenue from retained customers.</li>
              <li>Subtract campaign cost to get net impact and ROI percentage.</li>
            </ol>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
            <p className="subtle-legend mb-3">Formula Reference</p>
            <div className="space-y-2 text-sm text-on-surface-variant">
              <p><span className="text-zinc-200">Revenue at Risk</span> = Customers × ARPU × 12</p>
              <p><span className="text-zinc-200">Customers Saved</span> = Customers × Target Save Rate</p>
              <p><span className="text-zinc-200">Saved Revenue</span> = Customers Saved × ARPU × 12</p>
              <p><span className="text-zinc-200">Net Impact</span> = Saved Revenue − Campaign Cost</p>
              <p><span className="text-zinc-200">ROI %</span> = (Net Impact / Campaign Cost) × 100</p>
            </div>
          </div>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-4 space-y-6">
          <GlassCard glow>
            <div className="relative z-10">
              <h3 className="font-sans text-xl font-medium text-zinc-200 mb-8">Simulation Inputs</h3>

              <div className="space-y-8">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="font-mono text-xs text-on-surface-variant uppercase tracking-wider">High Risk Customers</label>
                    <span className="font-mono text-sm text-primary">{formatIndianNumber(params.customers)}</span>
                  </div>
                  <input type="range" name="customers" min="100" max="5000" step="100" value={params.customers} onChange={handleChange} className="w-full accent-primary bg-surface h-1 rounded-full appearance-none" />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="font-mono text-xs text-on-surface-variant uppercase tracking-wider">Avg Monthly Revenue (₹)</label>
                    <span className="font-mono text-sm text-primary">{formatINR(params.arpu)}</span>
                  </div>
                  <input type="range" name="arpu" min="1000" max="25000" step="500" value={params.arpu} onChange={handleChange} className="w-full accent-primary bg-surface h-1 rounded-full appearance-none" />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="font-mono text-xs text-on-surface-variant uppercase tracking-wider">Retention Cost / User (₹)</label>
                    <span className="font-mono text-sm text-tertiary">{formatINR(params.retentionCost)}</span>
                  </div>
                  <input type="range" name="retentionCost" min="500" max="10000" step="250" value={params.retentionCost} onChange={handleChange} className="w-full accent-tertiary bg-surface h-1 rounded-full appearance-none" />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="font-mono text-xs text-on-surface-variant uppercase tracking-wider">Target Save Rate (%)</label>
                    <span className="font-mono text-sm text-primary">{params.targetRate}%</span>
                  </div>
                  <input type="range" name="targetRate" min="5" max="50" step="1" value={params.targetRate} onChange={handleChange} className="w-full accent-primary bg-surface h-1 rounded-full appearance-none" />
                </div>
              </div>
            </div>
          </GlassCard>
        </div>

        <div className="xl:col-span-8 flex flex-col gap-6">
          <div className="glass-panel p-8 md:p-10 rounded-2xl text-center relative overflow-hidden group luxury-border">
            <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-primary/20 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
            <p className="font-mono text-xs text-on-surface-variant uppercase tracking-[0.22em] mb-4">Projected ROI</p>
            <div className={`font-display text-6xl md:text-8xl font-bold tracking-tighter glow-text ${netROIValue >= 0 ? 'text-primary' : 'text-tertiary'}`}>
              {roiPercentage}%
            </div>
            <p className="font-sans text-on-surface-variant text-sm mt-4">
              At <span className="text-zinc-200 font-semibold">{params.targetRate}%</span> save rate, you retain approximately <span className="text-zinc-200 font-semibold">{formatIndianNumber(customersSaved)}</span> customers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <GlassCard className="h-[320px]" glow>
              <div className="relative z-10 h-full">
                <p className="subtle-legend mb-3">Financial Breakdown (INR)</p>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={valueBreakdown} margin={{ top: 8, right: 10, left: 10, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                      <XAxis dataKey="label" tick={{ fill: '#a1a1aa', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={(v) => `${Math.round(v / 100000)}L`} tick={{ fill: '#a1a1aa', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        formatter={(value) => formatINR(value)}
                        contentStyle={{
                          backgroundColor: '#050505',
                          border: '1px solid rgba(255,255,255,0.12)',
                          borderRadius: '10px',
                          color: '#f4f4f5',
                        }}
                      />
                      <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                        {valueBreakdown.map((entry) => {
                          const color = entry.label === 'Campaign Cost' ? '#ef4444' : entry.label === 'Net Impact' ? '#52525b' : '#a1a1aa';
                          return <Cell key={entry.label} fill={color} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="h-[320px]" glow>
              <div className="relative z-10 h-full">
                <p className="subtle-legend mb-3">Net Impact vs Save Rate</p>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={scenarioData} margin={{ top: 8, right: 10, left: 10, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                      <XAxis dataKey="rate" tickFormatter={(v) => `${v}%`} tick={{ fill: '#a1a1aa', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={(v) => `${Math.round(v / 100000)}L`} tick={{ fill: '#a1a1aa', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        formatter={(value) => formatINR(value)}
                        labelFormatter={(label) => `Save rate: ${label}%`}
                        contentStyle={{
                          backgroundColor: '#050505',
                          border: '1px solid rgba(255,255,255,0.12)',
                          borderRadius: '10px',
                          color: '#f4f4f5',
                        }}
                      />
                      <ReferenceLine y={0} stroke="rgba(255,255,255,0.25)" strokeDasharray="6 6" />
                      <Line type="monotone" dataKey="netImpact" stroke="#ffffff" strokeWidth={2.4} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </GlassCard>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glass-panel p-5 rounded-xl border border-white/10">
              <p className="subtle-legend mb-1">Break-even Save Rate</p>
              <p className="font-display text-3xl text-zinc-200">{breakEvenRate.toFixed(1)}%</p>
            </div>
            <div className="glass-panel p-5 rounded-xl border border-white/10">
              <p className="subtle-legend mb-1">Current Margin</p>
              <p className={`font-display text-3xl ${marginVsBreakEven >= 0 ? 'text-primary' : 'text-tertiary'}`}>{marginVsBreakEven >= 0 ? '+' : ''}{marginVsBreakEven.toFixed(1)}%</p>
            </div>
            <div className="glass-panel p-5 rounded-xl border border-white/10">
              <p className="subtle-legend mb-1">Net Impact (INR)</p>
              <p className={`font-display text-3xl ${netROIValue >= 0 ? 'text-primary' : 'text-tertiary'}`}>{formatINR(netROIValue)}</p>
            </div>
          </div>

          <div className="glass-panel p-5 rounded-xl border border-white/10">
            <p className="text-sm text-on-surface-variant leading-relaxed">
              <span className="text-zinc-200 font-semibold">Interpretation:</span> If your target save rate stays above break-even, the campaign is expected to generate positive net impact. In this scenario, your estimated annual exposure is <span className="text-zinc-200 font-semibold">{formatINR(revenueAtRisk)}</span>, campaign cost is <span className="text-zinc-200 font-semibold">{formatINR(campaignCost)}</span>, and projected saved revenue is <span className="text-zinc-200 font-semibold">{formatINR(revenueSaved)}</span>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
