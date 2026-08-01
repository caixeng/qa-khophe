# KhoPhe ERP — Báo cáo Review & Kế hoạch Tối ưu

> Ngày review: 31/07/2026 · Branch `main` · 54 file nguồn / ~7.800 dòng

---

## ⚠️ CẬP NHẬT 31/07/2026 — Phase 0-6 đã triển khai trên code

Toàn bộ code đã được sửa/viết theo kế hoạch bên dưới. **Việc còn lại bắt buộc trước khi dùng:**

1. **Chạy migration `003` → `007`** trong Supabase SQL Editor theo đúng thứ tự (xem `README.md`). Nếu chưa chạy, app sẽ hiện lỗi thật (vd: `column exports.deleted_at does not exist`) thay vì số liệu giả như trước — đây là hành vi ĐÚNG theo thiết kế mới, không phải bug.
2. **Tạo tài khoản Supabase Auth thật** cho từng người dùng — backdoor `admin@khophe.vn/123456` đã bị xoá khỏi code. Không còn ai đăng nhập được cho tới khi làm bước này.
3. Cân nhắc nâng cấp `react-router-dom` lên v7 (có lỗ hổng bảo mật mức trung bình, nhưng là breaking change — chưa tự làm vì cần kiểm thử lại toàn bộ routing).

Xem `README.md` để biết chi tiết từng bước.

---

## PHẦN A — HIỆN TRẠNG

### A0. Ứng dụng đang KHÔNG build được và có 2 trang crash

| # | Vấn đề | Vị trí | Hậu quả |
|---|---|---|---|
| 1 | `npm run build` FAIL — `tsc -b` báo 28 lỗi | toàn dự án | Không deploy được lên Vercel |
| 2 | `useState` không được import | `src/pages/XayPhePage.tsx:31`, `src/pages/XuatPhePage.tsx:33` | Bấm tab **Xay phế** / **Xuất phế** → `ReferenceError`, trắng màn hình |
| 3 | Duplicate object key (TS1117) | `weighingService.ts:11,20,128`, `expensesService.ts:25,26` | `total_kg`, `person` khai báo 2 lần |
| 4 | Đọc field không tồn tại `supplier_name` / `customer_name` (đúng là `contact_name`) | `DashboardPage.tsx:53,61,175` | "Hoạt động gần đây" và "Cảnh báo" luôn hiện *"Khách lẻ"* |
| 5 | Import thừa gây lỗi `noUnusedLocals` | 8 file | Chặn build |

**→ Đây là việc phải làm trước tiên, trước mọi thứ khác.**

---

### A1. Bảo mật — mức độ nghiêm trọng CAO

| # | Vấn đề | Chi tiết |
|---|---|---|
| 6 | **RLS mở toang cho `anon`** | `002_allow_anon_rls.sql` đặt `USING(true) WITH CHECK(true)` cho **tất cả 9 bảng**, kể cả `users`. Anon key nằm công khai trong bundle JS → bất kỳ ai mở DevTools cũng **đọc / sửa / xoá toàn bộ** dữ liệu nhập-xuất, công nợ, lương nhân viên. |
| 7 | **Backdoor đăng nhập hardcode** | `AuthContext.tsx:76` — `admin@khophe.vn` / `123456` vẫn vào được kể cả khi Supabase từ chối. `LoginPage.tsx:8-9` còn **điền sẵn** cặp này vào form. |
| 8 | **Không có phân quyền thật** | `role: 'Admin'` gán cứng cho mọi user (`AuthContext.tsx:38,56,90`). DB có cột `users.role` nhưng app chưa bao giờ đọc. UI nói "Giám đốc / Quản lý kho" nhưng ai cũng làm được mọi thứ. |
| 9 | Không đồng bộ `auth.users` ↔ bảng `users` | Đăng nhập xong không fetch profile, không biết user là ai trong hệ thống. |
| 10 | `created_by` không bao giờ được ghi | Mọi service `insert` đều bỏ qua → **không truy vết được ai nhập phiếu nào**. |

---

### A2. Database — thiếu bảng, thiếu ràng buộc

| # | Vấn đề |
|---|---|
| 11 | **Bảng `employees` và `attendance` KHÔNG tồn tại** trong bất kỳ migration nào, nhưng `employeesService.ts` truy vấn tới → module Nhân sự (614 dòng) chạy 100% trên mock data. |
| 12 | **Không có bảng `payments`** — `payment_status = 'partial'` nhưng không lưu được số tiền đã trả. Hệ quả: cột "Nợ còn lại" ở `CongNoPage` đang hiện **toàn bộ** giá trị đơn → **số công nợ sai** với mọi đơn trả một phần. |
| 13 | **Không có `stock_movements` / kiểm kê** — tồn kho tính `SUM(xay) − SUM(xuất)` ở client. Không chốt kỳ, không kiểm kê thực tế, không điều chỉnh hao hụt. |
| 14 | `exports.weighing_session_id` **không có FOREIGN KEY** → liên kết phiếu xuất ↔ phiên cân là lỏng lẻo. |
| 15 | `total_amount` nullable và tính ở client → có thể lệch với `quantity_kg × price_per_kg`. |
| 16 | Không có CHECK: `quantity_kg > 0`, `price_per_kg >= 0`, `grinding.output_qty_kg <= input_qty_kg`. Dữ liệu thật đã có dòng output **vượt** input (`grd-1`: 1.395 → 1.412 kg). |
| 17 | Thiếu `updated_at` (chỉ `contacts` có), thiếu **audit log**, thiếu **soft delete** — xoá phiếu là mất vĩnh viễn. |
| 18 | Không có unique constraint chống nhập trùng phiếu. |
| 19 | Thiếu index: `imports(payment_status)`, `exports(payment_status)`, `imports(processing_status)` — các cột được filter nhiều nhất. |
| 20 | Toàn bộ dữ liệu sổ tay (26 phiếu nhập, 7 phiếu xay, 49 bao cân, 17 khoản chi) **hardcode trong file `.ts`** thay vì nằm trong DB. |

---

### A3. Tầng dữ liệu — rủi ro nghiệp vụ

| # | Vấn đề |
|---|---|
| 21 | **Mọi service nuốt lỗi và trả mock data.** Ví dụ `importsService.getAll()`: `if (error \|\| !data \|\| data.length === 0) return ALL_NOTEBOOK_IMPORTS`. Supabase chết → người dùng thấy **số liệu giả mà tưởng là thật**. Đây là rủi ro lớn thứ hai sau RLS. |
| 22 | **`create()` khi lỗi vẫn trả object giả** (`importsService.ts:85-99`, `employeesService.ts:99`, `weighingService.ts:121`) → UI báo toast "Thành công", danh sách hiện dòng mới, **nhưng DB không có gì**. |
| 23 | `useAsyncData`: `fetchData` phụ thuộc `data` → identity thay đổi mỗi lần fetch; `staleTime` 30s có thể **chặn refetch ngay sau khi thêm/sửa**. |
| 24 | Không cache / dedupe: Dashboard gọi 4 service, mỗi page mount lại fetch full table bằng `select('*')`. Không phân trang phía server. |
| 25 | KPI bịa số: `inventoryKg \|\| 52200`, `inventoryBags \|\| 58` (`DashboardPage.tsx:93-94`, `TonKhoPage.tsx:29-30`), `formatKg(16200)` cứng cho "Xay hôm nay" (`DashboardPage.tsx:115`). Khi dữ liệu thật = 0, app hiện số giả. |

---

### A4. UI/UX

| # | Vấn đề |
|---|---|
| 26 | Quy đổi **1 bao = 900 kg hardcode** ở 2 nơi, trong khi dữ liệu cân thực tế dao động 700–1.015 kg/bao → số bao tồn hiển thị sai. |
| 27 | Biểu đồ tồn kho chỉ có **1 điểm dữ liệu** cố định `'28/07'` (`TonKhoPage.tsx:66-68`) → vô nghĩa. |
| 28 | Dashboard: "Xay hôm nay" và "Xuất hôm nay" là số cứng; "Nhập hôm nay" thực chất là **tổng all-time**. |
| 29 | Không có bộ lọc khoảng ngày ở phần lớn trang (`DateRangePicker` đã có nhưng ít dùng) → không chọn được kỳ báo cáo. |
| 30 | Xuất Excel chỉ 1 sheet "Tổng Quan", không xuất chi tiết từng phiếu. |
| 31 | **Không có in phiếu** (phiếu nhập / xuất / phiếu cân) — nghiệp vụ kho phế cần chứng từ giấy ký nhận tại chỗ. |
| 32 | Không có trang chi tiết đối tác: lịch sử giao dịch + công nợ theo từng NCC/khách. |
| 33 | Mobile: chỉ Dashboard có view riêng. Các bảng nhập/xuất/cân vẫn là table cuộn ngang — khó thao tác tại xưởng. |
| 34 | A11y: bảng thiếu `<caption>` / `scope`, modal chưa có focus trap, nhiều chỗ chữ `text-[10px]` quá nhỏ so với môi trường xưởng. |
| 35 | Không có PWA / offline — xưởng phế hay mất sóng, dữ liệu nhập dở sẽ mất. |
| 36 | Trạng thái rỗng và skeleton dùng chưa nhất quán giữa các trang. |

---

### A5. Chất lượng code & tooling

| # | Vấn đề |
|---|---|
| 37 | **`tsconfig.app.json` KHÔNG bật `strict`** → mất phần lớn giá trị của TypeScript (`strictNullChecks`, `noImplicitAny`…). |
| 38 | **0 test**, không có CI. |
| 39 | Dependency thừa: `sonner` và `date-fns` cài nhưng **không dùng ở đâu** (ToastContext tự viết). `pg` nằm trong devDependencies của app frontend. |
| 40 | `package.json` name vẫn là `"app-temp"`; `README.md` vẫn là template Vite mặc định. |
| 41 | Không có Prettier / format script. |
| 42 | ~25 warning `react-hooks/exhaustive-deps`, 6 warning `const-comparisons` (biểu thức luôn cho cùng kết quả — ví dụ `XuatPhePage.tsx:67`, `CanPhePage.tsx:207`). |
| 43 | Không có `vite.config.ts` tối ưu: chưa cấu hình `manualChunks`, `xlsx` (~500 KB) nên tách lazy. |

---

## PHẦN B — KẾ HOẠCH TỐI ƯU

### Phase 0 — Sửa cháy (½ ngày) 🔴 BẮT BUỘC LÀM TRƯỚC — ✅ ĐÃ XONG (31/07/2026)

- [x] Thêm `import { useState }` vào `XayPhePage.tsx`, `XuatPhePage.tsx`
- [x] Xoá 5 duplicate key ở `weighingService.ts`, `expensesService.ts`
- [x] Sửa `supplier_name`/`customer_name` → `contact_name` ở `DashboardPage.tsx`
- [x] Dọn import thừa trong 8 file
- [x] Xoá fallback bịa số: `|| 52200`, `|| 58`, `formatKg(16200)`; "Nhập/Xay/Xuất hôm nay" giờ tính đúng theo ngày thực tế thay vì số cứng
- [x] Sửa 6 biểu thức logic luôn-đúng (`x || x`)
- **Đã kiểm chứng:** `npm run build` xanh, `tsc -b` sạch, oxlint 0 lỗi; chạy thử trên trình duyệt — Dashboard, tab Xay phế, tab Xuất phế đều không còn crash, không lỗi console

**Thêm ngoài kế hoạch (theo yêu cầu UI giống cic-ibst):**
- [x] `GlobalSearch` (Ctrl+K) — port nguyên pattern từ dự án `cic-ibst`, tìm xuyên suốt phiếu nhập/xuất/đối tác/nhân viên; gắn nút tìm kiếm + phím tắt vào `AppLayout`
- [x] `src/lib/print.ts` — module in phiếu theo đúng pattern `print.ts` của `cic-ibst` (mở cửa sổ mới, in trực tiếp), có 3 hàm: `printPhieuNhap`, `printPhieuXuat`, `printPhieuCan`; đã gắn nút "In phiếu" vào bảng Nhập phế, Xuất phế và lịch sử phiên Cân phế

### Phase 1 — Bảo mật & Phân quyền (1–2 ngày) 🔴

- [ ] Migration `003_rls_proper.sql`: bỏ policy `USING(true)`, thay bằng policy theo `auth.uid()` + `role`
  - `staff`: đọc tất cả, ghi `imports`/`grinding`/`exports`/`weighing`, không xoá
  - `manager`: + sửa/xoá, + `expenses`/`advances`/`contacts`
  - `admin`: toàn quyền + `users`/`employees`/lương
- [ ] Bảng `users`: chỉ đọc được dòng của chính mình (trừ admin)
- [ ] Xoá backdoor `admin@khophe.vn / 123456` khỏi `AuthContext.tsx`; bỏ giá trị điền sẵn ở `LoginPage.tsx`
- [ ] Sau đăng nhập → fetch profile từ bảng `users` theo `auth_id`, lấy `role` thật
- [ ] Thêm `<RequireRole>` guard cho route và component `<Can action="...">` cho nút
- [ ] Set `created_by` trong mọi service `insert`
- [ ] Đổi mật khẩu admin hiện tại; rà lại xem anon key đã bị lộ ra ngoài chưa
- **Nghiệm thu:** đăng nhập bằng tài khoản `staff` → nút Xoá bị ẩn VÀ request xoá bị RLS chặn (kiểm tra bằng Network tab)

### Phase 2 — Database v2 (2–3 ngày) 🟠

- [ ] `003_employees_attendance.sql` — tạo thật 2 bảng `employees`, `attendance` (kèm FK, CHECK, index)
- [ ] `004_payments.sql` — bảng `payments` (`ref_type`, `ref_id`, `amount`, `date`, `method`, `note`) + view `v_debts` tính nợ còn lại chuẩn
- [ ] `005_stock.sql` — bảng `stock_movements` + `stock_counts` (kiểm kê) + view `v_inventory`
- [ ] `006_constraints.sql`:
  - CHECK `quantity_kg > 0`, `price_per_kg >= 0`
  - FK `exports.weighing_session_id → weighing_sessions(id)`
  - `total_amount` chuyển thành `GENERATED ALWAYS AS (quantity_kg * price_per_kg) STORED`
  - `updated_at` + trigger cho mọi bảng
  - `deleted_at` (soft delete) cho các bảng chứng từ
  - Index cho `payment_status`, `processing_status`
- [ ] `007_audit.sql` — bảng `audit_log` + trigger ghi INSERT/UPDATE/DELETE
- [ ] `008_seed_notebook.sql` — chuyển toàn bộ dữ liệu sổ tay từ file `.ts` vào DB
- [ ] Sinh type từ schema: `supabase gen types typescript` → thay `src/types.ts` viết tay
- **Nghiệm thu:** chạy lại từ DB trắng bằng migration; app đọc đủ dữ liệu mà không cần mock

### Phase 3 — Tầng dữ liệu (1–2 ngày) 🟠

- [ ] **Bỏ toàn bộ fallback mock trong service.** Lỗi phải nổi lên UI (`DataState` đã sẵn sàng nhận `error`)
- [ ] `create/update/delete` phải `throw` khi Supabase lỗi — không trả object giả
- [ ] Sửa `useAsyncData`: bỏ `data` khỏi deps của `fetchData`, `refetch` luôn bỏ qua `staleTime`
- [ ] Thêm phân trang + filter phía server (`.range()`, `.gte('date')`, `.eq('payment_status')`) thay `select('*')`
- [ ] Gom logic tính toán (tồn kho, công nợ, lãi/lỗ) vào `src/lib/calc.ts` dùng chung Dashboard/TonKho/BaoCao — hiện đang lặp 3 nơi với công thức khác nhau
- [ ] Đưa hằng số `KG_PER_BAG` vào bảng `settings`, bỏ hardcode 900
- **Nghiệm thu:** ngắt mạng → app hiện thông báo lỗi rõ ràng + nút "Thử lại", không hiện số giả

### Phase 4 — Tính năng nghiệp vụ (3–5 ngày) 🟡

- [ ] **Thanh toán từng phần**: modal "Ghi nhận thanh toán" trên phiếu nhập/xuất; `payment_status` tự cập nhật theo tổng đã trả
- [ ] **Công nợ theo đối tác**: trang chi tiết NCC/khách — số dư, lịch sử phiếu, lịch sử thanh toán, nút gọi điện
- [ ] **In phiếu**: mẫu in A5 cho phiếu nhập / phiếu xuất / phiếu cân (CSS `@media print`), có chỗ ký nhận
- [ ] **Kiểm kê kho**: form đếm bao thực tế → sinh bút toán điều chỉnh chênh lệch
- [ ] **Báo cáo lãi/lỗ theo kỳ**: chọn khoảng ngày → doanh thu − giá vốn − chi phí − lương, kèm biểu đồ xu hướng
- [ ] **Báo cáo hiệu suất xay**: tỷ lệ hao hụt theo NCC / theo thợ / theo tháng → biết nguồn phế nào lãi thật
- [ ] **Xuất Excel đa sheet**: Tổng quan + Nhập + Xay + Xuất + Chi phí + Công nợ, lọc theo kỳ đã chọn
- [ ] **Chấm công & lương** chạy trên DB thật, có bảng lương tháng và tổng ứng/còn lại
- [ ] Bảng giá theo đối tác (giá nhập/xuất mặc định riêng từng NCC) thay vì cứng 4.000 / 6.000

### Phase 5 — UI/UX (3–4 ngày) 🟡

- [ ] Biểu đồ tồn kho theo thời gian thật (dựng từ `stock_movements`, mặc định 30 ngày)
- [ ] Dashboard: KPI đúng nghĩa "hôm nay" + so sánh với hôm qua/tuần trước (`trend` hiện đang là số cứng)
- [ ] `DateRangePicker` toàn cục, đồng bộ qua URL query, dùng chung mọi trang
- [ ] Card view thay table trên mobile cho Nhập/Xay/Xuất; NumPad cho mọi ô nhập số
- [ ] Modal: focus trap + `Esc` đóng + trả focus về nút gốc
- [ ] Bảng: `<caption>`, `scope="col"`, sort được theo cột, nâng cỡ chữ tối thiểu lên 12px
- [ ] Empty state có hướng dẫn hành động; skeleton dùng nhất quán
- [ ] PWA: manifest + service worker, cache dữ liệu đọc, hàng đợi ghi khi offline
- [ ] Xác nhận trước khi rời form đang nhập dở
- [ ] Tìm kiếm toàn cục (Ctrl+K): tìm phiếu, đối tác, nhân viên

### Phase 6 — Chất lượng & Vận hành (1–2 ngày) 🟢

- [ ] Bật `"strict": true` trong `tsconfig.app.json`, sửa hết lỗi phát sinh
- [ ] Vitest + React Testing Library: test `lib/calc.ts` (công thức tiền/tồn kho), service, và luồng nhập phiếu
- [ ] GitHub Actions: `build` + `lint` + `test` mỗi PR
- [ ] Gỡ `sonner`, `date-fns`, `pg` khỏi dependencies
- [ ] Đổi `package.json` name → `qa-khophe`; viết lại `README.md` (cách chạy, biến môi trường, cách chạy migration)
- [ ] Prettier + script `format`
- [ ] `vite.config.ts`: `manualChunks` cho `recharts`/`xlsx`, lazy-load `xlsx` chỉ khi bấm Xuất Excel
- [ ] Sửa hết warning `exhaustive-deps`
- [ ] Sentry hoặc log lỗi tối thiểu để biết user gặp lỗi gì

---

## PHẦN C — THỨ TỰ ƯU TIÊN ĐỀ XUẤT

```
Tuần 1:  Phase 0  →  Phase 1  →  Phase 2      (app chạy được + an toàn + DB đúng)
Tuần 2:  Phase 3  →  Phase 4 (thanh toán, công nợ, in phiếu)
Tuần 3:  Phase 4 (còn lại)  →  Phase 5
Tuần 4:  Phase 6  +  chạy thử tại xưởng, chỉnh theo phản hồi
```

**Ba việc quan trọng nhất, nếu chỉ làm được 3 việc:**
1. Phase 0 — app đang vỡ, không deploy được
2. Mục 6 (RLS) — dữ liệu kinh doanh đang phơi ra internet
3. Mục 21+22 (bỏ mock fallback) — đang có nguy cơ ra quyết định trên số liệu giả
