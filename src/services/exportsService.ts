import { supabase } from '../lib/supabase';
import type { Export } from '../types';
import { loadLocalData, saveLocalData } from '../lib/storage';

let LOCAL_EXPORTS: Export[] = loadLocalData('khophe_exports', []);

export const exportsService = {
  async getAll(): Promise<Export[]> {
    try {
      const { data, error } = await supabase
        .from('exports')
        .select('*, contacts(name)')
        .is('deleted_at', null)
        .order('date', { ascending: false });

      if (!error && data && data.length > 0) {
        const fetched = data.map(item => ({
          id: item.id,
          date: item.date,
          contact_id: item.contact_id,
          contact_name: item.contacts?.name || 'Khách lẻ',
          bags_count: Number(item.bags_count) || 0,
          total_kg: Number(item.total_kg) || 0,
          price_per_kg: Number(item.price_per_kg) || 0,
          total_amount: Number(item.total_amount) || (Number(item.total_kg) * Number(item.price_per_kg)),
          payment_status: item.payment_status || 'unpaid',
          weighing_session_id: item.weighing_session_id,
          notes: item.notes,
          created_at: item.created_at,
        }));
        LOCAL_EXPORTS = fetched;
        saveLocalData('khophe_exports', LOCAL_EXPORTS);
        return fetched;
      }
    } catch {}

    LOCAL_EXPORTS = loadLocalData('khophe_exports', LOCAL_EXPORTS);
    return LOCAL_EXPORTS;
  },

  async create(item: Partial<Export>): Promise<Export> {
    const qty = Number(item.total_kg) || 0;
    const price = Number(item.price_per_kg) || 0;
    const total = qty * price;

    let newItem: Export | null = null;
    try {
      const { data, error } = await supabase
        .from('exports')
        .insert({
          date: item.date || new Date().toISOString().split('T')[0],
          contact_id: item.contact_id || null,
          bags_count: Number(item.bags_count) || 0,
          total_kg: qty,
          price_per_kg: price,
          payment_status: item.payment_status || 'unpaid',
          weighing_session_id: item.weighing_session_id || null,
          notes: item.notes || null,
        })
        .select('*, contacts(name)')
        .single();

      if (!error && data) {
        newItem = {
          id: data.id,
          date: data.date,
          contact_id: data.contact_id,
          contact_name: data.contacts?.name || item.contact_name || 'Khách lẻ',
          bags_count: Number(data.bags_count) || 0,
          total_kg: Number(data.total_kg) || 0,
          price_per_kg: Number(data.price_per_kg) || 0,
          total_amount: total,
          payment_status: data.payment_status,
          weighing_session_id: data.weighing_session_id,
          notes: data.notes,
          created_at: data.created_at,
        };
      }
    } catch {}

    if (!newItem) {
      newItem = {
        id: `exp-${Date.now()}`,
        date: item.date || new Date().toISOString().split('T')[0],
        contact_id: item.contact_id,
        contact_name: item.contact_name || 'Khách lẻ',
        bags_count: Number(item.bags_count) || 0,
        total_kg: qty,
        price_per_kg: price,
        total_amount: total,
        payment_status: item.payment_status || 'unpaid',
        notes: item.notes,
      };
    }

    LOCAL_EXPORTS.unshift(newItem);
    saveLocalData('khophe_exports', LOCAL_EXPORTS);
    return newItem;
  },

  async update(id: string, item: Partial<Export>): Promise<void> {
    const qty = Number(item.total_kg) || 0;
    const price = Number(item.price_per_kg) || 0;
    const total = qty * price;

    const index = LOCAL_EXPORTS.findIndex(e => e.id === id);
    if (index !== -1) {
      LOCAL_EXPORTS[index] = {
        ...LOCAL_EXPORTS[index],
        ...item,
        total_kg: qty,
        price_per_kg: price,
        total_amount: total,
      };
      saveLocalData('khophe_exports', LOCAL_EXPORTS);
    }

    try {
      await supabase
        .from('exports')
        .update({
          date: item.date,
          contact_id: item.contact_id || null,
          bags_count: Number(item.bags_count) || 0,
          total_kg: qty,
          price_per_kg: price,
          payment_status: item.payment_status,
          notes: item.notes || null,
        })
        .eq('id', id);
    } catch {}
  },

  async delete(id: string): Promise<void> {
    LOCAL_EXPORTS = LOCAL_EXPORTS.filter(e => e.id !== id);
    saveLocalData('khophe_exports', LOCAL_EXPORTS);
    try {
      await supabase
        .from('exports')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
    } catch {}
  }
};
