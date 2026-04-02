import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? '/api' : 'http://127.0.0.1:8000');
const FALLBACK_API_BASE_URL = import.meta.env.VITE_BACKEND_FALLBACK_URL || 'http://127.0.0.1:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 12000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const fallbackApi = axios.create({
  baseURL: FALLBACK_API_BASE_URL,
  timeout: 12000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const canRetryViaFallback = import.meta.env.DEV && API_BASE_URL.startsWith('/');

function isRetryableNetworkError(error) {
  const message = String(error?.message || '').toLowerCase();
  return (
    !error?.response &&
    (error?.code === 'ERR_NETWORK' ||
      error?.code === 'ECONNABORTED' ||
      message.includes('network error') ||
      message.includes('timeout'))
  );
}

async function requestWithFallback(config) {
  try {
    const { data } = await api.request(config);
    return data;
  } catch (error) {
    if (canRetryViaFallback && isRetryableNetworkError(error)) {
      const { data } = await fallbackApi.request(config);
      return data;
    }
    throw error;
  }
}

export const churnApi = {
  predictChurn: async (customerData) => {
    return requestWithFallback({
      method: 'post',
      url: '/predict',
      data: customerData,
    });
  },
  getFeatureImportance: async () => {
    return requestWithFallback({
      method: 'get',
      url: '/feature-importance',
    });
  },
  getDashboardSummary: async () => {
    return requestWithFallback({
      method: 'get',
      url: '/dashboard-summary',
    });
  },
  getSampleCustomer: async () => {
    return requestWithFallback({
      method: 'get',
      url: '/sample-customer',
    });
  }
};
