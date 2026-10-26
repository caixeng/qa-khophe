import * as React from 'react';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowDownToLine, Settings2, ArrowUpFromLine, Scale, Plus } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/auth';
import { NhapPhePage } from './NhapPhePage';
import { XayPhePage } from './XayPhePage';
import { XuatPhePage } from './XuatPhePage';
import { CanPhePage } from './CanPhePage';

type PheTab = 'nhap' | 'xay' | 'xuat' | 'can';

const TABS: { id: PheTab; label: string; shortLabel: string; icon: React.ElementType; color: string }[] = [
  { id: 'nhap', label: 'Nhập phế', shortLabel: 'Nhập', icon: ArrowDownToLine, color: 'text-emerald-600' },
  { id: 'xay', label: 'Xay phế', shortLabel: 'Xay', icon: Settings2, color: 'text-amber-600' },
  { id: 'xuat', label: 'Xuất phế', shortLabel: 'Xuất', icon: ArrowUpFromLine, color: 'text-blue-600' },
  { id: 'can', label: 'Cân phế', shortLabel: 'Cân', icon: Scale, color: 'text-purple-600' },
];

export const QuanLyPhePage: React.FC = () => {
  const { can } = useAuth();
  const canCreateScrap = can('scrap.create');
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
      {/* CIC-IBST UNIFIED TOP TOOLBAR ROW — gọn 1 hàng trên mobile */}
      <div className="flex items-center justify-between gap-2">
        {/* Segmented Control 4 cột gọn gàng */}
        <div
          role="tablist"
          aria-label="Nghiệp vụ quản lý phế"
          className="grid flex-1 grid-cols-4 gap-1 bg-[var(--bg-surface)] p-1 rounded-xl shadow-2xs border border-[var(--border-color)] sm:flex sm:flex-none sm:w-fit"
        >
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
                  'h-8 sm:h-9 flex items-center justify-center gap-1 sm:gap-1.5 px-1.5 sm:px-3.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all whitespace-nowrap cursor-pointer',
                  isActive
                    ? 'bg-[var(--primary-500)] text-white shadow-2xs'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]',
                )}
              >
                <Icon size={13} className={cn('shrink-0', isActive ? 'text-white' : tab.color)} />
                <span className="sm:hidden">{tab.shortLabel}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Nút thêm phiếu nằm gọn trên cùng hàng */}
        {canCreateScrap && (
          <button
            onClick={handleActionClick}
            aria-label={getActionLabel(activeTab)}
            className="btn-primary !min-h-8 sm:!min-h-9 !px-2.5 sm:!px-3.5 !py-1.5 shrink-0 flex items-center justify-center gap-1"
          >
            <Plus size={15} />
            <span className="hidden sm:inline">{getActionLabel(activeTab)}</span>
            <span className="sm:hidden">Thêm</span>
          </button>
        )}
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
