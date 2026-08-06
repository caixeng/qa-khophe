import { createContext, useContext } from 'react';

/**
 * Context và hook của Toast nằm riêng khỏi file chứa `ToastProvider`.
 *
 * React Fast Refresh chỉ làm mới được một module nếu module đó chỉ export
 * component. File nào vừa export component vừa export hằng số/hook thì mỗi lần
 * sửa sẽ khiến toàn bộ cây component remount — đang gõ dở một phiếu là mất
 * sạch nội dung form.
 */

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
  isRemoving?: boolean;
}

export interface ToastContextValue {
  toast: {
    success: (msg: string) => void;
    error: (msg: string) => void;
    warning: (msg: string) => void;
    info: (msg: string) => void;
  };
}

export const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
