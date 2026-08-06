import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        /**
         * Tách thư viện ngoài ra khỏi mã ứng dụng.
         *
         * Mã ứng dụng thay đổi mỗi lần deploy, còn React/Supabase/Recharts thì
         * hàng tháng mới đổi một lần. Để chung một chunk nghĩa là mỗi lần sửa
         * một dòng code, người dùng ở xưởng phải tải lại toàn bộ ~500KB qua
         * mạng 3G. Tách ra thì phần vendor nằm yên trong cache trình duyệt.
         */
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return;

          /**
           * xlsx (~425KB) CỐ Ý không được gom vào chunk nào.
           *
           * Nó chỉ được `import()` động khi người dùng bấm "Xuất Excel" ở trang
           * Báo cáo. Gán nó vào một chunk tĩnh — kể cả chunk "vendor" chung —
           * sẽ khiến nó được tải ngay từ lần mở app đầu tiên, xoá sạch tác dụng
           * của lazy-load. Trả về undefined để Rollup giữ nó ở chunk động riêng.
           */
          if (id.includes('xlsx')) return;

          if (id.includes('recharts') || id.includes('d3-') || id.includes('victory-vendor')) {
            return 'vendor-charts';
          }
          if (id.includes('@supabase')) return 'vendor-supabase';
          if (id.includes('react-router')) return 'vendor-router';
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/')) {
            return 'vendor-react';
          }
          if (id.includes('lucide-react')) return 'vendor-icons';
          return 'vendor-misc';
        },
      },
    },
    /**
     * Hai chunk vượt ngưỡng này một cách có chủ đích và cả hai đều KHÔNG nằm
     * trong lần tải đầu: `vendor-charts` chỉ tải khi mở trang Tồn kho/Báo cáo,
     * `xlsx` chỉ tải khi bấm Xuất Excel. Đặt 450 để cảnh báo vẫn còn tác dụng
     * với những chunk phình ra ngoài dự kiến.
     */
    chunkSizeWarningLimit: 450,
  },
});
