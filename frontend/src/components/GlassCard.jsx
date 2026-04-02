export default function GlassCard({
  children,
  className = '',
  glow = false,
  paddingClass = 'p-8',
  floating = true,
}) {
  return (
    <div className={`relative group ${className}`}>
      {glow && (
        <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-white/10 via-white/5 to-white/10 opacity-50 group-hover:opacity-100 blur-lg transition-all duration-700" />
      )}
      <div
        className={`relative h-full glass-card rounded-2xl ${paddingClass} transition-all duration-500 group-hover:-translate-y-1 group-hover:shadow-ambient-primary overflow-hidden ${floating ? 'animate-float' : ''}`}
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.06] via-transparent to-transparent opacity-80" />
        <div className="pointer-events-none absolute -right-20 -top-20 h-44 w-44 rounded-full bg-white/5 blur-3xl" />
        {children}
      </div>
    </div>
  );
}
