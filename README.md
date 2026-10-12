# KhoPhe ERP — Quản lý Kho Phế Liệu

Ứng dụng quản lý xưởng phế liệu nhựa: nhập phế, xay phế, xuất phế, cân phế, tồn kho, công nợ, chi phí, nhân sự và báo cáo. React + TypeScript + Vite + Supabase (Postgres + Auth + RLS).

## Chạy dự án

```bash
nvm use 24            # Node.js 24
npm ci
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

1. Tạo project Supabase và điền URL, anon key vào `.env` theo `.env.example`.
2. Cài Supabase CLI, đăng nhập và liên kết đúng project bằng `npx supabase link --project-ref <project-ref>`.
3. Kiểm tra `npx supabase migration list` trước khi chạy `npx supabase db push`. Các file trong `supabase/migrations/` dùng timestamp và chạy theo thứ tự. Baseline tạo schema rỗng trên project mới; không nạp dữ liệu kinh doanh mẫu.
4. Tạo người dùng trong Supabase Auth, sau đó thêm hồ sơ tương ứng trong `public.users` với email và vai trò phù hợp. Username nội bộ được ánh xạ sang email `username@accounts.khophe.local`. Kế toán cần toàn quyền thì cấp `admin`.

**Project hiện hữu:** đối chiếu schema và lịch sử migration trước khi push. Không chạy lại các file trong `supabase/legacy/`; đó là tài liệu lịch sử, có cả seed dữ liệu thật và policy đã bị hủy bỏ. Project `ageezcxrthqmmacnrqpf` đã đồng bộ lịch sử đến `20261012005457` ngày 12/10/2026.

### Kiểm thử và sao lưu

```bash
npm run test:database                  # PostgreSQL WASM cô lập, dựng schema và chạy test rollback
npm run backup:data                    # cần SUPABASE_ACCESS_TOKEN trong .env
npm run test:database -- .backups/<file>.json  # thử khôi phục vào DB bộ nhớ riêng
```

Bản sao lưu nằm trong `.backups/` (git ignore), gồm dữ liệu các bảng nghiệp vụ public và checksum SHA-256. Kiểm thử khôi phục đối chiếu giá trị, số dòng và khóa ngoại. Bản này không bao gồm tài khoản/mật khẩu Supabase Auth hoặc nội dung file Storage; cần sao lưu riêng hai phần đó và lưu bản sao ở nơi an toàn ngoài máy làm việc. Script không có đường khôi phục ghi vào production.

CI chạy lint, unit test, build và kiểm thử migration trên PostgreSQL 17. `supabase/tests/bootstrap.sql` chỉ dành cho DB kiểm thử, tuyệt đối không chạy trên project thật.

## Phân quyền

| Vai trò | Xem | Ghi nghiệp vụ (nhập/xay/xuất/cân) | Sửa/Xoá | Tài chính (chi phí/ứng/lương) |
|---|---|---|---|---|
| `staff` | ✅ | ✅ | ❌ | ❌ |
| `manager` | ✅ | ✅ | ✅ | ✅ |
| `admin` | ✅ | ✅ | ✅ | ✅ + quản lý tài khoản |

Phân quyền được enforce ở **Row Level Security** trong Postgres (xem `supabase/legacy/003_users_roles_and_rls.sql`) — ẩn/hiện menu trên UI chỉ là tiện ích hiển thị, không phải cơ chế bảo mật.

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
  migrations/   Migration timestamp: schema, RLS, RPC
  legacy/       SQL lịch sử, không chạy lại
  tests/        Kiểm thử nghiệp vụ và phân quyền
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

## Nâng cấp vận hành 12/10/2026

- Dashboard dùng một RPC tổng hợp; giao diện chỉ dựng biểu đồ phù hợp kích thước màn hình.
- Trang Đối soát chỉ rõ công thức tồn kho, lô chưa liên kết, hao hụt chưa phân loại và tiền ứng chưa rõ mục đích; không tự sửa số liệu nguồn.
- Phiếu xay có danh mục/nguyên nhân hao hụt; chặn vượt lượng nhập của lô. Ngưỡng cảnh báo hao hụt có thể cấu hình.
- Bảng lương chuyển số dư âm/dương giữa kỳ, giữ hệ số tăng ca lịch sử; chốt lương nguyên tử, chống trả trùng và khóa sửa kỳ đã chốt.
- Báo cáo có dòng tiền thực thu/chi theo chứng từ, tránh cộng trùng khoản ứng với chi phí dùng tiền ứng. Chênh lệch bán–mua–chi không phải lợi nhuận kế toán.
- Cài đặt có ngưỡng hao hụt, hệ số tăng ca, tồn nguyên liệu đầu kỳ và nhật ký lỗi tập trung đã lọc thông tin nhạy cảm.
- Mật khẩu mới tối thiểu 8 ký tự. Kiểm tra mật khẩu rò rỉ chưa bật vì project hiện tại không có gói Pro.
- Các khoản ứng chưa phân loại và tồn kho âm giữ nguyên để đối chiếu chứng từ; không suy đoán giá vốn hay tự điều chỉnh tồn đầu kỳ.

### Nâng cấp full stack 08/10/2026

- Migration `20261008064436_fullstack_hardening.sql` đã áp dụng trên project `ageezcxrthqmmacnrqpf`: bảo vệ vai trò/tài khoản ngừng hoạt động, RLS file đính kèm, RPC cân nguyên tử có retry, khôi phục schema chốt lương, khóa kỳ lương đã chốt và RPC tổng tồn kho.
- Kiểm thử DB: chạy `supabase/tests/fullstack.sql` bằng SQL Editor hoặc `node scripts/run_migration.mjs supabase/tests/fullstack.sql`. Bộ test tạo dữ liệu tạm rồi `ROLLBACK`, kiểm tra quyền, cân nguyên tử/idempotency, ứng vượt lương, chốt lương, thanh toán và tồn kho. Không dùng dữ liệu mẫu làm dữ liệu vận hành.
- Các migration 001–016 trước đây được chạy thủ công, không đầy đủ trong lịch sử CLI. Trước khi `db push` phải đối chiếu schema và lịch sử; không đẩy lại toàn bộ SQL cũ lên DB hiện hữu.
- Node 24; Router 7, Tailwind 4, Vitest 4.1.11, SheetJS 0.20.3 chính thức; Inter phục vụ nội bộ. UI lấy cảm hứng từ `qlda-ddcn-ht-selfhost`: lam đậm, nền kem, nhấn vàng, bảng xen kẽ và mật độ tùy chọn.

#### Công thức chỉ số

| Chỉ số | Công thức / phạm vi |
| --- | --- |
| Giá trị nhập/xuất | Khối lượng × đơn giá, thành tiền lấy từ DB; phiếu đã xóa không tham gia tổng. |
| Lương phát sinh | Làm tròn VNĐ từng lượt: công × đơn giá ngày + giờ tăng ca × đơn giá ngày × 1,5 / 8. Đây là quy ước tăng ca ngày thường hiện tại của ứng dụng. |
| Lương còn sau ứng | Lương phát sinh − ứng; giữ số âm nếu ứng vượt lương. Khoản còn phải trả lấy phần không âm của tổng chưa trả theo từng người. |
| Chi phí vận hành | Chi phí xưởng + lương phát sinh trước ứng. Không cộng lại tiền ứng như một chi phí mới. |
| Chênh lệch giá trị | Giá trị bán − giá trị mua trong kỳ − chi phí vận hành. Chưa phân bổ giá vốn tồn kho; không phải lợi nhuận kế toán hoặc dòng tiền thực thu/chi. |
| Tồn thành phẩm | Tồn đầu + nhập thành phẩm trực tiếp + sản lượng xay ra − xuất thành phẩm. |
| Tồn nguyên liệu | Tồn nguyên liệu đầu (`opening_raw_stock_kg`) + nhập nguyên liệu − lượng đưa vào xay − xuất nguyên liệu. Cấu hình nguyên liệu đầu hiện qua bảng `settings`. |
| Bao ước tính | Làm tròn tồn thành phẩm / kg mỗi bao, tối thiểu 0; khối lượng âm vẫn được hiển thị để phát hiện lệch kho. Không phải số bao thực đếm. |
| Công nợ | Theo từng phiếu: max(0, thành tiền − tổng thanh toán); toàn bộ lịch sử. Phiếu cũ `paid` chưa có sổ thanh toán được coi đã trả theo trạng thái lịch sử. |
| Hao hụt xay | Tổng đầu vào − tổng đầu ra; tỷ lệ chia tổng đầu vào, không lấy trung bình các tỷ lệ từng lô. |
| % thay đổi | (Kỳ này − kỳ trước) / abs(kỳ trước) × 100; kỳ trước bằng 0 thì không hiển thị %. Kỳ liền trước cùng số ngày. |

Đối chiếu DB thật kỳ 09/09–08/10/2026: nhập 265.248 kg / 1.275.652.500đ, xuất 195.496,5 kg / 1.151.090.000đ; chi xưởng 1.707.000đ + lương 5.080.000đ = 6.787.000đ; chênh lệch giá trị −131.349.500đ. Không tự sửa lịch sử tài chính.

Kiểm tra sau nâng cấp: build, lint, format, 74 unit tests; DB rollback integration tests; browser desktop/mobile bằng dữ liệu giả lập, Excel tải xuống có kiểm tra số, lỗi nguồn dữ liệu không hiện KPI thiếu và quyền staff không thấy chi phí. Chưa kiểm thử đăng nhập bằng tài khoản vận hành thật hoặc triển khai bản frontend mới.


### Phân loại và đối soát tiền ứng (08/10/2026)

Trong Tài chính → Chi phí & Ứng tiền → Sổ ứng tiền:

- Có 5 mục đích: chưa phân loại, chi xưởng, mua nguyên liệu, ứng lương và khác. Sửa được phiếu cũ; lọc và tổng hợp riêng từng nhóm.
- Đối soát ứng chi xưởng/khác với phiếu chi đã ghi; ứng nguyên liệu với thanh toán phiếu nhập; ứng lương với lượt ứng trong chấm công của đúng nhân sự. Một chứng từ chỉ có một nguồn ứng. Chứng từ được liên kết toàn bộ số tiền, không tự chia nguồn.
- Nếu ứng lương chưa có trong chấm công, chọn tạo lượt ứng mới: 0 công, 0 lương, ứng bằng số chưa đối soát. Nếu đã có lượt ứng, chọn lượt đó để tránh trừ hai lần. Kỳ lương đã chốt không cho thay đổi.
- Hoàn ứng chọn phiếu gốc và kế thừa mục đích/nhân sự. Không cho đối soát hoặc hoàn vượt số tiền; phiếu đã đối soát không đổi số tiền, mục đích, ngày hay nhân sự. Gỡ liên kết để sửa chứng từ nếu kỳ chưa chốt.
- Số còn chưa đối soát = tiền ứng − chứng từ liên kết − hoàn ứng của phiếu gốc. Không trừ tất cả chi phí xưởng khỏi tất cả tiền ứng như trước đây. Tiền ứng không cộng thêm vào chi phí; lương phát sinh vẫn là tiền công trước ứng.
- Báo cáo và Excel có phân loại tiền ứng. Tiền ứng/hoàn tính theo kỳ đang chọn; số đã đối soát và số còn lại là hiện trạng của các phiếu ứng trong kỳ.

Migrations bổ sung: `20261008094958_classify_workshop_advances.sql`, `20261008095259_workshop_account_roles.sql`, `20261008095544_advance_reconciliation_guards.sql`. Tests DB trong `supabase/tests/advances.sql` và `supabase/tests/account_roles.sql` dùng fixtures rồi rollback.

Theo xác nhận của chủ xưởng, hai phiếu 10 triệu ngày 17/09 và 5 triệu ngày 21/09 cho Xếp Nam được phân loại ứng lương, gắn hồ sơ Anh Nam và đối soát vào chấm công. Đơn giá lương Anh Nam chưa được cung cấp, hiện 0; không suy đoán số công/tiền lương.

Tên đăng nhập có thể dùng thay email. Phân quyền mới: quản trị viên toàn hệ thống, quản lý kho sửa vận hành và kiểm kê nhưng không đọc tài chính/lương, kế toán xử lý tài chính/lương và đọc kho nhưng không sửa nghiệp vụ kho. Menu người dùng có Đổi mật khẩu, yêu cầu mật khẩu hiện tại. Tài khoản được tạo qua Supabase Auth Admin API, không chèn trực tiếp mật khẩu vào DB hoặc lưu mật khẩu trong repo.
