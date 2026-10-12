export const lossCategoryLabels = {
  unclassified: 'Chưa phân loại',
  sorting: 'Tạp chất / phân loại',
  moisture: 'Độ ẩm / sấy',
  machine: 'Xay / máy móc',
  transport: 'Bốc xếp / vận chuyển',
  other: 'Nguyên nhân khác',
} as const;
export type LossCategory = keyof typeof lossCategoryLabels;
