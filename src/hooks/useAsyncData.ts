import { useState, useEffect, useCallback, useRef } from 'react';

export function useAsyncData<T>(fetcher: () => Promise<T>, deps: any[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Ref to prevent state updates on unmounted component
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const fetchData = useCallback(async () => {
    if (!isMounted.current) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      if (isMounted.current) {
        setData(result);
      }
    } catch (err: any) {
      if (isMounted.current) {
        setError(err.message || 'Đã xảy ra lỗi khi tải dữ liệu');
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [fetcher]);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, refetch: fetchData };
}
