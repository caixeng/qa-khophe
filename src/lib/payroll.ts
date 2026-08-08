import type { Attendance } from '../types';

export interface PayrollRow {
  employee_id?: string;
  name: string;
  shifts: number;
  gross: number;
  advance: number;
  net: number;
  unpaid: number;
}

export interface PayrollSummary {
  rows: PayrollRow[];
  totals: Omit<PayrollRow, 'name' | 'employee_id'>;
}

const EMPTY_TOTALS: Omit<PayrollRow, 'name' | 'employee_id'> = {
  shifts: 0,
  gross: 0,
  advance: 0,
  net: 0,
  unpaid: 0,
};

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
  const byPerson = new Map<string, PayrollRow>();

  for (const a of attendance) {
    if (!(a.date || '').startsWith(month)) continue;

    const key = a.employee_id || a.employee_name || 'Không rõ';
    const row = byPerson.get(key) ?? {
      employee_id: a.employee_id,
      name: a.employee_name || 'Không rõ',
      ...EMPTY_TOTALS,
    };

    const shift = Number(a.work_shift) || 0;
    const dailyPay = Number(a.daily_pay) || 0;
    const advance = Number(a.advance_pay) || 0;

    row.shifts += shift;
    row.gross += shift * dailyPay;
    row.advance += advance;

    // Tính net thực tế = Gross - Advance (Nếu âm tức là nhân viên đang nợ tiền xưởng)
    const currentNet = row.gross - row.advance;
    row.net = currentNet;
    // Chỉ tính còn phải trả khi net > 0 và chưa thanh toán xong ('paid')
    row.unpaid = a.payment_status === 'paid' ? 0 : Math.max(0, currentNet);

    byPerson.set(key, row);
  }

  const rows = [...byPerson.values()].sort((x, y) => y.unpaid - x.unpaid);

  return {
    rows,
    totals: rows.reduce(
      (t, r) => ({
        shifts: t.shifts + r.shifts,
        gross: t.gross + r.gross,
        advance: t.advance + r.advance,
        net: t.net + r.net,
        unpaid: t.unpaid + r.unpaid,
      }),
      { ...EMPTY_TOTALS },
    ),
  };
}
