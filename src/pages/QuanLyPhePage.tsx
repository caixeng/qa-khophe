import * as React from 'react';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowDownToLine, Settings2, ArrowUpFromLine, Scale } from 'lucide-react';
import { cn } from '../lib/utils';
import { NhapPhePage } from './NhapPhePage';
import { XayPhePage } from './XayPhePage';
import { XuatPhePage } from './XuatPhePage';
import { CanPhePage } from './CanPhePage';

type PheTab = 'nhap' | 'xay' | 'xuat' | 'can';

const TABS: { id: PheTab; label: string; icon: React.ElementType; color: string }[] = [
  { id: 'nhap', label: 'Nhập phế', icon: ArrowDownToLine, color: 'text-emerald-600' },
  { id: 'xay', label: 'Xay phế', icon: Settings2, color: 'text-amber-600' },
  { id: 'xuat', label: 'Xuất phế', icon: ArrowUpFromLine, color: 'text-blue-600' },
  { id: 'can', label: 'Cân phế', icon: Scale, color: 'text-purple-600' },
];

export const QuanLyPhePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = (searchParams.get('tab') as PheTab) || 'nhap';
  const [activeTab, setActiveTab] = useState<PheTab>(tabParam);

  useEffect(() => {
    if (searchParams.get('tab') !== activeTab) {
      setSearchParams({ tab: activeTab }, { replace: true });
    }
  }, [activeTab]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header & Tab Navigation */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              Quản Lý Phế Liệu
            </h1>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Tập trung quản lý các công đoạn nhập, xay nghiền, xuất bán và cân phế
            </p>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-2 overflow-x-auto border-b border-[var(--border-color)] pb-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap border relative",
                  isActive
                    ? "bg-[var(--primary-50)] text-[var(--primary-600)] border-[var(--primary-500)]/30 shadow-xs"
                    : "bg-transparent text-[var(--text-secondary)] border-transparent hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
                )}
              >
                <Icon size={16} className={cn(isActive ? "text-[var(--primary-500)]" : tab.color)} />
                <span>{tab.label}</span>
                {isActive && (
                  <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-[var(--primary-500)] rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="transition-all duration-200">
        {activeTab === 'nhap' && <NhapPhePage />}
        {activeTab === 'xay' && <XayPhePage />}
        {activeTab === 'xuat' && <XuatPhePage />}
        {activeTab === 'can' && <CanPhePage />}
      </div>
    </div>
  );
};
