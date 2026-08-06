import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Thiếu biến môi trường thì dừng ngay tại đây.
 *
 * Trước đây chỗ này fallback về một URL placeholder: app vẫn build, vẫn chạy,
 * mọi request lặng lẽ thất bại — và không ai biết mình đang xem dữ liệu gì.
 * Với phần mềm quản lý kho thì im lặng sai còn tệ hơn là không chạy.
 */
if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Thiếu cấu hình Supabase. Hãy tạo file .env với VITE_SUPABASE_URL và ' +
      'VITE_SUPABASE_ANON_KEY (xem .env.example), rồi khởi động lại ứng dụng.',
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);
