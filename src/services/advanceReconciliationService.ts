import { supabase } from '../lib/supabase';
import { readAllPages } from '../lib/pagination';
import { runQuery } from '../lib/serviceError';
import { formatTien } from '../lib/utils';
import type { Advance } from '../types';

export interface AdvanceTarget {
  id: string;
  kind: 'expense' | 'payment' | 'attendance';
  label: string;
  amount: number;
  source?: string;
}

export const advanceReconciliationService = {
  async getTargets(advance: Advance): Promise<AdvanceTarget[]> {
    if (advance.purpose === 'payroll') {
      if (!advance.employee_id) return [];
      const rows = await readAllPages<any>('tải các lượt ứng lương', (from, to) =>
        supabase
          .from('attendance')
          .select('id,date,advance_pay,advance_id')
          .eq('employee_id', advance.employee_id!)
          .gt('advance_pay', 0)
          .order('date')
          .order('id')
          .range(from, to),
      );
      return rows
        .filter((row) => !row.advance_id || row.advance_id === advance.id)
        .map((row) => ({
          id: row.id,
          kind: 'attendance',
          label: `${row.date} · Ứng lương · ${formatTien(Number(row.advance_pay))}đ`,
          amount: Number(row.advance_pay),
          source: row.advance_id,
        }));
    }
    const isMaterials = advance.purpose === 'materials';
    if (!isMaterials && !['workshop', 'other'].includes(advance.purpose || '')) return [];
    const rows = await readAllPages<any>('tải chứng từ đối soát', (from, to) => {
      let query = supabase
        .from(isMaterials ? 'payments' : 'expenses')
        .select(
          isMaterials
            ? 'id,date,amount,advance_id,ref_type,ref_id,notes'
            : 'id,date,amount,advance_id,description',
        );
      if (isMaterials) query = query.eq('ref_type', 'import');
      return query.order('date').order('id').range(from, to);
    });
    return rows
      .filter((row) => !row.advance_id || row.advance_id === advance.id)
      .map((row) => ({
        id: row.id,
        kind: isMaterials ? 'payment' : 'expense',
        label: `${row.date} · ${isMaterials ? `Thanh toán phiếu nhập ${row.ref_id.slice(0, 8)}` : row.description || 'Chi xưởng'} · ${formatTien(Number(row.amount))}đ`,
        amount: Number(row.amount),
        source: row.advance_id,
      }));
  },
  reconcile: (advanceId: string, kind: AdvanceTarget['kind'] | 'payroll_new', refId?: string) =>
    runQuery<string>('đối soát tiền ứng', () =>
      supabase.rpc('reconcile_advance', {
        p_advance_id: advanceId,
        p_ref_type: kind,
        p_ref_id: refId || null,
      }),
    ),
  async unlink(target: AdvanceTarget) {
    const table =
      target.kind === 'expense' ? 'expenses' : target.kind === 'payment' ? 'payments' : 'attendance';
    await runQuery('gỡ đối soát', () =>
      supabase.from(table).update({ advance_id: null }).eq('id', target.id).select('id').single(),
    );
  },
};
