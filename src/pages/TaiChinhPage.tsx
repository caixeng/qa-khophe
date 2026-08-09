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
    const tab = searchParams.get('tab') as TaiChinhTab;
    if (tab && ['chiphi', 'congno'].includes(tab) && tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [searchParams, activeTab]);

  const handleTabChange = (tab: TaiChinhTab) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', tab);
    next.delete('open');
    setSearchParams(next);
  };

  return (
    <div className="page-shell animate-fade-in">
      {/* CIC-IBST Pill Tabs Segmented Control */}
      <div role="tablist" aria-label="Nghiệp vụ tài chính" className="grid w-full grid-cols-2 gap-1 bg-[var(--bg-surface)] p-1.5 rounded-xl shadow-xs border border-[var(--border-color)] sm:flex sm:w-fit">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`finance-panel-${tab.id}`}
              onClick={() => handleTabChange(tab.id)}
              className={cn(
                'tap-target sm:min-h-0 sm:min-w-0 flex items-center justify-center gap-1.5 px-3.5 sm:py-1.5 rounded-lg text-xs font-bold transition-all whitespace-normal sm:whitespace-nowrap cursor-pointer',
                isActive
                  ? 'bg-[var(--primary-500)] text-white shadow-xs'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]',
              )}
            >
              <Icon size={14} className={isActive ? 'text-white' : tab.color} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div id={`finance-panel-${activeTab}`} role="tabpanel" className="transition-all duration-200">
        {activeTab === 'chiphi' && <ChiPhiPage />}
        {activeTab === 'congno' && <CongNoPage />}
      </div>
    </div>
  );
};
