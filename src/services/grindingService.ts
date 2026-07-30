import { supabase } from '../lib/supabase';
import type { Grinding } from '../types';

export const ALL_NOTEBOOK_GRINDING: Grinding[] = [
  { id: 'grd-1', date: '2026-06-29', input_quantity_kg: 1395, output_quantity_kg: 1412, loss_kg: -17, loss_percentage: -1.2, bags_count: 56, operator_name: 'Hoa', notes: 'R Hoàn (Xay ra 1.412kg, dôi +17kg)' },
  { id: 'grd-2', date: '2026-06-29', input_quantity_kg: 2280, output_quantity_kg: 2248, loss_kg: 32, loss_percentage: 1.4, bags_count: 90, operator_name: 'Hoa', notes: 'R Nga (Xay 29-30/06: 2.248kg)' },
  { id: 'grd-3', date: '2026-06-30', input_quantity_kg: 2505, output_quantity_kg: 2496, loss_kg: 9, loss_percentage: 0.4, bags_count: 100, operator_name: 'Hoa', notes: 'R Hoàn (Xay 30/06: 2.496kg)' },
  { id: 'grd-4', date: '2026-06-30', input_quantity_kg: 1655, output_quantity_kg: 1521, loss_kg: 134, loss_percentage: 8.1, bags_count: 61, operator_name: 'Hoa', notes: 'R CHoan (Xay 30/06: 1.521kg)' },
  { id: 'grd-5', date: '2026-07-17', input_quantity_kg: 865, output_quantity_kg: 855, loss_kg: 10, loss_percentage: 1.1, bags_count: 34, operator_name: 'Hoa', notes: 'chưa R Ph.Tuấn (Xay 17/07: 855kg)' },
  { id: 'grd-6', date: '2026-07-28', input_quantity_kg: 16200, output_quantity_kg: 16200, loss_kg: 0, loss_percentage: 0, bags_count: 18, operator_name: 'Hoa', notes: 'Xay phế 18 bao (tăng ca 1 bao, tích lũy 26 bao trong kho)' }
];

export const grindingService = {
  async getAll(): Promise<Grinding[]> {
    try {
      const { data, error } = await supabase
        .from('grinding')
        .select('*')
        .order('date', { ascending: false });

      if (error || !data || data.length === 0) {
        return ALL_NOTEBOOK_GRINDING;
      }
      return data.map(item => ({
        id: item.id,
        date: item.date,
        import_id: item.import_id,
        input_quantity_kg: Number(item.input_qty_kg) || 0,
        output_quantity_kg: Number(item.output_qty_kg) || 0,
        loss_kg: Number(item.loss_kg) || 0,
        loss_percentage: Number(item.loss_pct) || 0,
        bags_count: Number(item.bags_count) || 0,
        operator_name: item.worker || 'Hoa',
        notes: item.notes,
        created_at: item.created_at,
      }));
    } catch {
      return ALL_NOTEBOOK_GRINDING;
    }
  },

  async create(item: Partial<Grinding>): Promise<Grinding> {
    const inputKg = Number(item.input_quantity_kg) || 0;
    const outputKg = Number(item.output_quantity_kg) || 0;

    const { data, error } = await supabase
      .from('grinding')
      .insert({
        date: item.date || new Date().toISOString().split('T')[0],
        import_id: item.import_id || null,
        input_qty_kg: inputKg,
        output_qty_kg: outputKg,
        bags_count: Number(item.bags_count) || 0,
        worker: item.operator_name || 'Hoa',
        notes: item.notes || null,
      })
      .select()
      .single();

    if (error) {
      return {
        id: `grd-${Date.now()}`,
        date: item.date || '2026-07-28',
        input_quantity_kg: inputKg,
        output_quantity_kg: outputKg,
        loss_kg: Math.max(0, inputKg - outputKg),
        loss_percentage: inputKg > 0 ? ((inputKg - outputKg) / inputKg) * 100 : 0,
        bags_count: Number(item.bags_count) || 0,
        operator_name: item.operator_name || 'Hoa',
        notes: item.notes,
      };
    }

    return {
      id: data.id,
      date: data.date,
      import_id: data.import_id,
      input_quantity_kg: Number(data.input_qty_kg) || 0,
      output_quantity_kg: Number(data.output_qty_kg) || 0,
      loss_kg: Number(data.loss_kg) || 0,
      loss_percentage: Number(data.loss_pct) || 0,
      bags_count: Number(data.bags_count) || 0,
      operator_name: data.worker || 'Hoa',
      notes: data.notes,
      created_at: data.created_at,
    };
  },

  async update(id: string, item: Partial<Grinding>): Promise<void> {
    const inputKg = Number(item.input_quantity_kg) || 0;
    const outputKg = Number(item.output_quantity_kg) || 0;

    await supabase
      .from('grinding')
      .update({
        date: item.date,
        import_id: item.import_id || null,
        input_qty_kg: inputKg,
        output_qty_kg: outputKg,
        bags_count: Number(item.bags_count) || 0,
        worker: item.operator_name,
        notes: item.notes || null,
      })
      .eq('id', id);
  },

  async delete(id: string): Promise<void> {
    await supabase
      .from('grinding')
      .delete()
      .eq('id', id);
  }
};
