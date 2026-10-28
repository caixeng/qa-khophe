import { supabase } from '../lib/supabase';
import { runQuery, ServiceError } from '../lib/serviceError';
import type { Contact, SourceCategory } from '../types';

type ContactRow = {
  id: string;
  name: string;
  type: Contact['type'] | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean | null;
  default_price_per_kg?: number | string | null;
  contact_person?: string | null;
  source_category?: SourceCategory | null;
  region?: string | null;
  main_material_type?: string | null;
  bank_info?: string | null;
  collector_name?: string | null;
  created_at: string | null;
  updated_at: string | null;
};

const BASE_COLUMNS = 'id, name, type, phone, address, notes, is_active, created_at, updated_at';
const PRICING_COLUMNS = `${BASE_COLUMNS}, default_price_per_kg`;
const SELECT_COLUMNS = `${PRICING_COLUMNS}, contact_person, source_category, region, main_material_type, bank_info, collector_name`;

/**
 * Ghi nhớ khả năng hỗ trợ các cột mở rộng (`default_price_per_kg` + hồ sơ đơn vị
 * thu mua của Anh Hồ). Nếu DB chưa chạy migration mới nhất, tự hạ cấp xuống tập
 * cột cơ bản mà không làm hỏng danh bạ.
 */
let schemaLevel: 'full' | 'pricing' | 'base' | null = null;

function columnMissing(e: unknown): boolean {
  return e instanceof ServiceError && e.code === '42703';
}

function getActiveSelectColumns(): string {
  if (schemaLevel === 'base') return BASE_COLUMNS;
  if (schemaLevel === 'pricing') return PRICING_COLUMNS;
  return SELECT_COLUMNS;
}

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
    default_price_per_kg:
      item.default_price_per_kg == null ? undefined : Number(item.default_price_per_kg) || undefined,
    contact_person: item.contact_person ?? undefined,
    source_category: item.source_category ?? undefined,
    region: item.region ?? undefined,
    main_material_type: item.main_material_type ?? undefined,
    bank_info: item.bank_info ?? undefined,
    collector_name: item.collector_name ?? undefined,
    created_at: item.created_at ?? undefined,
    updated_at: item.updated_at ?? undefined,
  };
}

export const contactsService = {
  async getAll(): Promise<Contact[]> {
    const fetch = (columns: string) =>
      runQuery<ContactRow[]>('tải danh bạ đối tác', () =>
        supabase.from('contacts').select(columns).order('name', { ascending: true }).returns<ContactRow[]>(),
      );

    if (schemaLevel === 'base') return (await fetch(BASE_COLUMNS)).map(mapRow);
    if (schemaLevel === 'pricing') return (await fetch(PRICING_COLUMNS)).map(mapRow);

    try {
      const rows = await fetch(SELECT_COLUMNS);
      schemaLevel = 'full';
      return rows.map(mapRow);
    } catch (e) {
      if (!columnMissing(e)) throw e;
      try {
        const rows = await fetch(PRICING_COLUMNS);
        schemaLevel = 'pricing';
        return rows.map(mapRow);
      } catch (e2) {
        if (!columnMissing(e2)) throw e2;
        schemaLevel = 'base';
        return (await fetch(BASE_COLUMNS)).map(mapRow);
      }
    }
  },

  async getById(id: string): Promise<Contact> {
    const columns = getActiveSelectColumns();
    try {
      const row = await runQuery<ContactRow>('tải thông tin đối tác', () =>
        supabase.from('contacts').select(columns).eq('id', id).single<ContactRow>(),
      );
      return mapRow(row);
    } catch (e) {
      if (!columnMissing(e)) throw e;
      schemaLevel = 'base';
      const row = await runQuery<ContactRow>('tải thông tin đối tác', () =>
        supabase.from('contacts').select(BASE_COLUMNS).eq('id', id).single<ContactRow>(),
      );
      return mapRow(row);
    }
  },

  async create(contact: Omit<Contact, 'id' | 'created_at' | 'updated_at'>): Promise<Contact> {
    const name = contact.name?.trim();
    if (!name) {
      throw new ServiceError('Tên đối tác không được để trống.');
    }

    const basePayload: Record<string, unknown> = {
      name,
      type: contact.type || 'supplier',
      phone: contact.phone || null,
      address: contact.address || null,
      notes: contact.notes || null,
      is_active: contact.is_active ?? true,
    };

    if (schemaLevel !== 'base') {
      basePayload.default_price_per_kg = contact.default_price_per_kg ?? null;
    }

    if (schemaLevel === 'full' || schemaLevel === null) {
      if (contact.contact_person !== undefined) basePayload.contact_person = contact.contact_person || null;
      if (contact.source_category !== undefined)
        basePayload.source_category = contact.source_category || 'other';
      if (contact.region !== undefined) basePayload.region = contact.region || null;
      if (contact.main_material_type !== undefined)
        basePayload.main_material_type = contact.main_material_type || null;
      if (contact.bank_info !== undefined) basePayload.bank_info = contact.bank_info || null;
      if (contact.collector_name !== undefined)
        basePayload.collector_name = contact.collector_name || 'Anh Hồ';
    }

    const row = await runQuery<ContactRow>('thêm đối tác', () =>
      supabase.from('contacts').insert(basePayload).select(getActiveSelectColumns()).single<ContactRow>(),
    );

    return mapRow(row);
  },

  async update(id: string, contact: Partial<Contact>): Promise<Contact> {
    if ('name' in contact) {
      const name = contact.name?.trim();
      if (!name) {
        throw new ServiceError('Tên đối tác không được để trống.');
      }
    }

    const payload: Record<string, unknown> = {};
    if ('name' in contact) payload.name = contact.name?.trim();
    if ('type' in contact) payload.type = contact.type;
    if ('phone' in contact) payload.phone = contact.phone || null;
    if ('address' in contact) payload.address = contact.address || null;
    if ('notes' in contact) payload.notes = contact.notes || null;
    if ('is_active' in contact) payload.is_active = contact.is_active ?? true;
    if (schemaLevel !== 'base' && 'default_price_per_kg' in contact) {
      payload.default_price_per_kg = contact.default_price_per_kg ?? null;
    }
    if (schemaLevel === 'full' || schemaLevel === null) {
      if ('contact_person' in contact) payload.contact_person = contact.contact_person || null;
      if ('source_category' in contact) payload.source_category = contact.source_category || 'other';
      if ('region' in contact) payload.region = contact.region || null;
      if ('main_material_type' in contact) payload.main_material_type = contact.main_material_type || null;
      if ('bank_info' in contact) payload.bank_info = contact.bank_info || null;
      if ('collector_name' in contact) payload.collector_name = contact.collector_name || null;
    }

    const row = await runQuery<ContactRow>('cập nhật đối tác', () =>
      supabase
        .from('contacts')
        .update(payload)
        .eq('id', id)
        .select(getActiveSelectColumns())
        .single<ContactRow>(),
    );

    return mapRow(row);
  },

  async delete(id: string): Promise<void> {
    await runQuery('xoá đối tác', () =>
      supabase.from('contacts').delete().eq('id', id).select('id').single(),
    );
  },
};
