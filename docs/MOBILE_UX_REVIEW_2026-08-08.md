# Đánh giá toàn diện UI/UX mobile — KhoPhe ERP

**Ngày đánh giá:** 08/08/2026  
**Phạm vi:** giao diện điện thoại 320–430 px, tablet dọc 768–1023 px, PWA standalone, điều hướng, dashboard, danh sách, form, modal/bottom sheet, trạng thái dữ liệu và khả năng thao tác tại xưởng.

## 1. Kết luận điều hành

Ứng dụng đã có nền mobile tốt hơn một web ERP responsive thông thường: có bottom navigation, FAB thao tác nhanh, dashboard mobile riêng, card view cho Nhập/Xay/Xuất/Công nợ/Danh bạ, NumPad cho cân phế, input số có `inputMode`, PWA shell và hệ thống theme nhất quán.

Tuy nhiên, ứng dụng **chưa đạt mức hoàn thiện của một mobile app chuyên nghiệp** vì trải nghiệm chưa đồng nhất giữa các module. Các vấn đề lớn nhất hiện tại là:

1. Safe-area đang được gọi bằng class `pb-safe-area` nhưng class này không tồn tại trong CSS build; bottom nav và bottom sheet chưa thực sự tránh vùng home indicator.
2. Khung ứng dụng dùng `h-screen`/`100vh`, chưa dùng dynamic viewport; thanh địa chỉ và bàn phím mobile có thể làm che hoặc nhảy nội dung.
3. Quy tắc input 16 px chống iOS auto-zoom đang bị các utility `text-xs`/`text-[11px]` ghi đè ở nhiều màn.
4. Nhiều nút phân trang, tab, icon xóa và tùy chọn theme nhỏ hơn vùng chạm 44×44 px.
5. Chi phí, hồ sơ nhân viên, bảng lương, chi tiết đối tác và một số bảng báo cáo vẫn dùng bảng cuộn ngang trên mobile.
6. Tab nghiệp vụ chỉ đổi state, không đổi URL; Back/Forward, deep link và trạng thái sau reload chưa đúng kỳ vọng mobile.
7. FAB và menu “Thêm” chưa lọc đầy đủ theo role; người dùng có thể bấm vào chức năng rồi mới gặp trang từ chối quyền.
8. Modal/bottom sheet chưa hoàn chỉnh về bàn phím, focus, safe-area và semantics; “tay nắm kéo” thực tế chỉ bấm để đóng, không kéo được.
9. Cỡ chữ 10–11 px còn xuất hiện nhiều ở KPI và cảnh báo — khó đọc ngoài trời/xưởng.
10. PWA chưa có offline/update banner và chiến lược cache HTML chưa bảo đảm mở lại mọi route khi offline.

**Điểm tổng hợp hiện tại: 6,4/10.** Nền tảng, nhận diện và luồng chính khá tốt; cần một vòng “mobile hardening” có hệ thống thay vì sửa lẻ từng trang.

## 2. Phương pháp và bằng chứng

- Kiểm thử trực tiếp trang đăng nhập ở 320×568, 390×844 và 430×932.
- Ở cả ba kích thước: không có tràn ngang; card giữ lề 16 px; input cao ~49,6 px, font 16 px; nút đăng nhập cao 44 px.
- Không sử dụng hoặc suy đoán tài khoản đăng nhập. Các màn sau đăng nhập được audit từ component, breakpoint, CSS build và luồng route.
- Kiểm tra production: `npm run build` đạt; `npm run lint` đạt; `npm run test` đạt 35/35 test.
- CSS build xác nhận `.pb-safe-area` không được sinh; `.text-xs` và `.text-[11px]` đứng sau `.input-field`, nên có thể ghi đè font 16 px.

## 3. Bảng điểm theo tiêu chí

| Tiêu chí | Điểm | Nhận xét |
|---|---:|---|
| Nhận diện và tính nhất quán hình ảnh | 7,5/10 | Màu, surface, card, icon và theme thống nhất; đôi chỗ quá nhiều badge/màu trạng thái |
| Điều hướng mobile | 6,5/10 | Bottom nav + FAB tốt; còn lỗi role, URL tab, tên “Thêm” dễ lẫn với hành động tạo mới |
| Responsive layout | 6,5/10 | Luồng chính đã có card view; nhiều module phụ vẫn là bảng ngang |
| Form và nhập liệu | 7/10 | `inputMode`, NumPad, preview tổng tiền và khóa nút lưu tốt; keyboard/safe-area/iOS zoom chưa chốt |
| Vùng chạm và thao tác một tay | 5/10 | Nhiều điều khiển 24–36 px; các thao tác nguy hiểm có icon rất nhỏ |
| Khả năng đọc tại xưởng | 5,5/10 | Còn nhiều chữ 10–11 px và số tiền bị `truncate`/có nguy cơ tràn |
| Feedback, loading, empty/error | 7/10 | Có skeleton, DataState, toast và confirm riêng; thiếu offline/update state toàn cục |
| Modal, sheet và bàn phím | 5/10 | Có scroll lock và ESC; thiếu `dvh`, sticky action, focus restore, dialog semantics và drag thật |
| Accessibility | 5/10 | Có skip link, caption, label và một số focus trap; chưa đồng đều, thiếu aria cho sheet/tab/icon |
| PWA / cảm giác app-native | 5,5/10 | Có manifest + service worker; thiếu icon chuẩn, install/update/offline UX và cache route chắc chắn |

## 4. Điểm mạnh nên giữ

- App shell rõ ràng: header gọn, bottom nav 4 mục + FAB trung tâm hợp với thao tác tại xưởng.
- Nhập/Xay/Xuất đã bỏ bảng ngang trên mobile và dùng card có thông tin chính.
- Dashboard có bản mobile riêng, ưu tiên KPI và cảnh báo vận hành.
- Cân phế có NumPad, tổng gross/tare/net theo thời gian thực và cơ chế tránh mất phiên chưa lưu.
- Form có tổng tiền tính trước, trạng thái lưu, toast lỗi và confirm thao tác nguy hiểm.
- `.page-shell` đã gom khoảng trống cho bottom nav, khắc phục kiểu mỗi trang tự nhớ padding.
- Code splitting tốt; báo cáo/charts và XLSX tách chunk; build, lint và test đều xanh.

## 5. Vấn đề chi tiết theo mức ưu tiên

### P0 — Sửa trước khi gọi là mobile production-ready

#### 5.1. Viewport và safe-area chưa hoạt động đúng

- `AppLayout.tsx` dùng `h-screen`; loading/login/error cũng dùng `h-screen` hoặc `min-h-screen`.
- Bottom nav và bottom sheet dùng `pb-safe-area`, nhưng Tailwind config không định nghĩa utility/plugin này và CSS build không chứa class tương ứng.
- `index.html` chưa có `viewport-fit=cover`.

**Hậu quả:** nội dung có thể bị home indicator chạm vào; chiều cao app sai khi thanh địa chỉ co giãn hoặc bàn phím mở; footer/modal có thể nằm dưới keyboard.

**Giải pháp:** tạo token CSS thật cho `--safe-top`, `--safe-bottom`; dùng `height: 100dvh` có fallback; đặt chiều cao bottom nav thành `calc(64px + env(safe-area-inset-bottom))`; thêm padding safe-area cho sheet/modal; bổ sung `viewport-fit=cover`.

#### 5.2. iOS auto-zoom vẫn có thể xảy ra

`.input-field` đặt 16 px trên mobile, nhưng nhiều nơi gắn thêm `text-xs` hoặc `text-[11px]`: TableToolbar, DateRangePicker, PeriodFilter, QuickAttendanceCard, select đối tác ở Cân phế. Utility sinh sau component CSS và ghi đè 16 px.

**Giải pháp:** không đặt font nhỏ trực tiếp lên input/select ở breakpoint mobile; chuẩn hóa `.form-control` luôn 16 px dưới 768 px và chỉ giảm từ `md`; thêm test computed style ở 390 px.

#### 5.3. Vùng chạm dưới chuẩn

- Pagination dùng `p-1` + icon 16 px, tương đương khoảng 24 px.
- Tab Quản lý phế/Tài chính cao khoảng 30–32 px.
- Nút xóa từng bao ở Cân phế chỉ 16×16 px.
- Nút đóng modal, tùy chọn màu/theme và một số icon action nhỏ hơn 44 px.

**Giải pháp:** định nghĩa `.tap-target` min 44×44 px cho mobile; áp cho mọi button/icon/tab; giữ visual icon nhỏ nhưng hitbox lớn; destructive action cần label/confirm rõ.

#### 5.4. Các bảng ngang còn lại

- Chi phí và Ứng tiền vẫn render bảng `overflow-x-auto` trên mobile.
- Danh sách nhân viên, một số bảng chấm công/bảng lương vẫn cuộn ngang.
- Chi tiết đối tác có bảng lịch sử nhập/xuất ngang.
- Báo cáo hiệu suất có bảng ngang.

**Giải pháp:** dùng card/list hoặc disclosure row cho mobile; mỗi card chỉ giữ 3–5 dữ kiện ưu tiên, chi tiết mở sheet. Không dùng cuộn ngang cho nghiệp vụ nhập liệu thường xuyên.

#### 5.5. Điều hướng theo role và lịch sử trình duyệt

- Tab Quản lý phế/Tài chính chỉ gọi `setActiveTab`, không cập nhật search params.
- FAB quick action luôn hiển thị “Ghi nhận Chi phí” kể cả staff.
- Mobile More menu có Cài đặt nhưng không có `adminOnly`, trong khi route chỉ cho admin.

**Giải pháp:** một nguồn cấu hình menu/action dùng chung desktop/mobile; lọc theo role trước khi render; tab dùng `setSearchParams`; hỗ trợ Back/Forward và deep link; đặt semantics `role=tablist/tab/tabpanel`.

### P1 — Hoàn thiện trải nghiệm hằng ngày

#### 5.6. Form mobile còn mang dáng desktop modal

- Modal giữa màn hình, max-height theo `vh`, action nằm cuối form dài.
- Khi keyboard mở, người dùng có thể mất nút Lưu hoặc ngữ cảnh trường đang nhập.
- Các form tiền/khối lượng chưa dùng NumPad thống nhất; mới Cân phế có trải nghiệm chuyên biệt.

**Giải pháp:** ở mobile chuyển form tạo/sửa thành full-height sheet/page; header sticky, action footer sticky và nằm trên keyboard/safe-area; nhóm trường theo thứ tự thao tác thực tế; dùng numeric keypad/format tiền thống nhất; giữ draft khi đóng/rời form.

#### 5.7. Khả năng đọc và định dạng số

- Nhiều KPI/cảnh báo dùng 10–11 px.
- Một số KPI dùng `truncate`; số tiền lớn có thể bị cắt mà không có cách xem đủ.
- Dashboard hai cột có nguy cơ tràn với số tiền hàng trăm triệu/tỷ.

**Giải pháp:** body tối thiểu 14 px, secondary tối thiểu 12 px; KPI dùng `clamp()` hoặc format gọn (`1,25 tỷ`) kèm giá trị đầy đủ trong chi tiết; không truncate số tiền nghiệp vụ.

#### 5.8. Modal/bottom sheet và accessibility

- MobileBottomSheet chưa có `role=dialog`, `aria-modal`, focus trap, focus restore hay label cho nút đóng.
- Handle có hình thức kéo nhưng chỉ click để đóng, không có drag gesture.
- ConfirmDialog thiếu dialog semantics/focus trap; GlobalSearch thiếu xử lý lỗi tải dữ liệu và input chỉ 14 px.

**Giải pháp:** làm một primitive `AdaptiveDialog`: desktop modal, mobile sheet/full screen; focus trap/restore, ESC/backdrop, aria-labelledby/description, reduced motion; hoặc triển khai drag đúng, hoặc bỏ affordance kéo giả.

#### 5.9. Hệ thống trạng thái và hành động

- Empty state mới chủ yếu là thông báo, chưa luôn có CTA phù hợp.
- Cảnh báo dashboard là khối tĩnh, chưa mở thẳng danh sách cần xử lý.
- Không có banner offline; GlobalSearch có thể treo “Đang tải” khi một service lỗi.

**Giải pháp:** warning/KPI có drill-down; empty state có CTA; offline banner + retry; lỗi từng nguồn trong GlobalSearch không làm hỏng toàn bộ tìm kiếm; toast action “Thử lại/Hoàn tác” khi phù hợp.

### P2 — Polish và vận hành dài hạn

#### 5.10. PWA chưa hoàn chỉnh

- Manifest chỉ có SVG `sizes:any`; thiếu PNG 192/512, maskable và apple-touch-icon 180.
- Service worker không pre-cache shell khi install. HTML được cache theo URL route đã điều hướng, trong khi fallback lại tìm `/index.html`, nên mở offline một route chưa từng cache có thể thất bại.
- Chưa có UI báo bản mới, cài ứng dụng hoặc trạng thái offline.

**Giải pháp:** icon set chuẩn; pre-cache canonical shell; navigation fallback thống nhất; update toast “Có phiên bản mới”; install prompt không gây phiền; cache dữ liệu chỉ đọc có TTL nếu nghiệp vụ cho phép, tuyệt đối không giả báo lưu thành công offline.

#### 5.11. Polish app-native

- Thêm pressed/selected state nhất quán, skeleton cùng hình dạng nội dung, transition tôn trọng `prefers-reduced-motion`.
- Đổi nhãn bottom-nav “Thêm” thành “Khác” hoặc “Menu” để không lẫn với FAB tạo mới.
- Dùng haptic chỉ khi đóng gói native/TWA; web/PWA không nên mô phỏng quá mức.
- Chuẩn hóa icon, radius, shadow và mật độ theo một mobile design system, tránh mỗi page tự ghép class.

## 6. Ma trận theo màn hình

| Màn hình | Hiện trạng | Việc chính cần làm |
|---|---|---|
| Đăng nhập | Tốt ở 320/390/430, không tràn, input/nút đạt kích thước | Thêm safe-area/dvh, autofill/password-manager QA, lỗi mạng và offline state |
| Dashboard | Có bản mobile riêng, KPI/cảnh báo rõ | Tăng chữ 10 px, format số dài, biến cảnh báo thành deep link |
| Quản lý phế | Card view tốt cho Nhập/Xay/Xuất; Cân có NumPad | Tab 44 px + URL sync; tinh gọn toolbar/KPI; full-screen form mobile |
| Cân phế | Luồng nghiệp vụ mạnh nhất | Giảm mật độ card, tăng vùng chạm xóa/sửa bao, sticky save, kiểm thử bàn phím |
| Tồn kho | Nội dung thiên card/timeline, tương đối hợp mobile | Tăng chữ phụ, CTA và empty state; kiểm thử số dài/biểu đồ |
| Tài chính | Công nợ có card; Chi phí/Ứng tiền còn bảng ngang | Card view, phân trang, lọc theo kỳ, role-aware quick action |
| Nhân sự | Chấm công có card riêng | Card cho hồ sơ/bảng lương; tách toolbar theo từng tab; sticky batch save |
| Danh bạ | Card mobile tốt | Tăng hitbox gọi/xem; giữ vị trí scroll khi quay lại |
| Chi tiết đối tác | KPI tốt, lịch sử còn bảng ngang | Timeline giao dịch, action gọi/nhắn/thu-trả nợ sticky |
| Báo cáo | Nhiều KPI/chart, có giá trị quản trị | Mobile chart cards, legend/tooltip chạm được, thay bảng hiệu suất bằng ranked list |
| Cài đặt | Bố cục card rõ | Hitbox theme/màu 44 px, preview thay đổi, ẩn hoàn toàn nếu không đủ quyền |
| Tìm kiếm | Có modal toàn cục | Full-screen mobile search, input 16 px, recent search, lỗi từng nguồn và keyboard nav |

## 7. Kế hoạch thực thi đề xuất (9–12 ngày công)

### Giai đoạn 0 — Baseline và tiêu chí nghiệm thu (0,5 ngày)

- Chuẩn bị tài khoản test cho staff/manager/admin và dữ liệu seed không nhạy cảm.
- Chốt device matrix: 320×568, 360×800, 390×844, 430×932, iPad 768×1024.
- Chốt 6 luồng vàng: đăng nhập; tạo phiếu nhập; cân nhiều bao; tạo phiếu xuất; ghi chi phí; chấm công/lưu lương.
- Lưu screenshot baseline light/nature/dark.

**Nghiệm thu:** mỗi role có checklist và dữ liệu test tái lập được.

### Giai đoạn 1 — Mobile foundation P0 (1–1,5 ngày)

- `dvh`, safe-area thật, `viewport-fit=cover`.
- Form-control 16 px mobile không bị utility ghi đè.
- Tap target 44 px; sửa pagination, tabs, icon destructive, theme controls.
- Bổ sung `scroll-padding-bottom`, overscroll behavior và focus-visible.

**Nghiệm thu:** không auto-zoom iOS; không điều khiển nào dưới 44 px; không nội dung bị home indicator/bottom nav/keyboard che.

### Giai đoạn 2 — Điều hướng và phân quyền (1 ngày)

- Gom cấu hình route/menu/action theo role.
- Đồng bộ tab ↔ URL; Back/Forward chính xác.
- Sửa nhãn bottom nav; active state cho tab con.
- Cảnh báo/KPI/quick action deep-link đúng màn và mở đúng form.

**Nghiệm thu:** staff không nhìn thấy action manager/admin; reload và Back vẫn giữ đúng tab.

### Giai đoạn 3 — Mobile hóa các module còn thiếu (2–3 ngày)

- Card view cho Chi phí, Ứng tiền, Hồ sơ nhân viên, Bảng lương.
- Timeline/card cho giao dịch đối tác.
- Ranked list/card cho bảng báo cáo hiệu suất.
- Detail sheet dùng disclosure, không nhồi mọi cột lên card.

**Nghiệm thu:** 100% luồng thường dùng không cần cuộn ngang ở 320 px.

### Giai đoạn 4 — Form, modal, keyboard và draft (1,5–2 ngày)

- `AdaptiveDialog` dùng chung; sheet/full-screen mobile, modal desktop.
- Sticky header/footer, keyboard-safe, focus trap/restore, aria đầy đủ.
- Draft form và xác nhận khi thoát; format tiền/khối lượng khi nhập.
- Tối ưu thứ tự trường theo thao tác tại xưởng; đưa NumPad vào nơi thực sự có lợi.

**Nghiệm thu:** hoàn thành 6 luồng vàng bằng một tay; xoay màn hình/mở bàn phím không mất nút Lưu; đóng nhầm không mất dữ liệu.

### Giai đoạn 5 — Typography, density và visual polish (1–1,5 ngày)

- Loại bỏ chữ 10 px ở nội dung nghiệp vụ; chuẩn hóa type scale.
- Xử lý số dài, không truncate tiền/kg.
- Chuẩn hóa card, badge, pressed state, skeleton, empty state và CTA.
- Kiểm tra tương phản cả 3 theme và chế độ chữ lớn 200%.

**Nghiệm thu:** đọc được ngoài trời; không vỡ layout với số tiền dài và text zoom 200%.

### Giai đoạn 6 — PWA, offline và update UX (1–1,5 ngày)

- Icon PWA chuẩn, maskable/apple-touch.
- Sửa pre-cache/navigation fallback.
- Banner offline, retry, update available và install affordance.
- Không queue ghi ngầm nếu chưa thiết kế xung đột; lỗi lưu phải minh bạch.

**Nghiệm thu:** đã mở app một lần thì mở lại shell offline được từ mọi route; người dùng luôn biết đang offline và biết bản mới cần reload.

### Giai đoạn 7 — QA thiết bị thật và pilot tại xưởng (1,5–2 ngày)

- iPhone Safari/PWA, Android Chrome/PWA, tablet dọc/ngang.
- Kiểm tra nắng, tay ướt/bẩn, mạng chập chờn, bàn phím số, gọi điện và camera upload.
- Visual regression + E2E cho 6 luồng vàng.
- Pilot 2–3 người dùng; ghi thời gian hoàn thành, số chạm nhầm, điểm khó hiểu.

**Nghiệm thu:** không P0/P1 còn mở; mỗi luồng vàng đạt tỷ lệ hoàn thành 100% trong pilot.

## 8. Backlog triển khai theo thứ tự

### Sprint A — Bắt buộc

1. Safe-area + `dvh` + viewport meta.
2. Chống iOS zoom thực sự.
3. Tap target 44 px.
4. Role-aware menu/FAB.
5. URL-synced tabs.
6. Card mobile cho Chi phí và Nhân viên.

### Sprint B — Hoàn thiện thao tác

1. AdaptiveDialog + sticky action + keyboard safe.
2. Card/timeline cho đối tác và báo cáo.
3. Typography ≥12/14 px; xử lý số dài.
4. Offline/error/update states.
5. Accessibility cho sheet/tab/search/confirm.

### Sprint C — Polish và đo lường

1. PWA icon/cache/install/update.
2. Visual regression theo 5 viewport × 3 theme.
3. E2E luồng vàng theo 3 role.
4. Pilot tại xưởng và tối ưu dựa trên số liệu thao tác.

## 9. Definition of Done cho “ứng dụng mobile chuyên nghiệp”

- Không tràn ngang ở 320 px trong mọi luồng thường dùng.
- Không input nào dưới 16 px trên iOS; không có auto-zoom.
- Mọi điều khiển tương tác có hitbox tối thiểu 44×44 px.
- Không nội dung/nút bị bottom nav, home indicator hoặc keyboard che.
- Back/Forward/reload giữ đúng module và tab.
- Menu/action đúng role, không dẫn người dùng tới trang “không có quyền”.
- Form dài có sticky action, giữ draft và chống lưu lặp.
- Offline/lỗi/update đều có trạng thái rõ và đường phục hồi.
- Light/nature/dark đạt tương phản phù hợp; text zoom 200% không mất nội dung.
- 6 luồng vàng qua E2E và pilot trên iPhone/Android/tablet.

## 10. Khuyến nghị cuối

Không cần viết lại ứng dụng hoặc chuyển sang React Native ở giai đoạn này. Kiến trúc React/PWA hiện tại đủ để tạo trải nghiệm chuyên nghiệp nếu hoàn thành ba lớp theo đúng thứ tự: **mobile foundation → nhất quán luồng nghiệp vụ → PWA/polish/QA thiết bị thật**. Việc có giá trị cao nhất ngay lập tức là sửa safe-area/dvh/input/tap-target và loại bỏ các bảng ngang ở Chi phí + Nhân viên.

## 11. Kết quả triển khai ngày 08/08/2026

Đã hoàn thành vòng mobile hardening trong phạm vi mã nguồn:

- Dynamic viewport (`dvh`), safe-area thật, `viewport-fit=cover` và khoảng tránh bottom nav/home indicator.
- Input 16 px trên mobile không còn bị utility font nhỏ ghi đè; tap target chuẩn hóa 44 px.
- Tab Quản lý phế, Tài chính, Nhân sự và Báo cáo đồng bộ URL/Back/Forward và có semantics tab.
- Quick action/menu được lọc đúng theo role; nhãn bottom nav “Thêm” đổi thành “Khác”.
- Card/list mobile cho Chi phí, Ứng tiền, Hồ sơ nhân viên, Lịch sử chấm công, Bảng lương, giao dịch đối tác và hiệu suất xay.
- Modal mobile toàn màn hình, action form sticky, focus restore/trap, cảnh báo bỏ thay đổi chưa lưu; bottom sheet có dialog semantics và không còn affordance kéo giả.
- Global Search mobile toàn màn hình, input 16 px, ESC/focus restore và xử lý lỗi từng nguồn dữ liệu.
- Offline/update banner, service-worker pre-cache, navigation fallback và bộ icon PWA 180/192/512 px.
- Loại bỏ truncate ở các số KPI quan trọng; tăng chữ 10–11 px lên tối thiểu 12 px trên điện thoại.
- `prefers-reduced-motion`, focus-visible và touch-action được chuẩn hóa.

Kiểm chứng sau triển khai:

- `npm run build`: đạt.
- `npm run lint`: đạt, không lỗi.
- `npm run test`: 35/35 test đạt.
- 320×568, 390×844, 430×932: không tràn ngang ở trang đăng nhập; input 16 px; nút submit 44 px; root khớp dynamic viewport.
- CSS production chứa `.app-viewport`, `.mobile-nav-safe`, `.tap-target`, `.adaptive-dialog-body` và `100dvh`; không còn class `pb-safe-area` giả.

Phần còn cần môi trường/người dùng thật để nghiệm thu: đăng nhập bằng ba role, kiểm thử iPhone/Android PWA, camera upload, mạng chập chờn và pilot tại xưởng.
