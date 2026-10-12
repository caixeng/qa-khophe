import { describe, it, expect } from 'vitest';
import { computePayroll, withPayrollBalances } from './payrollBalances';
import { calculateAttendancePay } from './payroll';
import type { Attendance } from '../types';
const att = (values: Partial<Attendance>): Attendance => ({
  id: 'a',
  date: '2026-10-01',
  employee_id: 'e',
  employee_name: 'Nam',
  work_shift: 1,
  daily_pay: 100,
  net_pay: 100,
  payment_status: 'unpaid',
  ...values,
});
describe('payroll carry', () => {
  it('deducts a previous advance from current unpaid wages', () => {
    const list = [att({})];
    const result = withPayrollBalances(
      computePayroll(list, '2026-10'),
      [
        {
          employee_id: 'e',
          name: 'Nam',
          opening_balance: -150,
          settled: false,
          cash_paid: 0,
          closing_balance: 0,
        },
      ],
      list,
    );
    expect(result.rows[0].balance_due).toBe(-50);
    expect(result.totals.unpaid).toBe(0);
  });
  it('does not repay wages marked paid manually', () => {
    const list = [att({ payment_status: 'paid' }), att({ id: 'b', date: '2026-10-02', daily_pay: 200 })];
    const result = withPayrollBalances(computePayroll(list, '2026-10'), [], list);
    expect(result.rows[0].unpaid).toBe(200);
  });
  it('shows carry even when there is no attendance in the selected month', () => {
    const result = withPayrollBalances(computePayroll([], '2026-10'), [
      {
        employee_id: 'e',
        name: 'Nam',
        opening_balance: -150,
        settled: false,
        cash_paid: 0,
        closing_balance: 0,
      },
    ]);
    expect(result.rows[0].balance_due).toBe(-150);
  });
  it('keeps the stored closing balance after a settlement', () => {
    const list = [att({ payment_status: 'paid' })];
    const result = withPayrollBalances(
      computePayroll(list, '2026-10'),
      [
        {
          employee_id: 'e',
          name: 'Nam',
          opening_balance: -150,
          settled: true,
          cash_paid: 0,
          closing_balance: -50,
        },
      ],
      list,
    );
    expect(result.rows[0].balance_due).toBe(-50);
    expect(result.rows[0].unpaid).toBe(0);
  });
  it('uses the rate stored on the attendance record', () => {
    expect(calculateAttendancePay(att({ overtime_hours: 8, overtime_multiplier: 2 })).gross).toBe(300);
  });
});
