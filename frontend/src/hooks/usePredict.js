import { useState } from 'react';
import { churnApi, getApiBaseUrl } from '../services/api';

export function usePredict() {
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const predict = async (customerData) => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await churnApi.predictChurn(customerData);
      setResult(data);
      return data;
    } catch (err) {
      const detail = err?.response?.data?.detail;
      const message = String(err?.message || '').toLowerCase();
      const hasNetworkIssue =
        !err?.response &&
        (err?.code === 'ERR_NETWORK' ||
          err?.code === 'ECONNABORTED' ||
          message.includes('network error') ||
          message.includes('timeout'));

      if (hasNetworkIssue) {
        const baseUrl = getApiBaseUrl();
        const backendHint = baseUrl.startsWith('/')
          ? 'http://127.0.0.1:8000'
          : baseUrl;
        setError(
          `Cannot reach backend API at ${backendHint}. If backend was idle, wait about 60–90 seconds for wake-up and retry.`
        );
      } else if (Array.isArray(detail)) {
        const missingFields = detail
          .filter((item) => item?.type === 'missing' && Array.isArray(item?.loc))
          .map((item) => item.loc[item.loc.length - 1])
          .filter(Boolean);
        if (missingFields.length) {
          setError(`Missing required fields: ${missingFields.join(', ')}`);
        } else {
          setError('Validation failed. Please check your inputs and retry.');
        }
      } else if (typeof detail === 'string' && detail.trim()) {
        setError(detail);
      } else {
        setError(err.message || 'Failed to generate prediction');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getSample = async () => {
    try {
      return await churnApi.getSampleCustomer();
    } catch (err) {
      console.error(err);
      return null;
    }
  };

  return { predict, getSample, result, isLoading, error };
}
