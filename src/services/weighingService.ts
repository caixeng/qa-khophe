import { supabase } from '../lib/supabase';
import type { WeighingSession, WeighingBag } from '../types';

export const weighingService = {
  async getSessions(): Promise<WeighingSession[]> {
    const { data, error } = await supabase
      .from('weighing_sessions')
      .select('*')
      .order('date', { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
  },

  async getSessionBags(sessionId: string): Promise<WeighingBag[]> {
    const { data, error } = await supabase
      .from('weighing_bags')
      .select('*')
      .eq('session_id', sessionId)
      .order('bag_number', { ascending: true });

    if (error) throw new Error(error.message);
    return data || [];
  },

  async createSession(session: Partial<WeighingSession>): Promise<WeighingSession> {
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

    if (error) throw new Error(error.message);
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

    if (error) throw new Error(error.message);

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

    return data;
  }
};
