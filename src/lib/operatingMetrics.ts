import type { Attendance, Expense, Export, Grinding, Import } from '../types';
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

/**
 * Phân tích cấu thành giá vốn 1 kg phế thành phẩm trong kỳ:
 * Giá thành 1 kg = Giá mua NVL bình quân + Chi phí hao hụt xay + Nhân công/kg + Chi phí xưởng/kg
 */
export function calculateUnitCostMetrics(data: {
  totalImportKg: number;
  totalImportCost: number;
  totalExportKg: number;
  totalRevenue: number;
  totalExpenseCost: number;
  totalPayrollCost: number;
  grinding: readonly Pick<Grinding, 'input_qty_kg' | 'output_qty_kg'>[];
}) {
  const avgImportPricePerKg =
    data.totalImportKg > 0 ? Math.round(data.totalImportCost / data.totalImportKg) : 0;
  const avgExportPricePerKg = data.totalExportKg > 0 ? Math.round(data.totalRevenue / data.totalExportKg) : 0;

  const grindingInputKg = data.grinding.reduce((s, g) => s + (Number(g.input_qty_kg) || 0), 0);
  const grindingOutputKg = data.grinding.reduce((s, g) => s + (Number(g.output_qty_kg) || 0), 0);

  const lossRatio =
    grindingInputKg > 0 && grindingOutputKg > 0 && grindingInputKg >= grindingOutputKg
      ? (grindingInputKg - grindingOutputKg) / grindingOutputKg
      : 0;

  const lossCostPerKg = Math.round(avgImportPricePerKg * lossRatio);
  const baseProdKg = grindingOutputKg > 0 ? grindingOutputKg : data.totalExportKg;

  const laborCostPerKg = baseProdKg > 0 ? Math.round(data.totalPayrollCost / baseProdKg) : 0;
  const workshopCostPerKg = baseProdKg > 0 ? Math.round(data.totalExpenseCost / baseProdKg) : 0;

  const totalUnitCostPerKg = avgImportPricePerKg + lossCostPerKg + laborCostPerKg + workshopCostPerKg;
  const netMarginPerKg = avgExportPricePerKg > 0 ? avgExportPricePerKg - totalUnitCostPerKg : 0;
  const netMarginPct =
    avgExportPricePerKg > 0 ? Number(((netMarginPerKg / avgExportPricePerKg) * 100).toFixed(1)) : 0;

  return {
    avgImportPricePerKg,
    avgExportPricePerKg,
    lossCostPerKg,
    laborCostPerKg,
    workshopCostPerKg,
    totalUnitCostPerKg,
    netMarginPerKg,
    netMarginPct,
    baseProdKg,
  };
}
