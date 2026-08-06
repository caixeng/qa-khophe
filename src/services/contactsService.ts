import { supabase } from '../lib/supabase';
import { runQuery, ServiceError } from '../lib/serviceError';
import type { Contact } from '../types';

type ContactRow = {
  id: string;
  name: string;
  type: Contact['type'] | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

const SELECT_COLUMNS = 'id, name, type, phone, address, notes, is_active, created_at, updated_at';

function mapRow(item: ContactRow): Contact {
  return {
    id: item.id,
    name: item.name,
    type: item.type || 'supplier',
    phone: item.phone ?? undefined,
    address: item.address ?? undefined,
    notes: item.notes ?? undefined,
    is_active: item.is_active ?? true,
    status: item.is_active === false ? 'inactive' : 'active',
    created_at: item.created_at ?? undefined,
    updated_at: item.updated_at ?? undefined,
  };
}

export const contactsService = {
  async getAll(): Promise<Contact[]> {
    const rows = await runQuery<ContactRow[]>('tải danh bạ đối tác', () =>
      supabase.from('contacts').select(SELECT_COLUMNS).order('name', { ascending: true }).returns<ContactRow[]>(),
    );
    return rows.map(mapRow);
  },

  async create(contact: Omit<Contact, 'id' | 'created_at' | 'updated_at'>): Promise<Contact> {
    const name = contact.name?.trim();
    if (!name) {
      throw new ServiceError('Tên đối tác không được để trống.');
    }

    const row = await runQuery<ContactRow>('thêm đối tác', () =>
      supabase
        .from('contacts')
        .insert({
          name,
          type: contact.type || 'supplier',
          phone: contact.phone || null,
          address: contact.address || null,
          notes: contact.notes || null,
          is_active: contact.is_active ?? true,
        })
        .select(SELECT_COLUMNS)
        .single<ContactRow>(),
    );

    return mapRow(row);
  },

  async update(id: string, contact: Partial<Contact>): Promise<Contact> {
    const name = contact.name?.trim();
    if (!name) {
      throw new ServiceError('Tên đối tác không được để trống.');
    }

    const row = await runQuery<ContactRow>('cập nhật đối tác', () =>
      supabase
        .from('contacts')
        .update({
          name,
          type: contact.type,
          phone: contact.phone || null,
          address: contact.address || null,
          notes: contact.notes || null,
          is_active: contact.is_active ?? true,
        })
        .eq('id', id)
        .select(SELECT_COLUMNS)
        .single<ContactRow>(),
    );

    return mapRow(row);
  },

  async delete(id: string): Promise<void> {
    // Bảng contacts không có cột deleted_at; đối tác đã phát sinh phiếu sẽ bị
    // khoá ngoại chặn xoá — describeError() giải thích tình huống đó cho người dùng.
    await runQuery('xoá đối tác', () =>
      supabase.from('contacts').delete().eq('id', id).select('id').single(),
    );
  },
};
