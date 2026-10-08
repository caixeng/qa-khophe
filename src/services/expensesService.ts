import { supabase } from '../lib/supabase';
import { readAllPages } from '../lib/pagination';
import { runQuery, MAX_ROWS, type DateRangeFilter } from '../lib/serviceError';
import type { Expense, Advance } from '../types';
import { today } from '../lib/date';

export const expensesService = {
  async getExpenses(filter: DateRangeFilter = {}): Promise<Expense[]> {
    const data = await readAllPages<any>(
      'tải danh sách chi phí',
      (from, to) => {
        let q = supabase.from('expenses').select('*');
        if (filter.from) q = q.gte('date', filter.from);
        if (filter.to) q = q.lte('date', filter.to);
        return q.order('date', { ascending: false }).order('id').range(from, to);
      },
      { maxRows: filter.all ? 100_000 : (filter.limit ?? MAX_ROWS) },
    );

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

  async updateExpense(id: string, expense: Partial<Expense>): Promise<Expense> {
    if (expense.amount !== undefined && expense.amount <= 0) {
      throw new Error('Số tiền phải lớn hơn 0');
    }
    return runQuery<Expense>('cập nhật khoản chi phí', () =>
      supabase
        .from('expenses')
        .update({
          date: expense.date,
          category: expense.category,
          amount: expense.amount !== undefined ? Number(expense.amount) : undefined,
          description: expense.description,
          notes: expense.notes,
        })
        .eq('id', id)
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
    return readAllPages<Advance>(
      'tải sổ ứng tiền',
      (from, to) => {
        let q = supabase.from('v_advance_balances').select('*');
        if (filter.from) q = q.gte('date', filter.from);
        if (filter.to) q = q.lte('date', filter.to);
        return q.order('date', { ascending: false }).order('id').range(from, to);
      },
      { maxRows: filter.all ? 100_000 : (filter.limit ?? MAX_ROWS) },
    );
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
          purpose: advance.purpose || 'unclassified',
          employee_id: advance.employee_id || null,
          original_advance_id: advance.original_advance_id || null,
          notes: advance.notes || null,
        })
        .select()
        .single(),
    );
  },

  async updateAdvance(id: string, advance: Partial<Advance>): Promise<Advance> {
    if (advance.amount !== undefined && advance.amount <= 0) {
      throw new Error('Số tiền phải lớn hơn 0');
    }
    return runQuery<Advance>('cập nhật khoản ứng tiền', () =>
      supabase
        .from('advances')
        .update({
          date: advance.date,
          person: advance.person,
          amount: advance.amount !== undefined ? Number(advance.amount) : undefined,
          type: advance.type,
          purpose: advance.purpose,
          employee_id: advance.employee_id || null,
          original_advance_id: advance.original_advance_id || null,
          notes: advance.notes,
        })
        .eq('id', id)
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
