import { supabase } from '../lib/supabase';

const DEFAULT_KG_PER_BAG = 900;
const DEFAULT_OPENING_STOCK_KG = 0;

async function getNumericSetting(key: string, fallback: number): Promise<number> {
  try {
    const { data, error } = await supabase.from('settings').select('value').eq('key', key).maybeSingle();

    if (error || !data) return fallback;
    return Number(data.value) || fallback;
  } catch {
    return fallback;
  }
}

export const settingsService = {
  /**
   * Quy đổi kg/bao — đọc từ bảng `settings` (migration 006). Nếu bảng chưa
   * được tạo hoặc chưa có dòng cấu hình, dùng mặc định 900kg/bao thay vì lỗi
   * toàn trang — đây là giá trị cấu hình tuỳ chọn, không phải dữ liệu nghiệp vụ.
   */
  async getKgPerBag(): Promise<number> {
    return getNumericSetting('kg_per_bag', DEFAULT_KG_PER_BAG);
  },

  /**
   * Tồn kho đầu kỳ — số kg đã có sẵn trong kho trước khi hệ thống bắt đầu ghi
   * nhận phiếu xay/xuất, nhập tay 1 lần trong Cài đặt. Mặc định 0 nếu chưa
   * cấu hình (xưởng mới bắt đầu dùng app không cần quan tâm mục này).
   */
  async getOpeningStock(): Promise<number> {
    return getNumericSetting('opening_stock_kg', DEFAULT_OPENING_STOCK_KG);
  },

  /**
   * Ghi lại tồn kho đầu kỳ. Chỉ admin mới có quyền ghi vào bảng `settings`
   * (xem policy `settings_admin_write` trong migration 006) — RLS sẽ tự chặn
   * nếu tài khoản không đủ quyền, lỗi được throw để UI hiện thông báo thật.
   */
  async setOpeningStock(valueKg: number): Promise<void> {
    const { error } = await supabase
      .from('settings')
      .upsert({ key: 'opening_stock_kg', value: String(Math.max(0, valueKg)) }, { onConflict: 'key' });

    if (error) throw new Error(error.message);
  },
};
