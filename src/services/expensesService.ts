import { supabase } from '../lib/supabase';
import type { Expense, Advance } from '../types';
import { loadLocalData, saveLocalData } from '../lib/storage';

let LOCAL_EXPENSES: Expense[] = loadLocalData('khophe_expenses', []);
let LOCAL_ADVANCES: Advance[] = loadLocalData('khophe_advances', []);

export const expensesService = {
  async getExpenses(): Promise<Expense[]> {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('date', { ascending: false });

      if (!error && data && data.length > 0) {
        const mapped = data.map(item => ({
          id: item.id,
          date: item.date,
          category: item.category || 'other',
          amount: Number(item.amount) || 0,
          description: item.description || '',
          notes: item.notes,
          created_at: item.created_at,
        }));
        LOCAL_EXPENSES = mapped;
        saveLocalData('khophe_expenses', LOCAL_EXPENSES);
        return mapped;
      }
    } catch {}

    LOCAL_EXPENSES = loadLocalData('khophe_expenses', LOCAL_EXPENSES);
    return LOCAL_EXPENSES;
  },

  async createExpense(expense: Partial<Expense>): Promise<Expense> {
    let created: Expense | null = null;
    try {
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

      if (!error && data) {
        created = {
          id: data.id,
          date: data.date,
          category: data.category || 'other',
          amount: Number(data.amount) || 0,
          description: data.description || '',
          notes: data.notes,
          created_at: data.created_at,
        };
      }
    } catch {}

    if (!created) {
      created = {
        id: `exp-${Date.now()}`,
        date: expense.date || new Date().toISOString().split('T')[0],
        category: expense.category || 'other',
        amount: Number(expense.amount) || 0,
        description: expense.description || '',
        notes: expense.notes || undefined,
      };
    }

    LOCAL_EXPENSES.unshift(created);
    saveLocalData('khophe_expenses', LOCAL_EXPENSES);
    return created;
  },

  async deleteExpense(id: string): Promise<void> {
    LOCAL_EXPENSES = LOCAL_EXPENSES.filter(e => e.id !== id);
    saveLocalData('khophe_expenses', LOCAL_EXPENSES);
    try {
      await supabase.from('expenses').delete().eq('id', id);
    } catch {}
  },

  async getAdvances(): Promise<Advance[]> {
    try {
      const { data, error } = await supabase
        .from('advances')
        .select('*')
        .order('date', { ascending: false });

      if (!error && data && data.length > 0) {
        LOCAL_ADVANCES = data;
        saveLocalData('khophe_advances', LOCAL_ADVANCES);
        return data;
      }
    } catch {}

    LOCAL_ADVANCES = loadLocalData('khophe_advances', LOCAL_ADVANCES);
    return LOCAL_ADVANCES;
  },

  async createAdvance(advance: Partial<Advance>): Promise<Advance> {
    let created: Advance | null = null;
    try {
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

      if (!error && data) {
        created = data;
      }
    } catch {}

    if (!created) {
      created = {
        id: `adv-${Date.now()}`,
        date: advance.date || new Date().toISOString().split('T')[0],
        person: advance.person || 'Chủ xưởng',
        amount: Number(advance.amount) || 0,
        type: advance.type || 'advance',
        notes: advance.notes || undefined,
      };
    }

    LOCAL_ADVANCES.unshift(created);
    saveLocalData('khophe_advances', LOCAL_ADVANCES);
    return created;
  }
};
