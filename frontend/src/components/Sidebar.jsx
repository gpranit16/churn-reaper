import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  LayoutDashboard,
  Users,
  Calculator,
  FileSpreadsheet,
  X,
  Database,
  Cpu,
} from 'lucide-react';

export default function Sidebar({ isOpen = false, onClose = () => {} }) {
  const location = useLocation();

  const mainLinks = [
    { path: '/', label: 'Overview', icon: Home },
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/predict', label: 'Predict Churn', icon: Users },
    { path: '/dataset-analysis', label: 'Dataset Studio', icon: FileSpreadsheet },
    { path: '/roi', label: 'ROI Simulator', icon: Calculator },
  ];

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 w-[280px] h-screen bg-surface border-r border-white/[0.08] flex flex-col justify-between p-5 overflow-hidden transform transition-transform duration-300 ease-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-brand flex items-center justify-center text-white font-mono font-bold text-xs">
              CR
            </div>
            <div>
              <h2 className="font-sans font-bold text-sm text-white tracking-tight">Churn Reaper</h2>
              <p className="text-[10px] font-mono text-on-surface-muted uppercase tracking-wider">Retention Intelligence</p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-surface-low text-on-surface-variant hover:text-white hover:bg-surface-high transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        <div>
          <span className="block font-mono text-[10px] uppercase tracking-wider text-on-surface-muted px-3 mb-2 font-medium">
            Navigation
          </span>
          <nav className="space-y-1">
            {mainLinks.map((link) => {
              const isActive = link.path === '/' ? location.pathname === '/' : location.pathname.startsWith(link.path);
              const Icon = link.icon;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={onClose}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-brand/15 text-brand-light border border-brand/30'
                      : 'text-on-surface-variant hover:text-white hover:bg-surface-high'
                  }`}
                >
                  <Icon size={16} className={isActive ? 'text-brand-light' : 'text-on-surface-muted'} />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="p-3.5 rounded-lg bg-surface-low border border-white/[0.06] space-y-2">
        <div className="flex items-center gap-2 text-[11px] font-mono text-on-surface-variant">
          <Cpu size={13} className="text-brand-light" />
          <span>System Status</span>
        </div>
        <div className="flex items-center justify-between text-xs text-on-surface-muted font-mono">
          <span>XGBoost Depth-3</span>
          <span className="text-emerald-400">Online</span>
        </div>
        <div className="flex items-center justify-between text-xs text-on-surface-muted font-mono">
          <span>NVIDIA Nemotron</span>
          <span className="text-emerald-400">Ready</span>
        </div>
      </div>
    </aside>
  );
}

