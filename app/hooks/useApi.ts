import { useState, useCallback, useEffect } from 'react';
import { AxiosError } from 'axios';
import { handleApiError } from '@/app/lib/api';

interface UseApiState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

interface UseApiOptions {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

/**
 * Custom hook for API calls with loading and error states
 * 
 * Usage:
 * const { data, loading, error, execute } = useApi(employeesAPI.list);
 * const handleFetch = () => execute(1, 10);
 */
export const useApi = <T, A extends any[]>(
  apiFunction: (...args: A) => Promise<any>,
  options?: UseApiOptions
) => {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    error: null,
    loading: false,
  });

  const execute = useCallback(
    async (...args: A) => {
      setState({ data: null, error: null, loading: true });

      try {
        const response = await apiFunction(...args);
        const data = response.data;

        setState({ data, error: null, loading: false });
        options?.onSuccess?.();

        return data;
      } catch (err: any) {
        const errorMessage = handleApiError(err);
        setState({ data: null, error: errorMessage, loading: false });
        options?.onError?.(errorMessage);

        throw err;
      }
    },
    [apiFunction, options]
  );

  return {
    ...state,
    execute,
  };
};

/**
 * Custom hook for GET requests
 */
export const useGet = <T,>(
  apiFunction: () => Promise<any>,
  dependencies: any[] = []
) => {
  const { data, loading, error, execute } = useApi<T, []>(apiFunction);

  // Auto-execute on mount
  useEffect(() => {
    execute();
  }, dependencies);

  return { data, loading, error, refetch: execute };
};

/**
 * Custom hook for POST requests
 */
export const usePost = <T,>(
  apiFunction: (data: any) => Promise<any>,
  options?: UseApiOptions
) => {
  const { data, loading, error, execute } = useApi<T, [any]>(
    apiFunction,
    options
  );

  return {
    data,
    loading,
    error,
    post: execute,
  };
};

/**
 * Custom hook for PUT requests
 */
export const usePut = <T,>(
  apiFunction: (id: number, data: any) => Promise<any>,
  options?: UseApiOptions
) => {
  const { data, loading, error, execute } = useApi<T, [number, any]>(
    apiFunction,
    options
  );

  return {
    data,
    loading,
    error,
    put: execute,
  };
};

/**
 * Custom hook for DELETE requests
 */
export const useDelete = <T,>(
  apiFunction: (id: number) => Promise<any>,
  options?: UseApiOptions
) => {
  const { data, loading, error, execute } = useApi<T, [number]>(
    apiFunction,
    options
  );

  return {
    data,
    loading,
    error,
    delete: execute,
  };
};
