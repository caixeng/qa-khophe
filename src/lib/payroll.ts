import type { Attendance } from '../types';

export interface PayrollRow {
  key: string;
  employee_id?: string;
  name: string;
  shifts: number;
  overtime_hours: number;
  regular: number;
  overtime: number;
  gross: number;
  advance: number;
  net: number;
  unpaid: number;
}

export interface PayrollSummary {
  rows: PayrollRow[];
  totals: Omit<PayrollRow, 'key' | 'name' | 'employee_id'>;
}

const EMPTY_TOTALS: Omit<PayrollRow, 'key' | 'name' | 'employee_id'> = {
  shifts: 0,
  overtime_hours: 0,
  regular: 0,
  overtime: 0,
  gross: 0,
  advance: 0,
  net: 0,
  unpaid: 0,
};

export const STANDARD_WORKDAY_HOURS = 8;
export const OVERTIME_MULTIPLIER = 1.5;

export interface AttendancePayBreakdown {
  regular: number;
  overtime: number;
  gross: number;
  advance: number;
  net: number;
}

/**
 * Một công tiêu chuẩn gồm 8 giờ; tăng ca ngày thường được tính 150% đơn giá giờ.
 * Hàm dùng chung cho preview, bảng lương và test để giao diện không lệch DB.
 */
export function calculateAttendancePay(attendance: Partial<Attendance>): AttendancePayBreakdown {
  const shifts = Math.max(0, Number(attendance.work_shift) || 0);
  const dailyPay = Math.max(0, Number(attendance.daily_pay) || 0);
  const overtimeHours = Math.max(0, Number(attendance.overtime_hours) || 0);
  const advance = Math.max(0, Number(attendance.advance_pay) || 0);
  const regular = shifts * dailyPay;
  const overtime = (overtimeHours * dailyPay * OVERTIME_MULTIPLIER) / STANDARD_WORKDAY_HOURS;
  const gross = regular + overtime;

  return {
    regular,
    overtime,
    gross,
    advance,
    net: gross - advance,
  };
}

/**
 * Gộp các lượt chấm công trong một tháng thành bảng lương theo từng người.
 *
 * Chủ xưởng trả lương theo tháng nhưng dữ liệu ghi theo từng ngày công, nên
 * không gộp lại thì đến kỳ trả lương vẫn phải ngồi cộng tay.
 *
 * Gom theo `employee_id` khi có, vì hai người trùng tên phải là hai dòng lương
 * riêng. Chỉ khi chấm công tự do (không chọn nhân viên trong hồ sơ) mới đành
 * gom theo tên.
 *
 * @param month chuỗi `yyyy-mm`
 */
export function computePayroll(attendance: readonly Attendance[], month: string): PayrollSummary {
  const byPerson = new Map<string, { row: PayrollRow; hasOutstanding: boolean }>();

  for (const a of attendance) {
    if (!(a.date || '').startsWith(month)) continue;

    const normalizedName = (a.employee_name || 'Không rõ').trim();
    const key = a.employee_id ? `employee:${a.employee_id}` : `name:${normalizedName.toLocaleLowerCase('vi')}`;
    const entry = byPerson.get(key) ?? {
      hasOutstanding: false,
      row: {
      key,
      employee_id: a.employee_id,
      name: normalizedName,
      ...EMPTY_TOTALS,
      },
    };
    const row = entry.row;

    const shift = Number(a.work_shift) || 0;
    const overtimeHours = Number(a.overtime_hours) || 0;
    const pay = calculateAttendancePay(a);

    row.shifts += shift;
    row.overtime_hours += overtimeHours;
    row.regular += pay.regular;
    row.overtime += pay.overtime;
    row.gross += pay.gross;
    row.advance += pay.advance;
    row.net = row.gross - row.advance;
    entry.hasOutstanding ||= a.payment_status !== 'paid';
    row.unpaid = entry.hasOutstanding ? Math.max(0, row.net) : 0;

    byPerson.set(key, entry);
  }

  const rows = [...byPerson.values()].map(({ row }) => row).sort((x, y) => y.unpaid - x.unpaid);

  return {
    rows,
    totals: rows.reduce(
      (t, r) => ({
        shifts: t.shifts + r.shifts,
        overtime_hours: t.overtime_hours + r.overtime_hours,
        regular: t.regular + r.regular,
        overtime: t.overtime + r.overtime,
        gross: t.gross + r.gross,
        advance: t.advance + r.advance,
        net: t.net + r.net,
        unpaid: t.unpaid + r.unpaid,
      }),
      { ...EMPTY_TOTALS },
    ),
  };
}
