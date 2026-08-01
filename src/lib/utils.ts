import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTien(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount);
}

export function formatNgay(dateString: string | Date): string {
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export function formatKg(kg: number): string {
  return new Intl.NumberFormat('vi-VN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1
  }).format(kg) + ' kg';
}

export function formatPhanTram(pct: number): string {
  return new Intl.NumberFormat('vi-VN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1
  }).format(pct) + '%';
}

export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const ROLE_LABELS: Record<string, string> = {
  admin: 'Quản trị viên',
  manager: 'Quản lý',
  staff: 'Nhân viên',
};

export function formatRole(role?: string): string {
  return ROLE_LABELS[role || ''] || 'Chưa phân quyền';
}
