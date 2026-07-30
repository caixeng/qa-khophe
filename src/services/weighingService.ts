import { supabase } from '../lib/supabase';
import type { WeighingSession, WeighingBag } from '../types';

const INITIAL_2907_WEIGHING: WeighingSession[] = [
  {
    id: 'ws-2907-1',
    date: '2026-07-29',
    material_type: 'Cân Phế Nam (không lết)',
    total_bags: 24,
    total_kg: 20947,
    total_weight_kg: 20947,
    notes: 'Không lết - 24 bao tổng 20.947 kg'
  }
];

export const weighingService = {
  async getSessions(): Promise<WeighingSession[]> {
    try {
      const { data, error } = await supabase
        .from('weighing_sessions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error || !data || data.length === 0) return INITIAL_2907_WEIGHING;
      return data;
    } catch {
      return INITIAL_2907_WEIGHING;
    }
  },

  async getSessionBags(sessionId: string): Promise<WeighingBag[]> {
    try {
      const { data, error } = await supabase
        .from('weighing_bags')
        .select('*')
        .eq('session_id', sessionId)
        .order('bag_number', { ascending: true });

      if (error || !data) return [];
      return data;
    } catch {
      return [];
    }
  },

  async createSession(session: Partial<WeighingSession>): Promise<WeighingSession> {
    const totalW = Number((session as any).total_weight_kg || session.total_kg) || 0;
    const { data, error } = await supabase
      .from('weighing_sessions')
      .insert({
        date: session.date || new Date().toISOString().split('T')[0],
        material_type: session.material_type || 'Tấm nhựa nano',
        total_bags: Number(session.total_bags) || 0,
        total_kg: totalW,
        notes: session.notes || null,
      })
      .select()
      .single();

    if (error) {
      return {
        id: `ws-${Date.now()}`,
        date: session.date || '2026-07-29',
        material_type: session.material_type || 'Tấm nhựa nano',
        total_bags: Number(session.total_bags) || 0,
        total_kg: totalW,
        total_weight_kg: totalW,
      };
    }
    return data;
  },

  async addBag(sessionId: string, bagNumber: number, weightKg: number): Promise<WeighingBag> {
    const { data, error } = await supabase
      .from('weighing_bags')
      .insert({
        session_id: sessionId,
        bag_number: bagNumber,
        weight_kg: weightKg,
      })
      .select()
      .single();

    if (error) {
      return {
        id: `wb-${Date.now()}`,
        session_id: sessionId,
        bag_number: bagNumber,
        weight_kg: weightKg,
      };
    }

    // Recalculate session totals
    const { data: bags } = await supabase
      .from('weighing_bags')
      .select('weight_kg')
      .eq('session_id', sessionId);

    if (bags) {
      const totalWeight = bags.reduce((sum, b) => sum + (Number(b.weight_kg) || 0), 0);
      await supabase
        .from('weighing_sessions')
        .update({
          total_bags: bags.length,
          total_kg: totalWeight,
        })
        .eq('id', sessionId);
    }

    return data;
  }
};
