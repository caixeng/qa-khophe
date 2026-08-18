import { supabase } from '../lib/supabase';
import { runQuery, ServiceError, MAX_ROWS, type DateRangeFilter } from '../lib/serviceError';
import type { Export } from '../types';
import { today } from '../lib/date';

type ExportRow = {
  id: string;
  date: string;
  contact_id: string | null;
  contacts: { name: string } | null;
  bags_count: number | string | null;
  total_kg: number | string | null;
  export_type: Export['export_type'] | null;
  price_per_kg: number | string | null;
  total_amount: number | string | null;
  payment_status: Export['payment_status'] | null;
  weighing_session_id: string | null;
  notes: string | null;
  created_at: string | null;
};

const SELECT_COLUMNS =
  'id, date, contact_id, bags_count, total_kg, export_type, price_per_kg, total_amount, payment_status, weighing_session_id, notes, created_at, contacts(name)';

function mapRow(item: ExportRow): Export {
  const kg = Number(item.total_kg) || 0;
  const price = Number(item.price_per_kg) || 0;
  return {
    id: item.id,
    date: item.date,
    contact_id: item.contact_id ?? undefined,
    contact_name: item.contacts?.name || 'Khách lẻ',
    bags_count: Number(item.bags_count) || 0,
    total_kg: kg,
    export_type: item.export_type || 'thanh_pham',
    price_per_kg: price,
    total_amount: Number(item.total_amount) || kg * price,
    payment_status: item.payment_status || 'unpaid',
    weighing_session_id: item.weighing_session_id ?? undefined,
    notes: item.notes ?? undefined,
    created_at: item.created_at ?? undefined,
  };
}

export const exportsService = {
  async getAll(filter: DateRangeFilter = {}): Promise<Export[]> {
    const rows = await runQuery<ExportRow[]>('tải danh sách phiếu xuất', () => {
      let q = supabase.from('exports').select(SELECT_COLUMNS).is('deleted_at', null);
      if (filter.from) q = q.gte('date', filter.from);
      if (filter.to) q = q.lte('date', filter.to);
      return q
        .order('date', { ascending: false })
        .limit(filter.limit ?? MAX_ROWS)
        .returns<ExportRow[]>();
    });
    return rows.map(mapRow);
  },

  async create(item: Partial<Export>): Promise<Export> {
    const kg = Number(item.total_kg) || 0;
    const price = Number(item.price_per_kg) || 0;

    if (kg <= 0) {
      throw new ServiceError('Khối lượng xuất phải lớn hơn 0 kg.');
    }

    const row = await runQuery<ExportRow>('thêm phiếu xuất', () =>
      supabase
        .from('exports')
        .insert({
          date: item.date || today(),
          contact_id: item.contact_id || null,
          bags_count: Number(item.bags_count) || 0,
          total_kg: kg,
          export_type: item.export_type || 'thanh_pham',
          price_per_kg: price,
          payment_status: item.payment_status || 'unpaid',
          weighing_session_id: item.weighing_session_id || null,
          notes: item.notes || null,
        })
        .select(SELECT_COLUMNS)
        .single<ExportRow>(),
    );

    return mapRow(row);
  },

  async update(id: string, item: Partial<Export>): Promise<Export> {
    const kg = Number(item.total_kg) || 0;
    const price = Number(item.price_per_kg) || 0;

    if (kg <= 0) {
      throw new ServiceError('Khối lượng xuất phải lớn hơn 0 kg.');
    }

    const row = await runQuery<ExportRow>('cập nhật phiếu xuất', () =>
      supabase
        .from('exports')
        .update({
          date: item.date,
          contact_id: item.contact_id || null,
          bags_count: Number(item.bags_count) || 0,
          total_kg: kg,
          export_type: item.export_type || 'thanh_pham',
          price_per_kg: price,
          payment_status: item.payment_status,
          notes: item.notes || null,
        })
        .eq('id', id)
        .select(SELECT_COLUMNS)
        .single<ExportRow>(),
    );

    return mapRow(row);
  },

  async delete(id: string): Promise<void> {
    await runQuery('xoá phiếu xuất', () =>
      supabase
        .from('exports')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .select('id')
        .single(),
    );
  },
};
