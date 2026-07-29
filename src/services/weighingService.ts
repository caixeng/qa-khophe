import { supabase } from '../lib/supabase';
import type { WeighingSession, WeighingBag } from '../types';

export const weighingService = {
  async getSessions(): Promise<WeighingSession[]> {
    const { data, error } = await supabase
      .from('weighing_sessions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getSessionBags(sessionId: string): Promise<WeighingBag[]> {
    const { data, error } = await supabase
      .from('weighing_bags')
      .select('*')
      .eq('session_id', sessionId)
      .order('bag_number', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async createSession(session: Partial<WeighingSession>): Promise<WeighingSession> {
    const { data, error } = await supabase
      .from('weighing_sessions')
      .insert({
        date: session.date || new Date().toISOString().split('T')[0],
        material_type: session.material_type || 'Tấm nhựa nano',
        total_bags: Number(session.total_bags) || 0,
        total_weight_kg: Number(session.total_weight_kg) || 0,
        notes: session.notes || null,
      })
      .select()
      .single();

    if (error) throw error;
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

    if (error) throw error;

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
          total_weight_kg: totalWeight,
        })
        .eq('id', sessionId);
    }

    return data;
  }
};
