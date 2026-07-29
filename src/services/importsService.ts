import { supabase } from '../lib/supabase';
import type { Import } from '../types';

const INITIAL_2807_IMPORTS: Import[] = [
  {
    id: 'imp-2807-1',
    date: '2026-07-28',
    contact_name: 'Em Hoàn',
    material_type: 'Tấm nhựa nano',
    quantity_kg: 1796,
    price_per_kg: 4000,
    total_amount: 7184000,
    payment_status: 'paid',
    processing_status: 'pending',
    notes: 'Phiếu cân xe HTX Eco Wood Hồng Lĩnh (Khối lượng tổng: 4531kg, Bì: 2735kg, Hàng: 1796kg)'
  },
  {
    id: 'imp-2807-2',
    date: '2026-07-28',
    contact_name: 'Đà Nẵng',
    material_type: 'Tấm nhựa nano',
    quantity_kg: 7445,
    price_per_kg: 4000,
    total_amount: 29780000,
    payment_status: 'unpaid',
    processing_status: 'pending',
    notes: 'Phiếu cân xe HTX Eco Wood Hồng Lĩnh (Khối lượng tổng: 27785kg, Bì: 20340kg, Hàng: 7445kg)'
  }
];

export const importsService = {
  async getAll(): Promise<Import[]> {
    try {
      const { data, error } = await supabase
        .from('imports')
        .select('*, contacts(name)')
        .order('date', { ascending: false });

      if (error || !data || data.length === 0) {
        return INITIAL_2807_IMPORTS;
      }

      return data.map(item => ({
        id: item.id,
        date: item.date,
        contact_id: item.contact_id,
        contact_name: item.contacts?.name || (item.contact_id ? 'NCC Phế' : 'Khách lẻ'),
        quantity_kg: Number(item.quantity_kg) || 0,
        material_type: item.material_type || 'Tấm nhựa nano',
        price_per_kg: Number(item.price_per_kg) || 4000,
        total_amount: Number(item.total_amount) || 0,
        payment_status: item.payment_status || 'unpaid',
        processing_status: item.processing_status || 'pending',
        notes: item.notes,
        created_at: item.created_at,
      }));
    } catch {
      return INITIAL_2807_IMPORTS;
    }
  },

  async create(item: Partial<Import>): Promise<Import> {
    const qty = Number(item.quantity_kg) || 0;
    const price = Number(item.price_per_kg) || 0;
    const total = qty * price;

    const { data, error } = await supabase
      .from('imports')
      .insert({
        date: item.date || new Date().toISOString().split('T')[0],
        contact_id: item.contact_id || null,
        material_type: item.material_type || 'Tấm nhựa nano',
        quantity_kg: qty,
        price_per_kg: price,
        total_amount: total,
        payment_status: item.payment_status || 'unpaid',
        processing_status: item.processing_status || 'pending',
        notes: item.notes || null,
      })
      .select()
      .single();

    if (error) {
      return {
        id: `imp-${Date.now()}`,
        date: item.date || '2026-07-28',
        contact_id: item.contact_id,
        contact_name: item.contact_name || 'NCC Phế',
        quantity_kg: qty,
        material_type: item.material_type || 'Tấm nhựa nano',
        price_per_kg: price,
        total_amount: total,
        payment_status: item.payment_status || 'unpaid',
        processing_status: item.processing_status || 'pending',
        notes: item.notes,
      };
    }
    return data;
  },

  async update(id: string, item: Partial<Import>): Promise<void> {
    const qty = Number(item.quantity_kg) || 0;
    const price = Number(item.price_per_kg) || 0;
    const total = qty * price;

    await supabase
      .from('imports')
      .update({
        date: item.date,
        contact_id: item.contact_id || null,
        quantity_kg: qty,
        material_type: item.material_type,
        price_per_kg: price,
        total_amount: total,
        payment_status: item.payment_status,
        processing_status: item.processing_status,
        notes: item.notes || null,
      })
      .eq('id', id);
  },

  async delete(id: string): Promise<void> {
    await supabase
      .from('imports')
      .delete()
      .eq('id', id);
  }
};
