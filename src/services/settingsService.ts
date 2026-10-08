import { supabase } from '../lib/supabase';
import { throwIfError, runQuery, ServiceError } from '../lib/serviceError';

const DEFAULT_KG_PER_BAG = 900;
const DEFAULT_OPENING_STOCK_KG = 0;
const DEFAULT_LOW_STOCK_THRESHOLD_KG = 0; // 0 = tắt cảnh báo tồn kho thấp

async function getNumericSetting(key: string, fallback: number): Promise<number> {
  const data = await runQuery<{ value: string } | null>(
    'tải cấu hình kho',
    () => supabase.from('settings').select('value').eq('key', key).maybeSingle(),
    { allowNullData: true },
  );
  if (!data) return fallback;
  const value = Number(data.value);
  if (!Number.isFinite(value) || value < 0 || (key === 'kg_per_bag' && value <= 0)) {
    throw new ServiceError('Cấu hình kho không hợp lệ. Kiểm tra lại trong Cài đặt.');
  }
  return value;
}

async function setNumericSetting(key: string, value: number): Promise<void> {
  if (!Number.isFinite(value) || value < 0 || (key === 'kg_per_bag' && value <= 0)) {
    throw new ServiceError('Giá trị cấu hình phải là số hợp lệ, không âm; kg/bao phải lớn hơn 0.');
  }
  const { error } = await supabase
    .from('settings')
    .upsert({ key, value: String(value) }, { onConflict: 'key' });

  throwIfError(error, 'lưu cài đặt');
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

  async setKgPerBag(valueKg: number): Promise<void> {
    return setNumericSetting('kg_per_bag', valueKg);
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
    return setNumericSetting('opening_stock_kg', valueKg);
  },

  /**
   * Ngưỡng cảnh báo tồn kho thấp (kg). 0 = tắt cảnh báo — mặc định tắt vì mỗi
   * xưởng có quy mô khác nhau, không có con số hợp lý chung để tự bật.
   */
  async getLowStockThreshold(): Promise<number> {
    return getNumericSetting('low_stock_threshold_kg', DEFAULT_LOW_STOCK_THRESHOLD_KG);
  },

  async setLowStockThreshold(valueKg: number): Promise<void> {
    return setNumericSetting('low_stock_threshold_kg', valueKg);
  },
};
