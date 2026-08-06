import { useState, useEffect, useCallback, useRef } from 'react';

interface UseAsyncDataOptions {
  staleTime?: number;
  refetchOnFocus?: boolean;
}

export function useAsyncData<T>(
  fetcher: () => Promise<T>, 
  deps: any[] = [], 
  options: UseAsyncDataOptions = {}
) {
  const { staleTime = 30000, refetchOnFocus = false } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Ref to prevent state updates on unmounted component
  const isMounted = useRef(true);
  const lastFetched = useRef<number>(0);
  const hasData = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const fetchData = useCallback(async (force = false) => {
    if (!isMounted.current) return;

    // Check staleTime — bỏ qua khi force (vd: gọi refetch() sau khi thêm/sửa/xoá)
    if (!force && hasData.current && Date.now() - lastFetched.current < staleTime) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      if (isMounted.current) {
        setData(result);
        hasData.current = true;
        lastFetched.current = Date.now();
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
  }, [fetcher, staleTime]);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    if (!refetchOnFocus) return;

    const onFocus = () => {
      fetchData(true);
    };

    window.addEventListener('focus', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
    };
  }, [refetchOnFocus, fetchData]);

  return { data, loading, error, refetch: () => fetchData(true) };
}

/**
 * Một mảng rỗng duy nhất, dùng chung cho mọi danh sách chưa tải xong.
 *
 * Viết `data || []` trong thân component sẽ tạo một mảng MỚI ở mỗi lần render,
 * nên mọi `useMemo` phụ thuộc vào nó đều tính lại liên tục và cảnh báo
 * exhaustive-deps nổi lên khắp nơi. Dùng chung một tham chiếu bất biến thì
 * `useMemo` mới thực sự có tác dụng.
 */
const EMPTY_LIST: readonly never[] = Object.freeze([]);

/**
 * Bản `useAsyncData` dành cho dữ liệu dạng danh sách: không bao giờ trả `null`,
 * và tham chiếu mảng rỗng luôn giữ nguyên giữa các lần render.
 */
export function useAsyncList<T>(
  fetcher: () => Promise<T[]>,
  deps: unknown[] = [],
  options: UseAsyncDataOptions = {},
) {
  const { data, loading, error, refetch } = useAsyncData<T[]>(fetcher, deps, options);
  return {
    data: data ?? (EMPTY_LIST as unknown as T[]),
    loading,
    error,
    refetch,
  };
}
