import * as React from 'react';
import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Plus,
  Fuel,
  PenTool as Tool,
  Droplets,
  HardHat,
  Wrench,
  Truck,
  Settings,
  FileText,
  DollarSign,
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  Trash2,
} from 'lucide-react';
import { cn, formatTien, formatNgay } from '../lib/utils';
import { PageHeader } from '../components/PageHeader';
import { Modal, FormField } from '../components/Modal';
import { TableToolbar } from '../components/TableToolbar';
import { KpiCard } from '../components/KpiCard';
import { DataState } from '../components/DataState';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useAsyncList } from '../hooks/useAsyncData';
import { useCrudForm } from '../hooks/useCrudForm';
import { useTableControls } from '../hooks/useTableControls';
import { useToast } from '../contexts/toast';
import { expensesService } from '../services/expensesService';
import type { Expense, Advance } from '../types';

const categoryConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  fuel: { label: 'Xăng', icon: Fuel, color: 'text-orange-500' },
  blade: { label: 'Dao cắt', icon: Tool, color: 'text-gray-700' },
  oil: { label: 'Dầu máy', icon: Droplets, color: 'text-yellow-600' },
  labor: { label: 'Nhân công', icon: HardHat, color: 'text-blue-500' },
  parts: { label: 'Phụ tùng', icon: Wrench, color: 'text-slate-500' },
  transport: { label: 'Vận chuyển', icon: Truck, color: 'text-green-600' },
  maintenance: { label: 'Bảo trì', icon: Settings, color: 'text-purple-500' },
  other: { label: 'Khác', icon: FileText, color: 'text-gray-400' },
};

export const ChiPhiPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'chiphi' | 'ungtien'>('chiphi');
  const {
    data: expenses,
    loading: expLoading,
    error: expError,
    refetch: refetchExp,
  } = useAsyncList(expensesService.getExpenses, []);
  const {
    data: advances,
    loading: advLoading,
    error: advError,
    refetch: refetchAdv,
  } = useAsyncList(expensesService.getAdvances, []);

  const { searchQuery, setSearchQuery } = useTableControls();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [savingAdv, setSavingAdv] = useState(false);
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    id: string;
    type: 'expense' | 'advance';
  }>({ isOpen: false, id: '', type: 'expense' });

  const { formState, openModal, closeModal, handleChange } = useCrudForm<Expense>({
    initialData: {
      date: new Date().toISOString().split('T')[0],
      category: 'fuel',
      amount: 0,
      description: '',
      notes: '',
    },
  });

  const {
    formState: advForm,
    openModal: openAdvModal,
    closeModal: closeAdvModal,
    handleChange: handleAdvChange,
  } = useCrudForm<Advance>({
    initialData: {
      date: new Date().toISOString().split('T')[0],
      amount: 0,
      person: 'Chủ xưởng',
      type: 'advance',
      notes: '',
    },
  });

  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get('open') === 'true') {
      openModal();
      const params = new URLSearchParams(window.location.search);
      if (params.has('open')) {
        params.delete('open');
        const newUrl = window.location.pathname + (params.toString() ? `?${params.toString()}` : '');
        window.history.replaceState({}, '', newUrl);
      }
    }
  }, [searchParams, openModal]);

  const filteredExpenses = useMemo(() => {
    if (!searchQuery) return expenses;
    const q = searchQuery.toLowerCase();
    return expenses.filter((e) => {
      const catLabel = categoryConfig[e.category]?.label.toLowerCase() || '';
      return (
        (e.description && e.description.toLowerCase().includes(q)) ||
        (e.notes && e.notes.toLowerCase().includes(q)) ||
        catLabel.includes(q)
      );
    });
  }, [expenses, searchQuery]);

  const totalExpense = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const totalFuel = expenses
    .filter((e) => e.category === 'fuel')
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const totalBlade = expenses
    .filter((e) => e.category === 'blade')
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const totalOther = expenses
    .filter((e) => !['fuel', 'blade'].includes(e.category))
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const totalUng = advances
    .filter((a) => a.type === 'advance' || (a.type as string) === 'ung')
    .reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
  const totalHoan = advances
    .filter((a) => a.type === 'settlement' || (a.type as string) === 'hoan')
    .reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
  const totalConLai = totalUng - totalHoan;

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    const data = formState.data;
    const amount = Number(data.amount) || 0;
    if (amount <= 0) {
      toast.warning('Số tiền chi phí phải lớn hơn 0');
      return;
    }

    setSaving(true);
    try {
      await expensesService.createExpense({
        date: data.date || new Date().toISOString().split('T')[0],
        category: data.category || 'other',
        amount,
        description: data.description || '',
        notes: data.notes,
      });
      toast.success('Đã ghi nhận khoản chi phí');
      closeModal();
      refetchExp();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không lưu được khoản chi phí');
      console.error('Lỗi khi lưu chi phí:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteExpense = (id: string) => {
    setConfirmState({ isOpen: true, id, type: 'expense' });
  };

  const handleDeleteAdvance = (id: string) => {
    setConfirmState({ isOpen: true, id, type: 'advance' });
  };

  const confirmDeleteEntry = async () => {
    const { id, type } = confirmState;
    try {
      if (type === 'expense') {
        await expensesService.deleteExpense(id);
        toast.success('Đã xoá khoản chi phí');
        refetchExp();
      } else {
        await expensesService.deleteAdvance(id);
        toast.success('Đã xoá khoản ứng tiền');
        refetchAdv();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không xoá được bản ghi');
      console.error('Lỗi khi xóa:', err);
    }
    setConfirmState({ isOpen: false, id: '', type: 'expense' });
  };

  const handleSaveAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingAdv) return;

    const data = advForm.data;
    const amount = Number(data.amount) || 0;
    if (amount <= 0) {
      toast.warning('Số tiền ứng phải lớn hơn 0');
      return;
    }

    setSavingAdv(true);
    try {
      await expensesService.createAdvance({
        date: data.date || new Date().toISOString().split('T')[0],
        amount,
        person: data.person || 'Chủ xưởng',
        type: data.type || 'advance',
        notes: data.notes,
      });
      toast.success('Đã ghi nhận khoản ứng tiền');
      closeAdvModal();
      refetchAdv();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không lưu được khoản ứng tiền');
      console.error('Lỗi khi lưu ứng tiền:', err);
    } finally {
      setSavingAdv(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Chi Phí & Ứng Tiền"
        subtitle="Quản lý các khoản chi phát sinh tại xưởng và theo dõi ứng tiền"
        action={
          activeTab === 'chiphi'
            ? { label: 'Thêm chi phí', icon: Plus, onClick: () => openModal() }
            : { label: 'Thêm ứng tiền', icon: Plus, onClick: () => openAdvModal() }
        }
      />

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-[var(--border-color)]">
        <button
          onClick={() => setActiveTab('chiphi')}
          className={cn(
            'pb-3 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer',
            activeTab === 'chiphi'
              ? 'border-[var(--primary-500)] text-[var(--primary-500)] bg-[var(--primary-50)]/40 rounded-t-xl'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]',
          )}
        >
          Chi phí xưởng ({expenses.length})
        </button>
        <button
          onClick={() => setActiveTab('ungtien')}
          className={cn(
            'pb-3 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer',
            activeTab === 'ungtien'
              ? 'border-[var(--primary-500)] text-[var(--primary-500)] bg-[var(--primary-50)]/40 rounded-t-xl'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]',
          )}
        >
          Sổ ứng tiền ({advances.length})
        </button>
      </div>

      {activeTab === 'chiphi' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              title="Tổng chi tháng"
              value={formatTien(totalExpense)}
              icon={Wallet}
              trend={-12}
              color="danger"
            />
            <KpiCard title="Xăng xe" value={formatTien(totalFuel)} icon={Fuel} color="warning" />
            <KpiCard title="Dao cắt" value={formatTien(totalBlade)} icon={Tool} color="info" />
            <KpiCard
              title="Khác (Dầu, phụ tùng...)"
              value={formatTien(totalOther)}
              icon={FileText}
              color="primary"
            />
          </div>

          <TableToolbar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            placeholder="Tìm khoản chi..."
            totalCount={filteredExpenses.length}
          />

          <DataState
            loading={expLoading}
            error={expError}
            isEmpty={filteredExpenses.length === 0}
            emptyTitle="Chưa có khoản chi phí nào"
          >
            <div className="erp-table-container">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <caption className="sr-only">Danh sách khoản chi phí</caption>
                  <thead>
                    <tr>
                      <th scope="col" className="th-cell">
                        Ngày
                      </th>
                      <th scope="col" className="th-cell">
                        Danh mục
                      </th>
                      <th className="th-cell text-right">Số tiền</th>
                      <th scope="col" className="th-cell">
                        Mô tả
                      </th>
                      <th scope="col" className="th-cell">
                        Ghi chú
                      </th>
                      <th className="th-cell text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExpenses.map((exp) => {
                      const cfg = categoryConfig[exp.category] || categoryConfig.other;
                      const Icon = cfg.icon;
                      return (
                        <tr key={exp.id} className="tr-hover">
                          <td className="td-cell font-mono text-xs text-[var(--text-secondary)]">
                            {formatNgay(exp.date)}
                          </td>
                          <td className="td-cell">
                            <div className="flex items-center space-x-2">
                              <Icon className={cn('w-4 h-4', cfg.color)} />
                              <span className="font-bold text-xs">{cfg.label}</span>
                            </div>
                          </td>
                          <td className="td-cell text-right font-mono font-bold text-xs text-rose-600">
                            {formatTien(exp.amount)}
                          </td>
                          <td className="td-cell text-xs text-[var(--text-primary)]">
                            {exp.description || '—'}
                          </td>
                          <td className="td-cell text-xs text-[var(--text-muted)]">{exp.notes || '—'}</td>
                          <td className="td-cell text-right">
                            <button
                              onClick={() => handleDeleteExpense(exp.id)}
                              className="icon-action text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer"
                              title="Xóa"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </DataState>
        </div>
      )}

      {activeTab === 'ungtien' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KpiCard
              title="Tổng ứng vốn"
              value={formatTien(totalUng)}
              icon={ArrowDownRight}
              color="warning"
            />
            <KpiCard
              title="Tổng hoàn ứng"
              value={formatTien(totalHoan)}
              icon={ArrowUpRight}
              color="success"
            />
            <KpiCard title="Vốn còn lại" value={formatTien(totalConLai)} icon={DollarSign} color="primary" />
          </div>

          <DataState
            loading={advLoading}
            error={advError}
            isEmpty={advances.length === 0}
            emptyTitle="Chưa có thông tin ứng tiền"
          >
            <div className="erp-table-container">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <caption className="sr-only">Danh sách khoản ứng tiền</caption>
                  <thead>
                    <tr>
                      <th scope="col" className="th-cell">
                        Ngày
                      </th>
                      <th scope="col" className="th-cell">
                        Loại
                      </th>
                      <th scope="col" className="th-cell">
                        Người giao/nhận
                      </th>
                      <th className="th-cell text-right">Số tiền</th>
                      <th scope="col" className="th-cell">
                        Ghi chú
                      </th>
                      <th className="th-cell text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {advances.map((adv) => (
                      <tr key={adv.id} className="tr-hover">
                        <td className="td-cell font-mono text-xs text-[var(--text-secondary)]">
                          {formatNgay(adv.date)}
                        </td>
                        <td className="td-cell">
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded-full text-[11px] font-bold border',
                              adv.type === 'advance' || (adv.type as string) === 'ung'
                                ? 'bg-amber-100 text-amber-700 border-amber-200'
                                : 'bg-emerald-100 text-emerald-700 border-emerald-200',
                            )}
                          >
                            {adv.type === 'advance' || (adv.type as string) === 'ung'
                              ? 'Ứng tiền'
                              : 'Hoàn ứng'}
                          </span>
                        </td>
                        <td className="td-cell font-bold text-xs text-[var(--text-primary)]">
                          {adv.person || 'Chủ xưởng'}
                        </td>
                        <td className="td-cell text-right font-mono font-bold text-xs text-[var(--primary-500)]">
                          {formatTien(adv.amount)}
                        </td>
                        <td className="td-cell text-xs text-[var(--text-muted)]">{adv.notes || '—'}</td>
                        <td className="td-cell text-right">
                          <button
                            onClick={() => handleDeleteAdvance(adv.id)}
                            className="icon-action text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer"
                            title="Xóa"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </DataState>
        </div>
      )}

      {/* Modal Thêm chi phí */}
      <Modal isOpen={formState.isOpen} onClose={closeModal} title="Thêm chi phí phát sinh mới">
        <form onSubmit={handleSaveExpense} className="space-y-4">
          <FormField label="Ngày ghi nhận" required>
            <input
              type="date"
              required
              className="input-field"
              value={formState.data?.date || ''}
              onChange={(e) => handleChange('date', e.target.value)}
            />
          </FormField>

          <FormField label="Danh mục chi phí" required>
            <select
              className="input-field"
              value={formState.data?.category || 'fuel'}
              onChange={(e) => handleChange('category', e.target.value)}
            >
              {Object.entries(categoryConfig).map(([key, cfg]) => (
                <option key={key} value={key}>
                  {cfg.label}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Số tiền (đ)" required>
            <input
              type="number"
              inputMode="decimal"
              required
              min="1"
              className="input-field font-mono font-bold text-rose-600"
              placeholder="0"
              value={formState.data?.amount || ''}
              onChange={(e) => handleChange('amount', Number(e.target.value))}
            />
          </FormField>

          <FormField label="Mô tả khoản chi">
            <input
              type="text"
              className="input-field"
              placeholder="Ví dụ: Đổ xăng xe tải, mua 4 dao cắt..."
              value={formState.data?.description || ''}
              onChange={(e) => handleChange('description', e.target.value)}
            />
          </FormField>

          <FormField label="Ghi chú">
            <textarea
              className="input-field"
              rows={2}
              placeholder="Ghi chú thêm..."
              value={formState.data?.notes || ''}
              onChange={(e) => handleChange('notes', e.target.value)}
            />
          </FormField>

          <div className="flex justify-end space-x-3 pt-4 border-t border-[var(--border-color)]">
            <button type="button" onClick={closeModal} className="btn-secondary">
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? 'Đang lưu...' : 'Lưu chi phí'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Thêm ứng tiền */}
      <Modal isOpen={advForm.isOpen} onClose={closeAdvModal} title="Ghi nhận ứng tiền / hoàn ứng">
        <form onSubmit={handleSaveAdvance} className="space-y-4">
          <FormField label="Ngày ghi nhận" required>
            <input
              type="date"
              required
              className="input-field"
              value={advForm.data?.date || ''}
              onChange={(e) => handleAdvChange('date', e.target.value)}
            />
          </FormField>

          <FormField label="Loại giao dịch" required>
            <select
              className="input-field"
              value={advForm.data?.type || 'advance'}
              onChange={(e) => handleAdvChange('type', e.target.value as Advance['type'])}
            >
              <option value="advance">Ứng tiền (chi ra)</option>
              <option value="settlement">Hoàn ứng (thu về)</option>
            </select>
          </FormField>

          <FormField label="Số tiền (đ)" required>
            <input
              type="number"
              inputMode="decimal"
              required
              min="1"
              className="input-field font-mono font-bold text-[var(--primary-500)]"
              placeholder="0"
              value={advForm.data?.amount || ''}
              onChange={(e) => handleAdvChange('amount', Number(e.target.value))}
            />
          </FormField>

          <FormField label="Người giao/nhận">
            <input
              type="text"
              className="input-field"
              placeholder="Chủ xưởng"
              value={advForm.data?.person || ''}
              onChange={(e) => handleAdvChange('person', e.target.value)}
            />
          </FormField>

          <FormField label="Ghi chú">
            <textarea
              className="input-field"
              rows={2}
              placeholder="Ghi chú thêm..."
              value={advForm.data?.notes || ''}
              onChange={(e) => handleAdvChange('notes', e.target.value)}
            />
          </FormField>

          <div className="flex justify-end space-x-3 pt-4 border-t border-[var(--border-color)]">
            <button type="button" onClick={closeAdvModal} className="btn-secondary">
              Hủy
            </button>
            <button
              type="submit"
              disabled={savingAdv}
              className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {savingAdv ? 'Đang lưu...' : 'Lưu ứng tiền'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={confirmState.isOpen}
        onClose={() => setConfirmState({ isOpen: false, id: '', type: 'expense' })}
        onConfirm={confirmDeleteEntry}
        title={confirmState.type === 'expense' ? 'Xoá khoản chi phí' : 'Xoá khoản ứng tiền'}
        message={
          confirmState.type === 'expense'
            ? 'Bạn có chắc chắn muốn xoá khoản chi phí này? Hành động này không thể hoàn tác.'
            : 'Bạn có chắc chắn muốn xoá khoản ứng tiền này? Hành động này không thể hoàn tác.'
        }
        variant="danger"
        confirmText="Xoá"
        cancelText="Hủy"
      />
    </div>
  );
};
