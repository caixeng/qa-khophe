import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

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

const PRIMARY_COLOR_MAP: Record<PrimaryColor, {
  primary: string;
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
}> = {
  teal: {
    primary: '#00668c',
    50: '#f2f8fc', 100: '#d4eaf7', 200: '#b6ccd8', 300: '#71c4ef', 400: '#3995b8',
    500: '#00668c', 600: '#005273', 700: '#00415a', 800: '#003047', 900: '#001f30'
  },
  red: {
    primary: '#ae1e23',
    50: '#fef2f2', 100: '#fee2e2', 200: '#fca5a5', 300: '#f87171', 400: '#ef4444',
    500: '#ae1e23', 600: '#991b1b', 700: '#8b181c', 800: '#7f1d1d', 900: '#450a0a'
  },
  blue: {
    primary: '#2563eb',
    50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd', 400: '#60a5fa',
    500: '#2563eb', 600: '#1d4ed8', 700: '#1e40af', 800: '#1e3a8a', 900: '#172554'
  },
  emerald: {
    primary: '#059669',
    50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 300: '#6ee7b7', 400: '#34d399',
    500: '#059669', 600: '#047857', 700: '#065f46', 800: '#064e3b', 900: '#022c22'
  },
  amber: {
    primary: '#d97706',
    50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d', 400: '#fbbf24',
    500: '#d97706', 600: '#b45309', 700: '#92400e', 800: '#78350f', 900: '#451a03'
  },
  rose: {
    primary: '#e11d48',
    50: '#fff1f2', 100: '#ffe4e6', 200: '#fecdd3', 300: '#fda4af', 400: '#fb7185',
    500: '#e11d48', 600: '#be123c', 700: '#9f1239', 800: '#881337', 900: '#4c0519'
  },
  violet: {
    primary: '#7c3aed',
    50: '#f5f3ff', 100: '#ede9fe', 200: '#ddd6fe', 300: '#c4b5fd', 400: '#a78bfa',
    500: '#7c3aed', 600: '#6d28d9', 700: '#5b21b6', 800: '#4c1d95', 900: '#2e1065'
  },
  cyan: {
    primary: '#0891b2',
    50: '#ecfeff', 100: '#cffafe', 200: '#a5f3fc', 300: '#67e8f9', 400: '#22d3ee',
    500: '#0891b2', 600: '#0e7490', 700: '#155e75', 800: '#164e63', 900: '#083344'
  },
  indigo: {
    primary: '#4f46e5',
    50: '#eef2ff', 100: '#e0e7ff', 200: '#c7d2fe', 300: '#a5b4fc', 400: '#818cf8',
    500: '#4f46e5', 600: '#4338ca', 700: '#3730a3', 800: '#312e81', 900: '#1e1b4b'
  }
};

const DENSITY_MAP: Record<Density, {
  fontSize: string;
  cellPy: string;
  cellPx: string;
  cardP: string;
}> = {
  comfortable: { fontSize: '14px', cellPy: '0.75rem', cellPx: '1rem', cardP: '1.25rem' },
  compact: { fontSize: '13px', cellPy: '0.5rem', cellPx: '0.75rem', cardP: '1rem' },
  dense: { fontSize: '12px', cellPy: '0.375rem', cellPx: '0.625rem', cardP: '0.75rem' },
};

interface ThemeContextType {
  theme: Theme;
  setTheme: (t: Theme) => void;
  primaryColor: PrimaryColor;
  setPrimaryColor: (c: PrimaryColor) => void;
  density: Density;
  setDensity: (d: Density) => void;
}

export const ThemeContext = createContext<ThemeContextType | null>(null);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem('khophe_theme');
    return saved === 'dark' || saved === 'light' || saved === 'nature' ? saved : 'nature';
  });

  const [primaryColor, setPrimaryColorState] = useState<PrimaryColor>(() => {
    const saved = localStorage.getItem('khophe_primaryColor');
    return PRIMARY_COLORS.some(c => c.id === saved) ? (saved as PrimaryColor) : 'teal';
  });

  const [density, setDensityState] = useState<Density>(() => {
    const saved = localStorage.getItem('khophe_density');
    return saved === 'compact' || saved === 'dense' || saved === 'comfortable' ? saved : 'comfortable';
  });

  // Apply Theme Mode (nature | light | dark)
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    root.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  // Apply Primary Color Palette
  useEffect(() => {
    const root = document.documentElement;
    const colors = PRIMARY_COLOR_MAP[primaryColor];
    if (colors) {
      root.style.setProperty('--primary-50', colors[50]);
      root.style.setProperty('--primary-100', colors[100]);
      root.style.setProperty('--primary-200', colors[200]);
      root.style.setProperty('--primary-300', colors[300]);
      root.style.setProperty('--primary-400', colors[400]);
      root.style.setProperty('--primary-500', colors[500]);
      root.style.setProperty('--primary-600', colors[600]);
      root.style.setProperty('--primary-700', colors[700]);
      root.style.setProperty('--primary-800', colors[800]);
      root.style.setProperty('--primary-900', colors[900]);
    }
  }, [primaryColor]);

  // Apply Density / Size Scale
  useEffect(() => {
    const root = document.documentElement;
    const config = DENSITY_MAP[density];
    root.style.setProperty('--app-font-size', config.fontSize);
    root.style.setProperty('--density-cell-py', config.cellPy);
    root.style.setProperty('--density-cell-px', config.cellPx);
    root.style.setProperty('--density-card-p', config.cardP);
  }, [density]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    localStorage.setItem('khophe_theme', t);
  }, []);

  const setPrimaryColor = useCallback((c: PrimaryColor) => {
    setPrimaryColorState(c);
    localStorage.setItem('khophe_primaryColor', c);
  }, []);

  const setDensity = useCallback((d: Density) => {
    setDensityState(d);
    localStorage.setItem('khophe_density', d);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, primaryColor, setPrimaryColor, density, setDensity }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};
