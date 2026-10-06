import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTien(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount);
}

export function formatNgay(dateString?: string | Date | null): string {
  if (!dateString) return '';
  if (dateString instanceof Date) {
    const day = dateString.getDate().toString().padStart(2, '0');
    const month = (dateString.getMonth() + 1).toString().padStart(2, '0');
    const year = dateString.getFullYear();
    return `${day}/${month}/${year}`;
  }
  // Tách chuỗi trực tiếp thay vì qua new Date() để tránh UTC conversion
  const parts = dateString.split('-');
  if (parts.length !== 3) return dateString;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export function formatKg(kg: number): string {
  return (
    new Intl.NumberFormat('vi-VN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    }).format(kg) + ' kg'
  );
}

export function formatPhanTram(pct: number): string {
  return (
    new Intl.NumberFormat('vi-VN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    }).format(pct) + '%'
  );
}

export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const ROLE_LABELS: Record<string, string> = {
  admin: 'Quản trị viên',
  manager: 'Quản lý',
  staff: 'Nhân viên',
};

export function formatRole(role?: string): string {
  return ROLE_LABELS[role || ''] || 'Chưa phân quyền';
}
