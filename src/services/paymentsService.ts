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

  /**
   * Thanh toán gộp theo Đối tác (FIFO — gạch nợ từ phiếu cũ nhất đến mới nhất).
   * Khi có `contact_id`, ưu tiên gọi RPC nguyên tử `record_bulk_partner_payment`
   * có khoá dòng `FOR UPDATE` trên PostgreSQL; với khách vãng lai không gắn `contact_id`,
   * thực hiện batch insert trong 1 statement duy nhất.
   */
  async recordBulkFifoPayment(params: {
    contact_id?: string | null;
    ref_type: PaymentRefType;
    items: { id: string; date: string; remaining: number }[];
    totalAmount: number;
    date?: string;
    method?: 'cash' | 'transfer' | 'other';
    notes?: string;
  }): Promise<{ settledCount: number; allocatedAmount: number }> {
    const amount = Number(params.totalAmount) || 0;
    if (amount <= 0) {
      throw new ServiceError('Tổng số tiền thanh toán phải lớn hơn 0.');
    }

    const sorted = [...params.items]
      .filter((x) => x.remaining > 0)
      .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));

    if (sorted.length === 0) {
      throw new ServiceError('Không có phiếu công nợ nào cần thanh toán.');
    }

    const maxAllocatable = sorted.reduce((sum, x) => sum + x.remaining, 0);
    const effectiveAmount = Math.min(amount, maxAllocatable);
    const payDate = params.date || today();
    const payMethod = params.method || 'transfer';

    if (params.contact_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.contact_id)) {
      const rpcResult = await runQuery<{
        allocatedCount: number;
        totalAllocated: number;
        paymentIds: string[];
      }>('ghi nhận thanh toán gộp FIFO', () =>
        supabase.rpc('record_bulk_partner_payment', {
          p_contact_id: params.contact_id,
          p_ref_type: params.ref_type,
          p_total_amount: effectiveAmount,
          p_date: payDate,
          p_method: payMethod,
          p_advance_id: null,
          p_notes: params.notes || null,
        }),
      );

      return {
        settledCount: Number(rpcResult?.allocatedCount) || 0,
        allocatedAmount: Number(rpcResult?.totalAllocated) || effectiveAmount,
      };
    }

    let remainingBudget = effectiveAmount;
    const rowsToInsert: {
      ref_type: PaymentRefType;
      ref_id: string;
      amount: number;
      date: string;
      method: 'cash' | 'transfer' | 'other';
      notes: string | null;
    }[] = [];

    for (const invoice of sorted) {
      if (remainingBudget <= 0) break;
      const alloc = Math.min(invoice.remaining, remainingBudget);
      if (alloc > 0) {
        rowsToInsert.push({
          ref_type: params.ref_type,
          ref_id: invoice.id,
          amount: alloc,
          date: payDate,
          method: payMethod,
          notes: params.notes ? `${params.notes} (Phân bổ FIFO)` : `Thanh toán gộp FIFO ngày ${payDate}`,
        });
        remainingBudget -= alloc;
      }
    }

    await runQuery('ghi nhận thanh toán gộp FIFO', () =>
      supabase.from('payments').insert(rowsToInsert).select('id'),
    );

    return {
      settledCount: rowsToInsert.length,
      allocatedAmount: effectiveAmount - remainingBudget,
    };
  },
};
