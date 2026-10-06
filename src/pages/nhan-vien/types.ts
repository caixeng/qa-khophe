import { Users, ShieldCheck, HardHat, Scale, Truck } from 'lucide-react';
import React from 'react';
import type { EmployeeRole } from '../../types';

export type EmployeeTab = 'employees' | 'attendance' | 'payroll';

export const roleLabels: Record<EmployeeRole, { label: string; icon: React.ElementType; color: string }> = {
  grinder: { label: 'Thợ xay phế', icon: HardHat, color: 'bg-amber-100 text-amber-900 border-amber-200' },
  weigher: { label: 'Thợ cân phế', icon: Scale, color: 'bg-blue-100 text-blue-900 border-blue-200' },
  driver: {
    label: 'Tài xế giao hàng',
    icon: Truck,
    color: 'bg-emerald-100 text-emerald-900 border-emerald-200',
  },
  manager: {
    label: 'Quản lý xưởng',
    icon: ShieldCheck,
    color: 'bg-purple-100 text-purple-900 border-purple-200',
  },
  staff: { label: 'Nhân viên xưởng', icon: Users, color: 'bg-slate-100 text-slate-900 border-slate-200' },
};
