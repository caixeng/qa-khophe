import { supabase } from '../lib/supabase';
import { today } from '../lib/date';

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

export const paymentsService = {
  /** Lấy toàn bộ payments cho một loại chứng từ (import/export), gom theo ref_id. */
  async getPaidByRefType(refType: PaymentRefType): Promise<Record<string, number>> {
    const { data, error } = await supabase.from('payments').select('ref_id, amount').eq('ref_type', refType);

    if (error) throw new Error(error.message);

    const totals: Record<string, number> = {};
    for (const row of data || []) {
      totals[row.ref_id] = (totals[row.ref_id] || 0) + (Number(row.amount) || 0);
    }
    return totals;
  },

  async getHistory(refType: PaymentRefType, refId: string): Promise<Payment[]> {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('ref_type', refType)
      .eq('ref_id', refId)
      .order('date', { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
  },

  async recordPayment(payment: {
    ref_type: PaymentRefType;
    ref_id: string;
    amount: number;
    date?: string;
    method?: 'cash' | 'transfer' | 'other';
    notes?: string;
  }): Promise<Payment> {
    const { data, error } = await supabase
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
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  async deletePayment(id: string): Promise<void> {
    const { error } = await supabase.from('payments').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },
};
