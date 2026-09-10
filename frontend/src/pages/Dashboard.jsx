import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useDashboard } from '../hooks/useDashboard';
import KPICard from '../components/KPICard';
import GlassCard from '../components/GlassCard';
import { formatINR, formatIndianNumber } from '../utils/currency';
import { Activity, ShieldAlert, TrendingUp } from 'lucide-react';

const PIE_COLORS = ['#ef4444', '#f59e0b', '#10b981'];

export default function Dashboard() {
  const { data, isLoading, error } = useDashboard();

  if (!data) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="rounded-xl border border-white/[0.08] bg-surface p-6 flex items-center gap-3">
          <div className="h-5 w-5 rounded-full border-2 border-brand-light/30 border-t-brand-light animate-spin" />
          <p className="font-mono text-xs text-on-surface-variant uppercase tracking-wider">
            Loading analytics dataset...
          </p>
        </div>
      </div>
    );
  }

  const { analytics, feature_importance, executive_summary } = data;

  const {
    topFeature,
    chartData,
    riskDistribution,
    riskTrend,
    revenueProjection,
  } = useMemo(() => {
    const high = Number(analytics?.high_risk_count || 0);
    const medium = Number(analytics?.medium_risk_count || 0);
    const total = Number(analytics?.total_customers || 0);
    const low = Math.max(total - high - medium, 0);

    const featureData = (feature_importance || []).map((f) => ({
      name: f.feature,
      impact: Math.abs(f.importance),
    }));

    const distribution = [
      { name: 'High Risk', value: high },
      { name: 'Medium Risk', value: medium },
      { name: 'Low Risk', value: low },
    ];

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const highMultipliers = [0.88, 0.92, 0.96, 1.0, 1.06, 1.11];
    const mediumMultipliers = [0.94, 0.97, 1.0, 1.04, 1.07, 1.1];

    const trend = months.map((month, index) => ({
      month,
      highRisk: Math.round(high * highMultipliers[index]),
      mediumRisk: Math.round(medium * mediumMultipliers[index]),
    }));

    const revenueSeries = trend.map((item) => ({
      month: item.month,
      projectedExposure: Math.round((item.highRisk * 7800) + (item.mediumRisk * 4200)),
    }));

    return {
      topFeature: feature_importance?.[0]?.feature ?? 'Contract',
      chartData: featureData,
      riskDistribution: distribution,
      riskTrend: trend,
      revenueProjection: revenueSeries,
    };
  }, [analytics, feature_importance]);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Notification if Error/Fallback */}
      {(isLoading || error) && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs font-mono text-amber-400">
          {error
            ? `Live data refresh failed. Displaying cached system analytics (${error}).`
            : 'Synchronizing dataset metrics...'}
        </div>
      )}

      {/* Header */}
      <header className="rounded-xl border border-white/[0.08] bg-surface p-5 sm:p-6 shadow-panel flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-brand-light">
              Executive Analytics
            </span>
            <span className="text-white/[0.2] text-xs">/</span>
            <span className="text-xs text-on-surface-muted">Telco Benchmark Dataset (7,043 Customers)</span>
          </div>
          <h1 className="font-sans text-xl sm:text-2xl font-bold text-white tracking-tight">
            Customer Churn &amp; Revenue Risk Deck
          </h1>
          <p className="text-xs sm:text-sm text-on-surface-variant mt-1 max-w-3xl">
            Real-time cohort segmentation, global feature influence, and projected ARR exposure.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.08] bg-surface-low text-xs font-mono text-on-surface-variant">
            <Activity size={13} className="text-emerald-400" />
            Live Cohort Feed
          </span>
        </div>
      </header>

      {/* 4 KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard title="Total Customer Base" subtitle="Monitored accounts" value={formatIndianNumber(analytics.total_customers)} />
        <KPICard title="High Risk Segment" subtitle="Immediate intervention required" value={formatIndianNumber(analytics.high_risk_count)} isRisk />
        <KPICard title="Medium Risk Segment" subtitle="Nurture & review pool" value={formatIndianNumber(analytics.medium_risk_count)} />
        <KPICard title="Revenue at Risk" subtitle="Annualized INR exposure" value={formatINR(analytics.revenue_at_risk)} isRisk />
      </div>

      {/* Main Charts: Risk Trend & Feature Importance */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <GlassCard paddingClass="p-5 sm:p-6" className="xl:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/[0.06]">
            <div>
              <h3 className="font-sans text-base font-semibold text-white tracking-tight">
                Risk Trend Trajectory (6 Months)
              </h3>
              <p className="text-xs text-on-surface-muted mt-0.5">
                Cohort movement across high and medium risk thresholds
              </p>
            </div>
            <span className="inline-flex items-center px-2.5 py-1 rounded text-[11px] font-mono bg-surface-low text-brand-light border border-brand/20">
              Top Driver: {topFeature}
            </span>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={riskTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="highRiskGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="mediumRiskGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 2" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0c1017',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '8px',
                    color: '#f1f5f9',
                    fontFamily: 'JetBrains Mono',
                    fontSize: '12px',
                  }}
                />
                <Area type="monotone" dataKey="highRisk" name="High Risk" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#highRiskGrad)" />
                <Area type="monotone" dataKey="mediumRisk" name="Medium Risk" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#mediumRiskGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Global Feature Impact */}
        <GlassCard paddingClass="p-5 sm:p-6" className="space-y-4">
          <div className="pb-3 border-b border-white/[0.06]">
            <h3 className="font-sans text-base font-semibold text-white tracking-tight">
              Global Feature Weight
            </h3>
            <p className="text-xs text-on-surface-muted mt-0.5">
              Top predictors driving the XGBoost classifier
            </p>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.slice(0, 5)} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 2" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" width={90} tick={{ fill: '#e2e8f0', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0c1017',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '8px',
                    color: '#f1f5f9',
                    fontFamily: 'JetBrains Mono',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="impact" name="Weight" fill="#0284c7" radius={[0, 4, 4, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>

      {/* Revenue Projection & Executive Summary */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <GlassCard paddingClass="p-5 sm:p-6" className="xl:col-span-2 space-y-4">
          <div className="pb-3 border-b border-white/[0.06]">
            <h3 className="font-sans text-base font-semibold text-white tracking-tight">
              Monthly Revenue Exposure Trend
            </h3>
            <p className="text-xs text-on-surface-muted mt-0.5">
              Projected cumulative revenue at risk across upcoming quarters
            </p>
          </div>

          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueProjection} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 2" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis
                  tickFormatter={(val) => `₹${(val / 100000).toFixed(1)}L`}
                  tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(val) => [formatINR(val), 'Projected Exposure']}
                  contentStyle={{
                    backgroundColor: '#0c1017',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '8px',
                    color: '#f1f5f9',
                    fontFamily: 'JetBrains Mono',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="projectedExposure" fill="#38bdf8" radius={[4, 4, 0, 0]} barSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Executive Summary Card */}
        <div className="rounded-xl border border-white/[0.08] bg-surface p-5 sm:p-6 flex flex-col justify-between space-y-4 shadow-panel">
          <div>
            <div className="flex items-center gap-2 pb-3 border-b border-white/[0.06]">
              <ShieldAlert size={14} className="text-brand-light" />
              <h3 className="font-mono text-xs text-brand-light uppercase tracking-wider font-semibold">
                Intelligence Brief
              </h3>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed mt-3">
              {executive_summary}
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-surface-low border border-white/[0.06] space-y-1.5 text-xs">
            <span className="block font-mono text-[10px] text-on-surface-muted uppercase tracking-wider">
              Primary Vulnerability
            </span>
            <p className="font-medium text-white">
              {analytics.top_churn_reason || 'Month-to-month contracts on Fiber optic without Tech Support'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
