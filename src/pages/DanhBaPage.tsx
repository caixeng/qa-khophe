import * as React from 'react';
import { useState, useMemo } from 'react';
import { Plus, Users, MapPin, Phone, Edit, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { PageHeader } from '../components/PageHeader';
import { Modal, FormField } from '../components/Modal';
import { StatusBadge } from '../components/StatusBadge';
import { TableToolbar } from '../components/TableToolbar';
import { DataState } from '../components/DataState';
import { useAsyncList } from '../hooks/useAsyncData';
import { useCrudForm } from '../hooks/useCrudForm';
import { useTableControls } from '../hooks/useTableControls';
import { useToast } from '../contexts/ToastContext';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { PaginationBar } from '../components/PaginationBar';
import { contactsService } from '../services/contactsService';
import type { Contact, ContactType } from '../types';

export const DanhBaPage: React.FC = () => {
  const { data: contacts, loading, error, refetch } = useAsyncList(contactsService.getAll, []);
  const [activeTab, setActiveTab] = useState<ContactType>('supplier');
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [confirmState, setConfirmState] = useState<{ isOpen: boolean; id: string }>({ isOpen: false, id: '' });

  // Table controls
  const { searchQuery, setSearchQuery, currentPage, setCurrentPage, itemsPerPage, setItemsPerPage } = useTableControls();

  // CRUD Form
  const { formState, openModal, closeModal, handleChange } = useCrudForm<Contact>({
    initialData: { type: 'supplier', name: '', phone: '', address: '', notes: '' }
  });

  // Filter data
  const filteredData = useMemo(() => {
    return contacts
      .filter((item) => item.type === activeTab)
      .filter((item) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
          item.name.toLowerCase().includes(q) ||
          item.phone?.toLowerCase().includes(q) ||
          item.address?.toLowerCase().includes(q) ||
          item.notes?.toLowerCase().includes(q)
        );
      });
  }, [contacts, activeTab, searchQuery]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    // Chặn bấm Lưu nhiều lần — mỗi lần bấm thêm là một đối tác trùng tên.
    if (saving) return;

    const data = formState.data;
    if (!data.name) {
      toast.warning('Vui lòng nhập tên liên hệ');
      return;
    }

    setSaving(true);
    try {
      if (data.id) {
        await contactsService.update(data.id, data);
        toast.success('Đã cập nhật thông tin liên hệ');
      } else {
        await contactsService.create({
          name: data.name,
          type: activeTab,
          phone: data.phone,
          address: data.address,
          notes: data.notes,
        });
        toast.success('Đã thêm liên hệ mới');
      }
      closeModal();
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi khi lưu liên hệ');
      console.error('Lỗi khi lưu đối tác:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setConfirmState({ isOpen: true, id });
  };

  const confirmDelete = async () => {
    try {
      await contactsService.delete(confirmState.id);
      toast.success('Đã xóa liên hệ');
      refetch();
    } catch (err) {
      toast.error('Lỗi khi xóa liên hệ');
      console.error('Lỗi khi xóa đối tác:', err);
    }
    setConfirmState({ isOpen: false, id: '' });
  };

  const counts = useMemo(() => {
    return {
      supplier: contacts.filter((c) => c.type === 'supplier').length,
      customer: contacts.filter((c) => c.type === 'customer').length,
      partner: contacts.filter((c) => c.type === 'partner').length,
    };
  }, [contacts]);

  return (
    <div className="page-shell animate-fade-in">
      <PageHeader
        title="Danh bạ đối tác"
        subtitle="Quản lý thông tin nhà cung cấp, đối tác, khách hàng"
        action={{
          label: 'Thêm liên hệ',
          icon: Plus,
          onClick: () => openModal({ type: activeTab }),
        }}
      />

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-[var(--border-color)]">
        {(['supplier', 'partner', 'customer'] as ContactType[]).map((tabType) => {
          const labels: Record<ContactType, string> = {
            supplier: 'Nhà cung cấp',
            partner: 'Đối tác',
            customer: 'Khách hàng',
          };
          const count = counts[tabType];
          return (
            <button
              key={tabType}
              onClick={() => setActiveTab(tabType)}
              className={cn(
                'flex items-center space-x-2 border-b-2 px-4 py-3 text-xs font-bold transition-all cursor-pointer',
                activeTab === tabType
                  ? 'border-[var(--primary-500)] text-[var(--primary-500)] bg-[var(--primary-50)]/40 rounded-t-xl'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              )}
            >
              <span>{labels[tabType]}</span>
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-[11px] font-mono font-bold',
                  activeTab === tabType
                    ? 'bg-[var(--primary-500)] text-white'
                    : 'bg-[var(--bg-subtle)] text-[var(--text-muted)]'
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Table Toolbar */}
      <TableToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        placeholder="Tìm theo tên, SĐT, địa chỉ..."
        totalCount={filteredData.length}
      />

      <DataState loading={loading} error={error} isEmpty={filteredData.length === 0} emptyTitle="Chưa có liên hệ nào">
        {/* Desktop Table */}
        <div className="erp-table-container hidden lg:block">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <caption className="sr-only">Danh bạ đối tác</caption>
              <thead>
                <tr>
                  <th scope="col" className="th-cell">Tên liên hệ</th>
                  <th scope="col" className="th-cell">Số điện thoại</th>
                  <th scope="col" className="th-cell">Địa chỉ / Ghi chú</th>
                  <th scope="col" className="th-cell">Trạng thái</th>
                  <th className="th-cell text-right">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((contact) => (
                  <tr key={contact.id} className="tr-hover">
                    <td className="td-cell font-bold">
                      <div className="flex items-center space-x-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--primary-50)] text-[var(--primary-600)] font-bold border border-[var(--primary-500)]/20">
                          <Users size={16} />
                        </div>
                        <span className="text-xs text-[var(--text-primary)]">{contact.name}</span>
                      </div>
                    </td>
                    <td className="td-cell font-mono text-xs text-[var(--text-secondary)]">
                      {contact.phone ? (
                        <div className="flex items-center space-x-1">
                          <Phone size={12} className="text-[var(--text-muted)]" />
                          <span>{contact.phone}</span>
                        </div>
                      ) : (
                        <span className="text-[var(--text-muted)]">—</span>
                      )}
                    </td>
                    <td className="td-cell text-xs text-[var(--text-secondary)]">
                      {contact.address && (
                        <div className="flex items-center space-x-1 mb-0.5">
                          <MapPin size={12} className="text-[var(--text-muted)]" />
                          <span>{contact.address}</span>
                        </div>
                      )}
                      {contact.notes && <span className="italic text-[var(--text-muted)]">{contact.notes}</span>}
                      {!contact.address && !contact.notes && <span className="text-[var(--text-muted)]">—</span>}
                    </td>
                    <td className="td-cell">
                      <StatusBadge status={contact.status || 'active'} />
                    </td>
                    <td className="td-cell text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => openModal(contact)}
                          className="icon-action text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--primary-500)] transition-colors cursor-pointer"
                          title="Sửa"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(contact.id)}
                          className="icon-action text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer"
                          title="Xóa"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile Card List */}
        <div className="lg:hidden space-y-3">
          {filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((contact) => (
            <div key={contact.id} className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-xs space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[var(--primary-50)] text-[var(--primary-600)] flex items-center justify-center font-bold shrink-0">
                    <Users size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-[var(--text-primary)]">{contact.name}</h4>
                    {contact.phone && (
                      <p className="text-xs font-mono text-[var(--text-muted)] mt-0.5 flex items-center gap-1">
                        <Phone size={12} /> {contact.phone}
                      </p>
                    )}
                  </div>
                </div>
                <StatusBadge status={contact.status || 'active'} />
              </div>

              {(contact.address || contact.notes) && (
                <div className="p-2.5 rounded-xl bg-[var(--bg-subtle)] text-xs space-y-1">
                  {contact.address && (
                    <p className="text-[var(--text-secondary)] flex items-center gap-1.5">
                      <MapPin size={13} className="text-[var(--text-muted)] shrink-0" />
                      <span>{contact.address}</span>
                    </p>
                  )}
                  {contact.notes && <p className="text-[var(--text-muted)] italic">{contact.notes}</p>}
                </div>
              )}

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--border-color)]">
                {contact.phone ? (
                  <a
                    href={`tel:${contact.phone}`}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-xs active:scale-95 transition-transform"
                  >
                    <Phone size={14} /> Gọi điện
                  </a>
                ) : (
                  <div className="flex-1" />
                )}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openModal(contact)}
                    className="p-2 rounded-xl border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Edit size={14} /> Sửa
                  </button>
                  <button
                    onClick={() => handleDelete(contact.id)}
                    className="p-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <PaginationBar
          currentPage={currentPage}
          totalItems={filteredData.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
        />
      </DataState>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={formState.isOpen}
        onClose={closeModal}
        title={formState.data?.id ? 'Sửa thông tin liên hệ' : 'Thêm liên hệ mới'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <FormField label="Tên đối tác / Cá nhân" required>
            <input
              type="text"
              required
              className="input-field"
              placeholder="Nhập tên..."
              value={formState.data?.name || ''}
              onChange={(e) => handleChange('name', e.target.value)}
            />
          </FormField>

          <FormField label="Loại liên hệ" required>
            <select
              className="input-field"
              value={formState.data?.type || activeTab}
              onChange={(e) => handleChange('type', e.target.value as ContactType)}
            >
              <option value="supplier">Nhà cung cấp</option>
              <option value="partner">Đối tác</option>
              <option value="customer">Khách hàng</option>
            </select>
          </FormField>

          <FormField label="Số điện thoại">
            <input
              type="text"
              className="input-field"
              placeholder="Ví dụ: 0901234567"
              value={formState.data?.phone || ''}
              onChange={(e) => handleChange('phone', e.target.value)}
            />
          </FormField>

          <FormField label="Địa chỉ">
            <input
              type="text"
              className="input-field"
              placeholder="Nhập địa chỉ..."
              value={formState.data?.address || ''}
              onChange={(e) => handleChange('address', e.target.value)}
            />
          </FormField>

          <FormField label="Ghi chú">
            <textarea
              className="input-field"
              rows={3}
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
              {saving ? 'Đang lưu...' : 'Lưu liên hệ'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete */}
      <ConfirmDialog
        isOpen={confirmState.isOpen}
        onClose={() => setConfirmState({ isOpen: false, id: '' })}
        onConfirm={confirmDelete}
        title="Xóa liên hệ"
        message="Bạn có chắc chắn muốn xóa liên hệ này? Hành động này không thể hoàn tác."
        variant="danger"
        confirmText="Xóa"
        cancelText="Hủy"
      />
    </div>
  );
};
