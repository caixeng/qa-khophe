import * as React from 'react';
import { useState, useMemo } from 'react';
import { Plus, Users, MapPin, Phone, Edit, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { PageHeader } from '../components/PageHeader';
import { Modal, FormField } from '../components/Modal';
import { StatusBadge } from '../components/StatusBadge';
import { TableToolbar } from '../components/TableToolbar';
import { DataState } from '../components/DataState';
import { useAsyncData } from '../hooks/useAsyncData';
import { useCrudForm } from '../hooks/useCrudForm';
import { useTableControls } from '../hooks/useTableControls';
import { contactsService } from '../services/contactsService';
import type { Contact, ContactType } from '../types';

export const DanhBaPage: React.FC = () => {
  const { data: contactsData, loading, error, refetch } = useAsyncData(contactsService.getAll, []);
  const contacts = contactsData || [];
  const [activeTab, setActiveTab] = useState<ContactType>('supplier');

  // Table controls
  const { searchQuery, setSearchQuery } = useTableControls();

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
    const data = formState.data;
    if (!data.name) return;

    try {
      if (data.id) {
        await contactsService.update(data.id, data);
      } else {
        await contactsService.create({
          name: data.name,
          type: activeTab,
          phone: data.phone,
          address: data.address,
          notes: data.notes,
        });
      }
      closeModal();
      refetch();
    } catch (err) {
      console.error('Lỗi khi lưu đối tác:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa đối tác này?')) {
      try {
        await contactsService.delete(id);
        refetch();
      } catch (err) {
        console.error('Lỗi khi xóa đối tác:', err);
      }
    }
  };

  const counts = useMemo(() => {
    return {
      supplier: contacts.filter((c) => c.type === 'supplier').length,
      customer: contacts.filter((c) => c.type === 'customer').length,
      partner: contacts.filter((c) => c.type === 'partner').length,
    };
  }, [contacts]);

  return (
    <div className="space-y-6 animate-fade-in pb-20 md:pb-6">
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
                  'rounded-full px-2 py-0.5 text-[10px] font-mono font-bold',
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
        {/* Contacts Table */}
        <div className="erp-table-container">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="th-cell">Tên liên hệ</th>
                  <th className="th-cell">Số điện thoại</th>
                  <th className="th-cell">Địa chỉ / Ghi chú</th>
                  <th className="th-cell">Trạng thái</th>
                  <th className="th-cell text-right">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((contact) => (
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
                          className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--primary-500)] transition-colors cursor-pointer"
                          title="Sửa"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(contact.id)}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer"
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
            <button type="submit" className="btn-primary">
              Lưu liên hệ
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
