import { createContext, useContext } from 'react';

/**
 * Types, hằng số và hook của Theme tách khỏi file chứa `ThemeProvider` để
 * React Fast Refresh làm mới được provider mà không remount cả cây component.
 */

export type Theme = 'nature' | 'light' | 'dark';
export type PrimaryColor = 'teal' | 'red' | 'blue' | 'emerald' | 'amber' | 'rose' | 'violet' | 'cyan' | 'indigo';
export type Density = 'comfortable' | 'compact' | 'dense';

export interface PrimaryColorOption {
  id: PrimaryColor;
  name: string;
  hex: string;
}

export const PRIMARY_COLORS: PrimaryColorOption[] = [
  { id: 'teal', name: 'Teal Doanh Nghiệp (CIC-IBST)', hex: '#00668c' },
  { id: 'red', name: 'Đỏ Cờ IBST', hex: '#ae1e23' },
  { id: 'blue', name: 'Xanh Dương Modern', hex: '#2563eb' },
  { id: 'emerald', name: 'Ngọc Lục Bảo', hex: '#059669' },
  { id: 'amber', name: 'Hoàng Kim Amber', hex: '#d97706' },
  { id: 'rose', name: 'Hồng Ngọc Rose', hex: '#e11d48' },
  { id: 'violet', name: 'Thạch Anh Tím', hex: '#7c3aed' },
  { id: 'cyan', name: 'Xanh Đại Dương', hex: '#0891b2' },
  { id: 'indigo', name: 'Chàm Tím Indigo', hex: '#4f46e5' },
];

export interface ThemeContextType {
  theme: Theme;
  setTheme: (t: Theme) => void;
  primaryColor: PrimaryColor;
  setPrimaryColor: (c: PrimaryColor) => void;
  density: Density;
  setDensity: (d: Density) => void;
}

export const ThemeContext = createContext<ThemeContextType | null>(null);

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};
