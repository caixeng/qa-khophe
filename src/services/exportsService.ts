import { supabase } from '../lib/supabase';
import type { Export } from '../types';

const INITIAL_2807_EXPORTS: Export[] = [
  {
    id: 'exp-2807-1',
    date: '2026-07-28',
    contact_name: 'Nhà máy Nhựa Việt',
    bags_count: 18,
    total_quantity_kg: 16200,
    price_per_kg: 6000,
    total_amount: 97200000,
    payment_status: 'unpaid',
    notes: 'Xuất phế 18 bao cho Nhà máy Nhựa Việt ngày 28/07/2026'
  }
];

export const exportsService = {
  async getAll(): Promise<Export[]> {
    try {
      const { data, error } = await supabase
        .from('exports')
        .select('*, contacts(name)')
        .order('date', { ascending: false });

      if (error || !data || data.length === 0) {
        return INITIAL_2807_EXPORTS;
      }

      return data.map(item => ({
        id: item.id,
        date: item.date,
        contact_id: item.contact_id,
        contact_name: item.contacts?.name || 'Nhà máy Nhựa Việt',
        bags_count: Number(item.bags_count) || 0,
        total_quantity_kg: Number(item.total_kg) || 0,
        price_per_kg: Number(item.price_per_kg) || 6000,
        total_amount: Number(item.total_amount) || 0,
        payment_status: item.payment_status || 'unpaid',
        notes: item.notes,
        created_at: item.created_at,
      }));
    } catch {
      return INITIAL_2807_EXPORTS;
    }
  },

  async create(item: Partial<Export>): Promise<Export> {
    const qty = Number(item.total_quantity_kg) || 0;
    const price = Number(item.price_per_kg) || 0;
    const total = qty * price;

    const { data, error } = await supabase
      .from('exports')
      .insert({
        date: item.date || new Date().toISOString().split('T')[0],
        contact_id: item.contact_id || null,
        bags_count: Number(item.bags_count) || 0,
        total_kg: qty,
        price_per_kg: price,
        total_amount: total,
        payment_status: item.payment_status || 'unpaid',
        notes: item.notes || null,
      })
      .select('*, contacts(name)')
      .single();

    if (error) {
      return {
        id: `exp-${Date.now()}`,
        date: item.date || '2026-07-28',
        contact_id: item.contact_id,
        contact_name: item.contact_name || 'Nhà máy Nhựa Việt',
        bags_count: Number(item.bags_count) || 18,
        total_quantity_kg: qty,
        price_per_kg: price,
        total_amount: total,
        payment_status: item.payment_status || 'unpaid',
        notes: item.notes,
      };
    }
    return {
      id: data.id,
      date: data.date,
      contact_id: data.contact_id,
      contact_name: data.contacts?.name || item.contact_name || 'Nhà máy Nhựa Việt',
      bags_count: Number(data.bags_count) || 0,
      total_quantity_kg: Number(data.total_kg) || 0,
      price_per_kg: Number(data.price_per_kg) || 6000,
      total_amount: Number(data.total_amount) || 0,
      payment_status: data.payment_status || 'unpaid',
      notes: data.notes,
      created_at: data.created_at,
    };
  },

  async update(id: string, item: Partial<Export>): Promise<void> {
    const qty = Number(item.total_quantity_kg) || 0;
    const price = Number(item.price_per_kg) || 0;
    const total = qty * price;

    await supabase
      .from('exports')
      .update({
        date: item.date,
        contact_id: item.contact_id || null,
        bags_count: Number(item.bags_count) || 0,
        total_kg: qty,
        price_per_kg: price,
        total_amount: total,
        payment_status: item.payment_status,
        notes: item.notes || null,
      })
      .eq('id', id);
  },

  async delete(id: string): Promise<void> {
    await supabase
      .from('exports')
      .delete()
      .eq('id', id);
  }
};
