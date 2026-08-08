import { supabase } from '../lib/supabase';
import { runQuery, MAX_ROWS, type DateRangeFilter } from '../lib/serviceError';
import type { Expense, Advance } from '../types';
import { today } from '../lib/date';

export const expensesService = {
  async getExpenses(filter: DateRangeFilter = {}): Promise<Expense[]> {
    const data = await runQuery<any[]>('tải danh sách chi phí', () => {
      let q = supabase.from('expenses').select('*');
      if (filter.from) q = q.gte('date', filter.from);
      if (filter.to) q = q.lte('date', filter.to);
      return q.order('date', { ascending: false }).limit(filter.limit ?? MAX_ROWS);
    });

    return data.map((item) => ({
      id: item.id,
      date: item.date,
      category: item.category || 'other',
      amount: Number(item.amount) || 0,
      description: item.description || '',
      notes: item.notes,
      created_at: item.created_at,
    }));
  },

  async createExpense(expense: Partial<Expense>): Promise<Expense> {
    return runQuery<Expense>('thêm khoản chi phí', () =>
      supabase
        .from('expenses')
        .insert({
          date: expense.date || today(),
          category: expense.category || 'other',
          amount: Number(expense.amount) || 0,
          description: expense.description || '',
          notes: expense.notes || null,
        })
        .select()
        .single(),
    );
  },

  async deleteExpense(id: string): Promise<void> {
    await runQuery('xoá khoản chi phí', () =>
      supabase.from('expenses').delete().eq('id', id).select('id').single(),
    );
  },

  async getAdvances(filter: DateRangeFilter = {}): Promise<Advance[]> {
    return runQuery<Advance[]>('tải sổ ứng tiền', () => {
      let q = supabase.from('advances').select('*');
      if (filter.from) q = q.gte('date', filter.from);
      if (filter.to) q = q.lte('date', filter.to);
      return q.order('date', { ascending: false }).limit(filter.limit ?? MAX_ROWS);
    });
  },

  async createAdvance(advance: Partial<Advance>): Promise<Advance> {
    return runQuery<Advance>('thêm khoản ứng tiền', () =>
      supabase
        .from('advances')
        .insert({
          date: advance.date || today(),
          person: advance.person || 'Chủ xưởng',
          amount: Number(advance.amount) || 0,
          type: advance.type || 'advance',
          notes: advance.notes || null,
        })
        .select()
        .single(),
    );
  },

  async deleteAdvance(id: string): Promise<void> {
    await runQuery('xoá khoản ứng tiền', () =>
      supabase.from('advances').delete().eq('id', id).select('id').single(),
    );
  },
};
