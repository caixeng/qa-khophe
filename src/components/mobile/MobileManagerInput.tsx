import * as React from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Recycle, Scissors, Truck, DollarSign, X } from 'lucide-react';
import { cn } from '../../lib/utils';

export const MobileManagerInput: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const handleAction = (path: string) => {
    setIsOpen(false);
    navigate(path);
  };

  return (
    <div className="fixed bottom-20 right-4 z-40 lg:hidden">
      {/* Expanded Quick Action Wheel */}
      {isOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-30" onClick={() => setIsOpen(false)} />
          
          <div className="absolute bottom-16 right-0 flex flex-col items-end space-y-3 z-40 animate-fade-in-up">
            <button
              onClick={() => handleAction('/phe?tab=nhap')}
              className="flex items-center space-x-2 bg-emerald-600 text-white px-4 py-2.5 rounded-full shadow-lg text-xs font-bold transition-transform active:scale-95 cursor-pointer"
            >
              <Recycle size={16} />
              <span>+ Nhập Phế</span>
            </button>

            <button
              onClick={() => handleAction('/phe?tab=xay')}
              className="flex items-center space-x-2 bg-amber-600 text-white px-4 py-2.5 rounded-full shadow-lg text-xs font-bold transition-transform active:scale-95 cursor-pointer"
            >
              <Scissors size={16} />
              <span>+ Ghi Phiếu Xay</span>
            </button>

            <button
              onClick={() => handleAction('/phe?tab=xuat')}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2.5 rounded-full shadow-lg text-xs font-bold transition-transform active:scale-95 cursor-pointer"
            >
              <Truck size={16} />
              <span>+ Xuất Phế</span>
            </button>

            <button
              onClick={() => handleAction('/tai-chinh?tab=chiphi')}
              className="flex items-center space-x-2 bg-rose-600 text-white px-4 py-2.5 rounded-full shadow-lg text-xs font-bold transition-transform active:scale-95 cursor-pointer"
            >
              <DollarSign size={16} />
              <span>+ Ghi Chi Phí</span>
            </button>
          </div>
        </>
      )}

      {/* Main Floating Action Button (FAB) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-14 h-14 rounded-full bg-gradient-to-tr from-[var(--primary-600)] to-[var(--primary-400)] text-white flex items-center justify-center shadow-xl transition-all active:scale-90 cursor-pointer relative z-50",
          isOpen ? "rotate-45 bg-rose-600" : ""
        )}
        title="Thao tác nhanh Quản Lý Xưởng"
      >
        {isOpen ? <X size={24} /> : <Plus size={26} />}
      </button>
    </div>
  );
};
