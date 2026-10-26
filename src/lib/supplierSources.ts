import type { Contact, Import, SourceCategory } from '../types';
import { computeRemainingWithLegacyStatus } from './calc';

export interface SourceCategoryConfig {
  id: SourceCategory;
  label: string;
  shortLabel: string;
  badgeClass: string;
}

export const SOURCE_CATEGORY_CONFIG: Record<SourceCategory, SourceCategoryConfig> = {
  factory: {
    id: 'factory',
    label: 'Nhà máy / Xưởng SX',
    shortLabel: 'Nhà máy',
    badgeClass:
      'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800',
  },
  warehouse: {
    id: 'warehouse',
    label: 'Vựa phế / Đại lý',
    shortLabel: 'Vựa / Đại lý',
    badgeClass:
      'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800',
  },
  construction: {
    id: 'construction',
    label: 'Công trình / Đội thi công',
    shortLabel: 'Công trình',
    badgeClass:
      'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
  },
  individual: {
    id: 'individual',
    label: 'Điểm thu gom / Nhỏ lẻ',
    shortLabel: 'Thu gom lẻ',
    badgeClass:
      'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800',
  },
  other: {
    id: 'other',
    label: 'Nguồn khác',
    shortLabel: 'Khác',
    badgeClass:
      'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  },
};

export const COMMON_REGIONS = [
  'Đà Nẵng',
  'Quảng Nam',
  'TT-Huế',
  'Quảng Trị',
  'Quảng Ngãi',
  'Bình Dương',
  'Đồng Nai',
  'TP.HCM',
];

export const COMMON_MATERIAL_TYPES = [
  'Tấm nhựa nano',
  'Phế nhựa NVL',
  'Phế PVC trắng',
  'Phế cắt đầu tấm',
  'Phế thành phẩm',
];

export interface SupplierCollectionStats {
  contactId: string;
  tripCount: number;
  totalKg: number;
  totalAmount: number;
  payableAmount: number;
  lastCollectionDate?: string;
  daysSinceLastCollection: number | null;
  needsFollowUp: boolean;
}

export function getSourceCategoryConfig(category?: SourceCategory | string | null): SourceCategoryConfig {
  if (category && category in SOURCE_CATEGORY_CONFIG) {
    return SOURCE_CATEGORY_CONFIG[category as SourceCategory];
  }
  return SOURCE_CATEGORY_CONFIG.other;
}

/**
 * Tính toán thống kê sản lượng thu mua, số chuyến, ngày lấy gần nhất và dư nợ
 * cho từng đơn vị nhập phế để Anh Hồ và Chủ xưởng theo dõi trực tiếp.
 */
export function computeSupplierCollectionStatsMap(
  suppliers: Contact[],
  imports: Import[],
  paidByImport: Record<string, number>,
  referenceDate: string,
  followUpThresholdDays = 14,
): Record<string, SupplierCollectionStats> {
  const refMs = Date.parse(`${referenceDate}T00:00:00Z`);
  const map: Record<string, SupplierCollectionStats> = {};

  for (const s of suppliers) {
    map[s.id] = {
      contactId: s.id,
      tripCount: 0,
      totalKg: 0,
      totalAmount: 0,
      payableAmount: 0,
      lastCollectionDate: undefined,
      daysSinceLastCollection: null,
      needsFollowUp: false,
    };
  }

  for (const imp of imports) {
    if (!imp.contact_id) continue;
    if (!map[imp.contact_id]) {
      map[imp.contact_id] = {
        contactId: imp.contact_id,
        tripCount: 0,
        totalKg: 0,
        totalAmount: 0,
        payableAmount: 0,
        lastCollectionDate: undefined,
        daysSinceLastCollection: null,
        needsFollowUp: false,
      };
    }
    const stat = map[imp.contact_id];
    stat.tripCount += 1;
    stat.totalKg += Number(imp.quantity_kg) || 0;
    stat.totalAmount += Number(imp.total_amount) || 0;
    stat.payableAmount += computeRemainingWithLegacyStatus(
      imp.total_amount,
      paidByImport[imp.id] || 0,
      imp.payment_status,
    );

    if (!stat.lastCollectionDate || imp.date > stat.lastCollectionDate) {
      stat.lastCollectionDate = imp.date;
    }
  }

  for (const stat of Object.values(map)) {
    if (stat.lastCollectionDate && !Number.isNaN(refMs)) {
      const lastMs = Date.parse(`${stat.lastCollectionDate}T00:00:00Z`);
      if (!Number.isNaN(lastMs)) {
        const diffDays = Math.max(0, Math.round((refMs - lastMs) / 86_400_000));
        stat.daysSinceLastCollection = diffDays;
        stat.needsFollowUp = diffDays > followUpThresholdDays;
      }
    } else {
      stat.needsFollowUp = true;
    }
  }

  return map;
}

export interface CollectorLogSummary {
  collectorName: string;
  tripCount: number;
  uniqueSuppliersCount: number;
  totalKg: number;
  totalAmount: number;
  paidCount: number;
  unpaidAmount: number;
}

export function summarizeCollectorLog(
  imports: Import[],
  collectorName = 'Anh Hồ',
): CollectorLogSummary {
  const normalizedTarget = collectorName.trim().toLowerCase();
  const matching = imports.filter(
    (imp) => (imp.collector_name || 'Anh Hồ').trim().toLowerCase() === normalizedTarget,
  );

  const uniqueSuppliers = new Set<string>();
  let totalKg = 0;
  let totalAmount = 0;
  let paidCount = 0;
  let unpaidAmount = 0;

  for (const imp of matching) {
    if (imp.contact_id) uniqueSuppliers.add(imp.contact_id);
    else if (imp.contact_name) uniqueSuppliers.add(imp.contact_name);

    totalKg += Number(imp.quantity_kg) || 0;
    const amt = Number(imp.total_amount) || 0;
    totalAmount += amt;
    if (imp.payment_status === 'paid') {
      paidCount += 1;
    } else if (imp.payment_status === 'unpaid') {
      unpaidAmount += amt;
    }
  }

  return {
    collectorName,
    tripCount: matching.length,
    uniqueSuppliersCount: uniqueSuppliers.size,
    totalKg,
    totalAmount,
    paidCount,
    unpaidAmount,
  };
}
