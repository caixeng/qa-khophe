# KhoPhe ERP — Quản lý Kho Phế Liệu

Ứng dụng quản lý xưởng phế liệu nhựa: nhập phế, xay phế, xuất phế, cân phế, tồn kho, công nợ, chi phí, nhân sự và báo cáo. React + TypeScript + Vite + Supabase (Postgres + Auth + RLS).

## Chạy dự án

```bash
npm install
cp .env.example .env   # điền VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY
npm run dev
```

Các lệnh khác:

```bash
npm run build   # tsc -b && vite build
npm run lint    # oxlint
npm run test    # vitest run
```

## Cấu hình Supabase

1. Tạo project tại [supabase.com](https://supabase.com).
2. Vào **SQL Editor**, chạy lần lượt toàn bộ file trong `supabase/migrations/` theo đúng thứ tự số (`001_...` → `007_...`). Mỗi file có ghi chú ở đầu về việc cần làm thêm (nếu có).
3. Migration `003` bật RLS theo vai trò (`admin` / `manager` / `staff`) và **xoá quyền truy cập ẩn danh** — làm theo hướng dẫn trong comment đầu file để tạo tài khoản admin đầu tiên.
4. Migration `007` seed lại toàn bộ dữ liệu sổ tay thực tế (tháng 6–7/2026) vào database — an toàn để chạy lại nhiều lần.
5. Copy `Project URL` và `anon public key` từ **Project Settings > API** vào file `.env`.

## Phân quyền

| Vai trò | Xem | Ghi nghiệp vụ (nhập/xay/xuất/cân) | Sửa/Xoá | Tài chính (chi phí/ứng/lương) |
|---|---|---|---|---|
| `staff` | ✅ | ✅ | ❌ | ❌ |
| `manager` | ✅ | ✅ | ✅ | ✅ |
| `admin` | ✅ | ✅ | ✅ | ✅ + quản lý tài khoản |

Phân quyền được enforce ở **Row Level Security** trong Postgres (xem `supabase/migrations/003_users_roles_and_rls.sql`) — ẩn/hiện menu trên UI chỉ là tiện ích hiển thị, không phải cơ chế bảo mật.

## Cấu trúc thư mục

```
src/
  components/   UI dùng chung (Modal, DataState, GlobalSearch, PaginationBar...)
  contexts/     Auth, Theme, Toast, SlidePanel
  hooks/        useAsyncData, useCrudForm, useTableControls
  lib/          utils, calc (công thức nghiệp vụ dùng chung), print (in phiếu)
  pages/        Các trang theo route
  services/     Lớp gọi Supabase — mọi lỗi được throw thật, không có dữ liệu giả
supabase/
  migrations/   Schema, RLS, seed — chạy tay qua Supabase SQL Editor
```

## Ghi chú kỹ thuật

- **Không có mock-data fallback**: nếu Supabase lỗi hoặc RLS từ chối, service `throw` lỗi thật và UI hiện thông báo lỗi (`DataState`) — không hiện số liệu bịa.
- **In phiếu**: `src/lib/print.ts` — in trực tiếp phiếu nhập/xuất/cân qua cửa sổ trình duyệt, không cần máy in mạng.
- **PWA tối giản**: `public/sw.js` cache app shell (HTML/JS/CSS) để mở lại được khi mất mạng; dữ liệu nghiệp vụ (Supabase) không bao giờ bị cache.
- **Xuất Excel đa sheet**: `xlsx` được lazy-load — chỉ tải khi bấm nút Xuất Excel ở trang Báo cáo.

## Rủi ro bảo mật đã biết (chưa có bản vá từ nhà cung cấp)

`npm audit` báo 3 lỗ hổng:
- `react-router-dom` 6.x — có bản vá nhưng là **major version breaking change** lên v7, cần kiểm thử lại toàn bộ routing trước khi nâng cấp.
- `xlsx` (SheetJS) — lỗ hổng ReDoS/prototype pollution, **chưa có bản vá trên npm registry** (chỉ có trên CDN riêng của SheetJS). Rủi ro thấp trong app này vì chỉ dùng để **ghi** file Excel, không đọc file người dùng tải lên.

Chạy `npm audit` để xem chi tiết trước khi quyết định nâng cấp.
