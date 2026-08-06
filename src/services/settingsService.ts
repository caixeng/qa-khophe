import { supabase } from '../lib/supabase';

const DEFAULT_KG_PER_BAG = 900;

export const settingsService = {
  /**
   * Quy đổi kg/bao — đọc từ bảng `settings` (migration 006). Nếu bảng chưa
   * được tạo hoặc chưa có dòng cấu hình, dùng mặc định 900kg/bao thay vì lỗi
   * toàn trang — đây là giá trị cấu hình tuỳ chọn, không phải dữ liệu nghiệp vụ.
   */
  async getKgPerBag(): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'kg_per_bag')
        .maybeSingle();

      if (error || !data) return DEFAULT_KG_PER_BAG;
      return Number(data.value) || DEFAULT_KG_PER_BAG;
    } catch {
      return DEFAULT_KG_PER_BAG;
    }
  },
};
