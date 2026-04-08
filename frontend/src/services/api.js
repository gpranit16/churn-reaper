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

const WARMUP_DELAY_MS = 4000;

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

function sleep(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

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

async function warmupBackend(client) {
  try {
    await client.request({
      method: 'get',
      url: '/health',
      timeout: 20000,
    });
  } catch {
    // ignore warmup errors; primary request retry handles final failure
  }
}

async function requestWithFallback(config) {
  const clients = canRetryViaFallback ? [api, fallbackApi] : [api];
  let lastError;

  for (const client of clients) {
    try {
      const { data } = await client.request(config);
      return data;
    } catch (error) {
      lastError = error;

      const shouldWarmupRetry = import.meta.env.PROD && isRetryableNetworkError(error);
      if (!shouldWarmupRetry) {
        continue;
      }

      await warmupBackend(client);
      await sleep(WARMUP_DELAY_MS);

      try {
        const { data } = await client.request(config);
        return data;
      } catch (retryError) {
        lastError = retryError;
      }
    }
  }

  throw lastError;
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
