import { supabase } from '../lib/supabase';
import type { WeighingSession, WeighingBag } from '../types';
import { loadLocalData, saveLocalData } from '../lib/storage';

let LOCAL_SESSIONS: WeighingSession[] = loadLocalData('khophe_weighing_sessions', []);
let LOCAL_BAGS: WeighingBag[] = loadLocalData('khophe_weighing_bags', []);

export const weighingService = {
  async getSessions(): Promise<WeighingSession[]> {
    try {
      const { data, error } = await supabase
        .from('weighing_sessions')
        .select('*')
        .order('date', { ascending: false });

      if (!error && data && data.length > 0) {
        LOCAL_SESSIONS = data;
        saveLocalData('khophe_weighing_sessions', LOCAL_SESSIONS);
        return data;
      }
    } catch {}

    LOCAL_SESSIONS = loadLocalData('khophe_weighing_sessions', LOCAL_SESSIONS);
    return LOCAL_SESSIONS;
  },

  async getSessionBags(sessionId: string): Promise<WeighingBag[]> {
    try {
      const { data, error } = await supabase
        .from('weighing_bags')
        .select('*')
        .eq('session_id', sessionId)
        .order('bag_number', { ascending: true });

      if (!error && data && data.length > 0) {
        return data;
      }
    } catch {}

    LOCAL_BAGS = loadLocalData('khophe_weighing_bags', []);
    return LOCAL_BAGS.filter(b => b.session_id === sessionId);
  },

  async createSession(session: Partial<WeighingSession>): Promise<WeighingSession> {
    let created: WeighingSession | null = null;
    try {
      const { data, error } = await supabase
        .from('weighing_sessions')
        .insert({
          date: session.date || new Date().toISOString().split('T')[0],
          material_type: session.material_type || 'Tấm nhựa nano',
          total_bags: Number(session.total_bags) || 0,
          total_kg: Number(session.total_kg) || 0,
          notes: session.notes || null,
        })
        .select()
        .single();

      if (!error && data) {
        created = data;
      }
    } catch {}

    if (!created) {
      created = {
        id: `ws-${Date.now()}`,
        date: session.date || new Date().toISOString().split('T')[0],
        material_type: session.material_type || 'Tấm nhựa nano',
        total_bags: Number(session.total_bags) || 0,
        total_kg: Number(session.total_kg) || 0,
        notes: session.notes || undefined,
      };
    }

    LOCAL_SESSIONS.unshift(created);
    saveLocalData('khophe_weighing_sessions', LOCAL_SESSIONS);
    return created;
  },

  async addBag(sessionId: string, bagNumber: number, weightKg: number): Promise<WeighingBag> {
    let createdBag: WeighingBag | null = null;
    try {
      const { data, error } = await supabase
        .from('weighing_bags')
        .insert({
          session_id: sessionId,
          bag_number: bagNumber,
          weight_kg: weightKg,
        })
        .select()
        .single();

      if (!error && data) {
        createdBag = data;

        const { data: bags, error: bagsError } = await supabase
          .from('weighing_bags')
          .select('weight_kg')
          .eq('session_id', sessionId);

        if (!bagsError && bags) {
          const totalWeight = bags.reduce((sum, b) => sum + (Number(b.weight_kg) || 0), 0);
          await supabase
            .from('weighing_sessions')
            .update({ total_bags: bags.length, total_kg: totalWeight })
            .eq('id', sessionId);
        }
      }
    } catch {}

    if (!createdBag) {
      createdBag = {
        id: `wb-${Date.now()}`,
        session_id: sessionId,
        bag_number: bagNumber,
        weight_kg: weightKg,
      };
    }

    LOCAL_BAGS.push(createdBag);
    saveLocalData('khophe_weighing_bags', LOCAL_BAGS);

    // Update local session
    const sessionIndex = LOCAL_SESSIONS.findIndex(s => s.id === sessionId);
    if (sessionIndex !== -1) {
      const sessionBags = LOCAL_BAGS.filter(b => b.session_id === sessionId);
      const totalKg = sessionBags.reduce((sum, b) => sum + (Number(b.weight_kg) || 0), 0);
      LOCAL_SESSIONS[sessionIndex] = {
        ...LOCAL_SESSIONS[sessionIndex],
        total_bags: sessionBags.length,
        total_kg: totalKg,
      };
      saveLocalData('khophe_weighing_sessions', LOCAL_SESSIONS);
    }

    return createdBag;
  }
};
