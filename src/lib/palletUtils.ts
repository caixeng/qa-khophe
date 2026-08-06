// =============================================
// QA KHOPHE — Pallet ("Ba lết") & Tare Weight Utils
// Quy định trừ bì ba lết & lồng sắt
// =============================================

export type PalletType = 'none' | 'sat' | 'go' | 'nhua' | 'long_sat';

export interface PalletConfig {
  id: PalletType;
  name: string;
  symbol: string;
  weightKg: number;
}

export const PALLET_TYPES: Record<PalletType, PalletConfig> = {
  none: { id: 'none', name: 'Không ba lết', symbol: 'Không', weightKg: 0 },
  sat: { id: 'sat', name: 'Ba lết Sắt', symbol: 'S', weightKg: 41 },
  go: { id: 'go', name: 'Ba lết Gỗ', symbol: 'G', weightKg: 27 },
  nhua: { id: 'nhua', name: 'Ba lết Nhựa', symbol: 'N', weightKg: 20 },
  long_sat: { id: 'long_sat', name: 'Lồng bằng Sắt', symbol: 'Lồng', weightKg: 81 },
};

/**
  Tự động tính tổng khối lượng trừ bì ba lết
 */
export function calculatePalletTare(type: PalletType, quantity: number = 1): number {
  const config = PALLET_TYPES[type] || PALLET_TYPES.none;
  return config.weightKg * Math.max(0, quantity);
}

/**
  Tính khối lượng phế thực tế sau khi trừ bì lết
 */
export function calculateNetScrapWeight(
  grossWeightKg: number,
  type: PalletType,
  quantity: number = 1,
): number {
  const tareWeight = calculatePalletTare(type, quantity);
  return Math.max(0, grossWeightKg - tareWeight);
}
