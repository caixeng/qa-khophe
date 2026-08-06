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
  const [searchParams] = useSearchParams();
  const tabParam = (searchParams.get('tab') as TaiChinhTab) || 'chiphi';
  const [activeTab, setActiveTab] = useState<TaiChinhTab>(tabParam);

  useEffect(() => {
    const tab = searchParams.get('tab') as TaiChinhTab;
    if (tab && ['chiphi', 'congno'].includes(tab) && tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [searchParams, activeTab]);

  return (
    <div className="page-shell animate-fade-in">
      {/* CIC-IBST Pill Tabs Segmented Control */}
      <div className="flex flex-wrap items-center gap-1 bg-[var(--bg-surface)] p-1.5 rounded-xl shadow-xs border border-[var(--border-color)] w-fit">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
                isActive
                  ? "bg-[var(--primary-500)] text-white shadow-xs"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
              )}
            >
              <Icon size={14} className={isActive ? "text-white" : tab.color} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="transition-all duration-200">
        {activeTab === 'chiphi' && <ChiPhiPage />}
        {activeTab === 'congno' && <CongNoPage />}
      </div>
    </div>
  );
};
