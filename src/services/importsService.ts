import { supabase } from '../lib/supabase';
import type { Import } from '../types';

export const ALL_NOTEBOOK_IMPORTS: Import[] = [
  { id: 'imp-1', date: '2026-06-28', contact_name: 'Em Hoàn', material_type: 'Tấm nhựa nano', quantity_kg: 1395, price_per_kg: 4000, total_amount: 5580000, payment_status: 'paid', processing_status: 'done', notes: 'R Hoàn (Xay 29/06: 1.412kg)' },
  { id: 'imp-2', date: '2026-06-29', contact_name: 'Nga', material_type: 'Tấm nhựa nano', quantity_kg: 2280, price_per_kg: 4000, total_amount: 9120000, payment_status: 'paid', processing_status: 'done', notes: 'R Nga (Xay 29-30/06: 2.248kg)' },
  { id: 'imp-3', date: '2026-06-29', contact_name: 'Em Hoàn', material_type: 'Tấm nhựa nano', quantity_kg: 2505, price_per_kg: 4000, total_amount: 10020000, payment_status: 'paid', processing_status: 'done', notes: 'R Hoàn (Xay 30/06: 2.496kg)' },
  { id: 'imp-4', date: '2026-06-29', contact_name: 'Chị Hoan', material_type: 'Tấm nhựa nano', quantity_kg: 1655, price_per_kg: 4000, total_amount: 6620000, payment_status: 'paid', processing_status: 'done', notes: 'R CHoan (Xay 30/06: 1.521kg)' },
  { id: 'imp-5', date: '2026-07-02', contact_name: 'Em Hoàn', material_type: 'Tấm nhựa nano', quantity_kg: 2280, price_per_kg: 4000, total_amount: 9120000, payment_status: 'paid', processing_status: 'pending', notes: 'chưa R Hoàn' },
  { id: 'imp-6', date: '2026-07-04', contact_name: 'A Danh', material_type: 'Tấm nhựa nano', quantity_kg: 1870, price_per_kg: 4000, total_amount: 7480000, payment_status: 'paid', processing_status: 'pending', notes: 'chưa R A Danh' },
  { id: 'imp-7', date: '2026-07-06', contact_name: 'Em Hoàn', material_type: 'Tấm nhựa nano', quantity_kg: 1920, price_per_kg: 4000, total_amount: 7680000, payment_status: 'paid', processing_status: 'pending', notes: 'chưa R Hoàn' },
  { id: 'imp-8', date: '2026-07-10', contact_name: 'Em Hoàn', material_type: 'Tấm nhựa nano', quantity_kg: 1820, price_per_kg: 4000, total_amount: 7280000, payment_status: 'paid', processing_status: 'pending', notes: 'chưa R Hoàn' },
  { id: 'imp-9', date: '2026-07-12', contact_name: 'Em Hoàn', material_type: 'Tấm nhựa nano', quantity_kg: 1045, price_per_kg: 4000, total_amount: 4180000, payment_status: 'paid', processing_status: 'pending', notes: 'chưa R Hoàn' },
  { id: 'imp-10', date: '2026-07-12', contact_name: 'A Ngâu', material_type: 'Tấm nhựa nano', quantity_kg: 1170, price_per_kg: 4000, total_amount: 4680000, payment_status: 'paid', processing_status: 'pending', notes: 'chưa R A Ngâu (Ứng 5.000.000đ)' },
  { id: 'imp-11', date: '2026-07-17', contact_name: 'Đỗ Chung', material_type: 'Tấm nhựa nano', quantity_kg: 4840, price_per_kg: 4000, total_amount: 19360000, payment_status: 'paid', processing_status: 'pending', notes: 'chưa R Đỗ Chung' },
  { id: 'imp-12', date: '2026-07-17', contact_name: 'Ph. Tuấn', material_type: 'Tấm nhựa nano', quantity_kg: 865, price_per_kg: 4000, total_amount: 3460000, payment_status: 'paid', processing_status: 'done', notes: 'chưa R Ph.Tuấn (Xay 17/07: 855kg)' },
  { id: 'imp-13', date: '2026-07-18', contact_name: 'Em Hoàn', material_type: 'Tấm nhựa nano', quantity_kg: 1740, price_per_kg: 4000, total_amount: 6960000, payment_status: 'paid', processing_status: 'pending', notes: 'chưa R Hoàn' },
  { id: 'imp-14', date: '2026-07-20', contact_name: 'Chị Hoan', material_type: 'Tấm nhựa nano', quantity_kg: 4195, price_per_kg: 4000, total_amount: 16780000, payment_status: 'paid', processing_status: 'pending', notes: 'chưa R Chị Hoan' },
  { id: 'imp-15', date: '2026-07-20', contact_name: 'A Sâm', material_type: 'Tấm nhựa nano', quantity_kg: 1240, price_per_kg: 4000, total_amount: 4960000, payment_status: 'paid', processing_status: 'pending', notes: 'chưa R A Sâm' },
  { id: 'imp-16', date: '2026-07-21', contact_name: 'Em Hoàn', material_type: 'Tấm nhựa nano', quantity_kg: 1350, price_per_kg: 4000, total_amount: 5400000, payment_status: 'unpaid', processing_status: 'pending', notes: 'chưa R E Hoàn' },
  { id: 'imp-17', date: '2026-07-22', contact_name: 'Em Hoàn', material_type: 'Tấm nhựa nano', quantity_kg: 790, price_per_kg: 4000, total_amount: 3160000, payment_status: 'unpaid', processing_status: 'pending', notes: 'chưa R Em Hoàn' },
  { id: 'imp-18', date: '2026-07-24', contact_name: 'A Danh', material_type: 'Tấm nhựa nano', quantity_kg: 2455, price_per_kg: 4000, total_amount: 9820000, payment_status: 'unpaid', processing_status: 'pending', notes: 'chưa R A Danh' },
  { id: 'imp-19', date: '2026-07-26', contact_name: 'Nga', material_type: 'Tấm nhựa nano', quantity_kg: 3695, price_per_kg: 4000, total_amount: 14780000, payment_status: 'unpaid', processing_status: 'pending', notes: 'chưa R Nga' },
  { id: 'imp-20', date: '2026-07-27', contact_name: 'A Danh', material_type: 'Tấm nhựa nano', quantity_kg: 2085, price_per_kg: 4000, total_amount: 8340000, payment_status: 'unpaid', processing_status: 'pending', notes: 'chưa A Danh' },
  { id: 'imp-21', date: '2026-07-27', contact_name: 'Em Hoàn', material_type: 'Tấm nhựa nano', quantity_kg: 2060, price_per_kg: 4000, total_amount: 8240000, payment_status: 'unpaid', processing_status: 'pending', notes: 'chưa Hoàn' },
  { id: 'imp-22', date: '2026-07-28', contact_name: 'Em Hoàn', material_type: 'Tấm nhựa nano', quantity_kg: 1796, price_per_kg: 4000, total_amount: 7184000, payment_status: 'paid', processing_status: 'pending', notes: 'chưa Hoàn (Xe Eco Wood)' },
  { id: 'imp-23', date: '2026-07-28', contact_name: 'Đà Nẵng', material_type: 'Tấm nhựa nano', quantity_kg: 7445, price_per_kg: 4000, total_amount: 29780000, payment_status: 'unpaid', processing_status: 'pending', notes: 'chưa Đà Nẵng (Xe Eco Wood)' },
  { id: 'imp-24', date: '2026-07-28', contact_name: 'Em Hoàn', material_type: 'Tấm nhựa nano', quantity_kg: 1220, price_per_kg: 4000, total_amount: 4880000, payment_status: 'unpaid', processing_status: 'pending', notes: 'Nhập phế ngày 28/07' },
  { id: 'imp-25', date: '2026-07-29', contact_name: 'Chị Hoan', material_type: 'Tấm nhựa nano', quantity_kg: 1240, price_per_kg: 4000, total_amount: 4960000, payment_status: 'unpaid', processing_status: 'pending', notes: 'chưa Hoan' }
];

export const importsService = {
  async getAll(): Promise<Import[]> {
    try {
      const { data, error } = await supabase
        .from('imports')
        .select('*, contacts(name)')
        .order('date', { ascending: false });

      if (error || !data || data.length === 0) {
        return ALL_NOTEBOOK_IMPORTS;
      }

      return data.map(item => ({
        id: item.id,
        date: item.date,
        contact_id: item.contact_id,
        contact_name: item.contacts?.name || item.notes?.replace('chưa R ', '').replace('chưa ', '').replace('R ', '') || 'Khách lẻ',
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
      return ALL_NOTEBOOK_IMPORTS;
    }
  },

  async create(item: Partial<Import>): Promise<Import> {
    const qty = Number(item.quantity_kg) || 0;
    const price = Number(item.price_per_kg) || 4000;
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
    const price = Number(item.price_per_kg) || 4000;
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
