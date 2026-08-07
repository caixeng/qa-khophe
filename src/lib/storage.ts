/**
 * Tiện ích quản lý lưu trữ dữ liệu cục bộ (localStorage) cho QA KHOPHE.
 * Giúp đảm bảo dữ liệu không bao giờ bị mất khi Supabase offline hoặc RLS bị từ chối.
 */

export function loadLocalData<T>(key: string, defaultValue: T[]): T[] {
  try {
    const saved = localStorage.getItem(key);
    if (!saved) {
      saveLocalData(key, defaultValue);
      return defaultValue;
    }
    const parsed = JSON.parse(saved);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch (e) {
    console.warn(`Lỗi khi tải localStorage key [${key}]:`, e);
  }
  return defaultValue;
}

export function saveLocalData<T>(key: string, data: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn(`Lỗi khi ghi localStorage key [${key}]:`, e);
  }
}
