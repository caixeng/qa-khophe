import { createContext, type ReactNode } from 'react';

export const SlidePanelContext = createContext<any>(null);

export const SlidePanelProvider = ({ children }: { children: ReactNode }) => {
  return (
    <SlidePanelContext.Provider value={{}}>
      {children}
    </SlidePanelContext.Provider>
  );
};
