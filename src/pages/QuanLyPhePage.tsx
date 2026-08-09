import * as React from 'react';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowDownToLine, Settings2, ArrowUpFromLine, Scale, Plus } from 'lucide-react';
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
  const actionRef = React.useRef<(() => void) | null>(null);

  useEffect(() => {
    const tab = searchParams.get('tab') as PheTab;
    if (tab && ['nhap', 'xay', 'xuat', 'can'].includes(tab) && tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [searchParams, activeTab]);

  const getActionLabel = (tab: PheTab) => {
    switch (tab) {
      case 'nhap':
        return 'Thêm phiếu nhập';
      case 'xay':
        return 'Ghi phiếu xay';
      case 'xuat':
        return 'Thêm phiếu xuất';
      case 'can':
        return 'Phiên cân mới';
    }
  };

  const handleActionClick = () => {
    if (actionRef.current) {
      actionRef.current();
    }
  };

  const handleTabChange = (tab: PheTab) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', tab);
    next.delete('open');
    setSearchParams(next);
  };

  return (
    <div className="page-shell animate-fade-in">
      {/* CIC-IBST UNIFIED TOP TOOLBAR ROW */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* CIC-IBST Pill Tabs Segmented Control */}
        <div role="tablist" aria-label="Nghiệp vụ quản lý phế" className="grid w-full grid-cols-2 gap-1 bg-[var(--bg-surface)] p-1.5 rounded-xl shadow-xs border border-[var(--border-color)] sm:flex sm:w-fit">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`phe-panel-${tab.id}`}
                onClick={() => handleTabChange(tab.id)}
                className={cn(
                  'tap-target sm:min-h-0 sm:min-w-0 flex items-center justify-center gap-1.5 px-3.5 sm:py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer',
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

        {/* Right aligned action button in exact same row */}
        <button onClick={handleActionClick} className="btn-primary min-h-11 w-full justify-center sm:w-auto flex items-center gap-2">
          <Plus size={16} /> {getActionLabel(activeTab)}
        </button>
      </div>

      {/* Tab Content */}
      <div id={`phe-panel-${activeTab}`} role="tabpanel" className="transition-all duration-200">
        {activeTab === 'nhap' && <NhapPhePage actionRef={actionRef} />}
        {activeTab === 'xay' && <XayPhePage actionRef={actionRef} />}
        {activeTab === 'xuat' && <XuatPhePage actionRef={actionRef} />}
        {activeTab === 'can' && <CanPhePage actionRef={actionRef} />}
      </div>
    </div>
  );
};
