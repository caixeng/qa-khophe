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
npm run build         # tsc -b && vite build
npm run lint          # oxlint
npm run test          # vitest run
npm run format        # prettier --write .
npm run format:check  # prettier --check .
```

## Cấu hình Supabase

1. Tạo project tại [supabase.com](https://supabase.com).
2. Vào **SQL Editor**, chạy lần lượt các file trong `supabase/migrations/` theo đúng thứ tự số:
   `001` → `003` → `004` → `005` → `006` → `007` → `008` → `009`.
   **Bỏ qua `002_DEPRECATED_allow_anon_rls.sql.bak`** — file này mở toang RLS cho toàn bộ dữ liệu và đã bị huỷ bỏ; migration `003` thay thế hoàn toàn nó.
3. Migration `003` bật RLS theo vai trò (`admin` / `manager` / `staff`) và xoá quyền truy cập ẩn danh.
4. Tạo tài khoản đăng nhập thật: **Authentication > Users > Add user** (email + mật khẩu) cho từng người, rồi cấp vai trò:
   ```sql
   INSERT INTO users (email, full_name, role)
   VALUES ('ban@congty.vn', 'Quản trị viên', 'admin')
   ON CONFLICT (email) DO UPDATE SET role = 'admin';
   ```
   Lần đăng nhập đầu tiên, ứng dụng tự gắn `auth_id` vào đúng dòng này theo email.
5. Migration `007` seed dữ liệu sổ tay thực tế (tháng 6–7/2026) — an toàn khi chạy lại nhiều lần.
6. Migration `008` **tự kiểm tra bảo mật**: bật RLS cho mọi bảng, xoá policy `USING(true)` còn sót, và cảnh báo nếu có bảng không có policy hoặc chưa có tài khoản admin. Đọc tab **Messages/Notices** sau khi chạy.
7. Migration `009` thêm **bảng giá riêng theo đối tác** (`contacts.default_price_per_kg`) và điền sẵn giá từ đơn giá của phiếu gần nhất. Ứng dụng vẫn chạy bình thường nếu chưa chạy migration này — chỉ là không có tính năng tự điền giá khi chọn đối tác.
8. Copy `Project URL` và `anon public key` từ **Project Settings > API** vào file `.env`.

> **Không đăng nhập được?** Ứng dụng chỉ chấp nhận tài khoản Supabase Auth thật, và tài khoản đó phải có một dòng tương ứng trong bảng `users`. Nếu đăng nhập đúng mật khẩu mà báo *"chưa được cấp quyền trong hệ thống"*, nghĩa là bước 4 chưa làm cho email đó.

### Chạy migration bằng script (thay cho việc dán tay vào SQL Editor)

Thêm `SUPABASE_ACCESS_TOKEN=sbp_...` vào `.env` (lấy tại [account/tokens](https://supabase.com/dashboard/account/tokens)), rồi:

```bash
node scripts/run_migration.mjs --check                                  # chỉ đọc, không sửa gì
node scripts/run_migration.mjs supabase/migrations/009_contact_pricing.sql
```

`--check` chạy các truy vấn chẩn đoán: policy còn mở toang, phiếu xay sai vật lý (sản lượng ra > lượng vào), phiếu nhập nghi trùng, và trạng thái cột `default_price_per_kg`.

> Token này có **toàn quyền trên mọi project Supabase** của tài khoản, không giới hạn riêng project này. Dùng xong nên **Revoke** ngay. Anon key trong `.env` không thay thế được vì nó không chạy được DDL.

### Trạng thái đã áp dụng trên DB thật

Tính tới **06/08/2026**: migration `001`–`009` đã chạy xong trên project `ageezcxrthqmmacnrqpf`. Kiểm tra xác nhận không còn policy `USING(true)` nào và không có phiếu nhập trùng.

**Còn tồn:** 2 phiếu xay có sản lượng ra lớn hơn lượng vào (29/06 lệch +17 kg — khớp ghi chú sổ tay, nhiều khả năng sai số cân; 01/07 lệch **+1.397 kg** — cần đối chiếu sổ tay để sửa). Dữ liệu mới đã bị chặn bởi validation ở `grindingService` và CHECK trong migration `006`.

```sql
-- Tìm lại các dòng sai:
SELECT id, date, worker, input_qty_kg, output_qty_kg
FROM grinding WHERE deleted_at IS NULL AND output_qty_kg > input_qty_kg ORDER BY date;
```

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

- **Không có mock-data fallback**: nếu Supabase lỗi hoặc RLS từ chối, service `throw` lỗi thật và UI hiện thông báo lỗi (`DataState`) — không bao giờ hiện số liệu bịa. Lỗi Postgres được dịch sang tiếng Việt ở `src/lib/serviceError.ts`.
- **Thiếu biến môi trường thì app dừng ngay**: `src/lib/supabase.ts` throw lỗi thay vì fallback về URL placeholder rồi chạy im lặng trên dữ liệu rỗng.
- **Xác thực**: chỉ qua Supabase Auth. Không có tài khoản mặc định, không có đường vòng khi máy chủ từ chối.
- **In phiếu**: `src/lib/print.ts` — in trực tiếp phiếu nhập/xuất/cân qua cửa sổ trình duyệt, không cần máy in mạng.
- **Log lỗi**: `src/lib/errorLog.ts` lưu vòng tròn 50 lỗi gần nhất trong localStorage, bắt cả `window.onerror` lẫn `unhandledrejection` (ErrorBoundary chỉ thấy lỗi lúc render). Muốn chuyển sang Sentry chỉ cần sửa hàm `send()`.
- **Lọc theo kỳ ở phía máy chủ**: `useDateRange` giữ khoảng ngày trong URL (`?from=…&to=…`), đẩy xuống tận truy vấn Supabase (`.gte('date')`/`.lte('date')`, trần `MAX_ROWS`). Mọi thẻ KPI trên trang tính theo đúng kỳ đang chọn.
- **PWA**: `public/manifest.json` + `public/sw.js`. HTML dùng **network-first** (cache chỉ khi offline) vì nó trỏ tới các file JS có hash trong tên — trả HTML cũ sau khi deploy sẽ khiến trình duyệt tải chunk đã bị xoá và hiện màn hình trắng. File có hash dùng cache-first vì nội dung bất biến. Dữ liệu Supabase không bao giờ bị cache.
- **Xuất Excel đa sheet**: `xlsx` lazy-load — chỉ tải khi bấm Xuất Excel ở trang Báo cáo, nên không nằm trong bundle khởi động.
- **Tách chunk**: `vite.config.ts` tách vendor (react/router/supabase/charts/icons) khỏi mã ứng dụng để sửa code không bắt người dùng tải lại toàn bộ thư viện.

## Rủi ro bảo mật đã biết (chưa có bản vá từ nhà cung cấp)

`npm audit` báo 3 lỗ hổng:
- `react-router-dom` 6.x — có bản vá nhưng là **major version breaking change** lên v7, cần kiểm thử lại toàn bộ routing trước khi nâng cấp.
- `xlsx` (SheetJS) — lỗ hổng ReDoS/prototype pollution, **chưa có bản vá trên npm registry** (chỉ có trên CDN riêng của SheetJS). Rủi ro thấp trong app này vì chỉ dùng để **ghi** file Excel, không đọc file người dùng tải lên.

Chạy `npm audit` để xem chi tiết trước khi quyết định nâng cấp.
