import { useEffect, useMemo, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';
import ThreeBackground from './ThreeBackground';

export default function Layout() {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const pageTitle = useMemo(() => {
    if (location.pathname === '/') return 'Landing';
    if (location.pathname.startsWith('/predict')) return 'Predict Churn';
    if (location.pathname.startsWith('/roi')) return 'ROI Simulator';
    return 'Dashboard';
  }, [location.pathname]);

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="relative flex min-h-screen bg-background text-on-surface-variant font-sans selection:bg-primary/30 overflow-hidden luxury-grid premium-black">
      <ThreeBackground />
      <div className="pointer-events-none fixed -left-24 -top-24 h-[420px] w-[420px] rounded-full bg-primary/5 blur-[120px]" />
      <div className="pointer-events-none fixed right-0 top-20 h-[380px] w-[380px] rounded-full bg-primary/5 blur-[120px]" />
      <div className="pointer-events-none fixed bottom-0 left-1/3 h-[300px] w-[300px] rounded-full bg-primary/5 blur-[120px]" />

      {isSidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar overlay"
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px]"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main className="relative z-10 flex-1 min-w-0 h-screen overflow-y-auto custom-scrollbar px-4 pb-8 pt-4 md:px-6 lg:px-10 lg:pt-6">
        <header className="sticky top-0 z-30 mb-5 flex items-center justify-between rounded-2xl border border-primary/20 bg-[#05090f]/88 backdrop-blur-xl px-4 py-3 md:px-5">
          <div className="flex items-center gap-3 md:gap-4 min-w-0">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              aria-label="Open navigation menu"
            >
              <Menu size={18} />
            </button>

            <Link to="/" className="min-w-0">
              <h1 className="truncate font-display text-xl md:text-2xl font-bold premium-gradient-text">ChurnPredictor</h1>
              <p className="hidden md:block font-mono text-[10px] text-on-surface-variant uppercase tracking-[0.2em]">{pageTitle}</p>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/predict"
              className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs md:text-sm border border-primary/35 bg-primary/15 text-primary hover:bg-primary/20 transition-all"
            >
              Predict Churn
            </Link>
          </div>
        </header>

        <div className="relative z-10 max-w-[1360px] mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
