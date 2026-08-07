import { supabase } from '../lib/supabase';
import type { Contact } from '../types';
import { loadLocalData, saveLocalData } from '../lib/storage';

const INITIAL_CONTACTS: Contact[] = [
  { id: 'ct-1', name: 'Em Hoàn', type: 'supplier', phone: '0912345678', address: 'Kho phế', notes: 'Nhà cung cấp phế chính', is_active: true, status: 'active' },
  { id: 'ct-2', name: 'Em Hồ', type: 'supplier', phone: '0918123456', address: 'Huế', notes: 'Nhà cung cấp phế Em Hồ', is_active: true, status: 'active' },
  { id: 'ct-3', name: 'Chị Hoan', type: 'supplier', phone: '', address: '', notes: 'Nhà cung cấp phế Chị Hoan', is_active: true, status: 'active' },
  { id: 'ct-4', name: 'A Danh', type: 'supplier', phone: '', address: '', notes: 'Nhà cung cấp phế A Danh', is_active: true, status: 'active' },
  { id: 'ct-5', name: 'Em Cường', type: 'supplier', phone: '', address: '', notes: 'Nhà cung cấp phế Em Cường', is_active: true, status: 'active' },
  { id: 'ct-6', name: 'Hiền', type: 'supplier', phone: '', address: '', notes: 'Nhà cung cấp phế Hiền', is_active: true, status: 'active' },
  { id: 'ct-7', name: 'Nhà máy Nhựa Việt', type: 'customer', phone: '0281234567', address: 'KCN Sóng Thần', notes: 'Khách hàng mua xuất phế', is_active: true, status: 'active' }
];

let LOCAL_CONTACTS: Contact[] = loadLocalData('khophe_contacts', INITIAL_CONTACTS);

export const contactsService = {
  async getAll(): Promise<Contact[]> {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .order('name', { ascending: true });

      if (!error && data && data.length > 0) {
        const mapped = data.map(item => ({
          ...item,
          status: item.is_active ? 'active' : 'inactive'
        }));
        LOCAL_CONTACTS = mapped;
        saveLocalData('khophe_contacts', LOCAL_CONTACTS);
        return mapped;
      }
    } catch (e) {
      console.warn('Supabase getAll contacts error:', e);
    }

    LOCAL_CONTACTS = loadLocalData('khophe_contacts', INITIAL_CONTACTS);
    return LOCAL_CONTACTS;
  },

  async create(contact: Omit<Contact, 'id' | 'created_at' | 'updated_at'>): Promise<Contact> {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .insert({
          name: contact.name,
          type: contact.type || 'supplier',
          phone: contact.phone || null,
          address: contact.address || null,
          notes: contact.notes || null,
          is_active: contact.is_active ?? true,
        })
        .select();

      if (!error && data && data.length > 0) {
        const item = data[0];
        const res: Contact = {
          ...item,
          status: item.is_active ? 'active' : 'inactive'
        };
        LOCAL_CONTACTS.unshift(res);
        saveLocalData('khophe_contacts', LOCAL_CONTACTS);
        return res;
      }
      console.warn('Supabase create contact error:', error);
    } catch (e) {
      console.warn('Supabase create contact exception:', e);
    }

    // Local fallback creation
    const newContact: Contact = {
      id: `ct-${Date.now()}`,
      name: contact.name,
      type: contact.type || 'supplier',
      phone: contact.phone || '',
      address: contact.address || '',
      notes: contact.notes || '',
      is_active: true,
      status: 'active'
    };

    LOCAL_CONTACTS.unshift(newContact);
    saveLocalData('khophe_contacts', LOCAL_CONTACTS);
    return newContact;
  },

  async update(id: string, contact: Partial<Contact>): Promise<Contact> {
    try {
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
        .select();

      if (!error && data && data.length > 0) {
        const item = data[0];
        const res: Contact = {
          ...item,
          status: item.is_active ? 'active' : 'inactive'
        };
        const index = LOCAL_CONTACTS.findIndex(c => c.id === id);
        if (index !== -1) LOCAL_CONTACTS[index] = res;
        saveLocalData('khophe_contacts', LOCAL_CONTACTS);
        return res;
      }
    } catch (e) {
      console.warn('Supabase update contact error:', e);
    }

    // Local update fallback
    const index = LOCAL_CONTACTS.findIndex(c => c.id === id);
    if (index !== -1) {
      LOCAL_CONTACTS[index] = {
        ...LOCAL_CONTACTS[index],
        ...contact,
      };
      saveLocalData('khophe_contacts', LOCAL_CONTACTS);
      return LOCAL_CONTACTS[index];
    }

    const fallback: Contact = {
      id,
      name: contact.name || '',
      type: contact.type || 'supplier',
      phone: contact.phone || '',
      address: contact.address || '',
      notes: contact.notes || '',
      status: 'active',
      is_active: true,
    };
    LOCAL_CONTACTS.unshift(fallback);
    saveLocalData('khophe_contacts', LOCAL_CONTACTS);
    return fallback;
  },

  async delete(id: string): Promise<void> {
    try {
      await supabase.from('contacts').delete().eq('id', id);
    } catch (e) {
      console.warn('Supabase delete contact error:', e);
    }
    LOCAL_CONTACTS = LOCAL_CONTACTS.filter(c => c.id !== id);
    saveLocalData('khophe_contacts', LOCAL_CONTACTS);
  }
};
