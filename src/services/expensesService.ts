import { supabase } from '../lib/supabase';
import type { Expense, Advance } from '../types';

const INITIAL_2807_EXPENSES: Expense[] = [
  {
    id: 'exp-2807-1',
    date: '2026-07-28',
    category: 'other',
    amount: 85000,
    description: 'Thắp hương',
    notes: 'Chi tiêu kho ngày 28/07/2026'
  }
];

export const expensesService = {
  async getExpenses(): Promise<Expense[]> {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('date', { ascending: false });

      if (error || !data || data.length === 0) {
        return INITIAL_2807_EXPENSES;
      }
      return data.map(item => ({
        id: item.id,
        date: item.date,
        category: item.category || 'other',
        amount: Number(item.amount) || 0,
        description: item.description || '',
        notes: item.notes,
        created_at: item.created_at,
      }));
    } catch {
      return INITIAL_2807_EXPENSES;
    }
  },

  async createExpense(expense: Partial<Expense>): Promise<Expense> {
    const { data, error } = await supabase
      .from('expenses')
      .insert({
        date: expense.date || new Date().toISOString().split('T')[0],
        category: expense.category || 'other',
        amount: Number(expense.amount) || 0,
        description: expense.description || '',
        notes: expense.notes || null,
      })
      .select()
      .single();

    if (error) {
      return {
        id: `exp-${Date.now()}`,
        date: expense.date || '2026-07-28',
        category: expense.category || 'other',
        amount: Number(expense.amount) || 0,
        description: expense.description || '',
        notes: expense.notes,
      };
    }
    return data;
  },

  async deleteExpense(id: string): Promise<void> {
    await supabase
      .from('expenses')
      .delete()
      .eq('id', id);
  },

  async getAdvances(): Promise<Advance[]> {
    try {
      const { data, error } = await supabase
        .from('advances')
        .select('*')
        .order('date', { ascending: false });

      if (error || !data) return [];
      return data;
    } catch {
      return [];
    }
  },

  async createAdvance(advance: Partial<Advance>): Promise<Advance> {
    const { data, error } = await supabase
      .from('advances')
      .insert({
        date: advance.date || new Date().toISOString().split('T')[0],
        person: advance.person || advance.person_name || 'Chủ xưởng',
        amount: Number(advance.amount) || 0,
        type: advance.type || 'advance',
        notes: advance.notes || null,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};
