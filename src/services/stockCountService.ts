import { supabase } from '../lib/supabase';

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
    const { data, error } = await supabase
      .from('stock_counts')
      .select('*')
      .order('date', { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
  },

  async create(entry: {
    date?: string;
    counted_bags: number;
    counted_kg: number;
    system_kg: number;
    notes?: string;
  }): Promise<StockCount> {
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

    if (error) throw new Error(error.message);
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('stock_counts').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },
};
