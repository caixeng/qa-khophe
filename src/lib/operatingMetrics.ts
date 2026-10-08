import type { Attendance, Expense, Export, Import } from '../types';
import { calculateAttendancePay } from './payroll';

/** Values recorded in the period, irrespective of payment dates. Not accounting profit. */
export function summarizeOperations(data: {
  imports: readonly Pick<Import, 'quantity_kg' | 'total_amount'>[];
  exports: readonly Pick<Export, 'total_kg' | 'total_amount'>[];
  expenses: readonly Pick<Expense, 'amount'>[];
  attendance: readonly Partial<Attendance>[];
}) {
  const totalImportKg = data.imports.reduce((sum, row) => sum + (Number(row.quantity_kg) || 0), 0);
  const totalImportCost = data.imports.reduce((sum, row) => sum + (Number(row.total_amount) || 0), 0);
  const totalExportKg = data.exports.reduce((sum, row) => sum + (Number(row.total_kg) || 0), 0);
  const totalRevenue = data.exports.reduce((sum, row) => sum + (Number(row.total_amount) || 0), 0);
  const totalExpenseCost = data.expenses.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
  const totalPayrollCost = data.attendance.reduce((sum, row) => sum + calculateAttendancePay(row).gross, 0);
  const totalOperatingCost = totalExpenseCost + totalPayrollCost;
  return {
    totalImportKg,
    totalImportCost,
    totalExportKg,
    totalRevenue,
    totalExpenseCost,
    totalPayrollCost,
    totalOperatingCost,
    estimatedProfit: totalRevenue - totalImportCost - totalOperatingCost,
  };
}
