import { supabase } from '../lib/supabase';
import type { Grinding } from '../types';
import { loadLocalData, saveLocalData } from '../lib/storage';

let LOCAL_GRINDING: Grinding[] = loadLocalData('khophe_grinding', []);

export const grindingService = {
  async getAll(): Promise<Grinding[]> {
    try {
      const { data, error } = await supabase
        .from('grinding')
        .select('*')
        .is('deleted_at', null)
        .order('date', { ascending: false });

      if (!error && data && data.length > 0) {
        const fetched = data.map(item => ({
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
        LOCAL_GRINDING = fetched;
        saveLocalData('khophe_grinding', LOCAL_GRINDING);
        return fetched;
      }
    } catch {}

    LOCAL_GRINDING = loadLocalData('khophe_grinding', LOCAL_GRINDING);
    return LOCAL_GRINDING;
  },

  async create(item: Partial<Grinding>): Promise<Grinding> {
    const inputKg = Number(item.input_qty_kg) || 0;
    const outputKg = Number(item.output_qty_kg) || 0;
    const lossKg = inputKg - outputKg;

    let newItem: Grinding | null = null;
    try {
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

      if (!error && data) {
        newItem = {
          id: data.id,
          date: data.date,
          import_id: data.import_id,
          input_qty_kg: Number(data.input_qty_kg) || 0,
          output_qty_kg: Number(data.output_qty_kg) || 0,
          loss_kg: Number(data.loss_kg) || lossKg,
          loss_pct: Number(data.loss_pct) || 0,
          bags_count: Number(data.bags_count) || 0,
          worker: data.worker || 'Hoa',
          notes: data.notes,
          created_at: data.created_at,
        };
      }
    } catch {}

    if (!newItem) {
      newItem = {
        id: `grd-${Date.now()}`,
        date: item.date || new Date().toISOString().split('T')[0],
        import_id: item.import_id,
        input_qty_kg: inputKg,
        output_qty_kg: outputKg,
        loss_kg: lossKg,
        loss_pct: inputKg ? Number(((lossKg / inputKg) * 100).toFixed(1)) : 0,
        bags_count: Number(item.bags_count) || Math.round(outputKg / 25),
        worker: item.worker || 'Hoa',
        notes: item.notes,
      };
    }

    LOCAL_GRINDING.unshift(newItem);
    saveLocalData('khophe_grinding', LOCAL_GRINDING);
    return newItem;
  },

  async update(id: string, item: Partial<Grinding>): Promise<void> {
    const inputKg = Number(item.input_qty_kg) || 0;
    const outputKg = Number(item.output_qty_kg) || 0;
    const lossKg = inputKg - outputKg;

    const index = LOCAL_GRINDING.findIndex(g => g.id === id);
    if (index !== -1) {
      LOCAL_GRINDING[index] = {
        ...LOCAL_GRINDING[index],
        ...item,
        input_qty_kg: inputKg,
        output_qty_kg: outputKg,
        loss_kg: lossKg,
        loss_pct: inputKg ? Number(((lossKg / inputKg) * 100).toFixed(1)) : 0,
      };
      saveLocalData('khophe_grinding', LOCAL_GRINDING);
    }

    try {
      await supabase
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
    } catch {}
  },

  async delete(id: string): Promise<void> {
    LOCAL_GRINDING = LOCAL_GRINDING.filter(g => g.id !== id);
    saveLocalData('khophe_grinding', LOCAL_GRINDING);
    try {
      await supabase
        .from('grinding')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
    } catch {}
  }
};
