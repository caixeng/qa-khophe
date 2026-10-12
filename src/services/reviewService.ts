import { supabase } from '../lib/supabase';
import { runQuery } from '../lib/serviceError';
import { today } from '../lib/date';
import type { InventorySummary } from './inventoryService';
import type { MonthlyStatItem } from '../lib/monthlyStats';
import type { Import, Export } from '../types';

export interface ReconciliationStatus {
  inventory: InventorySummary;
  rawImported: number;
  rawExported: number;
  grindingInput: number;
  unlinkedLots: number;
  zeroLossLots: number;
  lossUnclassified: number;
  unclassifiedAdvances?: number;
  advanceOutstanding?: number;
  employeesWithoutSalary?: number;
}
export interface CashFlow {
  categories: Record<string, number>;
  inflow: number;
  outflow: number;
  net: number;
}
export interface DashboardSummary {
  todayImportKg: number;
  todayGroundKg: number;
  todayExportBags: number;
  totalImportKg: number;
  totalExportKg: number;
  totalImportCost: number;
  totalRevenue: number;
  totalOperatingCost: number | null;
  estimatedProfit: number | null;
  receivables: number;
  payables: number;
  inventoryKg: number;
  inventoryBags: number;
  pendingImports: Import[];
  pendingImportCount: number;
  unpaidExports: Export[];
  overdueReceivables: Export[];
  overdueCount: number;
  totalUnpaidReceivables: number;
  totalOverdueReceivables: number;
  lowStockAlert: boolean;
  recentActivities: { id: string; type: string; text: string; date: string; amount: number; unit: string }[];
}
export const reviewService = {
  getStatus: () =>
    runQuery<ReconciliationStatus>('tải đối soát', () => supabase.rpc('get_reconciliation_status')),
  getDashboard: () =>
    runQuery<{ summary: DashboardSummary; monthly: MonthlyStatItem[] }>('tải tổng quan', () =>
      supabase.rpc('get_dashboard_snapshot', { p_today: today() }),
    ),
  getCashFlow: (from: string, to: string) =>
    runQuery<CashFlow>('tải dòng tiền', () => supabase.rpc('get_cash_flow', { p_from: from, p_to: to })),
};
