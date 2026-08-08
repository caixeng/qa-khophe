import { supabase } from '../lib/supabase';
import { runQuery, ServiceError, MAX_ROWS, type DateRangeFilter } from '../lib/serviceError';
import type { Import } from '../types';
import { today } from '../lib/date';

/**
 * Dữ liệu nhập phế đọc/ghi thẳng vào Supabase.
 *
 * Không có bản sao trong bộ nhớ và không có dữ liệu mẫu dự phòng: nếu máy chủ
 * lỗi thì hàm ném lỗi để màn hình hiện thông báo thật. Trước đây chỗ này trả về
 * dữ liệu sổ tay hardcode khi lỗi, khiến người dùng nhìn thấy số liệu giả mà
 * tưởng là thật, và phiếu "lưu thành công" nhưng không hề vào DB.
 */

type ImportRow = {
  id: string;
  date: string;
  contact_id: string | null;
  contacts: { name: string } | null;
  quantity_kg: number | string | null;
  material_type: string | null;
  price_per_kg: number | string | null;
  total_amount: number | string | null;
  payment_status: Import['payment_status'] | null;
  processing_status: Import['processing_status'] | null;
  notes: string | null;
  created_at: string | null;
};

const SELECT_COLUMNS =
  'id, date, contact_id, quantity_kg, material_type, price_per_kg, total_amount, payment_status, processing_status, notes, created_at, contacts(name)';

function mapRow(item: ImportRow): Import {
  const qty = Number(item.quantity_kg) || 0;
  const price = Number(item.price_per_kg) || 0;
  return {
    id: item.id,
    date: item.date,
    contact_id: item.contact_id ?? undefined,
    contact_name: item.contacts?.name || 'Khách lẻ',
    quantity_kg: qty,
    material_type: item.material_type || 'Tấm nhựa nano',
    price_per_kg: price,
    total_amount: Number(item.total_amount) || qty * price,
    payment_status: item.payment_status || 'unpaid',
    processing_status: item.processing_status || 'pending',
    notes: item.notes ?? undefined,
    created_at: item.created_at ?? undefined,
  };
}

export const importsService = {
  async getAll(filter: DateRangeFilter = {}): Promise<Import[]> {
    const rows = await runQuery<ImportRow[]>('tải danh sách phiếu nhập', () => {
      let q = supabase.from('imports').select(SELECT_COLUMNS).is('deleted_at', null);
      if (filter.from) q = q.gte('date', filter.from);
      if (filter.to) q = q.lte('date', filter.to);
      return q
        .order('date', { ascending: false })
        .limit(filter.limit ?? MAX_ROWS)
        .returns<ImportRow[]>();
    });
    return rows.map(mapRow);
  },

  async create(item: Partial<Import>): Promise<Import> {
    const qty = Number(item.quantity_kg) || 0;
    const price = Number(item.price_per_kg) || 0;

    if (qty <= 0) {
      throw new ServiceError('Khối lượng nhập phải lớn hơn 0 kg.');
    }

    const row = await runQuery<ImportRow>('thêm phiếu nhập', () =>
      supabase
        .from('imports')
        .insert({
          date: item.date || today(),
          contact_id: item.contact_id || null,
          material_type: item.material_type || 'Tấm nhựa nano',
          quantity_kg: qty,
          price_per_kg: price,
          payment_status: item.payment_status || 'unpaid',
          processing_status: item.processing_status || 'pending',
          notes: item.notes || null,
        })
        .select(SELECT_COLUMNS)
        .single<ImportRow>(),
    );

    return mapRow(row);
  },

  async update(id: string, item: Partial<Import>): Promise<Import> {
    const qty = Number(item.quantity_kg) || 0;
    const price = Number(item.price_per_kg) || 0;

    if (qty <= 0) {
      throw new ServiceError('Khối lượng nhập phải lớn hơn 0 kg.');
    }

    const row = await runQuery<ImportRow>('cập nhật phiếu nhập', () =>
      supabase
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
        .eq('id', id)
        .select(SELECT_COLUMNS)
        .single<ImportRow>(),
    );

    return mapRow(row);
  },

  async delete(id: string): Promise<void> {
    // Xoá mềm: chứng từ kho cần giữ lại để đối chiếu, không xoá vĩnh viễn.
    await runQuery('xoá phiếu nhập', () =>
      supabase
        .from('imports')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .select('id')
        .single(),
    );
  },
};
