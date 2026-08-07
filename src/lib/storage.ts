/**
 * Tiện ích quản lý lưu trữ dữ liệu cục bộ (localStorage) cho QA KHOPHE.
 * Giúp đảm bảo dữ liệu không bao giờ bị mất khi Supabase offline hoặc RLS bị từ chối.
 */

export function sortByDateDesc<T>(items: T[]): T[] {
  if (!Array.isArray(items)) return [];
  return [...items].sort((a: any, b: any) => {
    const dateA = a?.date || (a?.created_at ? a.created_at.split('T')[0] : '');
    const dateB = b?.date || (b?.created_at ? b.created_at.split('T')[0] : '');
    if (dateA !== dateB) {
      return dateB.localeCompare(dateA); // Ngày mới nhất xếp lên đầu
    }
    const timeA = a?.created_at ? new Date(a.created_at).getTime() : 0;
    const timeB = b?.created_at ? new Date(b.created_at).getTime() : 0;
    if (timeA !== timeB) return timeB - timeA;
    return String(b?.id || '').localeCompare(String(a?.id || ''));
  });
}

export function loadLocalData<T>(key: string, defaultValue: T[]): T[] {
  try {
    const saved = localStorage.getItem(key);
    if (!saved) {
      const sortedDefault = sortByDateDesc(defaultValue);
      saveLocalData(key, sortedDefault);
      return sortedDefault;
    }
    const parsed = JSON.parse(saved);
    if (Array.isArray(parsed)) {
      return sortByDateDesc(parsed);
    }
  } catch (e) {
    console.warn(`Lỗi khi tải localStorage key [${key}]:`, e);
  }
  return sortByDateDesc(defaultValue);
}

export function saveLocalData<T>(key: string, data: T[]): void {
  try {
    const sorted = sortByDateDesc(data);
    localStorage.setItem(key, JSON.stringify(sorted));
  } catch (e) {
    console.warn(`Lỗi khi ghi localStorage key [${key}]:`, e);
  }
}
