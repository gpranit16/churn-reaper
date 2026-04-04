import axios from 'axios';

const DEFAULT_LOCAL_API_URL = 'http://127.0.0.1:8000';
const DEFAULT_PROD_API_URL = 'https://churn-reaper.onrender.com';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? '/api' : DEFAULT_PROD_API_URL);

const FALLBACK_API_BASE_URL =
  import.meta.env.VITE_BACKEND_FALLBACK_URL ||
  (import.meta.env.DEV ? DEFAULT_LOCAL_API_URL : DEFAULT_PROD_API_URL);

const configuredTimeout = Number(import.meta.env.VITE_API_TIMEOUT_MS);
const API_TIMEOUT_MS =
  Number.isFinite(configuredTimeout) && configuredTimeout > 0
    ? configuredTimeout
    : import.meta.env.PROD
      ? 70000
      : 12000;

export function getApiBaseUrl() {
  return API_BASE_URL;
}

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
  },
});

const fallbackApi = axios.create({
  baseURL: FALLBACK_API_BASE_URL,
  timeout: API_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
  },
});

const canRetryViaFallback = FALLBACK_API_BASE_URL !== API_BASE_URL;

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
