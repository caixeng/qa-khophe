import { useState, useEffect, useMemo, useCallback } from 'react';

type SortDirection = 'asc' | 'desc';

interface SortConfig {
  key: string;
  direction: SortDirection;
}

/**
 * Hook quản lý bảng dữ liệu: tìm kiếm, phân trang, sắp xếp
 * Dùng được cả có hoặc không có tham số
 */
export function useTableControls<T = any>(
  data?: T[] | null,
  config?: { searchFields?: (keyof T)[]; pageSize?: number },
) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(config?.pageSize || 10);
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const filteredData = useMemo(() => {
    if (!data) return [];
    if (!debouncedQuery.trim()) return data;

    const lowerSearch = debouncedQuery.toLowerCase();
    const fields = config?.searchFields;

    return data.filter((item) => {
      if (fields && fields.length > 0) {
        return fields.some((field) => {
          const val = item[field];
          return val ? String(val).toLowerCase().includes(lowerSearch) : false;
        });
      }
      // Fallback: search all string fields
      return Object.values(item as any).some(
        (val) => typeof val === 'string' && val.toLowerCase().includes(lowerSearch),
      );
    });
  }, [data, debouncedQuery, config?.searchFields]);

  const sortedData = useMemo(() => {
    if (!sortConfig) return filteredData;
    return [...filteredData].sort((a, b) => {
      const aVal = (a as any)[sortConfig.key];
      const bVal = (b as any)[sortConfig.key];
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortConfig]);

  const totalPages = Math.ceil(sortedData.length / itemsPerPage);

  const paginatedData = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    return sortedData.slice(start, start + itemsPerPage);
  }, [sortedData, page, itemsPerPage]);

  const handleSort = useCallback((key: string) => {
    setSortConfig((prev) => {
      if (prev?.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  }, []);

  return {
    // Search
    searchQuery,
    debouncedQuery,
    setSearchQuery: (q: string) => {
      setSearchQuery(q);
      setPage(1);
    },
    // Aliases for compatibility
    searchTerm: searchQuery,
    setSearchTerm: (q: string) => {
      setSearchQuery(q);
      setPage(1);
    },
    // Pagination
    page,
    setPage,
    currentPage: page,
    setCurrentPage: setPage,
    itemsPerPage,
    setItemsPerPage,
    totalPages,
    // Sort
    sortConfig,
    handleSort,
    // Data
    filteredData: sortedData,
    paginatedData,
  };
}
