import * as React from 'react';
import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  Users,
  MapPin,
  Phone,
  Edit,
  Trash2,
  Building2,
  Package,
  Wallet,
  Clock,
  ArrowDownToLine,
  UserCheck,
  Landmark,
  Filter,
} from 'lucide-react';
import { cn, formatKg, formatTien, formatNgay } from '../lib/utils';
import { PageHeader } from '../components/PageHeader';
import { Modal, FormField } from '../components/Modal';
import { StatusBadge } from '../components/StatusBadge';
import { TableToolbar } from '../components/TableToolbar';
import { DataState } from '../components/DataState';
import { useAsyncData, useAsyncList } from '../hooks/useAsyncData';
import { useCrudForm } from '../hooks/useCrudForm';
import { useTableControls } from '../hooks/useTableControls';
import { useAuth } from '../contexts/auth';
import { useToast } from '../contexts/toast';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { PaginationBar } from '../components/PaginationBar';
import { SortableHeader } from '../components/SortableHeader';
import { sortRows } from '../lib/sort';
import { contactsService } from '../services/contactsService';
import { importsService } from '../services/importsService';
import { paymentsService } from '../services/paymentsService';
import {
  SOURCE_CATEGORY_CONFIG,
  COMMON_REGIONS,
  COMMON_MATERIAL_TYPES,
  getSourceCategoryConfig,
  computeSupplierCollectionStatsMap,
} from '../lib/supplierSources';
import { today } from '../lib/date';
import type { Contact, ContactType, SourceCategory } from '../types';

type CollectionStatusFilter = 'all' | 'active_14d' | 'inactive_14d' | 'has_debt';

export const DanhBaPage: React.FC = () => {
  const navigate = useNavigate();
  const { can } = useAuth();
  const canManageContacts = can('contacts.manage');
  const canCreateScrap = can('scrap.create');
  const canSeeFinance = can('dashboard.finance.view');

  const { data: contacts, loading, error, refetch } = useAsyncList(contactsService.getAll, []);
  const { data: allImports } = useAsyncList(() => importsService.getAll({ all: true }), []);
  const { data: paidImports } = useAsyncData(() => paymentsService.getPaidByRefType('import'), []);

  const [activeTab, setActiveTab] = useState<ContactType>('supplier');
  const [categoryFilter, setCategoryFilter] = useState<'all' | SourceCategory>('all');
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const [collectionFilter, setCollectionFilter] = useState<CollectionStatusFilter>('all');

  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [confirmState, setConfirmState] = useState<{ isOpen: boolean; id: string }>({
    isOpen: false,
    id: '',
  });

  // Table controls
  const {
    searchQuery,
    setSearchQuery,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    sortConfig,
    handleSort,
  } = useTableControls();

  // CRUD Form
  const { formState, openModal, closeModal, handleChange } = useCrudForm<Contact>({
    initialData: {
      type: 'supplier',
      name: '',
      phone: '',
      address: '',
      contact_person: '',
      source_category: 'warehouse',
      region: 'Đà Nẵng',
      main_material_type: 'Tấm nhựa nano',
      bank_info: '',
      collector_name: 'Anh Hồ',
      notes: '',
    },
  });

  const suppliers = useMemo(() => contacts.filter((c) => c.type === 'supplier'), [contacts]);

  // Tính toán thống kê sản lượng thu mua, số chuyến, ngày lấy gần nhất & công nợ cho từng đơn vị
  const supplierStatsMap = useMemo(() => {
    const refDate =
      allImports.length > 0 ? allImports.reduce((max, i) => (i.date > max ? i.date : max), today()) : today();
    return computeSupplierCollectionStatsMap(suppliers, allImports, paidImports ?? {}, refDate, 14);
  }, [suppliers, allImports, paidImports]);

  // Tổng hợp KPI nguồn hàng cho tab Đơn vị nhập phế
  const supplierSummary = useMemo(() => {
    let totalCollectedKg = 0;
    let totalTrips = 0;
    let totalPayable = 0;
    let payableUnits = 0;
    let followUpUnits = 0;

    for (const s of suppliers) {
      const st = supplierStatsMap[s.id];
      if (!st) continue;
      totalCollectedKg += st.totalKg;
      totalTrips += st.tripCount;
      if (st.payableAmount > 0) {
        totalPayable += st.payableAmount;
        payableUnits += 1;
      }
      if (st.needsFollowUp) {
        followUpUnits += 1;
      }
    }

    return {
      totalUnits: suppliers.length,
      totalCollectedKg,
      totalTrips,
      totalPayable,
      payableUnits,
      followUpUnits,
    };
  }, [suppliers, supplierStatsMap]);

  // Danh sách các Khu vực / Tuyến thu mua hiện có để lọc nhanh
  const availableRegions = useMemo(() => {
    const set = new Set<string>();
    for (const c of contacts) {
      if (c.type === activeTab && c.region?.trim()) {
        set.add(c.region.trim());
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [contacts, activeTab]);

  // Filter data
  const filteredData = useMemo(() => {
    return contacts
      .filter((item) => item.type === activeTab)
      .filter((item) => {
        if (activeTab === 'supplier') {
          if (categoryFilter !== 'all' && (item.source_category || 'other') !== categoryFilter) {
            return false;
          }
          if (regionFilter !== 'all' && (item.region || '') !== regionFilter) {
            return false;
          }
          const st = supplierStatsMap[item.id];
          if (collectionFilter === 'active_14d' && (!st || st.needsFollowUp)) {
            return false;
          }
          if (collectionFilter === 'inactive_14d' && st && !st.needsFollowUp) {
            return false;
          }
          if (collectionFilter === 'has_debt' && (!st || st.payableAmount <= 0)) {
            return false;
          }
        }

        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
          item.name.toLowerCase().includes(q) ||
          item.phone?.toLowerCase().includes(q) ||
          item.address?.toLowerCase().includes(q) ||
          item.contact_person?.toLowerCase().includes(q) ||
          item.region?.toLowerCase().includes(q) ||
          item.main_material_type?.toLowerCase().includes(q) ||
          item.collector_name?.toLowerCase().includes(q) ||
          item.notes?.toLowerCase().includes(q)
        );
      });
  }, [contacts, activeTab, categoryFilter, regionFilter, collectionFilter, supplierStatsMap, searchQuery]);

  const sortedData = useMemo(() => sortRows(filteredData, sortConfig), [filteredData, sortConfig]);

  const pageItems = useMemo(
    () => sortedData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage),
    [sortedData, currentPage, itemsPerPage],
  );

  const handleOpenAddModal = () => {
    openModal({
      type: activeTab,
      name: '',
      phone: '',
      address: '',
      contact_person: '',
      source_category: activeTab === 'supplier' ? 'warehouse' : 'other',
      region: 'Đà Nẵng',
      main_material_type: activeTab === 'supplier' ? 'Tấm nhựa nano' : '',
      bank_info: '',
      collector_name: 'Anh Hồ',
      default_price_per_kg: activeTab === 'supplier' ? 4500 : 6000,
      notes: '',
    });
  };

  const handleQuickCreateImport = (contact: Contact) => {
    navigate(`/quan-ly-phe?tab=nhap&open=true&contactId=${encodeURIComponent(contact.id)}`);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    const data = formState.data;
    if (!data.name?.trim()) {
      toast.warning('Vui lòng nhập tên đơn vị / đối tác');
      return;
    }

    setSaving(true);
    try {
      if (data.id) {
        await contactsService.update(data.id, data);
        toast.success('Đã cập nhật hồ sơ đơn vị');
      } else {
        await contactsService.create({
          name: data.name,
          type: data.type || activeTab,
          phone: data.phone,
          address: data.address,
          notes: data.notes,
          default_price_per_kg: data.default_price_per_kg,
          contact_person: data.contact_person,
          source_category: data.source_category || 'warehouse',
          region: data.region,
          main_material_type: data.main_material_type,
          bank_info: data.bank_info,
          collector_name: data.collector_name || 'Anh Hồ',
        });
        toast.success('Đã thêm đơn vị mới vào danh bạ');
      }
      closeModal();
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi khi lưu thông tin đơn vị');
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
      toast.error('Không thể xóa đơn vị đã có lịch sử phiếu nhập/xuất');
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
        title="Quản lý Đơn vị Nhập phế & Đối tác"
        subtitle="Theo dõi nguồn cung cấp phế hằng ngày của Anh Hồ, tuyến thu mua, giá thỏa thuận và lịch sử lấy hàng"
        action={
          canManageContacts
            ? {
                label: activeTab === 'supplier' ? 'Thêm đơn vị nhập phế' : 'Thêm đối tác mới',
                icon: Plus,
                onClick: handleOpenAddModal,
              }
            : undefined
        }
      />

      {/* Tabs */}
      <div className="grid grid-cols-3 sm:flex sm:space-x-2 border-b border-[var(--border-color)]">
        {(['supplier', 'customer', 'partner'] as ContactType[]).map((tabType) => {
          const labels: Record<ContactType, string> = {
            supplier: 'Đơn vị nhập phế (NCC)',
            customer: 'Khách mua thành phẩm',
            partner: 'Đối tác khác',
          };
          const count = counts[tabType];
          return (
            <button
              key={tabType}
              onClick={() => {
                setActiveTab(tabType);
                setCurrentPage(1);
              }}
              className={cn(
                'flex items-center justify-center space-x-1.5 border-b-2 px-2 sm:px-4 py-2 sm:py-3 text-[11px] sm:text-xs font-bold transition-all cursor-pointer',
                activeTab === tabType
                  ? 'border-[var(--primary-500)] text-[var(--primary-500)] bg-[var(--primary-50)]/40 rounded-t-xl'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]',
              )}
            >
              <span className="truncate">{labels[tabType]}</span>
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.2 text-[10px] font-mono font-bold shrink-0',
                  activeTab === tabType
                    ? 'bg-[var(--primary-500)] text-white'
                    : 'bg-[var(--bg-subtle)] text-[var(--text-muted)]',
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* KPI Tổng quan cho Tab Đơn vị Nhập phế (Nguồn hàng của Anh Hồ) */}
      {activeTab === 'supplier' && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          <button
            type="button"
            onClick={() => setCollectionFilter('all')}
            className={cn(
              'card p-3 sm:p-4 flex items-center gap-3 text-left transition-all cursor-pointer bg-[var(--bg-surface)]',
              collectionFilter === 'all' && 'ring-2 ring-[var(--primary-500)]/40',
            )}
          >
            <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200 dark:bg-indigo-950/50 dark:border-indigo-800">
              <Building2 size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] sm:text-[11px] font-bold uppercase text-[var(--text-muted)] truncate">
                Đơn vị nhập phế
              </p>
              <p className="font-mono text-sm sm:text-lg font-black text-[var(--text-primary)] truncate">
                {supplierSummary.totalUnits} đơn vị
              </p>
              <p className="text-[10px] text-[var(--text-muted)] truncate">Phụ trách chính: Anh Hồ</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setCollectionFilter(collectionFilter === 'active_14d' ? 'all' : 'active_14d')}
            className={cn(
              'card p-3 sm:p-4 flex items-center gap-3 text-left transition-all cursor-pointer bg-[var(--bg-surface)]',
              collectionFilter === 'active_14d' && 'ring-2 ring-emerald-500/50',
            )}
          >
            <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-950/50 dark:border-emerald-800">
              <Package size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] sm:text-[11px] font-bold uppercase text-[var(--text-muted)] truncate">
                Tổng phế đã gom
              </p>
              <p className="font-mono text-sm sm:text-lg font-black text-emerald-600 truncate">
                {formatKg(supplierSummary.totalCollectedKg)}
              </p>
              <p className="text-[10px] text-[var(--text-muted)] truncate">
                Qua {supplierSummary.totalTrips} chuyến thu mua
              </p>
            </div>
          </button>

          {canSeeFinance && (
            <button
              type="button"
              onClick={() => setCollectionFilter(collectionFilter === 'has_debt' ? 'all' : 'has_debt')}
              className={cn(
                'card p-3 sm:p-4 flex items-center gap-3 text-left transition-all cursor-pointer bg-[var(--bg-surface)]',
                collectionFilter === 'has_debt' && 'ring-2 ring-amber-500/50',
              )}
            >
              <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-950/50 dark:border-amber-800">
                <Wallet size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] sm:text-[11px] font-bold uppercase text-[var(--text-muted)] truncate">
                  Nợ tiền phế chưa trả
                </p>
                <p className="font-mono text-sm sm:text-lg font-black text-amber-600 truncate">
                  {formatTien(supplierSummary.totalPayable)}
                </p>
                <p className="text-[10px] text-[var(--text-muted)] truncate">
                  Tại {supplierSummary.payableUnits} đơn vị cung cấp
                </p>
              </div>
            </button>
          )}

          <button
            type="button"
            onClick={() => setCollectionFilter(collectionFilter === 'inactive_14d' ? 'all' : 'inactive_14d')}
            className={cn(
              'card p-3 sm:p-4 flex items-center gap-3 text-left transition-all cursor-pointer bg-[var(--bg-surface)]',
              collectionFilter === 'inactive_14d' && 'ring-2 ring-rose-500/50',
            )}
          >
            <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-950/50 dark:border-rose-800">
              <Clock size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] sm:text-[11px] font-bold uppercase text-[var(--text-muted)] truncate">
                &gt; 14 ngày chưa lấy
              </p>
              <p className="font-mono text-sm sm:text-lg font-black text-rose-600 truncate">
                {supplierSummary.followUpUnits} mối hàng
              </p>
              <p className="text-[10px] text-[var(--text-muted)] truncate">Bấm lọc để Anh Hồ gọi hỏi hàng</p>
            </div>
          </button>
        </div>
      )}

      {/* Bộ lọc thông minh theo Phân loại nguồn phế & Khu vực/Tuyến thu mua */}
      {activeTab === 'supplier' && (
        <div className="card p-2.5 sm:p-3 bg-[var(--bg-surface)] flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <span className="text-[11px] font-bold text-[var(--text-muted)] flex items-center gap-1 pr-1 shrink-0">
              <Filter size={13} /> Nguồn:
            </span>
            {(
              [
                { id: 'all', label: 'Tất cả nguồn' },
                { id: 'factory', label: SOURCE_CATEGORY_CONFIG.factory.shortLabel },
                { id: 'warehouse', label: SOURCE_CATEGORY_CONFIG.warehouse.shortLabel },
                { id: 'construction', label: SOURCE_CATEGORY_CONFIG.construction.shortLabel },
                { id: 'individual', label: SOURCE_CATEGORY_CONFIG.individual.shortLabel },
              ] as const
            ).map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setCategoryFilter(cat.id);
                  setCurrentPage(1);
                }}
                className={cn(
                  'h-7 px-2.5 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap cursor-pointer',
                  categoryFilter === cat.id
                    ? 'bg-[var(--primary-500)] text-white shadow-2xs'
                    : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Lọc theo khu vực hoặc tuyến thu mua"
              value={regionFilter}
              onChange={(e) => {
                setRegionFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="h-8 rounded-lg border border-[var(--border-color)] bg-[var(--bg-subtle)] px-2.5 text-xs font-semibold text-[var(--text-primary)] cursor-pointer"
            >
              <option value="all">Tất cả tuyến / khu vực</option>
              {availableRegions.map((reg) => (
                <option key={reg} value={reg}>
                  Tuyến: {reg}
                </option>
              ))}
            </select>

            <select
              aria-label="Lọc theo tần suất lấy hàng"
              value={collectionFilter}
              onChange={(e) => {
                setCollectionFilter(e.target.value as CollectionStatusFilter);
                setCurrentPage(1);
              }}
              className="h-8 rounded-lg border border-[var(--border-color)] bg-[var(--bg-subtle)] px-2.5 text-xs font-semibold text-[var(--text-primary)] cursor-pointer"
            >
              <option value="all">Tất cả trạng thái lấy hàng</option>
              <option value="active_14d">Đang lấy đều (≤ 14 ngày)</option>
              <option value="inactive_14d">Lâu chưa lấy (&gt; 14 ngày)</option>
              <option value="has_debt">Đang còn nợ tiền phế</option>
            </select>
          </div>
        </div>
      )}

      {/* Table Toolbar */}
      <TableToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        placeholder={
          activeTab === 'supplier'
            ? 'Tìm theo tên đơn vị, người liên hệ, SĐT, khu vực, loại phế...'
            : 'Tìm theo tên, SĐT, địa chỉ...'
        }
        totalCount={filteredData.length}
      />

      <DataState
        loading={loading}
        error={error}
        isEmpty={filteredData.length === 0}
        emptyTitle="Chưa có đơn vị nào phù hợp"
      >
        {/* Desktop Table */}
        <div className="erp-table-container hidden lg:block">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <caption className="sr-only">Danh sách đơn vị nhập phế và đối tác</caption>
              <thead>
                <tr>
                  <SortableHeader sortKey="name" sortConfig={sortConfig} onSort={handleSort}>
                    Đơn vị / Đầu mối liên hệ
                  </SortableHeader>
                  <th scope="col" className="th-cell">
                    Tuyến / Liên hệ
                  </th>
                  <th scope="col" className="th-cell">
                    Phế chủ lực & Giá chuẩn
                  </th>
                  {activeTab === 'supplier' && (
                    <>
                      <th scope="col" className="th-cell text-right">
                        Sản lượng đã gom
                      </th>
                      <th scope="col" className="th-cell">
                        Chuyến gần nhất
                      </th>
                      {canSeeFinance && (
                        <th scope="col" className="th-cell text-right">
                          Công nợ phải trả
                        </th>
                      )}
                    </>
                  )}
                  <SortableHeader sortKey="status" sortConfig={sortConfig} onSort={handleSort}>
                    Trạng thái
                  </SortableHeader>
                  <th className="th-cell text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((contact) => {
                  const catCfg = getSourceCategoryConfig(contact.source_category);
                  const stat = supplierStatsMap[contact.id];
                  return (
                    <tr key={contact.id} className="tr-hover">
                      <td className="td-cell">
                        <div className="flex items-start space-x-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-50)] text-[var(--primary-600)] font-bold border border-[var(--primary-500)]/20">
                            <Users size={16} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Link
                                to={`/danh-ba/${contact.id}`}
                                className="text-xs font-bold text-[var(--text-primary)] hover:text-[var(--primary-600)] hover:underline"
                                title="Xem hồ sơ chi tiết, lịch sử thu mua và công nợ"
                              >
                                {contact.name}
                              </Link>
                              {activeTab === 'supplier' && (
                                <span
                                  className={cn(
                                    'px-2 py-0.5 rounded-full text-[10px] font-bold border',
                                    catCfg.badgeClass,
                                  )}
                                >
                                  {catCfg.shortLabel}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-[11px] text-[var(--text-muted)]">
                              {contact.contact_person && (
                                <span className="font-medium text-[var(--text-secondary)]">
                                  Đầu mối: {contact.contact_person}
                                </span>
                              )}
                              {activeTab === 'supplier' && (
                                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold">
                                  <UserCheck size={11} />
                                  {contact.collector_name || 'Anh Hồ'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="td-cell text-xs text-[var(--text-secondary)]">
                        <div className="space-y-1">
                          {contact.region && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--bg-subtle)] text-[10px] font-bold text-[var(--text-primary)]">
                              <MapPin size={11} className="text-[var(--primary-500)]" />
                              {contact.region}
                            </span>
                          )}
                          {contact.phone ? (
                            <div className="flex items-center space-x-1 font-mono text-xs">
                              <Phone size={12} className="text-emerald-600" />
                              <a
                                href={`tel:${contact.phone}`}
                                className="hover:underline font-semibold text-[var(--text-primary)]"
                              >
                                {contact.phone}
                              </a>
                            </div>
                          ) : (
                            <span className="text-[var(--text-muted)] block">Chưa có SĐT</span>
                          )}
                          {contact.address && (
                            <p className="text-[11px] text-[var(--text-muted)] truncate max-w-[200px]">
                              {contact.address}
                            </p>
                          )}
                        </div>
                      </td>

                      <td className="td-cell text-xs">
                        <div className="space-y-1">
                          {contact.main_material_type ? (
                            <span className="font-semibold text-[var(--text-primary)] block">
                              {contact.main_material_type}
                            </span>
                          ) : (
                            <span className="text-[var(--text-muted)] block">Tấm nhựa nano / NVL</span>
                          )}
                          {contact.default_price_per_kg ? (
                            <span className="font-mono text-[11px] font-bold text-[var(--primary-600)] block">
                              Giá chuẩn: {formatTien(contact.default_price_per_kg)}/kg
                            </span>
                          ) : (
                            <span className="text-[11px] text-[var(--text-muted)] block">
                              Giá theo chuyến
                            </span>
                          )}
                          {contact.bank_info && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
                              <Landmark size={11} /> {contact.bank_info}
                            </span>
                          )}
                        </div>
                      </td>

                      {activeTab === 'supplier' && (
                        <>
                          <td className="td-cell text-right font-mono text-xs">
                            {stat && stat.tripCount > 0 ? (
                              <div>
                                <span className="font-black text-[var(--text-primary)] block">
                                  {formatKg(stat.totalKg)}
                                </span>
                                <span className="text-[10px] text-[var(--text-muted)]">
                                  {stat.tripCount} chuyến gom
                                </span>
                              </div>
                            ) : (
                              <span className="text-[var(--text-muted)] text-[11px]">Chưa có chuyến</span>
                            )}
                          </td>

                          <td className="td-cell text-xs">
                            {stat?.lastCollectionDate ? (
                              <div>
                                <span className="font-mono font-semibold text-[var(--text-primary)] block">
                                  {formatNgay(stat.lastCollectionDate)}
                                </span>
                                {stat.daysSinceLastCollection !== null && (
                                  <span
                                    className={cn(
                                      'text-[10px] font-bold',
                                      stat.needsFollowUp ? 'text-rose-600' : 'text-emerald-600',
                                    )}
                                  >
                                    {stat.daysSinceLastCollection === 0
                                      ? 'Hôm nay'
                                      : `${stat.daysSinceLastCollection} ngày trước`}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200">
                                Chưa lấy hàng
                              </span>
                            )}
                          </td>

                          {canSeeFinance && (
                            <td className="td-cell text-right font-mono text-xs font-bold">
                              {stat && stat.payableAmount > 0 ? (
                                <span className="text-amber-600">{formatTien(stat.payableAmount)}</span>
                              ) : (
                                <span className="text-emerald-600 text-[11px]">Đã tất toán</span>
                              )}
                            </td>
                          )}
                        </>
                      )}

                      <td className="td-cell">
                        <StatusBadge status={contact.status || 'active'} />
                      </td>

                      <td className="td-cell text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {activeTab === 'supplier' && canCreateScrap && (
                            <button
                              type="button"
                              onClick={() => handleQuickCreateImport(contact)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-2xs transition-colors cursor-pointer"
                              title="Ghi nhận nhanh chuyến thu mua phế từ đơn vị này"
                            >
                              <ArrowDownToLine size={13} />
                              <span>Ghi nhập</span>
                            </button>
                          )}
                          {canManageContacts && (
                            <>
                              <button
                                onClick={() => openModal(contact)}
                                className="icon-action text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--primary-500)] transition-colors cursor-pointer"
                                title="Sửa hồ sơ đơn vị"
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
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile Card List */}
        <div className="lg:hidden space-y-3">
          {pageItems.map((contact) => {
            const catCfg = getSourceCategoryConfig(contact.source_category);
            const stat = supplierStatsMap[contact.id];
            return (
              <div
                key={contact.id}
                className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-[var(--primary-50)] text-[var(--primary-600)] flex items-center justify-center font-bold shrink-0">
                      <Users size={18} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Link
                          to={`/danh-ba/${contact.id}`}
                          className="font-bold text-sm text-[var(--text-primary)] hover:text-[var(--primary-600)]"
                        >
                          {contact.name}
                        </Link>
                        {activeTab === 'supplier' && (
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded-full text-[10px] font-bold border',
                              catCfg.badgeClass,
                            )}
                          >
                            {catCfg.shortLabel}
                          </span>
                        )}
                      </div>
                      {contact.contact_person && (
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                          Liên hệ: <b>{contact.contact_person}</b>
                        </p>
                      )}
                      {contact.phone && (
                        <p className="text-xs font-mono text-[var(--text-muted)] mt-0.5 flex items-center gap-1">
                          <Phone size={12} /> {contact.phone}
                        </p>
                      )}
                    </div>
                  </div>
                  <StatusBadge status={contact.status || 'active'} />
                </div>

                {/* Thông tin tuyến & thống kê thu mua trên Mobile */}
                <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-[var(--bg-subtle)] text-xs">
                  <div>
                    <span className="text-[10px] text-[var(--text-muted)] uppercase block">
                      Khu vực / Tuyến
                    </span>
                    <span className="font-bold text-[var(--text-primary)]">
                      {contact.region || contact.address || 'Chưa phân tuyến'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[var(--text-muted)] uppercase block">
                      Giá chuẩn / Phế
                    </span>
                    <span className="font-mono font-bold text-[var(--primary-600)]">
                      {contact.default_price_per_kg
                        ? `${formatTien(contact.default_price_per_kg)}/kg`
                        : 'Theo chuyến'}
                    </span>
                  </div>
                  {activeTab === 'supplier' && stat && (
                    <>
                      <div>
                        <span className="text-[10px] text-[var(--text-muted)] uppercase block">
                          Đã gom ({stat.tripCount} chuyến)
                        </span>
                        <span className="font-mono font-bold text-emerald-600">{formatKg(stat.totalKg)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[var(--text-muted)] uppercase block">
                          Lấy gần nhất
                        </span>
                        <span
                          className={cn(
                            'font-mono font-bold',
                            stat.needsFollowUp ? 'text-rose-600' : 'text-[var(--text-primary)]',
                          )}
                        >
                          {stat.lastCollectionDate ? formatNgay(stat.lastCollectionDate) : 'Chưa lấy'}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--border-color)]">
                  {activeTab === 'supplier' && canCreateScrap && (
                    <button
                      type="button"
                      onClick={() => handleQuickCreateImport(contact)}
                      className="tap-target flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-xs cursor-pointer"
                    >
                      <ArrowDownToLine size={14} /> Ghi nhập phế
                    </button>
                  )}
                  {contact.phone && (
                    <a
                      href={`tel:${contact.phone}`}
                      className="tap-target inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 text-xs font-bold"
                    >
                      <Phone size={14} /> Gọi
                    </a>
                  )}
                  {canManageContacts && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openModal(contact)}
                        className="tap-target p-2 rounded-xl border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(contact.id)}
                        className="tap-target p-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
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
        title={
          formState.data?.id
            ? 'Cập nhật hồ sơ đơn vị / đối tác'
            : activeTab === 'supplier'
              ? 'Thêm đơn vị nhập phế mới (Nguồn hàng)'
              : 'Thêm đối tác mới'
        }
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Tên đơn vị / Nhà máy / Vựa phế" required>
              <input
                type="text"
                required
                className="input-field"
                placeholder="VD: Xưởng Nhựa Nano Hòa Khánh, Vựa A Danh..."
                value={formState.data?.name || ''}
                onChange={(e) => handleChange('name', e.target.value)}
              />
            </FormField>

            <FormField label="Vai trò đối tác" required>
              <select
                className="input-field"
                value={formState.data?.type || activeTab}
                onChange={(e) => handleChange('type', e.target.value as ContactType)}
              >
                <option value="supplier">Đơn vị cung cấp phế (NCC)</option>
                <option value="customer">Khách hàng mua thành phẩm</option>
                <option value="partner">Đối tác khác</option>
              </select>
            </FormField>
          </div>

          {(formState.data?.type || activeTab) === 'supplier' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)]">
              <FormField label="Phân loại nguồn phế">
                <select
                  className="input-field"
                  value={formState.data?.source_category || 'warehouse'}
                  onChange={(e) => handleChange('source_category', e.target.value as SourceCategory)}
                >
                  {Object.values(SOURCE_CATEGORY_CONFIG).map((cfg) => (
                    <option key={cfg.id} value={cfg.id}>
                      {cfg.label}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Người phụ trách thu mua">
                <input
                  type="text"
                  className="input-field"
                  placeholder="Mặc định: Anh Hồ"
                  value={formState.data?.collector_name ?? 'Anh Hồ'}
                  onChange={(e) => handleChange('collector_name', e.target.value)}
                />
              </FormField>

              <FormField label="Người liên hệ trực tiếp tại đơn vị">
                <input
                  type="text"
                  className="input-field"
                  placeholder="VD: Anh Tuấn (Quản đốc), Chị Lan..."
                  value={formState.data?.contact_person || ''}
                  onChange={(e) => handleChange('contact_person', e.target.value)}
                />
              </FormField>

              <FormField label="Loại phế chủ lực của đơn vị">
                <input
                  type="text"
                  list="common-material-types"
                  className="input-field"
                  placeholder="VD: Tấm nhựa nano, Phế PVC..."
                  value={formState.data?.main_material_type || ''}
                  onChange={(e) => handleChange('main_material_type', e.target.value)}
                />
                <datalist id="common-material-types">
                  {COMMON_MATERIAL_TYPES.map((m) => (
                    <option key={m} value={m} />
                  ))}
                </datalist>
              </FormField>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Số điện thoại liên hệ">
              <input
                type="text"
                className="input-field font-mono"
                placeholder="Ví dụ: 0905123456"
                value={formState.data?.phone || ''}
                onChange={(e) => handleChange('phone', e.target.value)}
              />
            </FormField>

            <FormField label="Khu vực / Tuyến thu gom">
              <input
                type="text"
                list="common-regions"
                className="input-field"
                placeholder="VD: Đà Nẵng, Quảng Nam, TT-Huế..."
                value={formState.data?.region || ''}
                onChange={(e) => handleChange('region', e.target.value)}
              />
              <datalist id="common-regions">
                {COMMON_REGIONS.map((r) => (
                  <option key={r} value={r} />
                ))}
              </datalist>
            </FormField>
          </div>

          <FormField label="Địa chỉ chi tiết (Bãi / Nhà máy / Công trình)">
            <input
              type="text"
              className="input-field"
              placeholder="Nhập địa chỉ cụ thể để xe đến bốc hàng..."
              value={formState.data?.address || ''}
              onChange={(e) => handleChange('address', e.target.value)}
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField
              label={
                (formState.data?.type || activeTab) === 'supplier'
                  ? 'Giá thu mua thỏa thuận (đ/kg)'
                  : 'Giá xuất mặc định (đ/kg)'
              }
            >
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                className="input-field font-mono font-bold"
                placeholder="VD: 4500"
                value={formState.data?.default_price_per_kg ?? ''}
                onChange={(e) =>
                  handleChange(
                    'default_price_per_kg',
                    e.target.value === '' ? undefined : Number(e.target.value),
                  )
                }
              />
            </FormField>

            <FormField label="Tài khoản ngân hàng (Chuyển khoản)">
              <input
                type="text"
                className="input-field"
                placeholder="VD: Vietcombank - 004100... - Nguyễn Văn A"
                value={formState.data?.bank_info || ''}
                onChange={(e) => handleChange('bank_info', e.target.value)}
              />
            </FormField>
          </div>

          <FormField label="Ghi chú đặc thù (Giờ lấy hàng, quy cách cân, bốc xếp...)">
            <textarea
              className="input-field"
              rows={2}
              placeholder="VD: Chỉ bốc hàng buổi sáng, có sẵn xe nâng tại xưởng khách..."
              value={formState.data?.notes || ''}
              onChange={(e) => handleChange('notes', e.target.value)}
            />
          </FormField>

          <div className="flex justify-end space-x-3 pt-4 border-t border-[var(--border-color)]">
            <button type="button" onClick={closeModal} className="btn-secondary cursor-pointer">
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? 'Đang lưu...' : 'Lưu hồ sơ đơn vị'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete */}
      <ConfirmDialog
        isOpen={confirmState.isOpen}
        onClose={() => setConfirmState({ isOpen: false, id: '' })}
        onConfirm={confirmDelete}
        title="Xóa đơn vị liên hệ"
        message="Bạn có chắc chắn muốn xóa đơn vị này? Các đơn vị đã có phiếu nhập/xuất sẽ được bảo vệ không cho xóa."
        variant="danger"
        confirmText="Xóa"
        cancelText="Hủy"
      />
    </div>
  );
};
