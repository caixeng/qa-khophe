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
  default_price_per_kg?: number | string | null;
  created_at: string | null;
  updated_at: string | null;
};

const BASE_COLUMNS = 'id, name, type, phone, address, notes, is_active, created_at, updated_at';
const SELECT_COLUMNS = `${BASE_COLUMNS}, default_price_per_kg`;

/**
 * `default_price_per_kg` do migration 009 thêm vào và là tính năng tuỳ chọn
 * (giá gợi ý khi chọn đối tác). Nếu migration chưa chạy, cột không tồn tại và
 * Postgres trả 42703 — nhưng làm hỏng cả danh bạ chỉ vì thiếu một trường tiện
 * ích là phản ứng quá tay. Ghi nhớ kết quả sau lần đầu để không phải thử lại
 * mỗi lần truy vấn.
 *
 * Đây KHÔNG phải fallback dữ liệu giả: khi thiếu cột, ứng dụng chỉ bỏ trường
 * tuỳ chọn đó đi, còn mọi dữ liệu nghiệp vụ vẫn là dữ liệu thật từ máy chủ.
 */
let hasPricingColumn: boolean | null = null;

function columnMissing(e: unknown): boolean {
  return e instanceof ServiceError && e.code === '42703';
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

    if (hasPricingColumn === false) return (await fetch(BASE_COLUMNS)).map(mapRow);

    try {
      const rows = await fetch(SELECT_COLUMNS);
      hasPricingColumn = true;
      return rows.map(mapRow);
    } catch (e) {
      if (!columnMissing(e)) throw e;
      hasPricingColumn = false;
      console.warn('Chưa chạy migration 009 — bỏ qua giá mặc định theo đối tác.');
      return (await fetch(BASE_COLUMNS)).map(mapRow);
    }
  },

  async getById(id: string): Promise<Contact> {
    const columns = hasPricingColumn === false ? BASE_COLUMNS : SELECT_COLUMNS;
    try {
      const row = await runQuery<ContactRow>('tải thông tin đối tác', () =>
        supabase.from('contacts').select(columns).eq('id', id).single<ContactRow>(),
      );
      return mapRow(row);
    } catch (e) {
      if (!columnMissing(e)) throw e;
      hasPricingColumn = false;
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
          ...(hasPricingColumn === false ? {} : { default_price_per_kg: contact.default_price_per_kg ?? null }),
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
          ...(hasPricingColumn === false ? {} : { default_price_per_kg: contact.default_price_per_kg ?? null }),
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
