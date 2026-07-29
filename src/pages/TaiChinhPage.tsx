import * as React from 'react';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Receipt, FileText } from 'lucide-react';
import { cn } from '../lib/utils';
import { ChiPhiPage } from './ChiPhiPage';
import { CongNoPage } from './CongNoPage';

type TaiChinhTab = 'chiphi' | 'congno';

const TABS: { id: TaiChinhTab; label: string; icon: React.ElementType; color: string }[] = [
  { id: 'chiphi', label: 'Chi phí & Ứng tiền', icon: Receipt, color: 'text-amber-600' },
  { id: 'congno', label: 'Công nợ (Thu / Trả)', icon: FileText, color: 'text-rose-600' },
];

export const TaiChinhPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = (searchParams.get('tab') as TaiChinhTab) || 'chiphi';
  const [activeTab, setActiveTab] = useState<TaiChinhTab>(tabParam);

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
              Quản Lý Tài Chính
            </h1>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Theo dõi toàn bộ chi phí xưởng, tiền ứng kho và công nợ phải thu/trả
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
        {activeTab === 'chiphi' && <ChiPhiPage />}
        {activeTab === 'congno' && <CongNoPage />}
      </div>
    </div>
  );
};
