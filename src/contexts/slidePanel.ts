import { createContext, useContext, type ReactNode } from 'react';

/**
 * Context và hook của SlidePanel tách khỏi file chứa `SlidePanelProvider` để
 * React Fast Refresh làm mới được provider mà không remount cả cây component.
 */
export interface SlidePanelContextType {
  isOpen: boolean;
  openPanel: (title: string, content: ReactNode) => void;
  closePanel: () => void;
}

export const SlidePanelContext = createContext<SlidePanelContextType | null>(null);

export const useSlidePanel = () => {
  const ctx = useContext(SlidePanelContext);
  if (!ctx) throw new Error('useSlidePanel must be used within SlidePanelProvider');
  return ctx;
};
