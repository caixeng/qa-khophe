import { createContext, useState, useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '../lib/utils';

export interface SlidePanelContextType {
  isOpen: boolean;
  openPanel: (title: string, content: ReactNode) => void;
  closePanel: () => void;
}

export const SlidePanelContext = createContext<SlidePanelContextType | null>(null);

export const SlidePanelProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState<ReactNode | null>(null);

  const openPanel = (newTitle: string, newContent: ReactNode) => {
    setTitle(newTitle);
    setContent(newContent);
    setIsOpen(true);
  };

  const closePanel = () => {
    setIsOpen(false);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closePanel();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <SlidePanelContext.Provider value={{ isOpen, openPanel, closePanel }}>
      {children}
      
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
          onClick={closePanel}
        />
      )}

      {/* Panel */}
      <div className={cn(
        "fixed inset-y-0 right-0 w-full md:w-96 bg-[var(--bg-surface)] shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">{title}</h2>
          <button 
            onClick={closePanel}
            aria-label="Đóng"
            className="p-1.5 hover:bg-[var(--bg-subtle)] rounded-lg transition-colors"
          >
            <X size={20} className="text-[var(--text-secondary)]" />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {content}
        </div>
      </div>
    </SlidePanelContext.Provider>
  );
};
