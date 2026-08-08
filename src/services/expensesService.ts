import { supabase } from '../lib/supabase';
import type { Expense, Advance } from '../types';

export const expensesService = {
  async getExpenses(): Promise<Expense[]> {
    const { data, error } = await supabase.from('expenses').select('*').order('date', { ascending: false });

    if (error) throw new Error(error.message);

    return (data || []).map((item) => ({
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

    if (error) throw new Error(error.message);
    return data;
  },

  async deleteExpense(id: string): Promise<void> {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },

  async getAdvances(): Promise<Advance[]> {
    const { data, error } = await supabase.from('advances').select('*').order('date', { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
  },

  async createAdvance(advance: Partial<Advance>): Promise<Advance> {
    const { data, error } = await supabase
      .from('advances')
      .insert({
        date: advance.date || new Date().toISOString().split('T')[0],
        person: advance.person || 'Chủ xưởng',
        amount: Number(advance.amount) || 0,
        type: advance.type || 'advance',
        notes: advance.notes || null,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  async deleteAdvance(id: string): Promise<void> {
    const { error } = await supabase.from('advances').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },
};
