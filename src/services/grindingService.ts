import { supabase } from '../lib/supabase';
import type { Grinding } from '../types';

export const grindingService = {
  async getAll(): Promise<Grinding[]> {
    const { data, error } = await supabase
      .from('grinding')
      .select('*')
      .is('deleted_at', null)
      .order('date', { ascending: false });

    if (error) throw new Error(error.message);

    return (data || []).map(item => ({
      id: item.id,
      date: item.date,
      import_id: item.import_id,
      input_qty_kg: Number(item.input_qty_kg) || 0,
      output_qty_kg: Number(item.output_qty_kg) || 0,
      loss_kg: Number(item.loss_kg) || 0,
      loss_pct: Number(item.loss_pct) || 0,
      bags_count: Number(item.bags_count) || 0,
      worker: item.worker || 'Hoa',
      notes: item.notes,
      created_at: item.created_at,
    }));
  },

  async create(item: Partial<Grinding>): Promise<Grinding> {
    const inputKg = Number(item.input_qty_kg) || 0;
    const outputKg = Number(item.output_qty_kg) || 0;

    const { data, error } = await supabase
      .from('grinding')
      .insert({
        date: item.date || new Date().toISOString().split('T')[0],
        import_id: item.import_id || null,
        input_qty_kg: inputKg,
        output_qty_kg: outputKg,
        bags_count: Number(item.bags_count) || 0,
        worker: item.worker || 'Hoa',
        notes: item.notes || null,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    return {
      id: data.id,
      date: data.date,
      import_id: data.import_id,
      input_qty_kg: Number(data.input_qty_kg) || 0,
      output_qty_kg: Number(data.output_qty_kg) || 0,
      loss_kg: Number(data.loss_kg) || 0,
      loss_pct: Number(data.loss_pct) || 0,
      bags_count: Number(data.bags_count) || 0,
      worker: data.worker || 'Hoa',
      notes: data.notes,
      created_at: data.created_at,
    };
  },

  async update(id: string, item: Partial<Grinding>): Promise<void> {
    const inputKg = Number(item.input_qty_kg) || 0;
    const outputKg = Number(item.output_qty_kg) || 0;

    const { error } = await supabase
      .from('grinding')
      .update({
        date: item.date,
        import_id: item.import_id || null,
        input_qty_kg: inputKg,
        output_qty_kg: outputKg,
        bags_count: Number(item.bags_count) || 0,
        worker: item.worker,
        notes: item.notes || null,
      })
      .eq('id', id);

    if (error) throw new Error(error.message);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('grinding')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw new Error(error.message);
  }
};
