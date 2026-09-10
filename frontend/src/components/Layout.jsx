import { useEffect, useMemo, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Menu, ShieldAlert, Cpu, Activity } from 'lucide-react';
import Sidebar from './Sidebar';
import ThreeBackground from './ThreeBackground';

export default function Layout() {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const pageTitle = useMemo(() => {
    if (location.pathname === '/') return 'Product Overview';
    if (location.pathname.startsWith('/predict')) return 'Churn Risk Intelligence';
    if (location.pathname.startsWith('/dataset-analysis')) return 'Dataset Analysis';
    if (location.pathname.startsWith('/roi')) return 'Retention ROI Simulator';
    return 'Executive Dashboard';
  }, [location.pathname]);

  const navLinks = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/predict', label: 'Predict Churn' },
    { path: '/dataset-analysis', label: 'Dataset Studio' },
    { path: '/roi', label: 'ROI Simulator' },
  ];

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="relative flex min-h-screen bg-background text-on-surface font-sans selection:bg-brand-light/20 overflow-hidden">
      <ThreeBackground />

      {isSidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar overlay"
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main className="relative z-10 flex-1 min-w-0 h-screen overflow-y-auto custom-scrollbar px-4 pb-12 pt-3 md:px-6 lg:px-8">
        <header className="sticky top-0 z-30 mb-6 flex items-center justify-between rounded-xl border border-white/[0.08] bg-surface/90 backdrop-blur-md px-4 py-2.5 shadow-panel">
          <div className="flex items-center gap-4 min-w-0">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.1] bg-surface-high/60 text-on-surface hover:bg-surface-higher hover:border-white/[0.2] transition-colors"
              aria-label="Open navigation menu"
            >
              <Menu size={16} />
            </button>

            <Link to="/" className="flex items-center gap-2.5 min-w-0">
              <div className="h-7 w-7 rounded-lg bg-brand flex items-center justify-center text-white font-mono font-bold text-xs">
                CR
              </div>
              <div className="min-w-0">
                <span className="font-sans text-sm md:text-base font-bold text-white tracking-tight block truncate">
                  Churn Reaper
                </span>
              </div>
            </Link>

            <div className="hidden lg:flex items-center gap-1 border-l border-white/[0.08] pl-4 ml-1">
              {navLinks.map((link) => {
                const isActive = location.pathname.startsWith(link.path);
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-white/[0.08] text-white font-semibold'
                        : 'text-on-surface-variant hover:text-white hover:bg-white/[0.04]'
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-md border border-white/[0.06] bg-surface-low/80 text-[11px] font-mono text-on-surface-muted">
              <Activity size={12} className="text-emerald-400" />
              <span>XGBoost + NVIDIA Nemotron</span>
            </div>

            <Link
              to="/predict"
              className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white shadow-[0_0_15px_rgba(2,132,199,0.35)] border border-sky-400/30 transition-colors"
            >
              <Cpu size={13} />
              <span>Run Prediction</span>
            </Link>
          </div>
        </header>

        <div className="relative z-10 max-w-[1400px] mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

