import { runQuery, ServiceError } from './serviceError';

type PageResult<T> = { data: T[] | null; error: import('@supabase/supabase-js').PostgrestError | null };

/** Read every page; never present a silently truncated financial total. */
export async function readAllPages<T>(
  action: string,
  fetchPage: (from: number, to: number) => PromiseLike<PageResult<T>>,
  options: { pageSize?: number; maxRows?: number } = {},
): Promise<T[]> {
  const pageSize = options.pageSize ?? 500;
  const maxRows = options.maxRows ?? 100_000;
  const rows: T[] = [];
  for (let offset = 0; ;) {
    const page = await runQuery<T[]>(action, () => fetchPage(offset, offset + pageSize - 1));
    if (page.length === 0) return rows;
    if (rows.length + page.length > maxRows) {
      throw new ServiceError(
        'Dữ liệu vượt giới hạn tải. Hãy thu hẹp khoảng ngày trước khi xem hoặc xuất báo cáo.',
      );
    }
    rows.push(...page);
    // A project can cap responses below pageSize; advance by actual row count.
    offset += page.length;
  }
}
