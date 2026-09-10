import { useNavigate } from 'react-router-dom';
import { ArrowRight, Activity, ShieldCheck, Sparkles, Cpu, Calculator } from 'lucide-react';
import AIOrbBot from '../components/AIOrbBot';
import { formatINR } from '../utils/currency';

export default function Landing() {
  const navigate = useNavigate();
  const quickStats = [
    { label: 'Active Dataset', value: '7,043 Accounts' },
    { label: 'ARR at Risk', value: formatINR(23572000) },
    { label: 'Intelligence Pipeline', value: 'XGBoost + NVIDIA' },
  ];

  const workflowSteps = [
    {
      step: '01',
      title: 'XGBoost Risk Classifier',
      description: 'Predict churn probabilities on individual profiles or entire customer batch datasets in milliseconds.',
      icon: Activity,
    },
    {
      step: '02',
      title: 'SHAP Attribution Engine',
      description: 'Isolate exact parameter contributions driving risk up or down with transparent explainability.',
      icon: ShieldCheck,
    },
    {
      step: '03',
      title: 'NVIDIA Decision Economics',
      description: 'Synthesize optimal retention offers and evaluate payback horizons, Net Benefit, and ROI.',
      icon: Sparkles,
    },
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* Hero Section */}
      <section className="rounded-xl border border-white/[0.08] bg-surface p-6 md:p-10 shadow-panel relative overflow-hidden">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-center">
          <div className="xl:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md border border-brand/30 bg-brand/10 text-[11px] font-mono text-brand-light">
              <Cpu size={12} />
              B2B Retention Intelligence Platform
            </div>

            <h1 className="font-sans text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight">
              Predict churn risk. <br />
              Automate profitable retention.
            </h1>

            <p className="text-sm sm:text-base text-on-surface-variant max-w-xl leading-relaxed">
              Enterprise customer intelligence combining regularized XGBoost classification, SHAP attribution, and NVIDIA Nemotron economic decision models.
            </p>

            <div className="flex flex-wrap gap-3 pt-1">
              <button
                type="button"
                onClick={() => navigate('/predict')}
                className="inline-flex items-center gap-2 rounded-lg px-6 py-3 bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-400 hover:via-blue-500 hover:to-indigo-500 text-white font-bold text-xs tracking-wide shadow-[0_4px_20px_rgba(2,132,199,0.4)] border border-sky-400/40 transition-all cursor-pointer active:scale-[0.98]"
              >
                <Sparkles size={14} className="text-sky-200" />
                <span>Run Customer Analysis</span>
                <ArrowRight size={14} />
              </button>
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 border border-white/[0.1] bg-surface-low text-on-surface font-medium text-xs hover:bg-surface-high hover:border-white/[0.2] transition-colors"
              >
                View Dashboard
              </button>
              <button
                type="button"
                onClick={() => navigate('/dataset-analysis')}
                className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 border border-white/[0.1] bg-surface-low text-on-surface-variant font-medium text-xs hover:bg-surface-high hover:text-white transition-colors"
              >
                Dataset Studio
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-white/[0.08]">
              {quickStats.map((stat) => (
                <div key={stat.label} className="p-3 rounded-lg bg-surface-low border border-white/[0.06]">
                  <p className="font-mono text-[10px] text-on-surface-muted uppercase tracking-wider mb-0.5">
                    {stat.label}
                  </p>
                  <p className="font-mono text-sm font-semibold text-white tabular-numbers">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="xl:col-span-5">
            <AIOrbBot className="border border-white/[0.08] shadow-panel" />
          </div>
        </div>
      </section>

      {/* 3-Step Architecture Pillars */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {workflowSteps.map((step) => {
          const Icon = step.icon;
          return (
            <div
              key={step.step}
              className="p-5 sm:p-6 rounded-xl border border-white/[0.08] bg-surface shadow-panel space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-brand-light">{step.step}</span>
                  <div className="h-8 w-8 rounded-lg bg-surface-low border border-white/[0.08] flex items-center justify-center text-on-surface-variant">
                    <Icon size={16} />
                  </div>
                </div>
                <h3 className="font-sans text-base font-bold text-white tracking-tight">{step.title}</h3>
                <p className="text-xs text-on-surface-variant leading-relaxed">{step.description}</p>
              </div>

              <div className="pt-3 border-t border-white/[0.06]">
                <span className="text-[11px] font-mono text-on-surface-muted uppercase tracking-wider flex items-center gap-1">
                  Active in Platform →
                </span>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
