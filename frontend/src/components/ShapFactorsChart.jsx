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
const NEGATIVE_COLOR = '#22c55e'; // decreases churn

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
    <GlassCard floating={false} paddingClass="p-6 md:p-7">
      <div className="relative z-10">
        <h3 className="font-sans text-xl font-semibold text-on-surface mb-1">
          Top Factors Affecting Churn
        </h3>
        <p className="text-xs text-on-surface-variant mb-5">
          Red bars increase churn risk, green bars reduce churn risk.
        </p>

        <div className="h-[340px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 6, right: 12, left: 24, bottom: 6 }}
              barGap={8}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.06)"
                horizontal={false}
              />
              <XAxis
                type="number"
                domain={[-maxAbsValue * 1.15, maxAbsValue * 1.15]}
                tickFormatter={(value) => Number(value).toFixed(2)}
                tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                dataKey="label"
                type="category"
                width={170}
                tick={{ fill: '#cbd5e1', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                formatter={(value) => [formatShapValue(value), 'SHAP Value']}
                labelFormatter={(label) => `Feature: ${label}`}
                contentStyle={{
                  backgroundColor: '#050505',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '10px',
                  color: '#f4f4f5',
                }}
              />
              <ReferenceLine x={0} stroke="rgba(148,163,184,0.4)" strokeDasharray="3 3" />
              <Bar dataKey="value" radius={[6, 6, 6, 6]} barSize={16}>
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
      </div>
    </GlassCard>
  );
}
