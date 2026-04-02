import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import AIOrbBot from '../components/AIOrbBot';
import { formatINR } from '../utils/currency';

export default function Landing() {
  const navigate = useNavigate();
  const quickStats = [
    { label: 'Active customers', value: '7,043' },
    { label: 'Revenue at risk', value: formatINR(23572000) },
    { label: 'Model', value: 'XGBoost + SHAP' },
  ];

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-700">
      <section className="relative overflow-hidden glass-panel p-6 md:p-8 lg:p-10">
        <div className="relative z-10 grid grid-cols-1 xl:grid-cols-2 gap-8 items-center">
          <div className="space-y-6">
            <div className="metric-chip">ChurnPredictor</div>
            <h1 className="font-display text-4xl md:text-5xl xl:text-6xl font-bold tracking-tight leading-tight premium-gradient-text">
              Predict churn before it happens.
            </h1>
            <p className="text-on-surface-variant text-base md:text-lg max-w-2xl leading-relaxed">
              Run single-customer analysis with clear risk scores, key drivers, and recommended retention actions.
            </p>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => navigate('/predict')}
                className="inline-flex items-center gap-2 rounded-xl px-6 py-3 bg-primary text-slate-950 font-semibold tracking-[0.08em] hover:bg-cyan-300 transition-all shadow-[0_0_22px_rgba(34,211,238,0.25)]"
              >
                Predict Churn
                <ArrowRight size={16} />
              </button>
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="inline-flex items-center gap-2 rounded-xl px-6 py-3 border border-primary/30 bg-primary/10 text-on-surface font-medium hover:bg-primary/20 transition-all"
              >
                View Dashboard
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              {quickStats.map((stat) => (
                <div key={stat.label} className="rounded-xl border border-primary/20 bg-black/35 p-3">
                  <p className="subtle-legend mb-1 font-medium">{stat.label}</p>
                  <p className="text-on-surface text-sm font-medium">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>

          <AIOrbBot />
        </div>
      </section>
    </div>
  );
}
