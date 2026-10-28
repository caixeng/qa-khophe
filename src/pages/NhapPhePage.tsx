import * as React from 'react';
import { useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Edit,
  Trash2,
  Package,
  Clock,
  DollarSign,
  Printer,
  Truck,
  UserCheck,
  Plus,
  MapPin,
  Phone,
  Wallet,
  FileText,
  Check,
  X,
} from 'lucide-react';
import { formatTien, formatNgay, formatKg, cn } from '../lib/utils';
import { Modal, FormField } from '../components/Modal';
import { AttachmentUploader } from '../components/AttachmentUploader';
import { printPhieuNhap } from '../lib/print';
import { StatusBadge } from '../components/StatusBadge';
import { TableToolbar } from '../components/TableToolbar';
import { DataState } from '../components/DataState';
import { useAsyncList } from '../hooks/useAsyncData';
import { useCrudForm } from '../hooks/useCrudForm';
import { useTableControls } from '../hooks/useTableControls';
import { useAuth } from '../contexts/auth';
import { useToast } from '../contexts/toast';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { PaginationBar } from '../components/PaginationBar';
import { SortableHeader } from '../components/SortableHeader';
import { sortRows } from '../lib/sort';
import { PeriodFilter } from '../components/PeriodFilter';
import { MobileCardList } from '../components/mobile/MobileCardList';
import { useDateRange } from '../hooks/useDateRange';
import { importsService } from '../services/importsService';
import { contactsService } from '../services/contactsService';
import { expensesService } from '../services/expensesService';
import { paymentsService } from '../services/paymentsService';
import {
  SOURCE_CATEGORY_CONFIG,
  COMMON_REGIONS,
  getSourceCategoryConfig,
  summarizeCollectorLog,
} from '../lib/supplierSources';
import { sortByDateDesc } from '../lib/storage';
import type { Import, ImportType, PaymentStatus, ProcessingStatus, SourceCategory } from '../types';
import { today } from '../lib/date';

interface NhapPhePageProps {
  actionRef?: React.MutableRefObject<(() => void) | null>;
}

export const NhapPhePage: React.FC<NhapPhePageProps> = ({ actionRef }) => {
  const { can } = useAuth();
  const canEditDelete = can('scrap.edit_delete');
  const canManageContacts = can('contacts.manage');
  const canDeductAdvance = can('finance.record_payment') || can('scrap.create');

  const { range, setRange } = useDateRange();
  const [importTypeFilter, setImportTypeFilter] = useState<'all' | 'nvl' | 'thanh_pham'>('all');
  const [collectorFilter, setCollectorFilter] = useState<'all' | 'anh_ho'>('all');

  const {
    data: imports,
    loading,
    error,
    refetch,
  } = useAsyncList(() => importsService.getAll({ from: range.from, to: range.to }), [range.from, range.to]);
  const { data: contacts, refetch: refetchContacts } = useAsyncList(contactsService.getAll, []);
  const { data: advances, refetch: refetchAdvances } = useAsyncList(expensesService.getAdvances, []);

  const suppliers = useMemo(() => {
    return contacts.filter((c) => c.type === 'supplier' || !c.type);
  }, [contacts]);

  const supplierById = useMemo(() => {
    const map: Record<string, (typeof suppliers)[number]> = {};
    for (const s of suppliers) map[s.id] = s;
    return map;
  }, [suppliers]);

  // Các khoản tạm ứng tiền mua hàng (materials) còn số dư khả dụng để Anh Hồ đối trừ trực tiếp
  const availableMaterialAdvances = useMemo(() => {
    return advances.filter(
      (a) =>
        (a.type === 'advance' || a.type === 'ung') &&
        a.purpose === 'materials' &&
        (Number(a.outstanding_amount) || 0) > 0,
    );
  }, [advances]);

  const anhHoOutstandingAdvance = useMemo(() => {
    return availableMaterialAdvances.reduce((sum, a) => {
      const p = (a.person || '').toLowerCase();
      if (p.includes('hồ') || p.includes('ho') || availableMaterialAdvances.length > 0) {
        return sum + (Number(a.outstanding_amount) || 0);
      }
      return sum;
    }, 0);
  }, [availableMaterialAdvances]);

  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [confirmState, setConfirmState] = useState<{ isOpen: boolean; id: string }>({
    isOpen: false,
    id: '',
  });
  const [selectedDetail, setSelectedDetail] = useState<Import | null>(null);

  // State cho tính năng đối trừ tạm ứng 1-chạm khi tạo phiếu nhập mới
  const [selectedAdvanceId, setSelectedAdvanceId] = useState<string>('');

  // State cho tính năng "+ Thêm nhanh đơn vị mới" ngay trong Modal Nhập phế
  const [showQuickSupplier, setShowQuickSupplier] = useState(false);
  const [savingQuickSupplier, setSavingQuickSupplier] = useState(false);
  const [quickSupplier, setQuickSupplier] = useState<{
    name: string;
    source_category: SourceCategory;
    region: string;
    contact_person: string;
    phone: string;
    default_price_per_kg: string;
  }>({
    name: '',
    source_category: 'warehouse',
    region: 'Đà Nẵng',
    contact_person: '',
    phone: '',
    default_price_per_kg: '4500',
  });

  // Table Controls
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

  // Form State
  const { formState, openModal, closeModal, handleChange } = useCrudForm<Import>({
    initialData: {
      date: today(),
      material_type: 'Tấm nhựa nano',
      import_type: 'nvl',
      quantity_kg: 0,
      price_per_kg: 4500,
      payment_status: 'paid',
      processing_status: 'pending',
      collector_name: 'Anh Hồ',
      vehicle_info: '',
      supplier_slip_code: '',
    },
  });

  const handleOpenNewModal = React.useCallback(
    (preselectedContactId?: string) => {
      setShowQuickSupplier(false);
      setSelectedAdvanceId('');
      const matchedSupplier = preselectedContactId
        ? suppliers.find((s) => s.id === preselectedContactId)
        : undefined;

      openModal({
        date: today(),
        contact_id: matchedSupplier?.id,
        contact_name: matchedSupplier?.name,
        material_type:
          matchedSupplier?.main_material_type ||
          (importTypeFilter === 'thanh_pham' ? 'Phế thành phẩm' : 'Tấm nhựa nano'),
        import_type: importTypeFilter === 'thanh_pham' ? 'thanh_pham' : 'nvl',
        quantity_kg: 0,
        price_per_kg: matchedSupplier?.default_price_per_kg || 4500,
        payment_status: 'paid',
        processing_status: 'pending',
        collector_name: matchedSupplier?.collector_name || 'Anh Hồ',
        vehicle_info: '',
        supplier_slip_code: '',
      });
    },
    [openModal, importTypeFilter, suppliers],
  );

  const [searchParams] = useSearchParams();

  React.useEffect(() => {
    if (actionRef) actionRef.current = () => handleOpenNewModal();
  });

  React.useEffect(() => {
    if (searchParams.get('open') === 'true') {
      const contactIdParam = searchParams.get('contactId') || undefined;
      if (contactIdParam && suppliers.length === 0) {
        // Đợi danh sách suppliers tải xong để điền sẵn thông tin đơn vị
        return;
      }
      handleOpenNewModal(contactIdParam);
      const params = new URLSearchParams(window.location.search);
      if (params.has('open') || params.has('contactId')) {
        params.delete('open');
        params.delete('contactId');
        const newUrl = window.location.pathname + (params.toString() ? `?${params.toString()}` : '');
        window.history.replaceState({}, '', newUrl);
      }
    }
  }, [searchParams, handleOpenNewModal, suppliers.length]);

  const filteredData = useMemo(() => {
    const list = imports.filter((item) => {
      const type = item.import_type || 'nvl';
      if (importTypeFilter !== 'all' && type !== importTypeFilter) return false;
      if (collectorFilter === 'anh_ho') {
        const collector = (item.collector_name || 'Anh Hồ').toLowerCase();
        if (!collector.includes('hồ') && !collector.includes('ho')) return false;
      }
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      const contactName = item.contact_name || '';
      const supplier = item.contact_id ? supplierById[item.contact_id] : undefined;
      return (
        contactName.toLowerCase().includes(q) ||
        item.date.includes(q) ||
        item.material_type.toLowerCase().includes(q) ||
        item.collector_name?.toLowerCase().includes(q) ||
        item.vehicle_info?.toLowerCase().includes(q) ||
        item.supplier_slip_code?.toLowerCase().includes(q) ||
        supplier?.region?.toLowerCase().includes(q) ||
        item.notes?.toLowerCase().includes(q)
      );
    });
    return sortByDateDesc(list);
  }, [imports, searchQuery, importTypeFilter, collectorFilter, supplierById]);

  // Thống kê tổng hợp theo bộ lọc hiện tại
  const stats = useMemo(() => {
    const totalKg = filteredData.reduce((acc, item) => acc + (Number(item.quantity_kg) || 0), 0);
    const totalLots = filteredData.length;
    const pendingLots = filteredData.filter((i) => i.processing_status === 'pending').length;
    const unpaidAmount = filteredData
      .filter((i) => i.payment_status === 'unpaid')
      .reduce((acc, item) => acc + (Number(item.total_amount) || 0), 0);

    return { totalKg, totalLots, pendingLots, unpaidAmount };
  }, [filteredData]);

  // Tổng hợp Nhật ký thu mua của Anh Hồ trong kỳ đang xem
  const anhHoLog = useMemo(() => summarizeCollectorLog(imports, 'Anh Hồ'), [imports]);

  const sortedData = useMemo(() => sortRows(filteredData, sortConfig), [filteredData, sortConfig]);

  const pageItems = useMemo(
    () => sortedData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage),
    [sortedData, currentPage, itemsPerPage],
  );

  // Xử lý tạo nhanh đơn vị nhập phế ngay trong Modal Nhập phế
  const handleQuickCreateSupplier = async () => {
    const name = quickSupplier.name.trim();
    if (!name) {
      toast.warning('Vui lòng nhập tên đơn vị cung cấp mới');
      return;
    }
    setSavingQuickSupplier(true);
    try {
      const priceNum = Number(quickSupplier.default_price_per_kg) || undefined;
      const created = await contactsService.create({
        name,
        type: 'supplier',
        source_category: quickSupplier.source_category,
        region: quickSupplier.region.trim() || undefined,
        contact_person: quickSupplier.contact_person.trim() || undefined,
        phone: quickSupplier.phone.trim() || undefined,
        default_price_per_kg: priceNum,
        main_material_type: formState.data?.material_type || 'Tấm nhựa nano',
        collector_name: formState.data?.collector_name || 'Anh Hồ',
      });
      await refetchContacts();
      handleChange('contact_id', created.id);
      if (priceNum) {
        handleChange('price_per_kg', priceNum);
      }
      setShowQuickSupplier(false);
      setQuickSupplier({
        name: '',
        source_category: 'warehouse',
        region: 'Đà Nẵng',
        contact_person: '',
        phone: '',
        default_price_per_kg: '4500',
      });
      toast.success(`Đã thêm đơn vị "${created.name}" và chọn vào phiếu nhập`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không thể tạo nhanh đơn vị');
    } finally {
      setSavingQuickSupplier(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    const data = formState.data;
    const qty = Number(data.quantity_kg) || 0;
    const price = Number(data.price_per_kg) || 0;
    const totalAmount = qty * price;

    if (qty <= 0) {
      toast.warning('Vui lòng nhập khối lượng lớn hơn 0 kg');
      return;
    }

    // Kiểm tra số dư nếu chọn đối trừ từ khoản tạm ứng mua hàng của Anh Hồ
    const chosenAdvance = selectedAdvanceId
      ? availableMaterialAdvances.find((a) => a.id === selectedAdvanceId)
      : undefined;

    if (!data.id && chosenAdvance) {
      const advRemaining = Number(chosenAdvance.outstanding_amount) || 0;
      if (totalAmount <= 0) {
        toast.warning('Tổng tiền phiếu nhập phải lớn hơn 0đ để đối trừ tạm ứng');
        return;
      }
      if (totalAmount > advRemaining) {
        toast.warning(
          `Tổng tiền phiếu (${formatTien(totalAmount)}) vượt số dư khoản ứng đã chọn (${formatTien(advRemaining)}). Vui lòng chọn khoản ứng khác hoặc để trạng thái Chưa thanh toán.`,
        );
        return;
      }
    }

    setSaving(true);
    try {
      const selectedContact = suppliers.find((s) => s.id === data.contact_id);
      const contactName = selectedContact ? selectedContact.name : data.contact_name || 'Khách lẻ';
      const importType: ImportType = data.import_type || 'nvl';

      if (data.id) {
        await importsService.update(data.id, {
          ...data,
          import_type: importType,
          contact_name: contactName,
          total_amount: totalAmount,
          collector_name: data.collector_name || 'Anh Hồ',
          vehicle_info: data.vehicle_info,
          supplier_slip_code: data.supplier_slip_code,
        });
        toast.success('Đã cập nhật phiếu thu mua phế');
      } else {
        // Nếu có chọn đối trừ tạm ứng, tạo phiếu ở trạng thái 'unpaid' rồi ghi payment gắn advance_id
        // để trigger DB tự động chuyển payment_status -> 'paid' và trừ số dư ứng chuẩn xác.
        const initialPayStatus: PaymentStatus = chosenAdvance ? 'unpaid' : data.payment_status || 'paid';

        const createdImport = await importsService.create({
          date: data.date || today(),
          contact_id: data.contact_id || undefined,
          contact_name: contactName,
          material_type:
            data.material_type || (importType === 'thanh_pham' ? 'Phế thành phẩm' : 'Tấm nhựa nano'),
          import_type: importType,
          quantity_kg: qty,
          price_per_kg: price,
          total_amount: totalAmount,
          payment_status: initialPayStatus,
          processing_status: data.processing_status || 'pending',
          collector_name: data.collector_name || 'Anh Hồ',
          vehicle_info: data.vehicle_info,
          supplier_slip_code: data.supplier_slip_code,
          notes: data.notes,
        });

        if (chosenAdvance && canDeductAdvance) {
          await paymentsService.recordPayment({
            ref_type: 'import',
            ref_id: createdImport.id,
            amount: totalAmount,
            date: createdImport.date,
            method: 'cash',
            advance_id: chosenAdvance.id,
            notes: `Chi trả tiền phế từ khoản tạm ứng mua hàng (${chosenAdvance.person || 'Anh Hồ'})`,
          });
          await refetchAdvances();
          toast.success('Đã lưu phiếu nhập và đối trừ trực tiếp vào tiền ứng của Anh Hồ');
        } else {
          toast.success('Đã ghi nhận chuyến thu mua phế mới');
        }
      }
      closeModal();
      setSelectedAdvanceId('');
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi khi lưu phiếu nhập');
      console.error('Lỗi khi lưu phiếu nhập:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setConfirmState({ isOpen: true, id });
  };

  const confirmDelete = async () => {
    try {
      await importsService.delete(confirmState.id);
      toast.success('Đã xóa phiếu nhập');
      refetch();
    } catch (err) {
      toast.error('Lỗi khi xóa phiếu nhập');
      console.error('Lỗi khi xóa phiếu nhập:', err);
    }
    setConfirmState({ isOpen: false, id: '' });
  };

  const selectedFormSupplier = formState.data?.contact_id
    ? supplierById[formState.data.contact_id]
    : undefined;

  return (
    <div className="space-y-2.5 sm:space-y-4 animate-fade-in">
      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <div className="card p-2.5 sm:p-4 flex items-center space-x-2 sm:space-x-4 bg-[var(--bg-surface)] min-w-0">
          <div className="flex h-8 w-8 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-lg sm:rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800">
            <Package className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] sm:text-xs text-[var(--text-muted)] font-bold uppercase truncate">
              Tổng nhập trong kỳ
            </p>
            <p className="text-xs sm:text-xl font-black font-mono leading-tight text-[var(--text-primary)] truncate">
              {formatKg(stats.totalKg)}
            </p>
          </div>
        </div>

        <div className="card p-2.5 sm:p-4 flex items-center space-x-2 sm:space-x-4 bg-[var(--bg-surface)] min-w-0">
          <div className="flex h-8 w-8 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-lg sm:rounded-2xl bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-950/40 dark:border-blue-800">
            <Truck className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] sm:text-xs text-[var(--text-muted)] font-bold uppercase truncate">
              Số chuyến thu gom
            </p>
            <p className="text-xs sm:text-xl font-black font-mono leading-tight text-[var(--text-primary)] truncate">
              {stats.totalLots} chuyến
            </p>
          </div>
        </div>

        <div className="card p-2.5 sm:p-4 flex items-center space-x-2 sm:space-x-4 bg-[var(--bg-surface)] min-w-0">
          <div className="flex h-8 w-8 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-lg sm:rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-950/40 dark:border-amber-800">
            <Clock className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] sm:text-xs text-[var(--text-muted)] font-bold uppercase truncate">
              Chờ đưa vào xay
            </p>
            <p className="text-xs sm:text-xl font-black font-mono leading-tight text-amber-600 truncate">
              {stats.pendingLots} lô
            </p>
          </div>
        </div>

        <div className="card p-2.5 sm:p-4 flex items-center space-x-2 sm:space-x-4 bg-[var(--bg-surface)] min-w-0">
          <div className="flex h-8 w-8 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-lg sm:rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-950/40 dark:border-rose-800">
            <DollarSign className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] sm:text-xs text-[var(--text-muted)] font-bold uppercase truncate">
              Chưa thanh toán
            </p>
            <p className="text-xs sm:text-xl font-black font-mono leading-tight text-rose-600 truncate">
              {formatTien(stats.unpaidAmount)}
            </p>
          </div>
        </div>
      </div>

      {/* Thẻ Nhật Ký Đi Thu Mua Hằng Ngày Của Anh Hồ */}
      <div className="card p-3 sm:p-4 bg-gradient-to-r from-emerald-50/80 via-[var(--bg-surface)] to-teal-50/60 dark:from-emerald-950/30 dark:via-[var(--bg-surface)] dark:to-teal-950/20 border border-emerald-200/80 dark:border-emerald-800/60">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
              <UserCheck size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xs sm:text-sm font-black text-[var(--text-primary)]">
                  Sổ Nhật Ký Thu Mua Phế — Anh Hồ
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/70 dark:text-emerald-200">
                  {anhHoLog.tripCount} chuyến • {anhHoLog.uniqueSuppliersCount} đơn vị cung cấp
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                Sản lượng Anh Hồ gom trong kỳ:{' '}
                <b className="font-mono text-emerald-700 dark:text-emerald-400">
                  {formatKg(anhHoLog.totalKg)}
                </b>{' '}
                • Tổng tiền hàng:{' '}
                <b className="font-mono text-[var(--text-primary)]">{formatTien(anhHoLog.totalAmount)}</b>
                {anhHoOutstandingAdvance > 0 && (
                  <>
                    {' '}
                    • Tiền ứng mua hàng còn dư:{' '}
                    <b className="font-mono text-amber-600">{formatTien(anhHoOutstandingAdvance)}</b>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setCollectorFilter(collectorFilter === 'anh_ho' ? 'all' : 'anh_ho')}
              className={cn(
                'h-8 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border',
                collectorFilter === 'anh_ho'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                  : 'bg-[var(--bg-surface)] text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:text-emerald-300 dark:border-emerald-800',
              )}
            >
              <UserCheck size={14} />
              <span>
                {collectorFilter === 'anh_ho' ? 'Đang lọc: Chuyến của Anh Hồ' : 'Lọc riêng chuyến Anh Hồ'}
              </span>
            </button>

            <Link
              to="/danh-ba"
              className="h-8 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--primary-600)] border border-[var(--border-color)] transition-colors"
            >
              <MapPin size={14} />
              <span>Quản lý đơn vị nhập ({suppliers.length})</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Bộ lọc loại phế & Kỳ thời gian */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2 bg-[var(--bg-surface)] p-2 rounded-xl border border-[var(--border-color)] shadow-2xs">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setImportTypeFilter('all')}
            className={cn(
              'h-7 px-2.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap',
              importTypeFilter === 'all'
                ? 'bg-[var(--primary-500)] text-white shadow-2xs'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]',
            )}
          >
            Tất cả ({imports.length})
          </button>
          <button
            type="button"
            onClick={() => setImportTypeFilter('nvl')}
            className={cn(
              'h-7 flex items-center gap-1 px-2.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap',
              importTypeFilter === 'nvl'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 dark:text-emerald-400',
            )}
          >
            <span>Phế NVL</span>
            <span className="text-[10px] px-1.5 py-0.2 bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 rounded-full font-mono font-black">
              {imports.filter((i) => (i.import_type || 'nvl') === 'nvl').length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setImportTypeFilter('thanh_pham')}
            className={cn(
              'h-7 flex items-center gap-1 px-2.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap',
              importTypeFilter === 'thanh_pham'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 dark:text-indigo-400',
            )}
          >
            <span>Phế Thành phẩm</span>
            <span className="text-[10px] px-1.5 py-0.2 bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200 rounded-full font-mono font-black">
              {imports.filter((i) => i.import_type === 'thanh_pham').length}
            </span>
          </button>
        </div>

        <PeriodFilter range={range} onChange={setRange} className="border-0 p-0 sm:p-0 bg-transparent" />
      </div>

      {/* Toolbar */}
      <TableToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        placeholder="Tìm theo tên đơn vị, tuyến khu vực, người thu mua (Anh Hồ), biển số xe..."
        totalCount={filteredData.length}
      />

      <DataState
        loading={loading}
        error={error}
        isEmpty={filteredData.length === 0}
        emptyTitle="Chưa có phiếu thu mua phế nào trong kỳ"
      >
        {/* Table */}
        <div className="erp-table-container hidden lg:block">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <caption className="sr-only">Danh sách phiếu nhập phế</caption>
              <thead>
                <tr>
                  <SortableHeader sortKey="date" sortConfig={sortConfig} onSort={handleSort}>
                    Ngày nhập
                  </SortableHeader>
                  <SortableHeader sortKey="contact_name" sortConfig={sortConfig} onSort={handleSort}>
                    Đơn vị nhập phế (NCC)
                  </SortableHeader>
                  <th scope="col" className="th-cell">
                    Người thu mua & Chuyến xe
                  </th>
                  <SortableHeader sortKey="import_type" sortConfig={sortConfig} onSort={handleSort}>
                    Loại phế
                  </SortableHeader>
                  <SortableHeader
                    sortKey="quantity_kg"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    align="right"
                  >
                    Số lượng (kg)
                  </SortableHeader>
                  <SortableHeader
                    sortKey="price_per_kg"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    align="right"
                  >
                    Giá/kg
                  </SortableHeader>
                  <SortableHeader
                    sortKey="total_amount"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    align="right"
                  >
                    Tổng tiền
                  </SortableHeader>
                  <SortableHeader sortKey="payment_status" sortConfig={sortConfig} onSort={handleSort}>
                    Thanh toán
                  </SortableHeader>
                  <SortableHeader sortKey="processing_status" sortConfig={sortConfig} onSort={handleSort}>
                    Xử lý
                  </SortableHeader>
                  <th className="th-cell text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((item) => {
                  const sup = item.contact_id ? supplierById[item.contact_id] : undefined;
                  const catCfg = sup ? getSourceCategoryConfig(sup.source_category) : undefined;
                  return (
                    <tr
                      key={item.id}
                      className="tr-hover cursor-pointer"
                      onClick={() => setSelectedDetail(item)}
                      title="Bấm để xem chi tiết phiếu nhập"
                    >
                      <td className="td-cell font-mono text-xs text-[var(--text-secondary)]">
                        {formatNgay(item.date)}
                      </td>
                      <td className="td-cell">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-xs text-[var(--text-primary)]">
                            {item.contact_name || 'Khách lẻ'}
                          </span>
                          {catCfg && (
                            <span
                              className={cn(
                                'px-1.5 py-0.2 rounded-full text-[9px] font-bold border',
                                catCfg.badgeClass,
                              )}
                            >
                              {catCfg.shortLabel}
                            </span>
                          )}
                        </div>
                        {sup?.region && (
                          <span className="text-[10px] text-[var(--text-muted)] block mt-0.5">
                            Tuyến: {sup.region}
                            {sup.contact_person ? ` • LH: ${sup.contact_person}` : ''}
                          </span>
                        )}
                      </td>
                      <td className="td-cell text-xs">
                        <span className="inline-flex items-center gap-1 font-bold text-emerald-700 dark:text-emerald-400">
                          <UserCheck size={12} /> {item.collector_name || 'Anh Hồ'}
                        </span>
                        {(item.vehicle_info || item.supplier_slip_code) && (
                          <span className="text-[10px] text-[var(--text-muted)] block mt-0.5 font-mono">
                            {item.vehicle_info}
                            {item.vehicle_info && item.supplier_slip_code ? ' • ' : ''}
                            {item.supplier_slip_code ? `Phiếu: ${item.supplier_slip_code}` : ''}
                          </span>
                        )}
                      </td>
                      <td className="td-cell">
                        {item.import_type === 'thanh_pham' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:border-indigo-800 whitespace-nowrap">
                            Phế TP
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800 whitespace-nowrap">
                            {item.material_type || 'Phế NVL'}
                          </span>
                        )}
                      </td>
                      <td className="td-cell text-right font-mono font-bold text-xs text-[var(--text-primary)]">
                        {formatKg(item.quantity_kg)}
                      </td>
                      <td className="td-cell text-right font-mono text-xs text-[var(--text-muted)]">
                        {formatTien(item.price_per_kg)}
                      </td>
                      <td className="td-cell text-right font-mono font-bold text-xs text-[var(--primary-500)]">
                        {formatTien(item.total_amount)}
                      </td>
                      <td className="td-cell">
                        <StatusBadge status={item.payment_status} />
                      </td>
                      <td className="td-cell">
                        <StatusBadge status={item.processing_status} />
                      </td>
                      <td className="td-cell text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end">
                          {canEditDelete && (
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="icon-action text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer"
                              title="Xóa phiếu"
                            >
                              <Trash2 size={16} />
                            </button>
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

        {/* Card view cho điện thoại */}
        <MobileCardList
          items={pageItems.map((item) => {
            const sup = item.contact_id ? supplierById[item.contact_id] : undefined;
            return {
              id: item.id,
              title: item.contact_name || 'Khách lẻ',
              subtitle: `${formatNgay(item.date)} • ${item.collector_name || 'Anh Hồ'}${sup?.region ? ` • ${sup.region}` : ''}`,
              badge: <StatusBadge status={item.payment_status} />,
              accentColor:
                item.import_type === 'thanh_pham'
                  ? '#6366f1'
                  : item.processing_status === 'pending'
                    ? '#f59e0b'
                    : '#10b981',
              onClick: () => setSelectedDetail(item),
              fields: [
                {
                  label: 'Loại phế',
                  value:
                    item.import_type === 'thanh_pham' ? 'Phế Thành phẩm' : item.material_type || 'Phế NVL',
                },
                { label: 'Khối lượng', value: formatKg(item.quantity_kg) },
                { label: 'Đơn giá', value: `${formatTien(item.price_per_kg)}/kg` },
                { label: 'Thành tiền', value: formatTien(item.total_amount) },
                ...(item.vehicle_info ? [{ label: 'Chuyến xe', value: item.vehicle_info }] : []),
                { label: 'Xử lý', value: <StatusBadge status={item.processing_status} /> },
              ],
            };
          })}
          emptyMessage="Chưa có phiếu nhập nào trong kỳ này"
        />

        <PaginationBar
          currentPage={currentPage}
          totalItems={filteredData.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
        />
      </DataState>

      {/* Detail View Modal */}
      <Modal
        isOpen={!!selectedDetail}
        onClose={() => setSelectedDetail(null)}
        title="Chi tiết phiếu thu mua / nhập phế"
      >
        {selectedDetail && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)]">
              <div>
                <span className="text-[var(--text-muted)] block font-semibold uppercase">Ngày nhập</span>
                <span className="font-mono font-bold text-sm text-[var(--text-primary)]">
                  {formatNgay(selectedDetail.date)}
                </span>
              </div>
              <div>
                <span className="text-[var(--text-muted)] block font-semibold uppercase">
                  Người đi thu mua
                </span>
                <span className="font-bold text-sm text-emerald-700 dark:text-emerald-400">
                  {selectedDetail.collector_name || 'Anh Hồ'}
                </span>
              </div>
              <div>
                <span className="text-[var(--text-muted)] block font-semibold uppercase">
                  Đơn vị cung cấp (NCC)
                </span>
                <span className="font-bold text-sm text-[var(--text-primary)]">
                  {selectedDetail.contact_name || 'Khách lẻ'}
                </span>
              </div>
              <div>
                <span className="text-[var(--text-muted)] block font-semibold uppercase">Loại phế</span>
                <span className="font-bold text-sm text-[var(--text-primary)]">
                  {selectedDetail.material_type ||
                    (selectedDetail.import_type === 'thanh_pham' ? 'Phế Thành phẩm' : 'Phế Nguyên Vật Liệu')}
                </span>
              </div>
              {(selectedDetail.vehicle_info || selectedDetail.supplier_slip_code) && (
                <>
                  <div>
                    <span className="text-[var(--text-muted)] block font-semibold uppercase">
                      Chuyến xe / Vận chuyển
                    </span>
                    <span className="font-mono font-semibold text-xs text-[var(--text-primary)]">
                      {selectedDetail.vehicle_info || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)] block font-semibold uppercase">
                      Mã phiếu cân tại nguồn
                    </span>
                    <span className="font-mono font-semibold text-xs text-[var(--text-primary)]">
                      {selectedDetail.supplier_slip_code || '—'}
                    </span>
                  </div>
                </>
              )}
              <div>
                <span className="text-[var(--text-muted)] block font-semibold uppercase">Khối lượng</span>
                <span className="font-mono font-bold text-sm text-emerald-600">
                  {formatKg(selectedDetail.quantity_kg)}
                </span>
              </div>
              <div>
                <span className="text-[var(--text-muted)] block font-semibold uppercase">Đơn giá</span>
                <span className="font-mono font-bold text-sm text-[var(--text-primary)]">
                  {formatTien(selectedDetail.price_per_kg)}/kg
                </span>
              </div>
              <div className="col-span-2 pt-2 border-t border-[var(--border-color)] flex justify-between items-center">
                <span className="text-[var(--text-muted)] font-semibold uppercase">TỔNG TIỀN PHIẾU:</span>
                <span className="font-mono font-black text-base text-[var(--primary-500)]">
                  {formatTien(selectedDetail.total_amount)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)]">
                <span className="text-[var(--text-muted)] block font-semibold uppercase mb-1">
                  THANH TOÁN
                </span>
                <StatusBadge status={selectedDetail.payment_status} />
              </div>
              <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)]">
                <span className="text-[var(--text-muted)] block font-semibold uppercase mb-1">
                  TRẠNG THÁI XAY
                </span>
                <StatusBadge status={selectedDetail.processing_status} />
              </div>
            </div>

            {selectedDetail.notes && (
              <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)]">
                <span className="text-[var(--text-muted)] block font-semibold uppercase mb-1">GHI CHÚ</span>
                <p className="text-[var(--text-secondary)] italic">{selectedDetail.notes}</p>
              </div>
            )}

            <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)]">
              <AttachmentUploader refType="import" refId={selectedDetail.id} />
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-[var(--border-color)] gap-2">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    printPhieuNhap(selectedDetail);
                  }}
                  className="btn-secondary flex items-center space-x-1.5 text-xs font-bold py-2 px-3 cursor-pointer"
                >
                  <Printer size={15} />
                  <span>In phiếu</span>
                </button>
                {canEditDelete && (
                  <button
                    onClick={() => {
                      const item = selectedDetail;
                      setSelectedDetail(null);
                      setShowQuickSupplier(false);
                      setSelectedAdvanceId('');
                      openModal(item);
                    }}
                    className="btn-primary flex items-center space-x-1.5 text-xs font-bold py-2 px-3 cursor-pointer"
                  >
                    <Edit size={15} />
                    <span>Chỉnh sửa</span>
                  </button>
                )}
              </div>

              {canEditDelete && (
                <button
                  onClick={() => {
                    const id = selectedDetail.id;
                    setSelectedDetail(null);
                    handleDelete(id);
                  }}
                  className="btn-danger flex items-center space-x-1.5 text-xs font-bold py-2 px-3 cursor-pointer"
                >
                  <Trash2 size={15} />
                  <span>Xóa</span>
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Add/Edit Phiếu Thu Mua Phế */}
      <Modal
        isOpen={formState.isOpen}
        onClose={closeModal}
        title={formState.data?.id ? 'Sửa phiếu thu mua phế' : 'Ghi nhận chuyến thu mua / nhập phế mới'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <FormField label="Loại phế nhập" required>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  handleChange('import_type', 'nvl');
                  if (!formState.data?.id && formState.data?.material_type === 'Phế thành phẩm') {
                    handleChange('material_type', 'Tấm nhựa nano');
                  }
                }}
                className={cn(
                  'tap-target flex items-center justify-center gap-1.5 p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer',
                  (formState.data?.import_type || 'nvl') === 'nvl'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:border-emerald-600 dark:text-emerald-200 shadow-xs'
                    : 'border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]',
                )}
              >
                <Package size={15} />
                <span>Phế Nguyên Vật Liệu (Cần xay)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  handleChange('import_type', 'thanh_pham');
                  if (
                    !formState.data?.id &&
                    (formState.data?.material_type === 'Phế nhựa NVL' ||
                      formState.data?.material_type === 'Tấm nhựa nano')
                  ) {
                    handleChange('material_type', 'Phế thành phẩm');
                  }
                }}
                className={cn(
                  'tap-target flex items-center justify-center gap-1.5 p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer',
                  formState.data?.import_type === 'thanh_pham'
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-800 dark:bg-indigo-950/60 dark:border-indigo-600 dark:text-indigo-200 shadow-xs'
                    : 'border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]',
                )}
              >
                <FileText size={15} />
                <span>Phế Thành phẩm (Đã xay)</span>
              </button>
            </div>
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Ngày thu mua" required>
              <input
                type="date"
                required
                className="input-field"
                value={formState.data?.date || ''}
                onChange={(e) => handleChange('date', e.target.value)}
              />
            </FormField>

            <FormField label="Người đi thu mua">
              <input
                type="text"
                className="input-field font-semibold"
                placeholder="Mặc định: Anh Hồ"
                value={formState.data?.collector_name ?? 'Anh Hồ'}
                onChange={(e) => handleChange('collector_name', e.target.value)}
              />
            </FormField>
          </div>

          {/* Chọn Đơn vị cung cấp + Nút tạo nhanh đơn vị mới ngay tại hiện trường */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-[var(--text-secondary)]">
                Đơn vị cung cấp phế (Nguồn hàng)
              </label>
              {canManageContacts && (
                <button
                  type="button"
                  onClick={() => setShowQuickSupplier((prev) => !prev)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer"
                >
                  {showQuickSupplier ? (
                    <>
                      <X size={13} /> Đóng form thêm nhanh
                    </>
                  ) : (
                    <>
                      <Plus size={13} /> Thêm nhanh đơn vị mới
                    </>
                  )}
                </button>
              )}
            </div>

            <select
              aria-label="Người bán (Nhà cung cấp)"
              className="input-field"
              value={formState.data?.contact_id || ''}
              onChange={(e) => {
                const id = e.target.value;
                handleChange('contact_id', id);
                const sup = suppliers.find((s) => s.id === id);
                if (sup && !formState.data?.id) {
                  if (sup.default_price_per_kg) {
                    handleChange('price_per_kg', sup.default_price_per_kg);
                  }
                  if (sup.main_material_type) {
                    handleChange('material_type', sup.main_material_type);
                  }
                  if (sup.collector_name) {
                    handleChange('collector_name', sup.collector_name);
                  }
                }
              }}
            >
              <option value="">-- Chọn đơn vị nhập phế --</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {s.region ? ` [${s.region}]` : ''}
                  {s.default_price_per_kg ? ` — ${formatTien(s.default_price_per_kg)}/kg` : ''}
                </option>
              ))}
            </select>

            {/* Hiển thị nhanh hồ sơ của đơn vị vừa chọn để Anh Hồ đối chiếu */}
            {selectedFormSupplier && (
              <div className="p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 text-[11px] flex flex-wrap items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <span className="font-bold text-emerald-900 dark:text-emerald-200">
                    {getSourceCategoryConfig(selectedFormSupplier.source_category).label}
                    {selectedFormSupplier.region ? ` • Tuyến: ${selectedFormSupplier.region}` : ''}
                  </span>
                  <div className="text-[var(--text-secondary)] flex flex-wrap items-center gap-2">
                    {selectedFormSupplier.contact_person && (
                      <span>Đầu mối: {selectedFormSupplier.contact_person}</span>
                    )}
                    {selectedFormSupplier.phone && (
                      <span className="inline-flex items-center gap-0.5 font-mono">
                        <Phone size={11} /> {selectedFormSupplier.phone}
                      </span>
                    )}
                  </div>
                </div>
                {selectedFormSupplier.default_price_per_kg && (
                  <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300 bg-white/80 dark:bg-slate-900 px-2 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
                    Giá chuẩn: {formatTien(selectedFormSupplier.default_price_per_kg)}/kg
                  </span>
                )}
              </div>
            )}

            {/* Khung tạo nhanh đơn vị nhập phế mới */}
            {showQuickSupplier && (
              <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border-2 border-emerald-500/40 space-y-3 animate-fade-in">
                <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  Thêm nhanh đơn vị cung cấp phế mới (tự động chọn sau khi lưu)
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <input
                    type="text"
                    className="input-field text-xs"
                    placeholder="Tên đơn vị / Vựa / Xưởng *"
                    value={quickSupplier.name}
                    onChange={(e) => setQuickSupplier((prev) => ({ ...prev, name: e.target.value }))}
                  />
                  <select
                    className="input-field text-xs"
                    value={quickSupplier.source_category}
                    onChange={(e) =>
                      setQuickSupplier((prev) => ({
                        ...prev,
                        source_category: e.target.value as SourceCategory,
                      }))
                    }
                  >
                    {Object.values(SOURCE_CATEGORY_CONFIG).map((cfg) => (
                      <option key={cfg.id} value={cfg.id}>
                        {cfg.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    list="quick-supplier-regions"
                    className="input-field text-xs"
                    placeholder="Khu vực / Tuyến (VD: Đà Nẵng)"
                    value={quickSupplier.region}
                    onChange={(e) => setQuickSupplier((prev) => ({ ...prev, region: e.target.value }))}
                  />
                  <datalist id="quick-supplier-regions">
                    {COMMON_REGIONS.map((r) => (
                      <option key={r} value={r} />
                    ))}
                  </datalist>
                  <input
                    type="text"
                    className="input-field text-xs"
                    placeholder="Tên người liên hệ tại đơn vị"
                    value={quickSupplier.contact_person}
                    onChange={(e) =>
                      setQuickSupplier((prev) => ({ ...prev, contact_person: e.target.value }))
                    }
                  />
                  <input
                    type="text"
                    className="input-field text-xs font-mono"
                    placeholder="Số điện thoại"
                    value={quickSupplier.phone}
                    onChange={(e) => setQuickSupplier((prev) => ({ ...prev, phone: e.target.value }))}
                  />
                  <input
                    type="number"
                    className="input-field text-xs font-mono"
                    placeholder="Giá thỏa thuận (đ/kg)"
                    value={quickSupplier.default_price_per_kg}
                    onChange={(e) =>
                      setQuickSupplier((prev) => ({
                        ...prev,
                        default_price_per_kg: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowQuickSupplier(false)}
                    className="btn-secondary !py-1.5 !px-3 text-xs cursor-pointer"
                  >
                    Đóng
                  </button>
                  <button
                    type="button"
                    disabled={savingQuickSupplier}
                    onClick={() => void handleQuickCreateSupplier()}
                    className="btn-primary !py-1.5 !px-3 text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <Check size={14} />
                    <span>{savingQuickSupplier ? 'Đang tạo...' : 'Lưu & Chọn đơn vị'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Tên mặt hàng phế">
              <input
                type="text"
                className="input-field"
                placeholder="VD: Tấm nhựa nano, Phế PVC..."
                value={formState.data?.material_type || ''}
                onChange={(e) => handleChange('material_type', e.target.value)}
              />
            </FormField>

            <FormField label="Chuyến xe / Biển số">
              <input
                type="text"
                className="input-field"
                placeholder="VD: Xe tải 43C-128.99 - Chuyến sáng"
                value={formState.data?.vehicle_info || ''}
                onChange={(e) => handleChange('vehicle_info', e.target.value)}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Khối lượng cân (kg)" required>
              <input
                type="number"
                inputMode="decimal"
                required
                min="1"
                step="any"
                className="input-field font-mono font-bold"
                placeholder="0"
                value={formState.data?.quantity_kg || ''}
                onChange={(e) => handleChange('quantity_kg', Number(e.target.value))}
              />
            </FormField>

            <FormField label="Đơn giá thu mua (đ/kg)" required>
              <input
                type="number"
                inputMode="decimal"
                required
                min="0"
                className="input-field font-mono"
                placeholder="4500"
                value={formState.data?.price_per_kg || ''}
                onChange={(e) => handleChange('price_per_kg', Number(e.target.value))}
              />
            </FormField>
          </div>

          {/* Computed preview */}
          <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] flex justify-between items-center text-xs">
            <span className="text-[var(--text-muted)] font-semibold">TỔNG TIỀN PHIẾU THU MUA:</span>
            <span className="font-mono font-black text-sm text-[var(--primary-500)]">
              {formatTien(
                (Number(formState.data?.quantity_kg) || 0) * (Number(formState.data?.price_per_kg) || 0),
              )}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Thanh toán">
              <select
                className="input-field"
                value={formState.data?.payment_status || 'paid'}
                onChange={(e) => {
                  const nextStatus = e.target.value as PaymentStatus;
                  handleChange('payment_status', nextStatus);
                  if (nextStatus !== 'paid') {
                    setSelectedAdvanceId('');
                  }
                }}
              >
                <option value="paid">Đã thanh toán đủ</option>
                <option value="partial">Thanh toán 1 phần</option>
                <option value="unpaid">Chưa thanh toán (Ghi nợ NCC)</option>
              </select>
            </FormField>

            <FormField label="Trạng thái xay">
              <select
                className="input-field"
                value={formState.data?.processing_status || 'pending'}
                onChange={(e) => handleChange('processing_status', e.target.value as ProcessingStatus)}
              >
                <option value="pending">Chờ xay</option>
                <option value="grinding">Đang xay</option>
                <option value="done">Hoàn thành</option>
              </select>
            </FormField>
          </div>

          {/* Tích hợp Đối trừ Tạm ứng tiền hàng của Anh Hồ 1-chạm */}
          {!formState.data?.id &&
            (formState.data?.payment_status || 'paid') === 'paid' &&
            canDeductAdvance &&
            availableMaterialAdvances.length > 0 && (
              <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/70 space-y-1.5">
                <label className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                  <Wallet size={14} className="text-amber-600" />
                  <span>Nguồn tiền thanh toán chuyến hàng này</span>
                </label>
                <select
                  aria-label="Nguồn tiền thanh toán chuyến hàng"
                  className="input-field text-xs"
                  value={selectedAdvanceId}
                  onChange={(e) => setSelectedAdvanceId(e.target.value)}
                >
                  <option value="">Tiền mặt / Chuyển khoản trực tiếp từ quỹ xưởng</option>
                  {availableMaterialAdvances.map((adv) => (
                    <option key={adv.id} value={adv.id}>
                      Trừ vào tiền ứng của {adv.person || 'Anh Hồ'} (Ngày {formatNgay(adv.date)} — Còn dư:{' '}
                      {formatTien(Number(adv.outstanding_amount) || 0)})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-amber-800 dark:text-amber-300">
                  Khi chọn trừ vào tiền ứng, hệ thống tự động tạo phiếu thanh toán và khấu trừ số dư tạm ứng
                  mua hàng của Anh Hồ ngay lập tức.
                </p>
              </div>
            )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Mã phiếu cân tại nguồn (nếu có)">
              <input
                type="text"
                className="input-field font-mono"
                placeholder="VD: PC-20261026-01"
                value={formState.data?.supplier_slip_code || ''}
                onChange={(e) => handleChange('supplier_slip_code', e.target.value)}
              />
            </FormField>

            <FormField label="Ghi chú chuyến hàng">
              <input
                type="text"
                className="input-field"
                placeholder="Ghi chú chất lượng phế, bốc xếp..."
                value={formState.data?.notes || ''}
                onChange={(e) => handleChange('notes', e.target.value)}
              />
            </FormField>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-[var(--border-color)]">
            <button type="button" onClick={closeModal} className="btn-secondary cursor-pointer">
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? 'Đang lưu...' : 'Lưu phiếu thu mua'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete */}
      <ConfirmDialog
        isOpen={confirmState.isOpen}
        onClose={() => setConfirmState({ isOpen: false, id: '' })}
        onConfirm={confirmDelete}
        title="Xóa phiếu nhập"
        message="Bạn có chắc chắn muốn xóa phiếu nhập phế liệu này? Hành động này không thể hoàn tác."
        variant="danger"
        confirmText="Xóa"
        cancelText="Hủy"
      />
    </div>
  );
};
