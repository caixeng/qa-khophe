import type { PostgrestError } from '@supabase/supabase-js';

/**
 * Lỗi nghiệp vụ đã được diễn giải sang tiếng Việt để hiển thị thẳng cho người
 * dùng ở xưởng. Giữ lại `code` và `cause` để còn debug được.
 */
export class ServiceError extends Error {
  readonly code?: string;

  constructor(message: string, code?: string, cause?: unknown) {
    super(message);
    this.name = 'ServiceError';
    this.code = code;
    this.cause = cause;
  }
}

/**
 * Dịch lỗi Postgres/PostgREST sang câu tiếng Việt nói rõ chuyện gì đã xảy ra.
 *
 * Mục đích không phải là làm đẹp thông báo, mà là để người ở xưởng phân biệt
 * được ba tình huống hoàn toàn khác nhau: mất mạng, không đủ quyền, và dữ liệu
 * nhập sai — vì cách xử lý của họ với từng tình huống là khác nhau.
 */
export function describeError(error: PostgrestError | Error | null, action: string): string {
  if (!error) return `Không thực hiện được: ${action}.`;

  const code = 'code' in error ? error.code : undefined;
  const raw = error.message || '';

  switch (code) {
    case '42501':
      return `Bạn không có quyền ${action}. Liên hệ quản trị viên nếu cần thêm quyền.`;
    case '23505':
      return `Không thể ${action}: bản ghi này đã tồn tại trong hệ thống.`;
    case '23514':
      return `Không thể ${action}: dữ liệu không hợp lệ (ví dụ khối lượng phải lớn hơn 0, sản lượng xay không được vượt lượng đầu vào).`;
    case '23503':
      return `Không thể ${action}: bản ghi đang được tham chiếu bởi dữ liệu khác, hoặc đối tác đã chọn không còn tồn tại.`;
    case '42P01':
      return `Không thể ${action}: bảng dữ liệu chưa tồn tại trên máy chủ. Cần chạy các migration trong thư mục supabase/migrations.`;
    case '42703':
      return `Không thể ${action}: cấu trúc bảng trên máy chủ chưa khớp với ứng dụng. Cần chạy các migration còn thiếu.`;
    case 'PGRST301':
    case '401':
      return `Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại rồi thử ${action} lần nữa.`;
  }

  if (/failed to fetch|networkerror|load failed/i.test(raw)) {
    return `Mất kết nối tới máy chủ nên không ${action} được. Kiểm tra đường truyền rồi bấm "Thử lại".`;
  }

  return `Không thể ${action}: ${raw}`;
}

/**
 * Khoảng ngày lọc phía máy chủ.
 *
 * Mọi truy vấn danh sách đều nhận tham số này. Trước đây các service dùng
 * `select('*')` không giới hạn: mỗi lần mở trang là kéo toàn bộ lịch sử phiếu
 * về trình duyệt rồi mới lọc — chấp nhận được với vài chục dòng, nhưng sau một
 * năm hoạt động thì mỗi lần mở trang là vài nghìn dòng qua mạng 3G ở xưởng.
 */
export interface DateRangeFilter {
  from?: string;
  to?: string;
  /** Trần an toàn cho số dòng trả về, kể cả khi khoảng ngày rất rộng. */
  limit?: number;
}

/** Số dòng tối đa cho một lần tải danh sách. */
export const MAX_ROWS = 2000;

/** Ném ServiceError nếu Supabase trả lỗi. Dùng ngay sau mỗi truy vấn. */
export function throwIfError(error: PostgrestError | null, action: string): void {
  if (!error) return;
  throw new ServiceError(describeError(error, action), error.code, error);
}

/**
 * Bọc một lời gọi Supabase: lỗi mạng (exception) cũng được diễn giải giống lỗi
 * trả về từ PostgREST, để tầng UI chỉ cần đọc `error.message`.
 */
export async function runQuery<T>(
  action: string,
  query: () => PromiseLike<{ data: T | null; error: PostgrestError | null }>,
): Promise<T> {
  let result: { data: T | null; error: PostgrestError | null };
  try {
    result = await query();
  } catch (e) {
    throw new ServiceError(describeError(e as Error, action), undefined, e);
  }

  throwIfError(result.error, action);

  if (result.data === null) {
    throw new ServiceError(`Không thể ${action}: máy chủ không trả về dữ liệu.`);
  }

  return result.data;
}
