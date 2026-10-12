import type { Attendance } from '../types';
import type { PayrollBalance } from '../services/employeesService';
import { calculateAttendancePay, type PayrollSummary } from './payroll';
export { computePayroll } from './payroll';

/** Positive balance is owed to the employee; negative balance is an outstanding advance. */
export function withPayrollBalances(
  summary: PayrollSummary,
  balances: readonly PayrollBalance[],
  attendance: readonly Attendance[] = [],
) {
  const rows = summary.rows.map((row) => {
    const balance = balances.find((item) => item.employee_id === row.employee_id);
    const pending = attendance
      .filter(
        (item) =>
          item.payment_status !== 'paid' &&
          (row.employee_id
            ? item.employee_id === row.employee_id
            : item.employee_name.trim().toLocaleLowerCase('vi') === row.name.trim().toLocaleLowerCase('vi')),
      )
      .reduce((sum, item) => sum + calculateAttendancePay(item).net, 0);
    const opening_balance = Number(balance?.opening_balance) || 0;
    const settled = balance?.settled ?? false;
    const balance_due = settled ? Number(balance?.closing_balance) || 0 : opening_balance + pending;
    return {
      ...row,
      opening_balance,
      settled,
      balance_due,
      cash_paid: Number(balance?.cash_paid) || 0,
      unpaid: settled ? 0 : Math.max(0, balance_due),
    };
  });
  for (const balance of balances) {
    if (
      rows.some((row) => row.employee_id === balance.employee_id) ||
      (!Number(balance.opening_balance) && !balance.settled)
    )
      continue;
    const due = Number(balance.settled ? balance.closing_balance : balance.opening_balance);
    rows.push({
      key: `employee:${balance.employee_id}`,
      employee_id: balance.employee_id,
      name: balance.name,
      shifts: 0,
      overtime_hours: 0,
      regular: 0,
      overtime: 0,
      gross: 0,
      advance: 0,
      net: 0,
      unpaid: balance.settled ? 0 : Math.max(0, due),
      opening_balance: Number(balance.opening_balance),
      settled: balance.settled,
      balance_due: due,
      cash_paid: Number(balance.cash_paid),
    });
  }
  return {
    rows: rows.sort((a, b) => b.unpaid - a.unpaid),
    totals: {
      ...summary.totals,
      unpaid: rows.reduce((sum, row) => sum + row.unpaid, 0),
      opening_balance: rows.reduce((sum, row) => sum + row.opening_balance, 0),
    },
  };
}
