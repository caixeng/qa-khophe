import { supabase } from '../lib/supabase';
import { runQuery, ServiceError } from '../lib/serviceError';
import { today } from '../lib/date';
import { readAllPages } from '../lib/pagination';

export type PaymentRefType = 'import' | 'export';

export interface Payment {
  id: string;
  ref_type: PaymentRefType;
  ref_id: string;
  amount: number;
  date: string;
  method: 'cash' | 'transfer' | 'other';
  notes?: string;
  created_at?: string;
}

export interface DebtSummary {
  ref_id: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
}

export const paymentsService = {
  /**
   * Lấy tổng đã trả cho từng phiếu nhập hoặc xuất, tính sẵn trong DB view
   * (`v_import_debts` / `v_export_debts`) thay vì kéo toàn bộ bảng payments
   * về trình duyệt rồi cộng tay.
   */
  async getPaidByRefType(refType: PaymentRefType): Promise<Record<string, number>> {
    const view = refType === 'import' ? 'v_import_debts' : 'v_export_debts';
    type PaidRow = { ref_id: string; paid_amount: number | string | null };
    const rows = await readAllPages<PaidRow>('tải tổng thanh toán', (from, to) =>
      supabase
        .from(view)
        .select('ref_id, paid_amount')
        .gt('paid_amount', 0)
        .order('ref_id')
        .range(from, to)
        .returns<PaidRow[]>(),
    );

    const totals: Record<string, number> = {};
    for (const row of rows) {
      totals[row.ref_id] = Number(row.paid_amount) || 0;
    }
    return totals;
  },

  async getHistory(refType: PaymentRefType, refId: string): Promise<Payment[]> {
    return runQuery<Payment[]>('tải lịch sử thanh toán', () =>
      supabase
        .from('payments')
        .select('*')
        .eq('ref_type', refType)
        .eq('ref_id', refId)
        .order('date', { ascending: false }),
    );
  },

  async recordPayment(payment: {
    ref_type: PaymentRefType;
    ref_id: string;
    amount: number;
    date?: string;
    method?: 'cash' | 'transfer' | 'other';
    notes?: string;
  }): Promise<Payment> {
    if (!payment.amount || payment.amount <= 0) {
      throw new ServiceError('Số tiền thanh toán phải lớn hơn 0.');
    }

    return runQuery<Payment>('ghi nhận thanh toán', () =>
      supabase
        .from('payments')
        .insert({
          ref_type: payment.ref_type,
          ref_id: payment.ref_id,
          amount: Number(payment.amount) || 0,
          date: payment.date || today(),
          method: payment.method || 'cash',
          notes: payment.notes || null,
        })
        .select()
        .single(),
    );
  },

  async deletePayment(id: string): Promise<void> {
    await runQuery('xoá khoản thanh toán', () =>
      supabase.from('payments').delete().eq('id', id).select('id').single(),
    );
  },
};
