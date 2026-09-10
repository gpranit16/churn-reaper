export default function GlassCard({
  children,
  className = '',
  glow = false,
  paddingClass = 'p-6',
  floating = false, // disabled float animations for clean B2B look
}) {
  return (
    <div
      className={`relative bg-surface border border-white/[0.08] rounded-xl transition-colors duration-200 ${paddingClass} ${className}`}
    >
      {children}
    </div>
  );
}

