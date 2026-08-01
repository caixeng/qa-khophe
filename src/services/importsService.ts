import { supabase } from '../lib/supabase';
import type { Import } from '../types';

export const importsService = {
  async getAll(): Promise<Import[]> {
    const { data, error } = await supabase
      .from('imports')
      .select('*, contacts(name)')
      .is('deleted_at', null)
      .order('date', { ascending: false });

    if (error) throw new Error(error.message);

    return (data || []).map(item => ({
      id: item.id,
      date: item.date,
      contact_id: item.contact_id,
      contact_name: item.contacts?.name || 'Khách lẻ',
      quantity_kg: Number(item.quantity_kg) || 0,
      material_type: item.material_type || 'Tấm nhựa nano',
      price_per_kg: Number(item.price_per_kg) || 0,
      total_amount: Number(item.total_amount) || 0,
      payment_status: item.payment_status || 'unpaid',
      processing_status: item.processing_status || 'pending',
      notes: item.notes,
      created_at: item.created_at,
    }));
  },

  async create(item: Partial<Import>): Promise<Import> {
    const qty = Number(item.quantity_kg) || 0;
    const price = Number(item.price_per_kg) || 4000;

    const { data, error } = await supabase
      .from('imports')
      .insert({
        date: item.date || new Date().toISOString().split('T')[0],
        contact_id: item.contact_id || null,
        material_type: item.material_type || 'Tấm nhựa nano',
        quantity_kg: qty,
        price_per_kg: price,
        payment_status: item.payment_status || 'unpaid',
        processing_status: item.processing_status || 'pending',
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
      quantity_kg: Number(data.quantity_kg) || 0,
      material_type: data.material_type,
      price_per_kg: Number(data.price_per_kg) || 0,
      total_amount: Number(data.total_amount) || 0,
      payment_status: data.payment_status,
      processing_status: data.processing_status,
      notes: data.notes,
      created_at: data.created_at,
    };
  },

  async update(id: string, item: Partial<Import>): Promise<void> {
    const qty = Number(item.quantity_kg) || 0;
    const price = Number(item.price_per_kg) || 0;

    const { error } = await supabase
      .from('imports')
      .update({
        date: item.date,
        contact_id: item.contact_id || null,
        quantity_kg: qty,
        material_type: item.material_type,
        price_per_kg: price,
        payment_status: item.payment_status,
        processing_status: item.processing_status,
        notes: item.notes || null,
      })
      .eq('id', id);

    if (error) throw new Error(error.message);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('imports')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw new Error(error.message);
  }
};
