/**
 * Ghi nhận lỗi phía người dùng.
 *
 * Xưởng dùng app trên điện thoại của công nhân — khi có lỗi, không ai chụp màn
 * hình console gửi lại. Không có bản ghi nào thì mọi báo lỗi đều dừng ở mức
 * "hôm qua nó bị lỗi" và không thể lần ra nguyên nhân.
 *
 * Chưa gắn dịch vụ ngoài (Sentry...) vì việc đó cần tài khoản và quyết định về
 * chi phí. Trước mắt lưu vòng tròn trong localStorage để khi cần còn xuất ra
 * xem được từ trang Cài đặt; muốn chuyển sang Sentry thì chỉ cần sửa hàm `send`
 * bên dưới, mọi nơi gọi giữ nguyên.
 */

const STORAGE_KEY = 'khophe_error_log';
const MAX_ENTRIES = 50;

export interface LoggedError {
  at: string;
  message: string;
  stack?: string;
  context?: string;
  url: string;
}

function send(entry: LoggedError) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const entries: LoggedError[] = raw ? JSON.parse(raw) : [];
    entries.unshift(entry);
    // Giữ vòng tròn: 50 lỗi gần nhất là đủ để lần lại một sự cố, mà không làm
    // đầy localStorage của máy.
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch {
    // Hết dung lượng hoặc trình duyệt chặn localStorage — bản thân việc ghi log
    // không bao giờ được phép làm hỏng thêm luồng đang chạy.
  }
}

export function logError(error: unknown, context?: string) {
  const err = error instanceof Error ? error : new Error(String(error));

  console.error(context ? `[${context}]` : '[error]', err);

  send({
    at: new Date().toISOString(),
    message: err.message,
    stack: err.stack,
    context,
    url: typeof location !== 'undefined' ? location.href : '',
  });
}

export function getErrorLog(): LoggedError[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function clearErrorLog() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // không sao
  }
}

/**
 * Bắt cả lỗi không được xử lý ở đâu cả — ErrorBoundary chỉ thấy lỗi xảy ra lúc
 * render, còn lỗi trong handler bất đồng bộ (vd: promise bị reject) thì không.
 */
export function installGlobalErrorHandlers() {
  window.addEventListener('error', (e) => {
    logError(e.error ?? e.message, 'window.onerror');
  });

  window.addEventListener('unhandledrejection', (e) => {
    logError(e.reason, 'unhandledrejection');
  });
}
