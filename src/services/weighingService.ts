import { supabase } from '../lib/supabase';
import { runQuery } from '../lib/serviceError';
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
    const { data, error } = await supabase
      .from('exports')
      .select('weighing_session_id')
      .not('weighing_session_id', 'is', null);
    if (error) throw new Error(error.message);

    const used = new Set((data || []).map((r) => r.weighing_session_id).filter(Boolean));
    return new Set(all.filter((s) => !used.has(s.id)).map((s) => s.id));
  },

  /**
   * Tạo phiên cân + lưu toàn bộ bao trong ĐÚNG MỘT lượt gọi mạng (insert
   * mảng), thay vì lặp addBag() cho từng bao. Ở mạng xưởng yếu, lưu tuần tự
   * 25 lượt dễ đứt giữa chừng — phiên bị lưu dở, số bao sai mà không rõ lý
   * do. `total_bags`/`total_kg` tính sẵn ở client trước khi gọi, vì lúc này
   * chưa có gì trong bảng weighing_bags để tính lại từ DB.
   */
  async createSessionWithBags(
    session: Partial<WeighingSession>,
    bags: { bag_number: number; weight_kg: number; notes?: string }[],
  ): Promise<WeighingSession> {
    const row = await runQuery<SessionRow>('tạo phiên cân', () =>
      supabase
        .from('weighing_sessions')
        .insert({
          date: session.date || today(),
          material_type: session.material_type || 'Tấm nhựa nano',
          total_bags: Number(session.total_bags) || 0,
          total_kg: Number(session.total_kg) || 0,
          contact_id: session.contact_id || null,
          notes: session.notes || null,
        })
        .select(SELECT_COLUMNS)
        .single<SessionRow>(),
    );
    const newSession = mapRow(row);

    if (bags.length > 0) {
      await runQuery('lưu danh sách bao đã cân', () =>
        supabase
          .from('weighing_bags')
          .insert(
            bags.map((b) => ({
              session_id: newSession.id,
              bag_number: b.bag_number,
              weight_kg: b.weight_kg,
              notes: b.notes || null,
            })),
          )
          .select('id'),
      );
    }

    return newSession;
  },

  async deleteSession(id: string): Promise<void> {
    // weighing_bags có ON DELETE CASCADE theo session_id (migration 001).
    await runQuery('xoá phiên cân', () =>
      supabase.from('weighing_sessions').delete().eq('id', id).select('id').single(),
    );
  },
};
