import { describe, expect, it } from 'vitest';
import { normalizeAttendanceRecord } from './employeesService';

describe('normalizeAttendanceRecord', () => {
  it('giữ nguyên 0 công cho ngày nghỉ và phiếu chỉ tạm ứng', () => {
    const row = normalizeAttendanceRecord({
      id: 'a1',
      date: '2026-08-09',
      employee_id: 'e1',
      employees: { name: 'Hoa' },
      work_shift: 0,
      overtime_hours: 0,
      daily_pay: 350_000,
      advance_pay: 200_000,
      net_pay: 0,
      payment_status: 'unpaid',
    });

    expect(row.work_shift).toBe(0);
    expect(row.advance_pay).toBe(200_000);
  });

  it('không biến dữ liệu số âm thành giá trị hợp lệ', () => {
    const row = normalizeAttendanceRecord({
      id: 'a2',
      date: '2026-08-09',
      work_shift: -1,
      overtime_hours: -2,
      daily_pay: -100,
      advance_pay: -50,
      net_pay: 0,
      payment_status: 'unpaid',
    });

    expect(row.work_shift).toBe(0);
    expect(row.overtime_hours).toBe(0);
    expect(row.daily_pay).toBe(0);
    expect(row.advance_pay).toBe(0);
  });
});
