import { supabase } from '../lib/supabase';
import { loadLocalData, saveLocalData } from '../lib/storage';

export interface StockCount {
  id: string;
  date: string;
  counted_bags: number;
  counted_kg: number;
  system_kg: number;
  diff_kg: number;
  notes?: string;
  created_at?: string;
}

let LOCAL_STOCK_COUNTS: StockCount[] = loadLocalData('khophe_stock_counts', []);

export const stockCountService = {
  async getAll(): Promise<StockCount[]> {
    try {
      const { data, error } = await supabase
        .from('stock_counts')
        .select('*')
        .order('date', { ascending: false });

      if (!error && data && data.length > 0) {
        LOCAL_STOCK_COUNTS = data;
        saveLocalData('khophe_stock_counts', LOCAL_STOCK_COUNTS);
        return data;
      }
    } catch {}

    LOCAL_STOCK_COUNTS = loadLocalData('khophe_stock_counts', LOCAL_STOCK_COUNTS);
    return LOCAL_STOCK_COUNTS;
  },

  async create(entry: { date?: string; counted_bags: number; counted_kg: number; system_kg: number; notes?: string }): Promise<StockCount> {
    let created: StockCount | null = null;
    const diffKg = entry.counted_kg - entry.system_kg;
    try {
      const { data, error } = await supabase
        .from('stock_counts')
        .insert({
          date: entry.date || new Date().toISOString().split('T')[0],
          counted_bags: entry.counted_bags,
          counted_kg: entry.counted_kg,
          system_kg: entry.system_kg,
          notes: entry.notes || null,
        })
        .select()
        .single();

      if (!error && data) {
        created = data;
      }
    } catch {}

    if (!created) {
      created = {
        id: `sc-${Date.now()}`,
        date: entry.date || new Date().toISOString().split('T')[0],
        counted_bags: entry.counted_bags,
        counted_kg: entry.counted_kg,
        system_kg: entry.system_kg,
        diff_kg: diffKg,
        notes: entry.notes || undefined,
      };
    }

    LOCAL_STOCK_COUNTS.unshift(created);
    saveLocalData('khophe_stock_counts', LOCAL_STOCK_COUNTS);
    return created;
  }
};
