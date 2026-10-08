import { supabase } from '../lib/supabase';
import { runQuery, MAX_ROWS } from '../lib/serviceError';
import type { WeighingSession, WeighingBag } from '../types';
import { today } from '../lib/date';

type SessionRow = {
  id: string;
  date: string;
  material_type: string;
  total_bags: number | string | null;
  total_kg: number | string | null;
  contact_id: string | null;
  contacts: { name: string } | null;
  notes: string | null;
  created_at: string | null;
};

const SELECT_COLUMNS =
  'id, date, material_type, total_bags, total_kg, contact_id, notes, created_at, contacts(name)';

function mapRow(item: SessionRow): WeighingSession {
  return {
    id: item.id,
    date: item.date,
    material_type: item.material_type,
    total_bags: Number(item.total_bags) || 0,
    total_kg: Number(item.total_kg) || 0,
    contact_id: item.contact_id ?? undefined,
    contact_name: item.contacts?.name,
    notes: item.notes ?? undefined,
    created_at: item.created_at ?? undefined,
  };
}

export const weighingService = {
  async getSessions(): Promise<WeighingSession[]> {
    const rows = await runQuery<SessionRow[]>('tải danh sách phiên cân', () =>
      supabase
        .from('weighing_sessions')
        .select(SELECT_COLUMNS)
        .order('date', { ascending: false })
        .limit(MAX_ROWS)
        .returns<SessionRow[]>(),
    );
    return rows.map(mapRow);
  },

  async getSessionBags(sessionId: string): Promise<WeighingBag[]> {
    return runQuery<WeighingBag[]>('tải chi tiết phiên cân', () =>
      supabase
        .from('weighing_bags')
        .select('*')
        .eq('session_id', sessionId)
        .order('bag_number', { ascending: true }),
    );
  },

  /**
   * Các phiên cân CHƯA gắn với phiếu xuất nào — dùng để chọn khi tạo phiếu
   * xuất, tránh chọn nhầm 1 phiên cân đã dùng cho phiếu khác.
   */
  async getUnlinkedSessionIds(): Promise<Set<string>> {
    const all = await this.getSessions();
    const data = await runQuery<{ weighing_session_id: string }[]>(
      'tải danh sách phiên cân đã liên kết',
      () =>
        supabase
          .from('exports')
          .select('weighing_session_id')
          .not('weighing_session_id', 'is', null)
          .is('deleted_at', null),
    );

    const used = new Set(data.map((r) => r.weighing_session_id).filter(Boolean));
    return new Set(all.filter((s) => !used.has(s.id)).map((s) => s.id));
  },

  /**
   * RPC ghi phiên cân và các bao nguyên tử, tính tổng và trừ bì tại DB.
   * ID được giữ trong bản nháp để retry sau lỗi mạng không tạo phiếu trùng.
   */
  async createSessionWithBags(
    session: Partial<WeighingSession>,
    bags: { bag_number: number; weight_kg: number; notes?: string }[],
  ): Promise<WeighingSession> {
    const id = await runQuery<string>('lưu phiên cân', () =>
      supabase.rpc('create_weighing_session', {
        p_id: session.id || crypto.randomUUID(),
        p_date: session.date || today(),
        p_material_type: session.material_type || 'Tấm nhựa nano',
        p_contact_id: session.contact_id || null,
        p_notes: session.notes || null,
        p_tare_kg: session.tare_kg || 0,
        p_bags: bags,
      }),
    );
    const row = await runQuery<SessionRow>('tải phiên cân đã lưu', () =>
      supabase.from('weighing_sessions').select(SELECT_COLUMNS).eq('id', id).single<SessionRow>(),
    );
    return mapRow(row);
  },

  async deleteSession(id: string): Promise<void> {
    // weighing_bags có ON DELETE CASCADE theo session_id (migration 001).
    await runQuery('xoá phiên cân', () =>
      supabase.from('weighing_sessions').delete().eq('id', id).select('id').single(),
    );
  },
};
