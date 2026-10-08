import { supabase } from '../lib/supabase';
import { runQuery } from '../lib/serviceError';

export interface InventorySummary {
  currentStockKg: number;
  currentBags: number;
  rawStockKg: number;
  totalGround: number;
  totalImported: number;
  totalExported: number;
  openingStock: number;
  kgPerBag: number;
}

export const inventoryService = {
  getSummary: () =>
    runQuery<InventorySummary>('tải tổng tồn kho', () => supabase.rpc('get_inventory_summary')),
};
