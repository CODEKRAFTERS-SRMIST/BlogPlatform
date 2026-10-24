import { useState, useCallback, useEffect } from 'react';
import { handleApiError } from '@/lib/api';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseApiReturn<T> extends UseApiState<T> {
  refetch: () => Promise<void>;
  reset: () => void;
}

/**
 * Custom hook for handling API calls with loading and error states
 * Usage: const { data, loading, error, refetch } = useApi(apiFunction)
 */
export function useApi<T>(
  apiFunction: () => Promise<T>,
  dependencies: unknown[] = []
): UseApiReturn<T> {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const fetchData = useCallback(async () => {
    setState({ data: null, loading: true, error: null });
    try {
      const result = await apiFunction();
      setState({ data: result, loading: false, error: null });
    } catch (err) {
      const errorMessage = handleApiError(err);
      setState({ data: null, loading: false, error: errorMessage });
    }
  }, dependencies);

  // Automatically fetch data on mount
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return {
    ...state,
    refetch: fetchData,
    reset,
  };
}

/**
 * Custom hook for handling API mutations (POST, PUT, DELETE)
 * Usage: const { mutate, loading, error } = useMutation(apiFunction)
 */
export function useMutation<T, D>(
  mutationFunction: (data: D) => Promise<T>
) {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const mutate = useCallback(async (data: D) => {
    setState({ data: null, loading: true, error: null });
    try {
      const result = await mutationFunction(data);
      setState({ data: result, loading: false, error: null });
      return result;
    } catch (err) {
      const errorMessage = handleApiError(err);
      setState({ data: null, loading: false, error: errorMessage });
      throw err;
    }
  }, [mutationFunction]);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return {
    ...state,
    mutate,
    reset,
  };
}
