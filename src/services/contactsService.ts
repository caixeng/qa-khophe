import { supabase } from '../lib/supabase';
import type { Contact } from '../types';

export const contactsService = {
  async getAll(): Promise<Contact[]> {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw new Error(error.message);

    return (data || []).map(item => ({
      ...item,
      status: item.is_active ? 'active' : 'inactive'
    }));
  },

  async create(contact: Omit<Contact, 'id' | 'created_at' | 'updated_at'>): Promise<Contact> {
    const { data, error } = await supabase
      .from('contacts')
      .insert({
        name: contact.name,
        type: contact.type,
        phone: contact.phone || null,
        address: contact.address || null,
        notes: contact.notes || null,
        is_active: contact.is_active ?? true,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  async update(id: string, contact: Partial<Contact>): Promise<Contact> {
    const { data, error } = await supabase
      .from('contacts')
      .update({
        name: contact.name,
        type: contact.type,
        phone: contact.phone || null,
        address: contact.address || null,
        notes: contact.notes || null,
        is_active: contact.is_active ?? true,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('contacts').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }
};
