import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import GlassCard from './GlassCard';

const POSITIVE_COLOR = '#ef4444'; // increases churn
const NEGATIVE_COLOR = '#10b981'; // decreases churn

function toDisplayName(feature) {
  return String(feature)
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatShapValue(value) {
  const numeric = Number(value) || 0;
  return `${numeric >= 0 ? '+' : ''}${numeric.toFixed(4)}`;
}

export default function ShapFactorsChart({ shapValues, maxFeatures = 8 }) {
  const chartData = useMemo(() => {
    if (!shapValues || typeof shapValues !== 'object') return [];

    return Object.entries(shapValues)
      .map(([feature, rawValue]) => {
        const value = Number(rawValue);
        if (!Number.isFinite(value)) return null;

        return {
          feature,
          label: toDisplayName(feature),
          value,
          absValue: Math.abs(value),
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.absValue - a.absValue)
      .slice(0, Math.min(Math.max(maxFeatures, 5), 8));
  }, [shapValues, maxFeatures]);

  const maxAbsValue = useMemo(() => {
    if (!chartData.length) return 1;
    return chartData.reduce((max, item) => Math.max(max, item.absValue), 0) || 1;
  }, [chartData]);

  if (!chartData.length) return null;

  return (
    <GlassCard paddingClass="p-5 sm:p-6" className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/[0.06]">
        <div>
          <h3 className="font-sans text-base sm:text-lg font-semibold text-white tracking-tight">
            Key Feature SHAP Attribution
          </h3>
          <p className="text-xs text-on-surface-muted mt-0.5">
            Marginal contribution of customer parameters toward churn probability
          </p>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-mono">
          <span className="flex items-center gap-1.5 text-red-400">
            <span className="w-2.5 h-2.5 rounded-sm bg-red-500/80" />
            Increases Churn
          </span>
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/80" />
            Protects Customer
          </span>
        </div>
      </div>

      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 4, right: 12, left: 16, bottom: 4 }}
            barGap={6}
          >
            <CartesianGrid
              strokeDasharray="2 2"
              stroke="rgba(255, 255, 255, 0.05)"
              horizontal={false}
            />
            <XAxis
              type="number"
              domain={[-maxAbsValue * 1.12, maxAbsValue * 1.12]}
              tickFormatter={(value) => Number(value).toFixed(2)}
              tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'JetBrains Mono' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              dataKey="label"
              type="category"
              width={160}
              tick={{ fill: '#e2e8f0', fontSize: 12, fontFamily: 'Plus Jakarta Sans' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: 'rgba(255, 255, 255, 0.03)' }}
              formatter={(value) => [formatShapValue(value), 'SHAP Value']}
              labelFormatter={(label) => `Feature: ${label}`}
              contentStyle={{
                backgroundColor: '#0c1017',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '8px',
                color: '#f1f5f9',
                fontFamily: 'JetBrains Mono',
                fontSize: '12px',
              }}
            />
            <ReferenceLine x={0} stroke="rgba(255, 255, 255, 0.2)" strokeDasharray="3 3" />
            <Bar dataKey="value" radius={[4, 4, 4, 4]} barSize={14}>
              {chartData.map((entry) => (
                <Cell
                  key={entry.feature}
                  fill={entry.value >= 0 ? POSITIVE_COLOR : NEGATIVE_COLOR}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </GlassCard>
  );
}

