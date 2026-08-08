# VUA PHẾ — Kế hoạch v2: Hoàn thiện thành ứng dụng quản lý kho phế chuyên nghiệp

> Review ngày 08/08/2026 · 80 file nguồn / ~12.800 dòng · build + lint + 35 test đều sạch
>
> Kế hoạch v1 (`KE_HOACH_TOI_UU.md`) đã hoàn thành. Tài liệu này review lại từ đầu ở
> trạng thái hiện tại, tập trung vào **hai người dùng thật**:
> - **Người nhập** (thợ cân, quản lý kho ghi phiếu tại xưởng) — cần ghi nhận đủ, không mất dữ liệu
> - **Người quản lý** (chủ xưởng) — cần số liệu đúng và đọc được để ra quyết định

---

## PHẦN A — HIỆN TRẠNG

Nền tảng kỹ thuật đã tốt: RLS phân quyền thật, không còn mock-data, lỗi hiển thị tiếng Việt rõ ràng,
lọc theo kỳ ở phía máy chủ, in phiếu, PWA, CI. Phần dưới là những gì **còn thiếu để dùng thật hằng ngày**.

---

### A1. Lỗi đang làm SAI SỐ LIỆU 🔴

| # | Vấn đề | Bằng chứng | Hậu quả thực tế |
|---|---|---|---|
| 1 | **Phiếu ghi trước 7h sáng bị lùi 1 ngày** | 28 chỗ dùng `new Date().toISOString().split('T')[0]` (giờ UTC). `useDateRange.ts:12` đã có hàm `today()` đúng **kèm comment giải thích chính xác lỗi này**, nhưng chưa được dùng ở form/service | Xưởng làm từ 5–6h sáng. Phiếu nhập lúc 6h ghi thành hôm qua. "Nhập hôm nay" trên Dashboard hiện 0 dù vừa nhập xong |
| 2 | **Lợi nhuận trên Báo cáo tính sai kỳ** | `BaoCaoPage.tsx:54` gọi `expensesService.getExpenses()` — hàm này **không nhận tham số kỳ**, trong khi nhập/xuất/xay đều đã lọc theo kỳ | Chọn xem tháng 8: doanh thu tháng 8 − chi phí mua tháng 8 − **chi phí vận hành CẢ NĂM**. Kỳ càng ngắn, lãi hiện càng âm sai |
| 3 | **Công nợ Dashboard ≠ Công nợ trang Tài chính** | Dashboard (`DashboardPage.tsx:58`) chỉ đếm `payment_status === 'unpaid'`, bỏ qua `partial` và bỏ qua bảng `payments`. Trang Công nợ dùng `computeRemainingWithLegacyStatus` có trừ số đã trả | Hai màn hình cho hai con số nợ khác nhau. Quản lý không biết tin số nào |
| 4 | **"Lô phế chưa xay" không bao giờ hết** | Tạo phiếu xay có chọn lô nhập, nhưng `imports.processing_status` **không được cập nhật** sau đó | Cảnh báo "21 lô phế chưa xay" đứng yên vĩnh viễn dù đã xay xong hết (đúng như ảnh chụp màn hình đã gửi) |
| 5 | **Dashboard cắt dữ liệu âm thầm ở 2.000 dòng** | Dashboard tải toàn bộ lịch sử không lọc kỳ, `MAX_ROWS = 2000` | Sau ~1 năm hoạt động, mọi KPI trên Tổng quan bị sai mà không có cảnh báo nào |

---

### A2. Người nhập chưa ghi được đủ dữ liệu 🔴

**Màn hình Cân phế là nơi rủi ro nhất** — đây là chỗ ghi số liệu gốc, cân tay từng bao ngoài xưởng.

| # | Vấn đề | Vị trí | Hậu quả |
|---|---|---|---|
| 6 | **Mất trắng dữ liệu đang cân** | `CanPhePage.tsx:23` — danh sách bao chỉ nằm trong state React, không lưu tạm | Khoá màn hình / hết pin / chuyển sang app khác → **mất sạch 25 bao vừa cân tay**, phải ra cân lại |
| 7 | **Không sửa/xoá được bao đã cân** | Chỉ có `handleAddBag`, không có sửa/xoá | Gõ nhầm 960 thành 9600 → phải làm lại từ đầu cả phiên |
| 8 | **Không có nút "Lưu phiên cân"** | Chỉ lưu được qua đường vòng: bấm *Phiên cân mới* → hộp thoại hỏi có lưu không | Người cân xong không biết cách lưu. Đây là lỗi UX nghiêm trọng nhất của màn hình |
| 9 | **Lưu 25 bao = 25 lượt gọi mạng tuần tự** | `CanPhePage.tsx:72` vòng lặp `await addBag()`, mỗi lượt còn update lại tổng phiên | Mạng xưởng yếu → đứt giữa chừng, phiên lưu một nửa, số bao sai |
| 10 | **Phiên cân là dữ liệu mồ côi** | Không gắn với đối tác/xe/phiếu nào. Cột `exports.weighing_session_id` có sẵn, service đọc-ghi được, nhưng **UI không bao giờ cho chọn** | Cân xong không đối chiếu được với phiếu nhập/xuất. Phiếu cân thành sổ ghi chép rời rạc |
| 11 | **Mất mạng là không nhập được gì** | PWA chỉ cache vỏ app. Không có hàng đợi ghi offline | Xưởng sóng yếu → không ghi được phiếu, phải ghi giấy rồi nhập lại (nguồn gốc của sai sót) |
| 12 | **`storage.ts` hứa sai** | Comment ghi *"đảm bảo dữ liệu không bao giờ bị mất khi Supabase offline"* nhưng `loadLocalData`/`saveLocalData` **không ai gọi** — code chết | Đọc code tưởng đã có bảo vệ offline, thực tế không có |
| 13 | **Không có màn hình "hôm nay tôi đã ghi gì"** | — | Cuối ngày người nhập không tự kiểm được đã ghi đủ chưa |

---

### A3. Người quản lý chưa nắm được số 🟠

| # | Vấn đề | Hậu quả |
|---|---|---|
| 14 | **Không so sánh được kỳ** | Không biết tháng này so tháng trước tăng/giảm bao nhiêu — chỉ thấy số tuyệt đối |
| 15 | **"Lợi nhuận" không phải lãi thật** | Đang tính = doanh thu − tiền mua phế **trong kỳ**, không phải **giá vốn của đúng lô đã bán**. Khi tồn kho biến động mạnh, con số này lệch rất xa |
| 16 | **Lương không nằm trong chi phí** | `attendance.net_pay` đã ghi nhận nhưng không được cộng vào chi phí vận hành → lãi hiển thị cao hơn thực tế |
| 17 | **Không có lãi/lỗ theo lô** | Không biết mua của ai thì lãi, của ai thì lỗ — dù đây là quyết định kinh doanh quan trọng nhất |
| 18 | **Không có cảnh báo chủ động** | Nợ quá hạn, hao hụt xay bất thường, tồn kho thấp — đều phải tự vào xem mới biết |

---

### A4. Chất lượng & vận hành 🟢

| # | Vấn đề |
|---|---|
| 19 | Test chỉ phủ 4 file lib thuần (calc, payroll, serviceError, useDateRange). **0 test cho service, form, hay luồng nghiệp vụ** |
| 20 | `src/lib/storage.ts` — code chết + comment sai lệch (xem mục 12) |
| 21 | `react-router-dom` 6.x có CVE (cần lên v7 — breaking), `xlsx` chưa có bản vá npm |

---

## PHẦN B — KẾ HOẠCH

### Giai đoạn 1 — Sửa số liệu sai (1–1,5 ngày) 🔴 *Làm trước tiên*

> Số liệu sai nguy hiểm hơn thiếu tính năng: quản lý ra quyết định trên con số sai mà không biết.

- [ ] **Gom hàm ngày về một chỗ.** Đưa `today()` từ `useDateRange.ts` sang `lib/date.ts`, thay toàn bộ 28 chỗ `toISOString().split('T')[0]`. Thêm test múi giờ +07
- [ ] **Cho `expensesService`/`getAdvances` nhận khoảng ngày** như các service khác; `BaoCaoPage` truyền kỳ đang chọn xuống
- [ ] **Cộng lương vào chi phí vận hành** trong P&L (`attendance.net_pay` theo kỳ)
- [ ] **Thống nhất công thức công nợ**: Dashboard dùng chung `computeRemainingWithLegacyStatus` như trang Công nợ
- [ ] **Tự cập nhật `processing_status`** khi tạo/xoá phiếu xay có gắn lô nhập (làm bằng trigger DB để không phụ thuộc client nhớ gọi)
- [ ] **Dashboard lọc theo kỳ** thay vì tải toàn bộ lịch sử; hiện cảnh báo rõ ràng khi chạm trần `MAX_ROWS`
- **Nghiệm thu:** tạo phiếu lúc 6h sáng → ghi đúng ngày hôm nay; chọn kỳ 1 tháng ở Báo cáo → lãi khớp với tính tay; xay xong 1 lô → cảnh báo "chưa xay" giảm đi 1

---

### Giai đoạn 2 — Người nhập ghi được đủ, không mất dữ liệu (2–3 ngày) 🔴

- [ ] **Cân phế: tự lưu tạm sau mỗi bao** vào localStorage; mở lại app là khôi phục nguyên phiên đang dở
- [ ] **Cân phế: nút "Lưu phiên cân" nổi bật**, luôn thấy khi có bao chưa lưu
- [ ] **Cân phế: sửa/xoá từng bao** (bấm vào chip bao → sửa số hoặc xoá)
- [ ] **Cân phế: lưu cả phiên trong 1 lượt gọi** (`insert` mảng bao) thay vì 25 lượt tuần tự
- [ ] **Gắn phiên cân với đối tác + loại phiếu** (cân nhập của NCC nào / cân xuất cho khách nào), và cho chọn phiên cân khi tạo phiếu xuất (dùng cột `weighing_session_id` đã có sẵn)
- [ ] **Xoá được phiên cân** ghi nhầm
- [ ] **Hàng đợi ghi offline**: mất mạng vẫn ghi được phiếu, lưu vào hàng đợi, tự đẩy lên khi có mạng lại; hiện rõ badge "N phiếu chờ đồng bộ"
- [ ] **Dọn `storage.ts`**: xoá code chết hoặc dùng thật cho hàng đợi offline (bỏ comment hứa sai)
- [ ] **Màn hình "Hôm nay"**: liệt kê mọi thứ người dùng đã ghi trong ngày + tổng cộng, để tự đối chiếu cuối ca
- **Nghiệm thu:** cân 25 bao → tắt app → mở lại vẫn còn đủ; bật chế độ máy bay → vẫn ghi được phiếu → bật mạng lại → phiếu tự lên

---

### Giai đoạn 3 — Quản lý nắm được số (2–3 ngày) 🟠

- [ ] **So sánh kỳ**: mỗi KPI hiện thêm "so với kỳ trước ±%"
- [ ] **Giá vốn hàng bán thật**: tính theo bình quân gia quyền tồn kho, thay vì lấy tiền mua trong kỳ
- [ ] **Báo cáo lãi/lỗ theo nhà cung cấp**: mua của ai lãi nhất, hao hụt xay của ai cao nhất
- [ ] **Trang "Sức khoẻ xưởng"** một màn hình: tồn kho, công nợ 2 chiều, lãi kỳ này vs kỳ trước, top cảnh báo
- [ ] **Cảnh báo chủ động**: nợ quá N ngày, hao hụt xay vượt ngưỡng, tồn kho dưới mức tối thiểu (ngưỡng cấu hình được)
- [ ] **Xuất Excel theo đúng kỳ đang xem** + thêm sheet Công nợ, Lương, Hiệu suất xay
- **Nghiệm thu:** chủ xưởng mở 1 màn hình trả lời được: tháng này lãi bao nhiêu, ai đang nợ, tồn kho còn bao nhiêu, chỗ nào bất thường

---

### Giai đoạn 4 — Dễ dùng ở xưởng (1–2 ngày) 🟡

- [ ] **NumPad cho mọi ô nhập số** trên điện thoại (hiện chỉ Cân phế có)
- [ ] **Nút bấm to hơn ở trang nhập liệu** — thao tác khi tay bẩn, đeo găng
- [ ] **Cảnh báo trước khi rời form đang nhập dở**
- [ ] **Nhân đôi phiếu** ("giống phiếu hôm qua") — phần lớn phiếu nhập lặp lại cùng NCC, cùng giá
- [ ] **Tìm kiếm toàn cục nhớ lịch sử tra cứu gần đây**
- [ ] Nâng cỡ chữ tối thiểu lên 12px (nhiều chỗ đang `text-[11px]`)

---

### Giai đoạn 5 — Bền vững lâu dài (1–2 ngày) 🟢

- [ ] **Test cho service và luồng nghiệp vụ** (hiện 0): nhập → xay → xuất → công nợ
- [ ] **Test hồi quy cho các lỗi ở Giai đoạn 1** để không tái phát
- [ ] Nâng `react-router-dom` lên v7 (breaking — cần kiểm thử lại routing)
- [ ] Sao lưu định kỳ + hướng dẫn khôi phục

---

## PHẦN C — THỨ TỰ ĐỀ XUẤT

```
Tuần 1:  Giai đoạn 1  →  Giai đoạn 2      (số liệu đúng + không mất dữ liệu)
Tuần 2:  Giai đoạn 3  →  Giai đoạn 4      (quản lý đọc được số + xưởng dễ dùng)
Tuần 3:  Giai đoạn 5  +  chạy thử tại xưởng, chỉnh theo phản hồi thật
```

**Nếu chỉ làm được 3 việc:**
1. **Sửa lỗi múi giờ** (mục 1) — mọi phiếu ghi buổi sáng đang sai ngày
2. **Cân phế tự lưu tạm + nút Lưu rõ ràng** (mục 6, 8) — đây là chỗ mất dữ liệu thật
3. **Sửa lợi nhuận sai kỳ** (mục 2) — quản lý đang nhìn con số lãi không đúng
