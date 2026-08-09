# Rà soát module Nhân sự — Chấm công — Tính lương

Ngày rà soát: 09/08/2026

## 1. Phạm vi

- Hồ sơ nhân viên: thêm, sửa, trạng thái làm việc, bảo toàn lịch sử.
- Chấm công: chấm nhanh theo ngày, lịch sử theo tháng, ngày nghỉ, tăng ca.
- Tạm ứng: ghi nhận theo nhân viên và kỳ lương.
- Bảng lương: tổng công, tăng ca, lương gộp, tạm ứng, thực lĩnh, còn phải trả.
- Quyết toán: chốt đã trả, thời điểm/người chốt và phiếu quyết toán tháng.
- Phân quyền RLS, tính toàn vẹn dữ liệu và trải nghiệm mobile/desktop.

## 2. Các lỗi nghiêm trọng đã xử lý

1. `0 công` bị ép thành `1 công` khi đọc hoặc cập nhật dữ liệu. Điều này làm ngày nghỉ và phiếu chỉ ứng lương phát sinh lương sai.
2. Giờ tăng ca được nhập nhưng không được tính vào lương.
3. Số tiền còn nợ của cả tháng phụ thuộc trạng thái bản ghi cuối cùng của nhân viên.
4. Chi tiết lương lọc theo tên và không giới hạn đúng tháng, dẫn tới sai khi trùng tên hoặc xem kỳ cũ.
5. KPI ghi “tháng này” nhưng cộng toàn bộ lịch sử đã tải.
6. Bảng lương dùng danh sách lịch sử có giới hạn thay vì truy vấn chính xác kỳ lương.
7. Xóa nhân viên có nguy cơ mất liên kết lịch sử; quy trình mới chuyển sang “Đã nghỉ”.
8. Migration 013 mở toàn bộ CRUD hồ sơ nhân viên cho mọi tài khoản; migration 014 khôi phục quyền manager/admin.
9. Không có dấu vết kế toán độc lập khi chốt lương.
10. Migration 013 từng gỡ `employee_id` khỏi toàn bộ chấm công cũ, khiến danh tính lịch sử có thể bị mất.

## 3. Quy tắc lương hiện được áp dụng

- Lương công thường = `số công × đơn giá ngày`.
- Một ngày công tiêu chuẩn = 8 giờ.
- Tăng ca ngày thường = `giờ tăng ca × đơn giá ngày / 8 × 150%`.
- Lương gộp = lương công thường + lương tăng ca.
- Thực lĩnh = lương gộp − tổng tạm ứng.
- Nếu thực lĩnh âm, giao diện thể hiện “Nhân viên nợ xưởng”; số còn phải trả không âm.
- Kỳ chỉ hết nợ khi toàn bộ lượt trong kỳ được chốt `paid` qua thao tác quyết toán.

Hệ số 150% là mặc định nghiệp vụ hiện tại. Nếu xưởng có hệ số riêng cho ngày nghỉ, ngày lễ hoặc ca đêm, cần bổ sung bảng cấu hình và loại tăng ca trước khi sử dụng các trường hợp đó.

## 4. Thay đổi dữ liệu

Migration `014_hr_payroll_hardening.sql` bổ sung:

- Khôi phục RLS manager/admin cho `employees`.
- Chặn xóa nhân viên đã có lịch sử công.
- Snapshot tên nhân viên trên từng lượt chấm công.
- `paid_at`, `paid_by` cho chấm công đã thanh toán.
- Giới hạn hợp lệ cho số công và giờ tăng ca.
- Chặn phát sinh hai lượt công dương cho cùng nhân viên/ngày.
- Công thức lương tăng ca đồng nhất ở trigger DB và ứng dụng.
- Bảng `payroll_settlements` và RPC `settle_employee_payroll` để chốt lương trong một transaction.

### Lưu ý phục hồi dữ liệu cũ

Migration 013 đã chạy câu lệnh đặt toàn bộ `attendance.employee_id = NULL` trước khi xóa danh sách nhân viên. Migration 014 không tự đoán lại tên vì có thể gán sai tiền lương cho người khác. Nếu hệ thống đã có chấm công trước migration 013, cần phục hồi liên kết từ backup hoặc đối chiếu sổ chấm công thủ công.

## 5. Checklist UAT bắt buộc

- Đăng nhập bằng tài khoản manager và admin; xác nhận staff không đọc được dữ liệu nhân sự/lương.
- Tạo một nhân viên, sửa lương/ngày, ngày vào làm, điện thoại và địa chỉ.
- Chấm lần lượt 1 công, 0.5 công, nghỉ 0 công và một lượt có tăng ca.
- Ghi tạm ứng độc lập và xác nhận không làm tăng số công.
- Xem lịch sử ở tháng hiện tại và tháng trước.
- Kiểm tra hai nhân viên trùng tên vẫn có hai dòng lương riêng.
- Chốt lương; xác nhận bảng lương về 0 còn nợ và có `paid_at`/phiếu quyết toán.
- Cho nhân viên nghỉ; xác nhận lịch sử cũ còn nguyên và nhân viên không còn trong chấm công mới.
- Kiểm tra mobile 320/390/430 px và desktop từ 1024 px.
