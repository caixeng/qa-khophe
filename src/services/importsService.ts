import { supabase } from '../lib/supabase';
import { runQuery, ServiceError, MAX_ROWS, type DateRangeFilter } from '../lib/serviceError';
import type { Import } from '../types';
import { today } from '../lib/date';
import { readAllPages } from '../lib/pagination';

/**
 * Dữ liệu nhập phế đọc/ghi thẳng vào Supabase.
 */

type ImportRow = {
  id: string;
  date: string;
  contact_id: string | null;
  contacts: { name: string } | null;
  quantity_kg: number | string | null;
  material_type: string | null;
  import_type: Import['import_type'] | null;
  price_per_kg: number | string | null;
  total_amount: number | string | null;
  payment_status: Import['payment_status'] | null;
  processing_status: Import['processing_status'] | null;
  collector_name?: string | null;
  vehicle_info?: string | null;
  supplier_slip_code?: string | null;
  notes: string | null;
  created_at: string | null;
};

const BASE_COLUMNS =
  'id, date, contact_id, quantity_kg, material_type, import_type, price_per_kg, total_amount, payment_status, processing_status, notes, created_at, contacts(name)';
const SELECT_COLUMNS = `${BASE_COLUMNS}, collector_name, vehicle_info, supplier_slip_code`;

let hasCollectionColumns: boolean | null = null;

function columnMissing(e: unknown): boolean {
  return e instanceof ServiceError && e.code === '42703';
}

function getActiveSelectColumns(): string {
  return hasCollectionColumns === false ? BASE_COLUMNS : SELECT_COLUMNS;
}

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
    import_type: item.import_type || 'nvl',
    price_per_kg: price,
    total_amount: Number(item.total_amount) || qty * price,
    payment_status: item.payment_status || 'unpaid',
    processing_status: item.processing_status || 'pending',
    collector_name: item.collector_name ?? undefined,
    vehicle_info: item.vehicle_info ?? undefined,
    supplier_slip_code: item.supplier_slip_code ?? undefined,
    notes: item.notes ?? undefined,
    created_at: item.created_at ?? undefined,
  };
}

export const importsService = {
  async getAll(
    filter: DateRangeFilter & { importType?: Import['import_type']; collectorName?: string } = {},
  ): Promise<Import[]> {
    const fetchWithColumns = async (columns: string) =>
      readAllPages<ImportRow>(
        'tải danh sách phiếu nhập',
        (from, to) => {
          let q = supabase.from('imports').select(columns).is('deleted_at', null);
          if (filter.contactId) q = q.eq('contact_id', filter.contactId);
          if (filter.importType === 'nvl') q = q.neq('import_type', 'thanh_pham');
          else if (filter.importType === 'thanh_pham') q = q.eq('import_type', 'thanh_pham');
          if (filter.collectorName && columns === SELECT_COLUMNS) {
            q = q.eq('collector_name', filter.collectorName);
          }
          if (filter.from) q = q.gte('date', filter.from);
          if (filter.to) q = q.lte('date', filter.to);
          return q
            .order('date', { ascending: false })
            .order('id', { ascending: true })
            .range(from, to)
            .returns<ImportRow[]>();
        },
        { maxRows: filter.all ? 100_000 : (filter.limit ?? MAX_ROWS) },
      );

    if (hasCollectionColumns === false) {
      return (await fetchWithColumns(BASE_COLUMNS)).map(mapRow);
    }

    try {
      const rows = await fetchWithColumns(SELECT_COLUMNS);
      hasCollectionColumns = true;
      return rows.map(mapRow);
    } catch (e) {
      if (!columnMissing(e)) throw e;
      hasCollectionColumns = false;
      return (await fetchWithColumns(BASE_COLUMNS)).map(mapRow);
    }
  },

  async create(item: Partial<Import>): Promise<Import> {
    const qty = Number(item.quantity_kg) || 0;
    const price = Number(item.price_per_kg) || 0;

    if (qty <= 0) {
      throw new ServiceError('Khối lượng nhập phải lớn hơn 0 kg.');
    }

    const payload: Record<string, unknown> = {
      date: item.date || today(),
      contact_id: item.contact_id || null,
      material_type: item.material_type || 'Tấm nhựa nano',
      import_type: item.import_type || 'nvl',
      quantity_kg: qty,
      price_per_kg: price,
      payment_status: item.payment_status || 'unpaid',
      processing_status: item.processing_status || 'pending',
      notes: item.notes || null,
    };

    if (hasCollectionColumns !== false) {
      payload.collector_name = item.collector_name || 'Anh Hồ';
      if (item.vehicle_info !== undefined) payload.vehicle_info = item.vehicle_info || null;
      if (item.supplier_slip_code !== undefined) payload.supplier_slip_code = item.supplier_slip_code || null;
    }

    const row = await runQuery<ImportRow>('thêm phiếu nhập', () =>
      supabase
        .from('imports')
        .insert(payload)
        .select(getActiveSelectColumns())
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

    const payload: Record<string, unknown> = {
      date: item.date,
      contact_id: item.contact_id || null,
      quantity_kg: qty,
      material_type: item.material_type,
      import_type: item.import_type || 'nvl',
      price_per_kg: price,
      payment_status: item.payment_status,
      processing_status: item.processing_status,
      notes: item.notes || null,
    };

    if (hasCollectionColumns !== false) {
      if ('collector_name' in item) payload.collector_name = item.collector_name || 'Anh Hồ';
      if ('vehicle_info' in item) payload.vehicle_info = item.vehicle_info || null;
      if ('supplier_slip_code' in item) payload.supplier_slip_code = item.supplier_slip_code || null;
    }

    const row = await runQuery<ImportRow>('cập nhật phiếu nhập', () =>
      supabase
        .from('imports')
        .update(payload)
        .eq('id', id)
        .select(getActiveSelectColumns())
        .single<ImportRow>(),
    );

    return mapRow(row);
  },

  async delete(id: string): Promise<void> {
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
