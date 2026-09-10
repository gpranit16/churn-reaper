import GlassCard from './GlassCard';

export default function KPICard({ title, value, isRisk = false, prefix = '', subtitle = '' }) {
  return (
    <GlassCard paddingClass="p-5" className="h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-on-surface-variant">
            {title}
          </span>
          {isRisk ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-red-500/10 text-red-400 border border-red-500/20">
              Risk Alert
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-slate-800 text-slate-400 border border-slate-700/50">
              Active
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-xs text-on-surface-muted mb-3 font-normal">
            {subtitle}
          </p>
        )}
      </div>

      <div className="flex items-baseline gap-1.5 pt-2">
        {prefix && <span className="text-sm font-mono text-on-surface-variant">{prefix}</span>}
        <span
          className={`font-mono text-2xl lg:text-3xl font-bold tracking-tight tabular-numbers ${
            isRisk ? 'text-red-400' : 'text-on-surface'
          }`}
        >
          {value}
        </span>
      </div>
    </GlassCard>
  );
}

