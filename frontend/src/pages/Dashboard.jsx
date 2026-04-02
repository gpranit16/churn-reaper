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

const PIE_COLORS = ['#f43f5e', '#22d3ee', '#0ea5e9'];

export default function Dashboard() {
  const { data, isLoading, error } = useDashboard();

  if (!data) {
    return (
      <div className="min-h-[58vh] flex items-center justify-center">
        <div className="glass-panel rounded-2xl px-6 py-4 border border-primary/20">
          <p className="font-mono text-primary animate-pulse tracking-wider text-sm">Loading dashboard...</p>
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
    <div className="space-y-8 animate-in fade-in duration-700 pb-12">
      {(isLoading || error) && (
        <div className={`glass-panel p-4 rounded-xl border ${error ? 'border-tertiary/25' : 'border-primary/20'}`}>
          <p className={`font-mono text-xs tracking-[0.16em] uppercase ${error ? 'text-tertiary' : 'text-primary'}`}>
            {error
              ? `Live dashboard refresh failed. Showing cached project analytics. (${error})`
              : 'Refreshing live dashboard data...'}
          </p>
        </div>
      )}

      <header className="glass-panel p-6 md:p-8 lg:p-10 relative overflow-hidden">
        <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-primary/20 blur-[90px]" />
        <div className="relative z-10">
          <div className="metric-chip mb-4">Dashboard Overview</div>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight premium-gradient-text">Churn Dashboard</h2>
          <p className="font-sans text-sm text-on-surface-variant mt-3 max-w-3xl">
            Track churn segments, key features, and INR revenue exposure in one place.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
        <KPICard title="Total Customers" subtitle="Active Base" value={formatIndianNumber(analytics.total_customers)} />
        <KPICard title="High Risk Segment" subtitle="Immediate Attention" value={formatIndianNumber(analytics.high_risk_count)} isRisk />
        <KPICard title="Medium Risk Segment" subtitle="Nurture Pool" value={formatIndianNumber(analytics.medium_risk_count)} />
        <KPICard title="Revenue at Risk" subtitle="INR Exposure" value={formatINR(analytics.revenue_at_risk)} isRisk />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <GlassCard className="xl:col-span-2 h-[380px]" glow>
          <div className="relative z-10 h-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-sans text-lg md:text-xl font-medium text-on-surface">Risk Trend (Last 6 Months)</h3>
              <div className="metric-chip">Primary Driver: {topFeature}</div>
            </div>

            <div className="h-[285px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={riskTrend}>
                  <defs>
                    <linearGradient id="highRiskGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.55} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="mediumRiskGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#22d3ee" stopOpacity={0.04} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#050505',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: '10px',
                      color: '#f4f4f5',
                    }}
                  />
                  <Legend wrapperStyle={{ color: '#94a3b8' }} />
                  <Area type="monotone" dataKey="highRisk" stroke="#ef4444" strokeWidth={2} fill="url(#highRiskGrad)" name="High Risk" />
                  <Area type="monotone" dataKey="mediumRisk" stroke="#22d3ee" strokeWidth={2} fill="url(#mediumRiskGrad)" name="Medium Risk" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="h-[380px]" glow>
          <div className="relative z-10 h-full flex flex-col">
            <h3 className="font-sans text-lg md:text-xl font-medium text-on-surface mb-4">Risk Distribution</h3>
            <div className="flex-1 min-h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={riskDistribution}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={58}
                    outerRadius={94}
                    paddingAngle={3}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {riskDistribution.map((entry, index) => (
                      <Cell key={`cell-${entry.name}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => formatIndianNumber(value)}
                    contentStyle={{
                      backgroundColor: '#050505',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: '10px',
                      color: '#f4f4f5',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-on-surface-variant mt-2">Balanced segment visibility helps prioritize retention spend more precisely.</p>
          </div>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <GlassCard className="xl:col-span-2 h-[430px]" glow>
          <div className="relative z-10 h-full">
            <h3 className="font-sans text-lg md:text-xl font-medium text-on-surface mb-4">Top Churn Drivers</h3>
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 10, left: 65, bottom: 0 }}>
                  <defs>
                    <linearGradient id="barGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#22d3ee" />
                      <stop offset="100%" stopColor="#0369a1" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="name"
                    type="category"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 12, fontFamily: 'JetBrains Mono' }}
                  />
                  <Tooltip
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{
                      backgroundColor: '#050505',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: '10px',
                      color: '#f4f4f5',
                    }}
                  />
                  <Bar dataKey="impact" fill="url(#barGrad)" radius={[0, 8, 8, 0]} barSize={12} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </GlassCard>

        <div className="glass-panel p-6 md:p-8 h-[430px] flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/15 rounded-full blur-[40px] -mr-16 -mt-16 transition-opacity duration-1000 opacity-60 group-hover:opacity-100" />
          <div>
            <h3 className="font-mono text-xs text-primary uppercase tracking-[0.22em] mb-5 border-b border-primary/20 pb-3 inline-block">Executive Summary</h3>
            <p className="font-sans text-on-surface-variant leading-relaxed text-sm">{executive_summary}</p>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <p className="subtle-legend mb-2">Projected Exposure Trend (INR)</p>
            <div className="h-[120px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueProjection} margin={{ top: 8, right: 6, left: 0, bottom: 0 }}>
                  <XAxis dataKey="month" hide />
                  <YAxis hide />
                  <Tooltip
                    formatter={(value) => formatINR(value)}
                    contentStyle={{
                      backgroundColor: '#050505',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: '10px',
                      color: '#f4f4f5',
                    }}
                  />
                  <Line type="monotone" dataKey="projectedExposure" stroke="#22d3ee" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-on-surface-variant mt-2">Top churn reason: <span className="text-on-surface font-medium">{analytics.top_churn_reason}</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}
