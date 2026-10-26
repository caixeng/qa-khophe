import { describe, expect, it } from 'vitest';
import {
  computeSupplierCollectionStatsMap,
  getSourceCategoryConfig,
  summarizeCollectorLog,
} from './supplierSources';
import type { Contact, Import } from '../types';

describe('supplierSources helpers', () => {
  const suppliers: Contact[] = [
    {
      id: 'sup-1',
      name: 'Xưởng Nano Hòa Khánh',
      type: 'supplier',
      source_category: 'factory',
      region: 'Đà Nẵng',
      collector_name: 'Anh Hồ',
    },
    {
      id: 'sup-2',
      name: 'Vựa Phế A Danh',
      type: 'supplier',
      source_category: 'warehouse',
      region: 'Quảng Nam',
      collector_name: 'Anh Hồ',
    },
  ];

  const imports: Import[] = [
    {
      id: 'imp-1',
      date: '2026-10-20',
      contact_id: 'sup-1',
      contact_name: 'Xưởng Nano Hòa Khánh',
      quantity_kg: 5000,
      material_type: 'Tấm nhựa nano',
      price_per_kg: 4500,
      total_amount: 22500000,
      payment_status: 'paid',
      processing_status: 'done',
      collector_name: 'Anh Hồ',
    },
    {
      id: 'imp-2',
      date: '2026-10-25',
      contact_id: 'sup-1',
      contact_name: 'Xưởng Nano Hòa Khánh',
      quantity_kg: 3000,
      material_type: 'Tấm nhựa nano',
      price_per_kg: 4500,
      total_amount: 13500000,
      payment_status: 'unpaid',
      processing_status: 'pending',
      collector_name: 'Anh Hồ',
    },
    {
      id: 'imp-3',
      date: '2026-10-01',
      contact_id: 'sup-2',
      contact_name: 'Vựa Phế A Danh',
      quantity_kg: 4000,
      material_type: 'Phế nhựa NVL',
      price_per_kg: 4400,
      total_amount: 17600000,
      payment_status: 'partial',
      processing_status: 'done',
      collector_name: 'Anh Hồ',
    },
  ];

  it('computes collection stats, last trip date, follow-up warning and payable per supplier', () => {
    const statsMap = computeSupplierCollectionStatsMap(
      suppliers,
      imports,
      { 'imp-3': 10000000 },
      '2026-10-26',
      14,
    );

    expect(statsMap['sup-1']).toEqual({
      contactId: 'sup-1',
      tripCount: 2,
      totalKg: 8000,
      totalAmount: 36000000,
      payableAmount: 13500000,
      lastCollectionDate: '2026-10-25',
      daysSinceLastCollection: 1,
      needsFollowUp: false,
    });

    expect(statsMap['sup-2']).toEqual({
      contactId: 'sup-2',
      tripCount: 1,
      totalKg: 4000,
      totalAmount: 17600000,
      payableAmount: 7600000,
      lastCollectionDate: '2026-10-01',
      daysSinceLastCollection: 25,
      needsFollowUp: true,
    });
  });

  it('summarizes daily/period collection log for Anh Hồ', () => {
    const log = summarizeCollectorLog(imports, 'Anh Hồ');
    expect(log).toEqual({
      collectorName: 'Anh Hồ',
      tripCount: 3,
      uniqueSuppliersCount: 2,
      totalKg: 12000,
      totalAmount: 53600000,
      paidCount: 1,
      unpaidAmount: 13500000,
    });
  });

  it('returns fallback config for unknown source category', () => {
    expect(getSourceCategoryConfig('factory').shortLabel).toBe('Nhà máy');
    expect(getSourceCategoryConfig('unknown').id).toBe('other');
  });
});
