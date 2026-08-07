import { supabase } from '../lib/supabase';
import type { Import } from '../types';
import { loadLocalData, saveLocalData } from '../lib/storage';

const INITIAL_NOTEBOOK_IMPORTS: Import[] = [
  { id: 'imp-1', date: '2026-06-28', contact_name: 'Em Hoàn', material_type: 'Tấm nhựa nano', quantity_kg: 1395, price_per_kg: 4000, total_amount: 5580000, payment_status: 'paid', processing_status: 'done', notes: 'R Hoàn (Xay 29/06: 1.412kg, +17kg)' },
  { id: 'imp-2', date: '2026-06-29', contact_name: 'Nga', material_type: 'Tấm nhựa nano', quantity_kg: 2280, price_per_kg: 4000, total_amount: 9120000, payment_status: 'paid', processing_status: 'done', notes: 'R Nga (Xay 29-30/06: 2.248kg, -32kg)' },
  { id: 'imp-3', date: '2026-06-29', contact_name: 'Em Hoàn', material_type: 'Tấm nhựa nano', quantity_kg: 2505, price_per_kg: 4000, total_amount: 10020000, payment_status: 'paid', processing_status: 'done', notes: 'R Hoàn (Xay 30/06: 2.496kg, -9kg)' },
  { id: 'imp-4', date: '2026-06-29', contact_name: 'Chị Hoan', material_type: 'Tấm nhựa nano', quantity_kg: 1655, price_per_kg: 4000, total_amount: 6620000, payment_status: 'paid', processing_status: 'done', notes: 'R CHoan (Xay 30/06: 1.521kg, -134kg)' },
  { id: 'imp-5', date: '2026-07-02', contact_name: 'Em Hoàn', material_type: 'Tấm nhựa nano', quantity_kg: 2280, price_per_kg: 4000, total_amount: 9120000, payment_status: 'paid', processing_status: 'pending', notes: 'chưa R Hoàn (tồn phế H)' },
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
  { id: 'imp-16', date: '2026-07-21', contact_name: 'Em Hoàn', material_type: 'Tấm nhựa nano', quantity_kg: 1350, price_per_kg: 4000, total_amount: 5400000, payment_status: 'paid', processing_status: 'pending', notes: 'chưa R E Hoàn' },
  { id: 'imp-17', date: '2026-07-22', contact_name: 'Em Hoàn', material_type: 'Tấm nhựa nano', quantity_kg: 790, price_per_kg: 4000, total_amount: 3160000, payment_status: 'paid', processing_status: 'pending', notes: 'chưa R Em Hoàn' },
  { id: 'imp-18', date: '2026-07-24', contact_name: 'A Danh', material_type: 'Tấm nhựa nano', quantity_kg: 2455, price_per_kg: 4000, total_amount: 9820000, payment_status: 'paid', processing_status: 'pending', notes: 'chưa R A Danh' },
  { id: 'imp-19', date: '2026-07-26', contact_name: 'Nga', material_type: 'Tấm nhựa nano', quantity_kg: 3695, price_per_kg: 4000, total_amount: 14780000, payment_status: 'paid', processing_status: 'pending', notes: 'chưa R Nga' },

  // Dòng 21 - 27
  { id: 'imp-20', date: '2026-07-27', contact_name: 'A Danh', material_type: 'Tấm nhựa nano', quantity_kg: 2085, price_per_kg: 4500, total_amount: 9382500, payment_status: 'paid', processing_status: 'pending', notes: 'chưa R A Danh (TT 31/07: 9.382.500đ)' },
  { id: 'imp-21', date: '2026-07-27', contact_name: 'Em Hoàn', material_type: 'Tấm nhựa nano', quantity_kg: 2060, price_per_kg: 4500, total_amount: 9270000, payment_status: 'paid', processing_status: 'pending', notes: 'chưa R Hoàn (Xe1: 2060, Xe2: 1796, Xe3: 1240 - TT 31/07)' },
  { id: 'imp-22', date: '2026-07-28', contact_name: 'Em Hoàn', material_type: 'Tấm nhựa nano', quantity_kg: 1796, price_per_kg: 4500, total_amount: 8082000, payment_status: 'paid', processing_status: 'pending', notes: 'chưa R Hoàn (Xe Eco Wood 4531kg/2735kg)' },
  { id: 'imp-23', date: '2026-07-28', contact_name: 'Đà Nẵng', material_type: 'Tấm nhựa nano', quantity_kg: 7445, price_per_kg: 4000, total_amount: 29780000, payment_status: 'unpaid', processing_status: 'pending', notes: 'chưa Đà Nẵng (Xe Eco Wood 27785kg/20340kg)' },
  { id: 'imp-24', date: '2026-07-29', contact_name: 'Em Hoàn', material_type: 'Tấm nhựa nano', quantity_kg: 1240, price_per_kg: 4500, total_amount: 5580000, payment_status: 'paid', processing_status: 'pending', notes: 'chưa R Hoan (TT 31/07)' },
  { id: 'imp-25', date: '2026-07-31', contact_name: 'Chị Hoan', material_type: 'Tấm nhựa nano', quantity_kg: 2530, price_per_kg: 4500, total_amount: 11385000, payment_status: 'paid', processing_status: 'pending', notes: 'chưa R Chị Hoan (Eco Wood 4915kg/2385kg - TT 11.385.000đ)' },
  { id: 'imp-26', date: '2026-08-03', contact_name: 'Em Cường', material_type: 'Tấm nhựa nano', quantity_kg: 3150, price_per_kg: 4000, total_amount: 12600000, payment_status: 'unpaid', processing_status: 'pending', notes: 'chưa R Em Cường (22/08)' },

  // Dòng 28 - 31
  { id: 'imp-27', date: '2026-08-03', contact_name: 'A Danh', material_type: 'Tấm nhựa nano', quantity_kg: 2500, price_per_kg: 4000, total_amount: 10000000, payment_status: 'unpaid', processing_status: 'pending', notes: 'chưa A Danh' },
  { id: 'imp-28', date: '2026-08-04', contact_name: 'Chị Hoan', material_type: 'Tấm nhựa nano', quantity_kg: 3460, price_per_kg: 4000, total_amount: 13840000, payment_status: 'unpaid', processing_status: 'pending', notes: 'chưa CHoan' },
  { id: 'imp-29', date: '2026-08-05', contact_name: 'Hiền', material_type: 'Tấm nhựa nano', quantity_kg: 3035, price_per_kg: 4000, total_amount: 12140000, payment_status: 'unpaid', processing_status: 'pending', notes: 'chưa Hiền' },
  { id: 'imp-30', date: '2026-08-05', contact_name: 'Chị Hoan', material_type: 'Tấm nhựa nano', quantity_kg: 1280, price_per_kg: 4000, total_amount: 5120000, payment_status: 'unpaid', processing_status: 'pending', notes: 'chưa Hoan' }
];

export let ALL_NOTEBOOK_IMPORTS: Import[] = loadLocalData('khophe_imports', INITIAL_NOTEBOOK_IMPORTS);

export const importsService = {
  async getAll(): Promise<Import[]> {
    try {
      const { data, error } = await supabase
        .from('imports')
        .select('*, contacts(name)')
        .order('date', { ascending: false });

      if (error || !data || data.length === 0) {
        ALL_NOTEBOOK_IMPORTS = loadLocalData('khophe_imports', INITIAL_NOTEBOOK_IMPORTS);
        return ALL_NOTEBOOK_IMPORTS;
      }

      const mapped = data.map(item => ({
        id: item.id,
        date: item.date,
        contact_id: item.contact_id,
        contact_name: item.contacts?.name || item.notes?.replace('chưa R ', '').replace('chưa ', '').replace('R ', '') || 'Khách lẻ',
        quantity_kg: Number(item.quantity_kg) || 0,
        material_type: item.material_type || 'Tấm nhựa nano',
        price_per_kg: Number(item.price_per_kg) || 4000,
        total_amount: Number(item.total_amount) || (Number(item.quantity_kg) * Number(item.price_per_kg)),
        payment_status: item.payment_status || 'unpaid',
        processing_status: item.processing_status || 'pending',
        notes: item.notes,
        created_at: item.created_at,
      }));

      ALL_NOTEBOOK_IMPORTS = mapped;
      saveLocalData('khophe_imports', ALL_NOTEBOOK_IMPORTS);
      return mapped;
    } catch {
      ALL_NOTEBOOK_IMPORTS = loadLocalData('khophe_imports', INITIAL_NOTEBOOK_IMPORTS);
      return ALL_NOTEBOOK_IMPORTS;
    }
  },

  async create(item: Partial<Import>): Promise<Import> {
    const qty = Number(item.quantity_kg) || 0;
    const price = Number(item.price_per_kg) || 4000;
    const total = qty * price;

    let createdItem: Import | null = null;
    try {
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

      if (!error && data) {
        createdItem = {
          id: data.id,
          date: data.date,
          contact_id: data.contact_id,
          contact_name: data.contacts?.name || item.contact_name || 'NCC Phế',
          quantity_kg: qty,
          material_type: data.material_type,
          price_per_kg: price,
          total_amount: total,
          payment_status: data.payment_status,
          processing_status: data.processing_status,
          notes: data.notes
        };
      }
    } catch {}

    if (!createdItem) {
      createdItem = {
        id: `imp-${Date.now()}`,
        date: item.date || new Date().toISOString().split('T')[0],
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

    ALL_NOTEBOOK_IMPORTS.unshift(createdItem);
    saveLocalData('khophe_imports', ALL_NOTEBOOK_IMPORTS);
    return createdItem;
  },

  async update(id: string, item: Partial<Import>): Promise<void> {
    const qty = Number(item.quantity_kg) || 0;
    const price = Number(item.price_per_kg) || 4000;
    const total = qty * price;

    // Update local memory list
    const index = ALL_NOTEBOOK_IMPORTS.findIndex(i => i.id === id);
    if (index !== -1) {
      ALL_NOTEBOOK_IMPORTS[index] = {
        ...ALL_NOTEBOOK_IMPORTS[index],
        ...item,
        quantity_kg: qty,
        price_per_kg: price,
        total_amount: total,
      };
      saveLocalData('khophe_imports', ALL_NOTEBOOK_IMPORTS);
    }

    try {
      await supabase
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
    } catch {}
  },

  async delete(id: string): Promise<void> {
    ALL_NOTEBOOK_IMPORTS = ALL_NOTEBOOK_IMPORTS.filter(i => i.id !== id);
    saveLocalData('khophe_imports', ALL_NOTEBOOK_IMPORTS);
    try {
      await supabase
        .from('imports')
        .delete()
        .eq('id', id);
    } catch {}
  }
};
