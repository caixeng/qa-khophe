import { useState, useCallback, useRef } from 'react';

export interface CrudFormConfig<T> {
  initialData?: Partial<T>;
  onSave?: (data: T) => Promise<unknown> | unknown;
  onSubmit?: (data: T) => Promise<unknown> | unknown;
  onDelete?: (id: string) => Promise<unknown> | unknown;
  /** Được gọi khi lưu/xoá thất bại — dùng để hiện toast lỗi cho người dùng. */
  onError?: (message: string, error: unknown) => void;
}

function messageOf(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

/**
 * Hook quản lý CRUD form: Thêm/Sửa/Xoá.
 *
 * Khi lưu thất bại, form KHÔNG đóng và `onError` được gọi — nếu nuốt lỗi im
 * lặng thì người dùng sẽ tưởng đã lưu xong trong khi dữ liệu chưa hề vào DB.
 */
export function useCrudForm<T extends { id?: string }>(config?: CrudFormConfig<T>) {
  const [formData, setFormData] = useState<Partial<T>>(config?.initialData || {});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Trang gọi hook này luôn truyền config dưới dạng object literal, nên nó là
   * một object MỚI ở mỗi lần render. Giữ nó trong ref để các hàm bên dưới có
   * thể `useCallback` với deps rỗng — nhờ vậy `openModal` giữ nguyên identity,
   * và những `useEffect` phụ thuộc vào nó không bị chạy lại vô hạn.
   */
  const configRef = useRef(config);
  configRef.current = config;

  // Aliases
  const isOpen = isModalOpen;
  const mode: 'create' | 'edit' = isEditing ? 'edit' : 'create';
  const currentItem = isEditing ? (formData as T) : null;

  const openCreate = useCallback(() => {
    setFormData(configRef.current?.initialData || {});
    setIsEditing(false);
    setIsModalOpen(true);
  }, []);

  const openModal = useCallback((data?: Partial<T>) => {
    if (data && data.id) {
      setFormData({ ...data });
      setIsEditing(true);
    } else if (data) {
      setFormData({ ...configRef.current?.initialData, ...data });
      setIsEditing(false);
    } else {
      setFormData(configRef.current?.initialData || {});
      setIsEditing(false);
    }
    setIsModalOpen(true);
  }, []);

  const openEdit = useCallback((item: T) => {
    setFormData({ ...item });
    setIsEditing(true);
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setTimeout(() => {
      setFormData(configRef.current?.initialData || {});
      setIsEditing(false);
    }, 200);
  }, []);

  const closeForm = closeModal;

  const updateField = useCallback((field: keyof T, value: T[keyof T]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleChange = updateField;

  const runSave = async (data: Partial<T>): Promise<boolean> => {
    if (isSubmitting) return false;
    setIsSubmitting(true);
    try {
      if (config?.onSave) {
        await config.onSave(data as T);
      } else if (config?.onSubmit) {
        await config.onSubmit(data as T);
      }
      closeModal();
      return true;
    } catch (error) {
      config?.onError?.(messageOf(error, 'Không lưu được dữ liệu. Vui lòng thử lại.'), error);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e && e.preventDefault) e.preventDefault();
    return runSave(formData);
  };

  const saveForm = async (data?: Partial<T>) => runSave(data || formData);

  const handleDelete = async (id: string): Promise<boolean> => {
    if (!config?.onDelete) return false;
    try {
      await config.onDelete(id);
      return true;
    } catch (error) {
      config?.onError?.(messageOf(error, 'Không xoá được. Vui lòng thử lại.'), error);
      return false;
    }
  };

  return {
    // Form data
    formData,
    setFormData,
    formState: {
      isOpen: isModalOpen,
      data: formData,
    },
    // Modal state
    isModalOpen,
    isOpen,
    isEditing,
    isSubmitting,
    mode,
    currentItem,
    // Actions
    openCreate,
    openModal,
    openEdit,
    closeModal,
    closeForm,
    handleChange,
    handleSubmit,
    saveForm,
    handleDelete,
    updateField,
  };
}
