# Lịch Sử Cập Nhật Dữ Liệu & Phiên Bản Phần Mềm — KhoPhe ERP

> **Ngày trích xuất báo cáo:** 15/10/2026  
> **Dự án Supabase:** `ageezcxrthqmmacnrqpf` (KhoPhe ERP)  
> **Bản sao lưu đối chiếu gần nhất:** `.backups/qa-khophe-2026-10-12T00-52-38-167Z.json` (12/10/2026)

---

## 1. Tổng Quan Hiện Trạng Cập Nhật Dữ Liệu Trên Phần Mềm

Dữ liệu thực tế trên cơ sở dữ liệu sản xuất (Production Supabase Postgres) hiện có **18 bảng nghiệp vụ & hệ thống** với tổng cộng **2.543 dòng dữ liệu** (bao gồm 807 dòng nhật ký kiểm toán `audit_log`).

### 1.1. Bảng tổng hợp tiến độ cập nhật theo từng phân hệ

| Phân hệ / Bảng dữ liệu | Tổng số dòng | Đang hiệu lực (`active`) | Đã xóa mềm (`deleted`) | Kỳ dữ liệu nghiệp vụ (`min` → `max`) | Lần nhập mới cuối (`max_created`) | Lần chỉnh sửa cuối (`max_updated`) | Trạng thái cập nhật |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **1. Nhập phế** (`imports`) | 171 | **108** | 63 | `01/08/2026` → `02/10/2026` | 03/10/2026 | 08/10/2026 | ⚠️ Dừng ở ngày 02/10/2026 |
| **2. Xuất phế** (`exports`) | 37 | **31** | 6 | `01/08/2026` → `23/09/2026` | 23/09/2026 | 23/09/2026 | ⚠️ Dừng ở ngày 23/09/2026 |
| **3. Xay phế** (`grinding`) | 13 | **2** | 11 | `06/08/2026` → `07/08/2026` | 08/08/2026 | 08/08/2026 | 🔴 Thiếu dữ liệu từ 08/08/2026 |
| **4. Phiên cân** (`weighing_sessions`) | 53 | **53** | 0 | `29/07/2026` → `26/09/2026` | 26/09/2026 | — | ⚠️ Dừng ở ngày 26/09/2026 |
| **5. Chi tiết bao cân** (`weighing_bags`) | 1.107 | **1.107** | 0 | Theo 53 phiên cân | 26/09/2026 | — | ⚠️ Dừng ở ngày 26/09/2026 |
| **6. Chi phí xưởng** (`expenses`) | 35 | **35** | 0 | `12/07/2026` → `23/09/2026` | 23/09/2026 | — | ⚠️ Dừng ở ngày 23/09/2026 |
| **7. Sổ ứng tiền** (`advances`) | 12 | **12** | 0 | `18/07/2026` → `21/09/2026` | 23/09/2026 | 08/10/2026 *(đối soát)* | ⚠️ Dừng ở ngày 21/09/2026 |
| **8. Sổ thanh toán** (`payments`) | 0 | **0** | 0 | — | — | — | ⚪ Chưa ghi sổ thanh toán lẻ |
| **9. Nhân sự** (`employees`) | 10 | **10** | 0 | — | 12/10/2026 | 12/10/2026 | ✅ Đã cập nhật đến 12/10/2026 |
| **10. Chấm công** (`attendance`) | 258 | **258** | 0 | `01/08/2026` → `21/09/2026` | 08/10/2026 | 12/10/2026 | ⚠️ Chấm công dừng ở 21/09/2026 |
| **11. Chốt lương** (`payroll_settlements`) | 0 | **0** | 0 | — | — | — | ⚪ Chưa chốt kỳ lương nào |
| **12. Danh bạ đối tác** (`contacts`) | 27 | **27** | 0 | — | 16/08/2026 | 16/08/2026 | ✅ Ổn định (27 đối tác) |
| **13. Kiểm kê kho** (`stock_counts`) | 2 | **2** | 0 | `07/08/2026` | 07/08/2026 | — | ⚪ Chỉ có 2 phiếu ngày 07/08 |
| **14. File đính kèm** (`attachments`) | 2 | **2** | 0 | `07/09/2026` → `12/09/2026` | 12/09/2026 | — | ✅ Hoạt động bình thường |
| **15. Tài khoản hệ thống** (`users`) | 4 | **4** | 0 | — | 08/10/2026 | — | ✅ 4 tài khoản đang hoạt động |
| **16. Cấu hình hệ thống** (`settings`) | 4 | **4** | 0 | — | — | 12/10/2026 | ✅ Đã cập nhật 12/10/2026 |
| **17. Nhật ký kiểm toán** (`audit_log`) | 807 | **807** | 0 | `31/07/2026` → `12/10/2026` | 12/10/2026 | — | ✅ Tự động ghi qua DB Trigger |
| **18. Nhật ký lỗi ứng dụng** (`app_error_logs`) | 0 | **0** | 0 | — | — | — | ✅ Không có lỗi phát sinh |

---

### 1.2. Nhận xét nhanh về tiến độ nhập liệu thực tế của xưởng

1. **Dữ liệu Nhập phế (`imports`):** Là phân hệ được cập nhật gần nhất trong nhóm kho, với chứng từ mới nhất là ngày **02/10/2026** (được nhập lên phần mềm vào ngày **03/10/2026** và rà soát/cập nhật trạng thái lần cuối vào **08/10/2026**). Từ **03/10/2026 đến 15/10/2026** chưa có phiếu nhập mới nào được ghi nhận.
2. **Dữ liệu Xuất phế (`exports`) & Chi phí xưởng (`expenses`):** Đều dừng lại ở ngày **23/09/2026** (đợt nhập liệu lớn ngày 23/09/2026). Các chuyến xuất hàng và khoản chi xưởng sau ngày 23/09/2026 chưa được nhập lên phần mềm.
3. **Dữ liệu Cân phế (`weighing_sessions`):** Dừng ở ngày **26/09/2026** (3 phiên cân ngày 26/09 với tổng 55 bao / 121.356 kg).
4. **Dữ liệu Chấm công (`attendance`):** Lượt chấm công thực tế tại xưởng dừng ở ngày **21/09/2026** (trong đó có đợt nhập bù ngày 07/09, 10/09 và 2 bản ghi đối soát ứng lương của Anh Nam được tạo ngày 08/10/2026). Chấm công cuối tháng 09 (22/09 – 30/09) và nửa đầu tháng 10/2026 chưa được nhập.
5. **Dữ liệu Xay phế (`grinding`):** Hiện chỉ có **02 phiếu hiệu lực** từ ngày **06/08 và 07/08/2026** (11 phiếu cũ nạp từ sổ tay đã bị xóa mềm ngày 06–07/08). Do thiếu phiếu xay phế trong tháng 08, 09, 10 nên chỉ số **Tồn thành phẩm** (tính theo công thức `Tồn đầu + Nhập TP + Sản lượng xay ra − Xuất TP`) đang bị âm trên trang Đối soát.

---

## 2. Chi Tiết Lịch Sử Cập Nhật Dữ Liệu Theo Từng Phân Hệ

### 2.1. Phân hệ Nhập Phế (`imports`)

- **Tổng cộng:** 108 phiếu hiệu lực (`active`), 63 phiếu đã xóa mềm (`deleted_at IS NOT NULL`).
- **Phân loại:** Toàn bộ 108 phiếu hiệu lực đều thuộc nhóm `nvl` (Phế Nguyên Vật Liệu).
- **Lý do có 63 phiếu xóa mềm:** Ngày **06/08 – 07/08/2026**, quản trị viên đã thực hiện dọn dẹp các phiếu nhập lịch sử tháng 06/2026 (7 phiếu) và tháng 07/2026 (44 phiếu) nạp từ sổ tay ban đầu để chốt mốc theo dõi chính thức từ **01/08/2026**.

#### Thống kê Nhập phế theo tháng:
| Tháng | Số phiếu hiệu lực | Số phiếu đã xóa | Tổng khối lượng (kg) | Tổng thành tiền (VNĐ) | Khoảng ngày chứng từ | Lần nhập cuối (`created_at`) |
| :---: | :---: | :---: | ---: | ---: | :---: | :---: |
| `2026-06` | 0 | 7 | 0 | 0 | — *(đã xóa mềm 07/08)* | 06/08/2026 |
| `2026-07` | 0 | 44 | 0 | 0 | — *(đã xóa mềm 07/08)* | 06/08/2026 |
| `2026-08` | **48** | 11 | **375.350 kg** | **1.809.379.000 đ** | `01/08` → `31/08/2026` | 23/09/2026 |
| `2026-09` | **55** | 1 | **283.380 kg** | **1.358.101.500 đ** | `02/09` → `30/09/2026` | 03/10/2026 |
| `2026-10` | **5** | 0 | **15.590 kg** | **70.155.000 đ** | `01/10` → `02/10/2026` | 03/10/2026 |
| **Tổng cộng** | **108** | **63** | **674.320 kg** | **3.237.635.500 đ** | `01/08` → `02/10/2026` | **03/10/2026** |

#### 5 phiếu Nhập phế mới nhất trên hệ thống:
| Ngày phiếu | Nhà cung cấp | Khối lượng | Thành tiền | Ngày nhập lên phần mềm |
| :---: | :--- | ---: | ---: | :---: |
| `02/10/2026` | Đỗ Chung | 5.415 kg | 24.367.500 đ | 03/10/2026 |
| `02/10/2026` | E Hoàn | 2.310 kg | 10.395.000 đ | 03/10/2026 |
| `02/10/2026` | E Hoàn | 2.530 kg | 11.385.000 đ | 03/10/2026 |
| `02/10/2026` | A Danh | 2.910 kg | 13.095.000 đ | 03/10/2026 |
| `01/10/2026` | E Hoàn | 2.425 kg | 10.912.500 đ | 03/10/2026 |

---

### 2.2. Phân hệ Xuất Phế (`exports`)

- **Tổng cộng:** 31 phiếu hiệu lực (`active`), 6 phiếu đã xóa mềm.
- **Phân loại:** Toàn bộ 31 phiếu hiệu lực đều thuộc nhóm `thanh_pham` (Phế Thành Phẩm).

#### Thống kê Xuất phế theo tháng:
| Tháng | Số phiếu hiệu lực | Số phiếu đã xóa | Tổng khối lượng (kg) | Tổng thành tiền (VNĐ) | Khoảng ngày chứng từ | Lần nhập cuối (`created_at`) |
| :---: | :---: | :---: | ---: | ---: | :---: | :---: |
| `2026-07` | 0 | 2 | 0 | 0 | — *(đã xóa mềm 07/08)* | 06/08/2026 |
| `2026-08` | **19** | 3 | **447.725,0 kg** | **2.686.350.000 đ** | `01/08` → `31/08/2026` | 03/09/2026 |
| `2026-09` | **12** | 1 | **261.655,5 kg** | **1.548.044.000 đ** | `03/09` → `23/09/2026` | 23/09/2026 |
| **Tổng cộng** | **31** | **6** | **709.380,5 kg** | **4.234.394.000 đ** | `01/08` → `23/09/2026` | **23/09/2026** |

#### 5 phiếu Xuất phế mới nhất trên hệ thống:
| Ngày phiếu | Khách hàng | Số bao | Khối lượng | Thành tiền | Ngày nhập lên phần mềm |
| :---: | :--- | :---: | ---: | ---: | :---: |
| `23/09/2026` | Cty Nhựa SH Plus Việt Nam | 25 bao | 21.986 kg | 131.916.000 đ | 23/09/2026 |
| `22/09/2026` | Cty Nhựa SH Plus Việt Nam | 25 bao | 20.620 kg | 123.720.000 đ | 23/09/2026 |
| `20/09/2026` | Cty Nhựa SH Plus Việt Nam | 25 bao | 20.256 kg | 121.536.000 đ | 23/09/2026 |
| `19/09/2026` | Cty Nhựa SH Plus Việt Nam | 25 bao | 20.763 kg | 124.578.000 đ | 23/09/2026 |
| `17/09/2026` | Cty Nhựa SH Plus Việt Nam | 25 bao | 21.550 kg | 129.300.000 đ | 18/09/2026 |

---

### 2.3. Phân hệ Cân Phế (`weighing_sessions` & `weighing_bags`) và Xay Phế (`grinding`)

#### Thống kê Phiên cân (`weighing_sessions`) theo tháng:
| Tháng | Số phiên cân | Tổng số bao | Tổng khối lượng (kg) | Khoảng ngày cân | Lần nhập cuối (`created_at`) |
| :---: | :---: | :---: | ---: | :---: | :---: |
| `2026-07` | 1 | 24 bao | 20.947,0 kg | `29/07/2026` | 06/08/2026 |
| `2026-08` | 29 | 627 bao | 574.652,0 kg | `01/08` → `30/08/2026` | 30/08/2026 |
| `2026-09` | 23 | 454 bao | 732.984,5 kg | `03/09` → `26/09/2026` | 26/09/2026 |
| **Tổng cộng** | **53 phiên** | **1.105 bao** *(1.107 dòng chi tiết)* | **1.328.583,5 kg** | `29/07` → `26/09/2026` | **26/09/2026** |

#### Danh sách toàn bộ phiếu Xay phế đang hiệu lực (`grinding`):
Hiện tại chỉ có **02 phiếu xay phế** đang hoạt động (nhập ngày 08/08/2026):
1. **Ngày `06/08/2026`**: Thợ xay `Tú`, đầu vào `10.408 kg` → đầu ra `10.408 kg` (11 bao, hao hụt `0 kg`), ghi chú *"Cân nhập kho lần 1"*.
2. **Ngày `07/08/2026`**: Thợ xay `Tú`, đầu vào `12.933 kg` → đầu ra `12.933 kg` (14 bao, hao hụt `0 kg`), ghi chú *"Cân nhập kho lần 2"*.

---

### 2.4. Phân hệ Tài Chính: Chi Phí Xưởng (`expenses`) & Sổ Ứng Tiền (`advances`)

#### Thống kê Chi phí xưởng (`expenses`) theo tháng:
| Tháng | Số khoản chi | Tổng số tiền (VNĐ) | Khoảng ngày chi | Lần nhập cuối (`created_at`) |
| :---: | :---: | ---: | :---: | :---: |
| `2026-07` | 15 | 9.825.000 đ | `12/07` → `30/07/2026` | 11/08/2026 |
| `2026-08` | 12 | 7.485.000 đ | `01/08` → `12/08/2026` | 12/08/2026 |
| `2026-09` | 8 | 37.136.500 đ | `04/09` → `23/09/2026` | 23/09/2026 |
| **Tổng cộng** | **35 khoản** | **54.446.500 đ** | `12/07` → `23/09/2026` | **23/09/2026** |

*5 khoản chi phí mới nhất:*
- `23/09/2026`: Dầu xe nâng — `560.000 đ` (nhập 23/09)
- `22/09/2026`: Ốc vít lưỡi dao máy nhỏ — `447.000 đ` (nhập 23/09)
- `21/09/2026`: Quà Trung Thu — `700.000 đ` (nhập 23/09)
- `07/09/2026`: Tiền điện và tiền điện thoại Thím — `1.800.000 đ` (nhập 07/09, có ảnh hóa đơn đính kèm)
- `07/09/2026`: Mua xăng từ 12/08 đến 30/08 — `6.699.500 đ` (nhập 07/09, có ảnh hóa đơn đính kèm)

#### Thống kê Sổ ứng tiền (`advances` — 12 phiếu, tổng 90.000.000 đ):
| Tháng | Mục đích (`purpose`) | Số phiếu | Tổng tiền ứng (VNĐ) | Khoảng ngày ứng | Người nhận |
| :---: | :--- | :---: | ---: | :---: | :--- |
| `2026-07` | Chưa phân loại (`unclassified`) | 2 | 15.000.000 đ | `18/07` → `24/07/2026` | Xếp Nam (10tr, 5tr) |
| `2026-08` | Chưa phân loại (`unclassified`) | 5 | 25.000.000 đ | `01/08` → `27/08/2026` | Xếp Hồ / E Hồ (18tr), Xếp Nam (7tr) |
| `2026-09` | Chưa phân loại (`unclassified`) | 3 | 35.000.000 đ | `03/09` → `06/09/2026` | Xếp Nam (30tr), E Hồ (5tr - Sửa máy to) |
| `2026-09` | **Ứng lương (`payroll`)** *(đã đối soát 08/10)* | 2 | **15.000.000 đ** | `17/09` → `21/09/2026` | Xếp Nam / Anh Nam (10tr ngày 17/09, 5tr ngày 21/09) |
| **Tổng cộng** | — | **12 phiếu** | **90.000.000 đ** | `18/07` → `21/09/2026` | Đã đối soát 15tr; còn 75tr chưa phân loại |

---

### 2.5. Phân hệ Nhân Sự, Chấm Công & Tính Lương (`employees`, `attendance`, `users`)

#### Danh sách 10 nhân sự hiện có trong `public.employees`:
| STT | Họ tên | Vai trò | Đơn giá ngày | Ngày vào làm | Ngày tạo hồ sơ | Lần cập nhật cuối | Ghi chú |
| :---: | :--- | :---: | ---: | :---: | :---: | :---: | :--- |
| 1 | **Phan Xuân Tú** | `manager` | 300.000 đ | 01/08/2026 | 08/08/2026 | 07/09/2026 | Quản lý kho (`xuantu`) |
| 2 | **Trần Quốc Mạnh** | `staff` | 500.000 đ | 08/08/2026 | 08/08/2026 | 08/08/2026 | Nhân viên xưởng |
| 3 | **Anh Tam** | `staff` | 300.000 đ | 08/08/2026 | 08/08/2026 | 08/08/2026 | Thợ xay chính |
| 4 | **Chị Hoa** | `staff` | 300.000 đ | 08/08/2026 | 08/08/2026 | 08/08/2026 | Nhân viên xưởng |
| 5 | **Võ Thị Hoa** | `staff` | 300.000 đ | 08/08/2026 | 08/08/2026 | 08/08/2026 | Nhân viên xưởng |
| 6 | **Phan Văn Hoàng** | `staff` | 300.000 đ | 08/08/2026 | 08/08/2026 | 08/08/2026 | Nhân viên xưởng |
| 7 | **Bùi Xuân Lệ** | `staff` | 270.000 đ | 08/08/2026 | 08/08/2026 | 08/08/2026 | Nhân viên xưởng |
| 8 | **Anh Tiếp** | `staff` | 270.000 đ | 08/08/2026 | 08/08/2026 | 09/08/2026 | Nhân viên xưởng |
| 9 | **Anh Nam** | `manager` | 0 đ | 08/10/2026 | 08/10/2026 | 08/10/2026 | Giám đốc (`thanhnam`); chưa cấu hình đơn giá lương |
| 10 | **Mimi** | `staff` | 0 đ | 12/10/2026 | 12/10/2026 | 12/10/2026 | Kế toán (`mimi`, quyền Admin); chưa cấu hình đơn giá lương |

#### Thống kê Chấm công (`attendance` — 258 lượt):
| Tháng | Tổng số lượt | Số nhân sự | Giờ tăng ca | Tổng tiền tạm ứng lương | Khoảng ngày chấm công | Lần nhập cuối (`created_at`) |
| :---: | :---: | :---: | :---: | ---: | :---: | :---: |
| `2026-08` | **176 lượt** | 8 người | 0 giờ | 0 đ | `01/08` → `31/08/2026` | 10/09/2026 |
| `2026-09` | **82 lượt** | 9 người | 0 giờ | 15.000.000 đ | `01/09` → `21/09/2026` | 08/10/2026 |

*Các đợt nhập dữ liệu chấm công lên phần mềm:*
- Ngày `10/08/2026`: Nhập 10 lượt
- Ngày `12/08/2026`: Nhập 16 lượt
- Ngày `13/08/2026`: Nhập 7 lượt
- Ngày `16/08/2026`: Nhập 20 lượt
- Ngày `17/08/2026`: Nhập 6 lượt
- Ngày `19/08/2026`: Nhập 14 lượt
- Ngày `07/09/2026`: Nhập hàng loạt **152 lượt** (hoàn thiện chấm công tháng 8 và đầu tháng 9)
- Ngày `10/09/2026`: Nhập **31 lượt**
- Ngày `08/10/2026`: Tạo **2 lượt** đối soát ứng lương tháng 9 cho `Anh Nam` (10.000.000 đ ngày 17/09 và 5.000.000 đ ngày 21/09)

---

## 3. Cơ Chế Lưu Lịch Sử & Nhật Ký Kiểm Toán (`audit_log`) Trên Phần Mềm

Phần mềm KhoPhe ERP theo dõi lịch sử tạo/sửa/xóa dữ liệu qua **4 lớp bảo vệ ở tầng PostgreSQL**:

1. **Bảng Nhật ký Kiểm toán (`public.audit_log`):**
   - Sử dụng Database Trigger tự động ghi lại mọi thao tác `INSERT`, `UPDATE`, `DELETE` trên các bảng nghiệp vụ chính (`imports`, `exports`, `grinding`, `employees`), lưu trữ đầy đủ bản ghi cũ (`old_data` kiểu JSONB), bản ghi mới (`new_data` kiểu JSONB), người thực hiện (`user_id`) và thời điểm (`created_at`).
   - Hiện đang lưu **807 sự kiện** từ ngày `31/07/2026` đến `12/10/2026`.
2. **Xóa mềm (`Soft Delete` qua cột `deleted_at`):**
   - Các bảng phiếu kho (`imports`, `exports`, `grinding`) không xóa vĩnh viễn dữ liệu khi người dùng thao tác xóa trên giao diện mà cập nhật dấu thời gian `deleted_at`. Phiếu đã xóa không cộng vào KPI/báo cáo nhưng vẫn giữ nguyên dấu vết kiểm toán.
3. **Dấu thời gian và Người tạo tự động (`created_at`, `updated_at`, `created_by`):**
   - Trigger `set_created_by()` và `update_updated_at()` tự động gắn ID người dùng đăng nhập và thời점 chỉnh sửa cuối cùng.
4. **Sao lưu định kỳ có kiểm tra toàn vẹn SHA-256 (`scripts/backup_database.mjs`):**
   - Xuất toàn bộ dữ liệu các bảng `public` kèm lịch sử migration ra file JSON trong `.backups/` và kiểm thử khôi phục cô lập bằng PostgreSQL WASM (`npm run test:database`).

### Nhật ký hoạt động cập nhật dữ liệu theo ngày (Trích xuất từ `public.audit_log`)

| Ngày thực hiện | Bảng tác động | Hành động | Số lượng | Nội dung chính |
| :---: | :--- | :---: | :---: | :--- |
| **12/10/2026** | `employees` | `INSERT` | 1 | Thêm hồ sơ nhân sự Kế toán `Mimi` & chạy migration nâng cấp vận hành |
| **08/10/2026** | `employees`, `imports` | `INSERT` (1), `UPDATE` (9) | 10 | Thêm hồ sơ `Anh Nam`, cấp tài khoản `thanhnam`/`xuantu`/`mimi`, đối soát tiền ứng & cập nhật 9 phiếu nhập |
| **03/10/2026** | `imports` | `INSERT` (9), `UPDATE` (11) | 20 | Nhập 9 phiếu nhập phế mới (cuối tháng 9 và 01–02/10/2026), cập nhật 11 phiếu nhập |
| **25/09/2026** | `imports` | `INSERT` | 3 | Nhập 3 phiếu nhập phế |
| **23/09/2026** | `imports`, `exports` | `INSERT` (30), `UPDATE` (2) | 32 | Đợt nhập liệu lớn: 26 phiếu nhập, 4 phiếu xuất (+ 3 khoản chi phí, 2 khoản ứng, 2 phiên cân) |
| **18/09/2026** | `exports` | `INSERT` | 1 | Nhập 1 phiếu xuất phế (ngày 17/09) |
| **15/09/2026** | `imports`, `exports` | `INSERT` (6), `UPDATE` (11) | 17 | Nhập 3 phiếu nhập, 3 phiếu xuất; cập nhật 11 phiếu nhập |
| **13/09/2026** | `imports` | `INSERT` | 2 | Nhập 2 phiếu nhập phế |
| **11/09/2026** | `exports` | `UPDATE` | 1 | Cập nhật 1 phiếu xuất phế |
| **09/09/2026** | `imports`, `exports` | `INSERT` (9), `UPDATE` (1) | 10 | Nhập 8 phiếu nhập, 1 phiếu xuất |
| **08/09/2026** | `imports`, `exports` | `INSERT` (6), `UPDATE` (5) | 11 | Nhập 4 phiếu nhập, 2 phiếu xuất; cập nhật 5 phiếu |
| **07/09/2026** | `imports`, `employees` | `UPDATE` | 9 | Cập nhật 7 phiếu nhập, 2 hồ sơ nhân viên (+ nhập 152 lượt chấm công & 2 ảnh hóa đơn chi phí) |
| **03/09 – 06/09/2026** | `imports`, `exports` | `INSERT` (11), `UPDATE` (5) | 16 | Nhập 7 phiếu nhập, 4 phiếu xuất; cập nhật 5 phiếu nhập (+ 6 phiếu ứng tiền) |
| **20/08 – 30/08/2026** | `imports`, `exports` | `INSERT` (20), `UPDATE` (1) | 21 | Nhập 12 phiếu nhập, 8 phiếu xuất |
| **09/08 – 17/08/2026** | `imports`, `exports`, `employees` | `INSERT` (20), `UPDATE` (27) | 47 | Nhập đều đặn phiếu nhập/xuất hàng tuần, cập nhật hồ sơ nhân sự & danh bạ |
| **06/08 – 08/08/2026** | Tất cả các bảng | `INSERT`, `UPDATE`, `DELETE` | 285 | Đồng bộ dữ liệu gốc, xóa mềm các phiếu tháng 6–7 để chốt sổ từ 01/08/2026, lập danh sách 8 nhân viên xưởng |
| **31/07 – 03/08/2026** | Tất cả các bảng | `INSERT`, `DELETE` | 328 | Khởi tạo dữ liệu ban đầu từ sổ tay xưởng (28/06 – 02/08/2026) |

---

## 4. Lịch Sử Nâng Cấp Phần Mềm & Database Migrations

### 4.1. Lịch sử Database Migrations (`supabase_migrations.schema_migrations`)

| Phiên bản (Timestamp) | Tên Migration | Ngày áp dụng | Nội dung thay đổi |
| :---: | :--- | :---: | :--- |
| `001` → `016` *(Legacy)* | `supabase/legacy/001..016_*.sql` | `29/07` → `18/08/2026` | Khởi tạo schema ban đầu, RLS theo vai trò, bảng nhân sự/chấm công, thanh toán, kiểm kê, đính kèm ảnh, phân loại nhập/xuất (`nvl`/`thanh_pham`), vá lỗi tính lương. |
| `20261008000000` | `legacy_schema_baseline` | `08/10/2026` | Chuẩn hóa baseline schema cho Supabase CLI từ hệ thống legacy. |
| `20261008064436` | `fullstack_hardening` | `08/10/2026` | Bảo vệ vai trò/tài khoản ngừng hoạt động, RLS file đính kèm, RPC lưu phiên cân nguyên tử (`create_weighing_session_atomic`), khóa kỳ lương đã chốt, RPC tổng tồn kho. |
| `20261008094958` | `classify_workshop_advances` | `08/10/2026` | Bổ sung 5 mục đích ứng tiền (`unclassified`, `workshop_expense`, `raw_material`, `payroll`, `other`) và liên kết chứng từ đối soát. |
| `20261008095259` | `workshop_account_roles` | `08/10/2026` | Hỗ trợ đăng nhập bằng username nội bộ (`@accounts.khophe.local`), bổ sung vai trò `warehouse_manager` và `accountant`. |
| `20261008095544` | `advance_reconciliation_guards` | `08/10/2026` | Ràng buộc chống đối soát hoặc hoàn ứng vượt số tiền phiếu gốc, khóa sửa phiếu ứng đã đối soát. |
| `20261012004802` | `operational_upgrade` | `12/10/2026` | RPC tổng hợp Dashboard, trang Đối soát dữ liệu, phân loại nguyên nhân hao hụt xay, chuyển số dư lương âm/dương giữa các kỳ, bảng `app_error_logs`. |
| `20261012005457` | `operational_followup` | `12/10/2026` | Đồng bộ hoàn thiện quyền và kiểm thử vận hành ngày 12/10/2026. |

### 4.2. Lịch sử cập nhật phiên bản phần mềm (Git Changelog)

- **Giai đoạn 1 (29/07/2026 – 05/08/2026) — Khởi tạo & Số hóa sổ tay:**
  - Xây dựng ứng dụng KhoPhe ERP với React + TypeScript + Vite + Supabase.
  - Thiết kế giao diện Mobile-first (numpad cảm ứng, nút thao tác nhanh FAB, thẻ KPI, trừ bì Pallet).
  - Số hóa dữ liệu sổ tay từ 28/06/2026 đến 05/08/2026.
- **Giai đoạn 2 (06/08/2026 – 18/08/2026) — Chuẩn hóa dữ liệu thật & Nghiệp vụ cốt lõi:**
  - Loại bỏ hoàn toàn dữ liệu giả (mock fallback), bắt buộc xác thực qua Supabase Auth và phân quyền RLS.
  - Bổ sung đính kèm ảnh hóa đơn, liên kết phiên cân với phiếu xuất, so sánh kỳ trước, cảnh báo chủ động.
  - Chuẩn hóa module Nhân sự — Chấm công 1 chạm trên điện thoại — Tính lương và quyết toán (`08/08 – 09/08/2026`).
  - Bổ sung phân loại **Phế NVL (`nvl`)** và **Phế Thành Phẩm (`thanh_pham`)** cho Nhập/Xuất phế (`18/08/2026`).
- **Giai đoạn 3 (05/10/2026 – 12/10/2026) — Nâng cấp toàn diện & Đối soát tài chính - kho:**
  - **05/10 – 06/10/2026:** Bổ sung biểu đồ tổng hợp theo tháng trên trang Tổng quan và nâng cấp giao diện ERP.
  - **08/10/2026:** Nâng cấp Full-stack, thêm chỉ số hao hụt trên Báo cáo, phân loại & đối soát Sổ ứng tiền theo 5 mục đích, tạo tài khoản theo tên đăng nhập cho Giám đốc (`thanhnam`), Quản lý kho (`xuantu`), Kế toán (`mimi`).
  - **12/10/2026:** Ra mắt trang **Đối soát (`DoiSoatPage`)**, chuẩn hóa dòng tiền thực thu/chi trên Báo cáo, chuyển số dư lương âm/dương qua kỳ sau, phân loại nguyên nhân hao hụt khi xay và thiết lập cơ chế sao lưu + kiểm thử DB tự động (`npm run backup:data`, `npm run test:database`).

---

## 5. Các Mục Dữ Liệu Cần Xưởng Cập Nhật Bổ Sung

Để số liệu tồn kho, công nợ và bảng lương trên phần mềm khớp 100% với thực tế đến giữa tháng 10/2026, kế toán và quản lý kho cần cập nhật tiếp các dữ liệu đang tạm dừng sau:

1. **Phiếu Nhập phế (`imports`):** Nhập bổ sung các phiếu từ ngày **03/10/2026 đến nay**.
2. **Phiếu Xuất phế (`exports`):** Nhập bổ sung các chuyến xuất hàng từ ngày **24/09/2026 đến nay**.
3. **Phiên Cân phế (`weighing_sessions`):** Nhập bổ sung các phiên cân từ ngày **27/09/2026 đến nay**.
4. **Phiếu Xay phế (`grinding`):** Nhập bổ sung sản lượng xay phế từ ngày **08/08/2026 đến nay** (hiện mới có 2 phiếu ngày 06–07/08, làm tồn kho thành phẩm trên hệ thống bị âm).
5. **Chấm công & Đơn giá lương (`attendance`, `employees`):**
   - Nhập bổ sung bảng chấm công từ ngày **22/09/2026 đến nay**.
   - Thực hiện chốt lương tháng 08/2026 và tháng 09/2026 sau khi rà soát.
   - Cập nhật đơn giá lương ngày cho hồ sơ `Anh Nam` và `Mimi` (nếu có tính lương trên hệ thống).
6. **Chi phí xưởng & Sổ ứng tiền (`expenses`, `advances`):**
   - Nhập bổ sung chi phí xưởng phát sinh từ **24/09/2026 đến nay**.
   - Phân loại và đối soát **10 phiếu ứng tiền** (tổng **75.000.000 đ** giai đoạn 18/07 – 06/09/2026) đang ở trạng thái `Chưa phân loại` trên trang **Đối soát / Sổ ứng tiền**.

---

## 6. Lịch Sử Đăng Nhập & Hoạt Động Của Các Tài Khoản

> Dữ liệu trích xuất trực tiếp từ `auth.users`, `auth.sessions`, `auth.refresh_tokens`, `public.users`, `public.audit_log` và cột `created_by` trên toàn bộ các bảng nghiệp vụ (quy đổi theo giờ Việt Nam `UTC+7`).

### 6.1. Danh sách tài khoản và trạng thái đăng nhập (`auth.users` & `public.users`)

| STT | Tên đăng nhập / Email | Họ tên | Vai trò (`public.users`) | Ngày tạo tài khoản (VN) | Đăng nhập gần nhất (`last_sign_in_at` - VN) | Phiên hoạt động cuối (`refreshed_at` - VN) | Số phiên (`sessions` / `tokens`) | Tổng thao tác dữ liệu |
| :---: | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| 1 | `admin@khophe.vn` | **Admin KhoPhe** | `admin` | `29/07/2026 11:26` | `12/10/2026 07:31` | `12/10/2026 12:05` | 4 phiên / 6 token *(hiện lưu)* | **511 bản ghi tạo mới** + **193 lượt sửa/xóa** |
| 2 | `thanhnam` *(`thanhnam@accounts.khophe.local`)* | **Anh Nam** *(Giám đốc)* | `admin` | `08/10/2026 16:53` | `12/10/2026 08:01` | `12/10/2026 08:01` *(Thực tế: `10/10 16:07`)* | 9 phiên / 13 token | **2 bản ghi** *(đối soát ứng lương)* |
| 3 | `mimi` *(`mimi@accounts.khophe.local`)* | **Mimi** *(Kế toán)* | `admin` | `08/10/2026 16:53` | `12/10/2026 09:56` | `12/10/2026 09:56` *(Thực tế: `10/10 11:26`)* | 9 phiên / 13 token | **0 bản ghi** *(chỉ xem dữ liệu)* |
| 4 | `xuantu` *(`xuantu@accounts.khophe.local`)* | **Phan Xuân Tú** *(Quản lý kho)* | `warehouse_manager` | `08/10/2026 16:53` | `12/10/2026 08:01` | `12/10/2026 08:01` | 4 phiên / 4 token | **0 bản ghi** *(chưa đăng nhập thực tế)* |
| 5 | `khophe.admin@gmail.com` | *(Chưa gắn hồ sơ)* | *(Không có)* | `08/08/2026 20:25` | Chưa từng đăng nhập | — | 0 | **0 bản ghi** *(tài khoản thử nghiệm chưa xác thực email)* |

---

### 6.2. Chi tiết lịch sử phiên đăng nhập (`auth.sessions`)

Hiện hệ thống đang lưu **26 phiên đăng nhập gần nhất** (từ `08/10/2026` đến `12/10/2026`), chia làm 2 nhóm rõ rệt:

#### A. Các phiên đăng nhập thực tế của người dùng (trên thiết bị cá nhân)
1. **Tài khoản `mimi` (Kế toán — Mimi):**
   - **Thời gian bắt đầu đăng nhập:** `09/10/2026 14:28:14` (giờ VN)
   - **Duy trì hoạt động đến (`refreshed_at`):** `10/10/2026 11:26:11` (giờ VN)
   - **Thiết bị & Trình duyệt:** Máy Mac / thiết bị Apple (`Macintosh; Intel Mac OS X 10_15_7 - Safari 26.5`)
   - **Địa chỉ IP:** `113.161.65.16`
   - **Hoạt động trong phiên:** Xem báo cáo và số liệu các trang; chưa thực hiện thêm/sửa/xóa bản ghi nào.
2. **Tài khoản `thanhnam` (Giám đốc — Anh Nam):**
   - **Thời gian bắt đầu đăng nhập:** `09/10/2026 14:36:16` (giờ VN)
   - **Duy trì hoạt động đến (`refreshed_at`):** `10/10/2026 16:07:36` (giờ VN)
   - **Thiết bị & Trình duyệt:** Máy tính Windows 10/11 (`Chrome 154 / Microsoft Edge 154`)
   - **Địa chỉ IP:** `42.113.154.10`
   - **Hoạt động trong phiên:** Xem tổng quan và báo cáo; không phát sinh lệnh ghi dữ liệu mới.
3. **Tài khoản `admin@khophe.vn` (Admin KhoPhe):**
   - Sử dụng xuyên suốt từ `29/07/2026` đến `12/10/2026` để nhập liệu định kỳ và quản trị hệ thống.
   - Phiên trình duyệt gần nhất: Đăng nhập lúc `12/10/2026 07:31:00`, làm mới token đến **`12/10/2026 12:05:20` (giờ VN)** trên `Chrome 154 (Windows)` tại IP `118.70.182.173`.
4. **Tài khoản `xuantu` (Quản lý kho — Phan Xuân Tú):**
   - **Chưa có phiên đăng nhập thực tế** từ điện thoại hoặc máy tính tại xưởng (chỉ có 4 phiên kiểm thử tự động khi tạo và nâng cấp tài khoản ngày `08/10` và `12/10`).

#### B. Các phiên đăng nhập kiểm thử kỹ thuật & đối soát hệ thống
- **Ngày `08/10/2026` (`16:54` – `17:02` giờ VN, IP `118.70.182.173`):** 10 phiên trên `HeadlessChrome 154` để kiểm thử tự động phân quyền (`thanhnam`, `xuantu`, `mimi`) ngay sau khi khởi tạo 3 tài khoản theo tên đăng nhập.
- **Ngày `09/10/2026` (`14:36` – `14:47` giờ VN, IP `42.113.154.10`):** 3 phiên `node` của `admin@khophe.vn` phục vụ kiểm tra kết nối API.
- **Ngày `12/10/2026` (`07:30` – `09:56` giờ VN, IP `118.70.182.173`):** 10 phiên trên `HeadlessChrome 155` để kiểm thử tự động toàn bộ giao diện Desktop/Mobile cho các vai trò sau đợt nâng cấp vận hành 12/10.

---

### 6.3. Thống kê toàn bộ hoạt động tạo/sửa/xóa dữ liệu theo từng tài khoản

#### 1. Tài khoản `admin@khophe.vn` (`Admin KhoPhe`) — Tài khoản nhập liệu chính (99,6% dữ liệu)
Toàn bộ dữ liệu vận hành xưởng từ ngày **07/08/2026 đến 08/10/2026** đều được nhập và chỉnh sửa dưới tài khoản `admin@khophe.vn`:

| Phân hệ (`table`) | Bản ghi tạo mới (`created_by`) | Lượt sửa (`UPDATE` trong `audit_log`) | Lượt xóa (`DELETE` / xóa mềm) | Thời gian thao tác đầu tiên (VN) | Thời gian thao tác cuối cùng (VN) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Nhập phế** (`imports`) | **113 phiếu** *(108 hiệu lực, 5 xóa mềm)* | **154 lượt** | 5 phiếu *(xóa mềm)* | `06/08/2026 21:19` | **`08/10/2026 12:37`** *(cập nhật thanh toán)* |
| **Xuất phế** (`exports`) | **34 phiếu** *(31 hiệu lực, 3 xóa mềm)* | **11 lượt** | 3 phiếu *(xóa mềm)* | `07/08/2026 12:17` | `23/09/2026 10:34` |
| **Phiên cân** (`weighing_sessions`) | **50 phiên cân** | — | 0 | `07/08/2026 18:30` | `26/09/2026 08:59` |
| **Xay phế** (`grinding`) | **2 phiếu hiệu lực** *(5 INSERT trong log)* | **11 lượt** | 3 phiếu *(xóa mềm)* | `07/08/2026 12:17` | `08/08/2026 19:43` |
| **Chi phí xưởng** (`expenses`) | **35 khoản chi** | — | 0 | `11/08/2026 09:51` | `23/09/2026 10:57` |
| **Sổ ứng tiền** (`advances`) | **12 phiếu ứng** | — | 0 | `11/08/2026 09:49` | `23/09/2026 10:54` |
| **Chấm công** (`attendance`) | **256 lượt chấm công** | — | 0 | `10/08/2026 14:59` | `10/09/2026 20:30` |
| **Nhân sự** (`employees`) | **8 hồ sơ** *(10 INSERT trong log)* | **17 lượt** | 2 hồ sơ *(ngày 08/08)* | `07/08/2026 12:43` | `07/09/2026 16:54` |
| **Kiểm kê kho** (`stock_counts`) | **2 phiếu kiểm kê** | — | 0 | `07/08/2026 18:33` | `07/08/2026 21:04` |
| **Ảnh hóa đơn** (`attachments`) | **2 file ảnh** | — | 0 | `07/09/2026 11:59` | `12/09/2026 19:52` |

#### 2. Tài khoản `thanhnam` (`Anh Nam`)
- **Bản ghi đã tạo (`created_by`):** **02 bản ghi** trong bảng `attendance` vào ngày `08/10/2026 16:53:49` (giờ VN) khi thực hiện đối soát 2 phiếu ứng lương (10.000.000 đ ngày 17/09 và 5.000.000 đ ngày 21/09) sang sổ chấm công.
- **Hoạt động sau ngày 08/10/2026:** Đăng nhập xem số liệu ngày `09/10` – `10/10/2026`, không phát sinh chỉnh sửa dữ liệu.

#### 3. Tài khoản `mimi` (`Mimi` — Kế toán) & `xuantu` (`Phan Xuân Tú` — Quản lý kho)
- **Bản ghi đã tạo/sửa (`created_by` / `changed_by`):** **0 bản ghi**.
- Kể từ khi được cấp tài khoản riêng ngày `08/10/2026`, kế toán `mimi` mới đăng nhập xem dữ liệu (ngày `09/10 – 10/10/2026`), còn quản lý kho `xuantu` chưa đăng nhập nhập liệu. Toàn bộ dữ liệu nhập phế gần nhất (ngày `03/10` và cập nhật ngày `08/10`) vẫn được thực hiện bằng tài khoản chung `admin@khophe.vn`.

#### 4. Hoạt động hệ thống / Script Migration (`created_by = NULL` / `changed_by = NULL`)
- **Giai đoạn `31/07/2026` – `06/08/2026`:** 455 sự kiện trong `audit_log` (nạp dữ liệu sổ tay ban đầu gồm 58 phiếu nhập cũ, 3 phiếu xuất cũ, 3 phiên cân ngày 29/07–02/08, 27 danh bạ đối tác).
- **Ngày `08/10/2026` & `12/10/2026`:** Tạo tự động 2 hồ sơ nhân sự `Anh Nam` và `Mimi` qua SQL Migration nâng cấp hệ thống.

