import { supabase } from '../lib/supabase';
import type { Export } from '../types';

export const exportsService = {
  async getAll(): Promise<Export[]> {
    const { data, error } = await supabase
      .from('exports')
      .select('*, contacts(name)')
      .is('deleted_at', null)
      .order('date', { ascending: false });

    if (error) throw new Error(error.message);

    return (data || []).map(item => ({
      id: item.id,
      date: item.date,
      contact_id: item.contact_id,
      contact_name: item.contacts?.name || 'Khách lẻ',
      bags_count: Number(item.bags_count) || 0,
      total_kg: Number(item.total_kg) || 0,
      price_per_kg: Number(item.price_per_kg) || 0,
      total_amount: Number(item.total_amount) || 0,
      payment_status: item.payment_status || 'unpaid',
      weighing_session_id: item.weighing_session_id,
      notes: item.notes,
      created_at: item.created_at,
    }));
  },

  async create(item: Partial<Export>): Promise<Export> {
    const qty = Number(item.total_kg) || 0;
    const price = Number(item.price_per_kg) || 0;

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

    if (error) throw new Error(error.message);

    return {
      id: data.id,
      date: data.date,
      contact_id: data.contact_id,
      contact_name: data.contacts?.name || item.contact_name || 'Khách lẻ',
      bags_count: Number(data.bags_count) || 0,
      total_kg: Number(data.total_kg) || 0,
      price_per_kg: Number(data.price_per_kg) || 0,
      total_amount: Number(data.total_amount) || 0,
      payment_status: data.payment_status,
      weighing_session_id: data.weighing_session_id,
      notes: data.notes,
      created_at: data.created_at,
    };
  },

  async update(id: string, item: Partial<Export>): Promise<void> {
    const qty = Number(item.total_kg) || 0;
    const price = Number(item.price_per_kg) || 0;

    const { error } = await supabase
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

    if (error) throw new Error(error.message);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('exports')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw new Error(error.message);
  }
};
