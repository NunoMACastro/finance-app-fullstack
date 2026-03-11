/**
 * useApi — lightweight hook for calling API functions with loading + error state.
 *
 * Usage:
 *   const { execute, data, loading, error } = useApi(transactionsApi.getMonthSummary);
 *
 *   useEffect(() => { execute("2026-03"); }, []);
 *
 * Or for mutations:
 *   const { execute: deleteTransaction, loading } = useApi(transactionsApi.delete);
 *   await deleteTransaction(id);
 */

import { useState, useCallback, useRef } from "react";
import { isApiError } from "./http-client";
import type { ApiError } from "./types";

interface UseApiReturn<TArgs extends unknown[], TResult> {
  /** Call the API function. Returns the result or throws. */
  execute: (...args: TArgs) => Promise<TResult>;
  /** Last successful result (null until first success). */
  data: TResult | null;
  /** True while a request is in flight. */
  loading: boolean;
  /** Normalised error from the last failed call, or null. */
  error: ApiError | null;
  /** Manually clear the error. */
  clearError: () => void;
  /** Manually set data (useful for optimistic updates). */
  setData: (data: TResult | null) => void;
}

export function useApi<TArgs extends unknown[], TResult>(
  apiFn: (...args: TArgs) => Promise<TResult>,
): UseApiReturn<TArgs, TResult> {
  const [data, setData] = useState<TResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const callId = useRef(0);

  const execute = useCallback(
    async (...args: TArgs): Promise<TResult> => {
      const id = ++callId.current;
      setLoading(true);
      setError(null);
      try {
        const result = await apiFn(...args);
        // Only apply result if this is still the latest call (avoid race conditions)
        if (id === callId.current) {
          setData(result);
        }
        return result;
      } catch (err) {
        const apiError: ApiError = isApiError(err)
          ? err
          : { code: "UNKNOWN", message: (err as Error)?.message ?? "Erro desconhecido" };
        if (id === callId.current) {
          setError(apiError);
        }
        throw apiError;
      } finally {
        if (id === callId.current) {
          setLoading(false);
        }
      }
    },
    [apiFn],
  );

  const clearError = useCallback(() => setError(null), []);

  return { execute, data, loading, error, clearError, setData };
}
