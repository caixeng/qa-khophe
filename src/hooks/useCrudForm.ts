import { useState } from 'react';

/**
 * Hook quản lý CRUD form: Thêm/Sửa/Xóa
 * Dùng được cả có hoặc không có config
 */
export function useCrudForm<T extends { id?: string }>(config?: any) {
  const [formData, setFormData] = useState<Partial<T>>(config?.initialData || {});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Aliases
  const isOpen = isModalOpen;
  const mode: 'create' | 'edit' = isEditing ? 'edit' : 'create';
  const currentItem = isEditing ? (formData as T) : null;

  const openCreate = () => {
    setFormData(config?.initialData || {});
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const openModal = (data?: Partial<T>) => {
    if (data && data.id) {
      setFormData({ ...data });
      setIsEditing(true);
    } else if (data) {
      setFormData({ ...config?.initialData, ...data });
      setIsEditing(false);
    } else {
      setFormData(config?.initialData || {});
      setIsEditing(false);
    }
    setIsModalOpen(true);
  };

  const openEdit = (item: T) => {
    setFormData({ ...item });
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setTimeout(() => {
      setFormData(config?.initialData || {});
      setIsEditing(false);
    }, 200);
  };

  const closeForm = closeModal;

  const updateField = (field: keyof T, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleChange = (field: keyof T, value: any) => {
    updateField(field, value);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e && e.preventDefault) e.preventDefault();
    setIsSubmitting(true);
    try {
      if (config?.onSave) {
        await config.onSave(formData as T);
      } else if (config?.onSubmit) {
        await config.onSubmit(formData as T);
      }
      closeModal();
    } catch (error) {
      console.error('Lỗi khi lưu:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveForm = async (data?: Partial<T>) => {
    const saveData = data || formData;
    setIsSubmitting(true);
    try {
      if (config?.onSave) {
        await config.onSave(saveData as T);
      } else if (config?.onSubmit) {
        await config.onSubmit(saveData as T);
      }
      closeModal();
    } catch (error) {
      console.error('Lỗi khi lưu:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!config?.onDelete) return;
    try {
      await config.onDelete(id);
    } catch (error) {
      console.error('Lỗi khi xóa:', error);
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
