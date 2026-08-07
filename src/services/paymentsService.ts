import { supabase } from '../lib/supabase';
import { loadLocalData, saveLocalData } from '../lib/storage';

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

let LOCAL_PAYMENTS: Payment[] = loadLocalData('khophe_payments', []);

export const paymentsService = {
  /** Lấy toàn bộ payments cho một loại chứng từ (import/export), gom theo ref_id. */
  async getPaidByRefType(refType: PaymentRefType): Promise<Record<string, number>> {
    let list: Payment[] = [];
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('ref_type', refType);

      if (!error && data && data.length > 0) {
        list = data;
      }
    } catch {}

    if (list.length === 0) {
      LOCAL_PAYMENTS = loadLocalData('khophe_payments', []);
      list = LOCAL_PAYMENTS.filter(p => p.ref_type === refType);
    }

    const totals: Record<string, number> = {};
    for (const row of list) {
      totals[row.ref_id] = (totals[row.ref_id] || 0) + (Number(row.amount) || 0);
    }
    return totals;
  },

  async getHistory(refType: PaymentRefType, refId: string): Promise<Payment[]> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('ref_type', refType)
        .eq('ref_id', refId)
        .order('date', { ascending: false });

      if (!error && data && data.length > 0) {
        return data;
      }
    } catch {}

    LOCAL_PAYMENTS = loadLocalData('khophe_payments', []);
    return LOCAL_PAYMENTS.filter(p => p.ref_type === refType && p.ref_id === refId);
  },

  async recordPayment(payment: {
    ref_type: PaymentRefType;
    ref_id: string;
    amount: number;
    date?: string;
    method?: 'cash' | 'transfer' | 'other';
    notes?: string;
  }): Promise<Payment> {
    let created: Payment | null = null;
    try {
      const { data, error } = await supabase
        .from('payments')
        .insert({
          ref_type: payment.ref_type,
          ref_id: payment.ref_id,
          amount: Number(payment.amount) || 0,
          date: payment.date || new Date().toISOString().split('T')[0],
          method: payment.method || 'cash',
          notes: payment.notes || null,
        })
        .select()
        .single();

      if (!error && data) {
        created = data;
      }
    } catch {}

    if (!created) {
      created = {
        id: `pmt-${Date.now()}`,
        ref_type: payment.ref_type,
        ref_id: payment.ref_id,
        amount: Number(payment.amount) || 0,
        date: payment.date || new Date().toISOString().split('T')[0],
        method: payment.method || 'cash',
        notes: payment.notes || undefined,
      };
    }

    LOCAL_PAYMENTS.unshift(created);
    saveLocalData('khophe_payments', LOCAL_PAYMENTS);
    return created;
  },

  async deletePayment(id: string): Promise<void> {
    LOCAL_PAYMENTS = LOCAL_PAYMENTS.filter(p => p.id !== id);
    saveLocalData('khophe_payments', LOCAL_PAYMENTS);
    try {
      await supabase.from('payments').delete().eq('id', id);
    } catch {}
  }
};
