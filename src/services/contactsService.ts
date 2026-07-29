import { supabase } from '../lib/supabase';
import type { Contact } from '../types';

const INITIAL_2807_CONTACTS: Contact[] = [
  { id: 'cnt-1', name: 'Em Hoàn', type: 'supplier', phone: '0912345678', notes: 'Nhà cung cấp phế (1.796 kg ngày 28/07)', status: 'active', is_active: true },
  { id: 'cnt-2', name: 'Đà Nẵng', type: 'supplier', notes: 'Nguồn phế Đà Nẵng (7.445 kg ngày 28/07)', status: 'active', is_active: true },
  { id: 'cnt-3', name: 'Nhà máy Nhựa Việt', type: 'customer', address: 'KCN Sóng Thần', notes: 'Khách mua phế xuất (18 bao ngày 28/07)', status: 'active', is_active: true }
];

export const contactsService = {
  async getAll(): Promise<Contact[]> {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .order('name', { ascending: true });

      if (error || !data || data.length === 0) {
        return INITIAL_2807_CONTACTS;
      }
      return data.map(item => ({
        ...item,
        status: item.is_active ? 'active' : 'inactive'
      }));
    } catch {
      return INITIAL_2807_CONTACTS;
    }
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

    if (error) {
      return {
        id: `cnt-${Date.now()}`,
        name: contact.name,
        type: contact.type,
        phone: contact.phone,
        address: contact.address,
        notes: contact.notes,
        status: 'active',
        is_active: true,
      };
    }
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
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    await supabase
      .from('contacts')
      .delete()
      .eq('id', id);
  }
};
