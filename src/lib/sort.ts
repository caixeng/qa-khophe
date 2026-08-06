export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  key: string;
  direction: SortDirection;
}

/**
 * Sắp xếp danh sách theo một cột.
 *
 * Số được so sánh theo giá trị số chứ không theo chuỗi — nếu không, cột khối
 * lượng sẽ xếp "1.000" đứng trước "900" vì so sánh từng ký tự. Ngày ở dạng
 * `yyyy-mm-dd` thì so sánh chuỗi đã đúng thứ tự nên không cần xử lý riêng.
 * Giá trị rỗng luôn bị đẩy xuống cuối ở cả hai chiều, vì "chưa có dữ liệu"
 * không phải là "nhỏ nhất".
 */
export function sortRows<T>(rows: readonly T[], sort: SortConfig | null): T[] {
  if (!sort) return rows as T[];

  const dir = sort.direction === 'asc' ? 1 : -1;

  return [...rows].sort((a, b) => {
    const av = (a as Record<string, unknown>)[sort.key];
    const bv = (b as Record<string, unknown>)[sort.key];

    const aEmpty = av === null || av === undefined || av === '';
    const bEmpty = bv === null || bv === undefined || bv === '';
    if (aEmpty && bEmpty) return 0;
    if (aEmpty) return 1;
    if (bEmpty) return -1;

    if (typeof av === 'number' && typeof bv === 'number') {
      return (av - bv) * dir;
    }

    return String(av).localeCompare(String(bv), 'vi', { numeric: true }) * dir;
  });
}
