import { supabase } from '../lib/supabase';
import { runQuery, ServiceError, MAX_ROWS } from '../lib/serviceError';
import { today } from '../lib/date';

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

export const stockCountService = {
  async getAll(): Promise<StockCount[]> {
    return runQuery<StockCount[]>('tải danh sách kiểm kê', () =>
      supabase.from('stock_counts').select('*').order('date', { ascending: false }).limit(MAX_ROWS),
    );
  },

  async create(entry: {
    date?: string;
    counted_bags: number;
    counted_kg: number;
    system_kg: number;
    notes?: string;
  }): Promise<StockCount> {
    if (entry.counted_kg < 0 || entry.counted_bags < 0) {
      throw new ServiceError('Số lượng kiểm kê không được là số âm.');
    }

    return runQuery<StockCount>('thêm phiếu kiểm kê', () =>
      supabase
        .from('stock_counts')
        .insert({
          date: entry.date || today(),
          counted_bags: entry.counted_bags,
          counted_kg: entry.counted_kg,
          system_kg: entry.system_kg,
          notes: entry.notes || null,
        })
        .select()
        .single(),
    );
  },

  async delete(id: string): Promise<void> {
    await runQuery('xoá phiếu kiểm kê', () =>
      supabase.from('stock_counts').delete().eq('id', id).select('id').single(),
    );
  },
};
