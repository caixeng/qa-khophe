import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { MobileBottomSheet } from './MobileBottomSheet';
import { PackagePlus, Settings2, Truck, WalletCards } from 'lucide-react';
import { useAuth } from '../../contexts/auth';

interface MobileQuickActionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileQuickActionModal: React.FC<MobileQuickActionModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const actions = [
    {
      title: 'Nhập phế mới',
      desc: 'Cân & Nhập phế liệu từ nhà cung cấp',
      icon: PackagePlus,
      color: 'from-emerald-500 to-teal-600',
      textColor: 'text-emerald-600',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/40',
      borderColor: 'border-emerald-200 dark:border-emerald-900',
      action: () => {
        onClose();
        navigate('/phe?tab=nhap&open=true');
      },
      managerOnly: false,
    },
    {
      title: 'Lô Xay phế',
      desc: 'Tạo ca xay phế liệu nhựa thành hạt/xay',
      icon: Settings2,
      color: 'from-amber-500 to-orange-600',
      textColor: 'text-amber-600',
      bgColor: 'bg-amber-50 dark:bg-amber-950/40',
      borderColor: 'border-amber-200 dark:border-amber-900',
      action: () => {
        onClose();
        navigate('/phe?tab=xay&open=true');
      },
      managerOnly: false,
    },
    {
      title: 'Xuất phế / Bán phế',
      desc: 'Tạo phiếu xuất bán cho nhà máy/đối tác',
      icon: Truck,
      color: 'from-blue-500 to-indigo-600',
      textColor: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-950/40',
      borderColor: 'border-blue-200 dark:border-blue-900',
      action: () => {
        onClose();
        navigate('/phe?tab=xuat&open=true');
      },
      managerOnly: false,
    },
    {
      title: 'Ghi nhận Chi phí',
      desc: 'Nhập chi phí điện, xăng, vận chuyển, lương',
      icon: WalletCards,
      color: 'from-rose-500 to-pink-600',
      textColor: 'text-rose-600',
      bgColor: 'bg-rose-50 dark:bg-rose-950/40',
      borderColor: 'border-rose-200 dark:border-rose-900',
      action: () => {
        onClose();
        navigate('/tai-chinh?tab=chiphi&open=true');
      },
      managerOnly: true,
    },
  ];

  const visibleActions = actions.filter(
    (action) => !action.managerOnly || user?.role === 'manager' || user?.role === 'admin',
  );

  return (
    <MobileBottomSheet isOpen={isOpen} onClose={onClose} title="Thao tác nhanh xưởng phế">
      <div className="grid grid-cols-1 gap-3 pb-4">
        {visibleActions.map((act, index) => (
          <button
            key={index}
            onClick={act.action}
            className={`tap-target flex items-center gap-4 p-4 rounded-2xl border ${act.borderColor} ${act.bgColor} active:scale-98 transition-all text-left shadow-xs cursor-pointer`}
          >
            <div
              className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${act.color} flex items-center justify-center text-white shadow-md shrink-0`}
            >
              <act.icon size={22} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className={`font-black text-sm ${act.textColor}`}>{act.title}</h4>
              <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">{act.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </MobileBottomSheet>
  );
};
