import { beforeEach, describe, expect, it, vi } from 'vitest';

const { rpcMock, insertMock, selectMock } = vi.hoisted(() => {
  const select = vi.fn();
  const insert = vi.fn(() => ({ select }));
  const rpc = vi.fn();
  return { rpcMock: rpc, insertMock: insert, selectMock: select };
});

vi.mock('../lib/supabase', () => ({
  supabase: {
    rpc: rpcMock,
    from: vi.fn(() => ({
      insert: insertMock,
    })),
  },
}));

import { paymentsService } from './paymentsService';

describe('paymentsService.recordBulkFifoPayment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('gọi RPC nguyên tử record_bulk_partner_payment khi có contact_id hợp lệ', async () => {
    rpcMock.mockResolvedValueOnce({
      data: {
        allocatedCount: 2,
        totalAllocated: 18_000_000,
        paymentIds: ['p1', 'p2'],
      },
      error: null,
    });

    const result = await paymentsService.recordBulkFifoPayment({
      contact_id: '11111111-2222-3333-4444-555555555555',
      ref_type: 'import',
      items: [
        { id: 'imp-2', date: '2026-10-05', remaining: 15_000_000 },
        { id: 'imp-1', date: '2026-10-01', remaining: 10_000_000 },
      ],
      totalAmount: 18_000_000,
      date: '2026-10-20',
      method: 'transfer',
      notes: 'Thanh toán gộp đợt 1',
    });

    expect(rpcMock).toHaveBeenCalledWith('record_bulk_partner_payment', {
      p_contact_id: '11111111-2222-3333-4444-555555555555',
      p_ref_type: 'import',
      p_total_amount: 18_000_000,
      p_date: '2026-10-20',
      p_method: 'transfer',
      p_advance_id: null,
      p_notes: 'Thanh toán gộp đợt 1',
    });
    expect(result).toEqual({
      settledCount: 2,
      allocatedAmount: 18_000_000,
    });
  });

  it('phân bổ FIFO theo ngày tăng dần khi khách vãng lai không có contact_id', async () => {
    selectMock.mockResolvedValueOnce({
      data: [{ id: 'pay-1' }, { id: 'pay-2' }],
      error: null,
    });

    const result = await paymentsService.recordBulkFifoPayment({
      contact_id: null,
      ref_type: 'export',
      items: [
        { id: 'exp-new', date: '2026-10-12', remaining: 10_000_000 },
        { id: 'exp-old', date: '2026-10-02', remaining: 8_000_000 },
      ],
      totalAmount: 12_000_000,
      date: '2026-10-25',
      method: 'cash',
      notes: 'Thu nợ gộp khách lẻ',
    });

    expect(insertMock).toHaveBeenCalledTimes(1);
    const insertedRows = (
      insertMock.mock.calls[0] as unknown as [Array<{ ref_id: string; amount: number }>]
    )[0];
    expect(insertedRows).toHaveLength(2);
    expect(insertedRows[0]).toMatchObject({
      ref_id: 'exp-old',
      amount: 8_000_000,
    });
    expect(insertedRows[1]).toMatchObject({
      ref_id: 'exp-new',
      amount: 4_000_000,
    });
    expect(result).toEqual({
      settledCount: 2,
      allocatedAmount: 12_000_000,
    });
  });

  it('từ chối khi tổng số tiền <= 0 hoặc không có phiếu nợ', async () => {
    await expect(
      paymentsService.recordBulkFifoPayment({
        ref_type: 'import',
        items: [{ id: 'imp-1', date: '2026-10-01', remaining: 5_000_000 }],
        totalAmount: 0,
      }),
    ).rejects.toThrow('Tổng số tiền thanh toán phải lớn hơn 0.');

    await expect(
      paymentsService.recordBulkFifoPayment({
        ref_type: 'import',
        items: [],
        totalAmount: 5_000_000,
      }),
    ).rejects.toThrow('Không có phiếu công nợ nào cần thanh toán.');
  });
});
