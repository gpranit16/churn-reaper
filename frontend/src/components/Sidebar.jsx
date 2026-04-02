import { Link, useLocation } from 'react-router-dom';
import { Home, LayoutDashboard, Users, Calculator, Sparkles, ShieldCheck, X } from 'lucide-react';

export default function Sidebar({ isOpen = false, onClose = () => {} }) {
  const location = useLocation();

  const links = [
    { path: '/', label: 'Landing', icon: Home },
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/predict', label: 'Predict Churn', icon: Users },
    { path: '/roi', label: 'ROI Simulator', icon: Calculator },
  ];

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 w-[300px] h-screen bg-[#000000]/95 backdrop-blur-2xl border-r border-white/5 flex flex-col pt-8 overflow-hidden transform transition-transform duration-300 ease-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div className="absolute -top-20 -left-20 h-52 w-52 rounded-full bg-white/5 blur-[90px]" />
      <div className="absolute bottom-0 right-0 h-48 w-48 rounded-full bg-white/5 blur-[90px]" />

      <div className="px-6 pb-8 relative z-10">
        <div className="mb-4 flex justify-end">
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-on-surface"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex items-center gap-3 mb-3">
          <div className="h-9 w-9 rounded-xl bg-primary text-slate-950 flex items-center justify-center shadow-[0_0_15px_rgba(34,211,238,0.25)]">
            <Sparkles size={16} />
          </div>
          <div>
            <h1 className="font-display font-bold text-2xl tracking-tight premium-gradient-text">ChurnPredictor</h1>
            <p className="text-[10px] font-mono text-primary/70 uppercase tracking-[0.24em]">Customer Churn</p>
          </div>
        </div>
        <div className="metric-chip mt-4">Navigation</div>
      </div>

      <nav className="flex-1 px-4 space-y-2 relative z-10">
        {links.map((link) => {
          const isActive = link.path === '/' ? location.pathname === '/' : location.pathname.startsWith(link.path);
          const Icon = link.icon;
          return (
            <Link
              key={link.path}
              to={link.path}
              onClick={onClose}
              className={`group flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 border ${
                isActive
                  ? 'bg-primary/10 text-primary border-primary/30 shadow-ambient-primary'
                  : 'border-transparent hover:bg-white/5 text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <Icon size={18} className={isActive ? 'text-primary' : 'text-on-surface-variant/70 group-hover:text-on-surface'} />
              <span className="font-medium text-sm tracking-wide">{link.label}</span>
            </Link>
          );
        })}
      </nav>
      
      <div className="p-5 relative z-10">
        <div className="glass-card rounded-2xl p-4 text-left">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck size={14} className="text-primary" />
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-primary">Quick Tip</p>
          </div>
          <p className="text-xs text-on-surface-variant">Use this menu to open Dashboard, Predict, or ROI pages.</p>
        </div>
      </div>
    </aside>
  );
}
