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

const HEALTH_CHECK_TIMEOUT_MS = 8000;
const configuredWakeMax = Number(import.meta.env.VITE_BACKEND_WAKE_MAX_MS);
const BACKEND_WAKE_MAX_MS =
  Number.isFinite(configuredWakeMax) && configuredWakeMax > 0
    ? configuredWakeMax
    : import.meta.env.PROD
      ? 55000
      : 0;
const BACKEND_WAKE_POLL_MS = 2500;
const RETRY_DELAY_MS = 2500;

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
  await client.request({
    method: 'get',
    url: '/health',
    timeout: HEALTH_CHECK_TIMEOUT_MS,
  });
}

async function waitForBackend(client) {
  if (!import.meta.env.PROD || BACKEND_WAKE_MAX_MS <= 0) {
    return;
  }

  const start = Date.now();
  while (Date.now() - start < BACKEND_WAKE_MAX_MS) {
    try {
      await warmupBackend(client);
      return;
    } catch {
      await sleep(BACKEND_WAKE_POLL_MS);
    }
  }

  // Best effort: allow request attempt even if warmup polling did not succeed.
}

async function requestWithRetry(client, config) {
  try {
    const { data } = await client.request(config);
    return data;
  } catch (error) {
    if (!isRetryableNetworkError(error)) {
      throw error;
    }

    await sleep(RETRY_DELAY_MS);
    const { data } = await client.request(config);
    return data;
  }
}

async function requestWithFallback(config) {
  const clients = canRetryViaFallback ? [api, fallbackApi] : [api];
  let lastError;

  for (const client of clients) {
    try {
      await waitForBackend(client);
      const data = await requestWithRetry(client, config);
      return data;
    } catch (error) {
      lastError = error;
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
