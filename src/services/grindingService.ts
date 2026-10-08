import { supabase } from '../lib/supabase';
import { runQuery, ServiceError, MAX_ROWS, type DateRangeFilter } from '../lib/serviceError';
import type { Grinding } from '../types';
import { today } from '../lib/date';
import { readAllPages } from '../lib/pagination';

type GrindingRow = {
  id: string;
  date: string;
  import_id: string | null;
  input_qty_kg: number | string | null;
  output_qty_kg: number | string | null;
  loss_kg: number | string | null;
  loss_pct: number | string | null;
  bags_count: number | string | null;
  worker: string | null;
  notes: string | null;
  created_at: string | null;
};

const SELECT_COLUMNS =
  'id, date, import_id, input_qty_kg, output_qty_kg, loss_kg, loss_pct, bags_count, worker, notes, created_at';

function mapRow(item: GrindingRow): Grinding {
  const input = Number(item.input_qty_kg) || 0;
  const output = Number(item.output_qty_kg) || 0;
  return {
    id: item.id,
    date: item.date,
    import_id: item.import_id ?? undefined,
    input_qty_kg: input,
    output_qty_kg: output,
    loss_kg: Number(item.loss_kg) || input - output,
    loss_pct: Number(item.loss_pct) || (input ? Number((((input - output) / input) * 100).toFixed(1)) : 0),
    bags_count: Number(item.bags_count) || 0,
    worker: item.worker ?? undefined,
    notes: item.notes ?? undefined,
    created_at: item.created_at ?? undefined,
  };
}

/**
 * Sản lượng xay ra không thể vượt lượng phế đưa vào. DB đã có CHECK cho việc
 * này (migration 006) nhưng chặn sớm ở đây để người nhập nhận thông báo rõ
 * ràng ngay thay vì một lỗi ràng buộc khó hiểu từ máy chủ.
 */
function assertValidQuantities(input: number, output: number) {
  if (input <= 0) {
    throw new ServiceError('Khối lượng phế đưa vào xay phải lớn hơn 0 kg.');
  }
  if (output < 0) {
    throw new ServiceError('Sản lượng xay ra không được là số âm.');
  }
  if (output > input) {
    throw new ServiceError(
      `Sản lượng xay ra (${output.toLocaleString('vi-VN')} kg) không thể lớn hơn lượng đưa vào (${input.toLocaleString('vi-VN')} kg). Kiểm tra lại số liệu cân.`,
    );
  }
}

export const grindingService = {
  async getAll(filter: DateRangeFilter = {}): Promise<Grinding[]> {
    const rows = await readAllPages<GrindingRow>(
      'tải danh sách phiếu xay',
      (from, to) => {
        let q = supabase.from('grinding').select(SELECT_COLUMNS).is('deleted_at', null);
        if (filter.from) q = q.gte('date', filter.from);
        if (filter.to) q = q.lte('date', filter.to);
        return q
          .order('date', { ascending: false })
          .order('id', { ascending: true })
          .range(from, to)
          .returns<GrindingRow[]>();
      },
      { maxRows: filter.all ? 100_000 : (filter.limit ?? MAX_ROWS) },
    );
    return rows.map(mapRow);
  },

  async create(item: Partial<Grinding>): Promise<Grinding> {
    const input = Number(item.input_qty_kg) || 0;
    const output = Number(item.output_qty_kg) || 0;
    assertValidQuantities(input, output);

    const row = await runQuery<GrindingRow>('thêm phiếu xay', () =>
      supabase
        .from('grinding')
        .insert({
          date: item.date || today(),
          import_id: item.import_id || null,
          input_qty_kg: input,
          output_qty_kg: output,
          bags_count: Number(item.bags_count) || 0,
          worker: item.worker || null,
          notes: item.notes || null,
        })
        .select(SELECT_COLUMNS)
        .single<GrindingRow>(),
    );

    return mapRow(row);
  },

  async update(id: string, item: Partial<Grinding>): Promise<Grinding> {
    // Chỉ validate khối lượng khi trường đó nằm trong payload cập nhật
    const hasQtyFields = 'input_qty_kg' in item || 'output_qty_kg' in item;
    if (hasQtyFields) {
      const input = Number(item.input_qty_kg) || 0;
      const output = Number(item.output_qty_kg) || 0;
      assertValidQuantities(input, output);
    }

    const payload: Record<string, unknown> = {};
    if ('date' in item) payload.date = item.date;
    if ('import_id' in item) payload.import_id = item.import_id || null;
    if ('input_qty_kg' in item) payload.input_qty_kg = Number(item.input_qty_kg) || 0;
    if ('output_qty_kg' in item) payload.output_qty_kg = Number(item.output_qty_kg) || 0;
    if ('bags_count' in item) payload.bags_count = Number(item.bags_count) || 0;
    if ('worker' in item) payload.worker = item.worker;
    if ('notes' in item) payload.notes = item.notes || null;

    const row = await runQuery<GrindingRow>('cập nhật phiếu xay', () =>
      supabase.from('grinding').update(payload).eq('id', id).select(SELECT_COLUMNS).single<GrindingRow>(),
    );

    return mapRow(row);
  },

  async delete(id: string): Promise<void> {
    await runQuery('xoá phiếu xay', () =>
      supabase
        .from('grinding')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .select('id')
        .single(),
    );
  },
};
