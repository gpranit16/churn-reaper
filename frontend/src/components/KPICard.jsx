import GlassCard from './GlassCard';

export default function KPICard({ title, value, isRisk = false, prefix = '', subtitle = '' }) {
  return (
    <GlassCard glow={true} className="h-full">
      <div className="relative z-10">
        <h3 className="font-sans text-lg font-medium text-on-surface-variant mb-2">{title}</h3>
        {subtitle && <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant/60 mb-5">{subtitle}</p>}
        <div className="flex items-baseline gap-2">
          {prefix && <span className="text-xl font-mono text-on-surface-variant/50">{prefix}</span>}
          <span className={`font-display text-5xl font-bold tracking-tight ${isRisk ? 'text-tertiary risk-glow-text' : 'text-zinc-200'}`}>
            {value}
          </span>
        </div>
      </div>
      {isRisk && (
        <div className="absolute top-6 right-6 w-3 h-3 rounded-full bg-tertiary animate-pulse shadow-ambient-tertiary" />
      )}
      {!isRisk && (
        <div className="absolute top-6 right-6 w-3 h-3 rounded-full bg-primary/80 animate-pulse shadow-ambient-primary" />
      )}
      <div className="absolute inset-x-6 bottom-4 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
      <div className="metric-chip mt-6">Live</div>
    </GlassCard>
  );
}
