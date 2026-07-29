// =============================================
// QA KHOPHE — TypeScript Types
// Khớp với Supabase schema + Pages
// =============================================

// --- Type aliases ---

export type UserRole = 'admin' | 'manager' | 'staff';
export type ContactType = 'supplier' | 'customer' | 'partner';
export type PaymentStatus = 'unpaid' | 'partial' | 'paid';
export type ProcessingStatus = 'pending' | 'grinding' | 'done';
export type ExpenseCategory = 'fuel' | 'blade' | 'oil' | 'labor' | 'parts' | 'transport' | 'maintenance' | 'other';
export type AdvanceType = 'advance' | 'settlement';

// --- Data Models ---

export interface User {
  id: string;
  auth_id?: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  is_active: boolean;
  created_at: string;
}

export interface Contact {
  id: string;
  name: string;
  type: ContactType;
  phone?: string;
  address?: string;
  notes?: string;
  status?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Import {
  id: string;
  date: string;
  contact_id?: string;
  contact_name?: string;
  quantity_kg: number;
  material_type: string;
  price_per_kg: number;
  total_amount: number;
  payment_status: PaymentStatus;
  processing_status: ProcessingStatus;
  notes?: string;
  created_by?: string;
  created_at?: string;
}

export interface Grinding {
  id: string;
  date: string;
  import_id?: string;
  input_qty_kg: number;
  output_qty_kg: number;
  loss_kg: number;
  loss_pct: number;
  bags_count?: number;
  worker?: string;
  notes?: string;
  created_by?: string;
  created_at?: string;
}

export interface Export {
  id: string;
  date: string;
  contact_id?: string;
  contact_name?: string;
  bags_count: number;
  total_kg: number;
  price_per_kg: number;
  total_amount: number;
  payment_status: PaymentStatus;
  weighing_session_id?: string;
  notes?: string;
  created_by?: string;
  created_at?: string;
}

export interface WeighingSession {
  id: string;
  date: string;
  material_type: string;
  total_bags: number;
  total_kg: number;
  notes?: string;
  created_by?: string;
  created_at?: string;
}

export interface WeighingBag {
  id: string;
  session_id: string;
  bag_number: number;
  weight_kg: number;
  notes?: string;
}

export interface Expense {
  id: string;
  date: string;
  category: ExpenseCategory;
  amount: number;
  description?: string;
  notes?: string;
  created_by?: string;
  created_at?: string;
}

export interface Advance {
  id: string;
  date: string;
  amount: number;
  person: string;
  type: AdvanceType;
  notes?: string;
  created_by?: string;
  created_at?: string;
}

// --- Runtime marker to prevent Vite from tree-shaking this module ---
// (Vite erases type-only modules since they produce no JS)
export const _dependencies = 'khophe-types';
