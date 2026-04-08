import { useState, useEffect } from 'react';
import { churnApi } from '../services/api';

const FALLBACK_DASHBOARD_DATA = {
  analytics: {
    total_customers: 7043,
    high_risk_count: 1200,
    medium_risk_count: 1800,
    revenue_at_risk: 23572000,
    top_churn_reason: 'Contract type',
  },
  feature_importance: [
    { feature: 'Contract', importance: 1.0378 },
    { feature: 'MonthlyCharges', importance: 0.9734 },
    { feature: 'tenure', importance: 0.6108 },
    { feature: 'InternetService', importance: 0.5000 },
    { feature: 'OnlineSecurity', importance: 0.3702 },
  ],
  executive_summary:
    'Dashboard is showing cached project analytics while live data refreshes in the background.',
};

export function useDashboard() {
  const [data, setData] = useState(FALLBACK_DASHBOARD_DATA);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isActive = true;

    const fetchDashboard = async () => {
      let timeoutId;
      try {
        if (!isActive) return;

        setIsLoading(true);
        setError(null);

        const timeoutPromise = new Promise((_, reject) => {
          timeoutId = window.setTimeout(() => {
            reject(new Error('Dashboard request timed out. Please make sure backend is running on port 8000.'));
          }, 14000);
        });

        const summary = await Promise.race([
          churnApi.getDashboardSummary(),
          timeoutPromise,
        ]);

        if (!isActive) return;

        setData({
          analytics: summary?.analytics || FALLBACK_DASHBOARD_DATA.analytics,
          feature_importance: summary?.feature_importance || FALLBACK_DASHBOARD_DATA.feature_importance,
          executive_summary: summary?.executive_summary || FALLBACK_DASHBOARD_DATA.executive_summary,
        });
      } catch (err) {
        if (!isActive) return;
        setError(err?.message || 'Failed to fetch dashboard data');
      } finally {
        if (timeoutId) {
          window.clearTimeout(timeoutId);
        }
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    fetchDashboard();

    return () => {
      isActive = false;
    };
  }, []);

  return { data, isLoading, error };
}
