import { useState, useEffect, useCallback, useRef } from 'react';

interface UseAsyncDataOptions {
  staleTime?: number;
  refetchOnFocus?: boolean;
}

export function useAsyncData<T>(
  fetcher: () => Promise<T>,
  deps: readonly unknown[] = [],
  options: UseAsyncDataOptions = {},
) {
  const { staleTime = 30_000, refetchOnFocus = false } = options;
  const key = JSON.stringify(deps);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const sequence = useRef(0);
  const mounted = useRef(false);
  const fetched = useRef(0);
  const [state, setState] = useState<{ key: string; data: T | null; loading: boolean; error: string | null }>(
    { key, data: null, loading: true, error: null },
  );

  const fetchData = useCallback(
    async (force = false) => {
      if (!mounted.current || (!force && fetched.current && Date.now() - fetched.current < staleTime)) return;
      const request = ++sequence.current;
      setState((previous) => ({
        key,
        data: previous.key === key ? previous.data : null,
        loading: true,
        error: null,
      }));
      try {
        const data = await fetcherRef.current();
        if (!mounted.current || request !== sequence.current) return;
        fetched.current = Date.now();
        setState({ key, data, loading: false, error: null });
      } catch (error) {
        if (!mounted.current || request !== sequence.current) return;
        setState({
          key,
          data: null,
          loading: false,
          error: error instanceof Error ? error.message : 'Đã xảy ra lỗi khi tải dữ liệu',
        });
      }
    },
    [key, staleTime],
  );

  useEffect(() => {
    mounted.current = true;
    fetched.current = 0;
    void fetchData(true);
    return () => {
      mounted.current = false;
      sequence.current += 1;
    };
  }, [fetchData]);

  useEffect(() => {
    if (!refetchOnFocus) return;
    const onFocus = () => {
      void fetchData();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refetchOnFocus, fetchData]);

  const refetch = useCallback(() => fetchData(true), [fetchData]);
  return {
    data: state.key === key ? state.data : null,
    loading: state.key !== key || state.loading,
    error: state.key === key ? state.error : null,
    refetch,
  };
}

const EMPTY_LIST: readonly never[] = Object.freeze([]);
export function useAsyncList<T>(
  fetcher: () => Promise<T[]>,
  deps: readonly unknown[] = [],
  options: UseAsyncDataOptions = {},
) {
  const { data, ...state } = useAsyncData<T[]>(fetcher, deps, options);
  return { data: data ?? (EMPTY_LIST as unknown as T[]), ...state };
}
