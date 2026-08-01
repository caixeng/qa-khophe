/**
 * Công thức nghiệp vụ dùng chung — gom về một nơi để Dashboard, Tồn kho,
 * Báo cáo... luôn tính ra cùng một con số thay vì mỗi trang tự viết lại.
 */

export interface InventorySnapshot {
  currentStockKg: number;
  currentBags: number;
}

/** Tồn kho thành phẩm = tổng đã xay ra - tổng đã xuất bán. */
export function computeInventory(totalGroundKg: number, totalExportedKg: number, kgPerBag: number): InventorySnapshot {
  const currentStockKg = Math.max(0, totalGroundKg - totalExportedKg);
  const currentBags = kgPerBag > 0 ? Math.round(currentStockKg / kgPerBag) : 0;
  return { currentStockKg, currentBags };
}

/** Nợ còn lại của một phiếu = tổng tiền - tổng đã trả (0 nếu chưa có payments). */
export function computeRemaining(totalAmount: number, paidAmount: number): number {
  return Math.max(0, (Number(totalAmount) || 0) - (Number(paidAmount) || 0));
}

/**
 * Nợ còn lại có tính tới dữ liệu lịch sử: những phiếu đã được đánh dấu
 * `payment_status = 'paid'` TRƯỚC KHI sổ thanh toán (`payments`) tồn tại sẽ
 * không có bản ghi payments nào — nếu chỉ dựa vào tổng đã trả từ sổ, mọi
 * phiếu cũ đã trả sẽ bị tính nhầm thành còn nợ nguyên giá trị. Coi phiếu đã
 * "paid" nhưng chưa có bản ghi thanh toán nào là còn lại = 0 (tin dữ liệu cũ);
 * ngược lại luôn ưu tiên số liệu thật từ sổ thanh toán.
 */
export function computeRemainingWithLegacyStatus(
  totalAmount: number,
  paidAmount: number,
  paymentStatus: string | undefined,
): number {
  if (paymentStatus === 'paid' && (!paidAmount || paidAmount <= 0)) return 0;
  return computeRemaining(totalAmount, paidAmount);
}
