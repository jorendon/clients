import { createContext, useContext, useState, type ReactNode } from 'react';

type ActiveClientContextType = {
  activeClientId: number | null;
  setActiveClientId: (id: number | null) => void;
};

const ActiveClientContext = createContext<ActiveClientContextType | undefined>(undefined);

const STORAGE_KEY = 'clients-active-client';

export function ActiveClientProvider({ children }: { children: ReactNode }) {
  const [activeClientId, setActiveClientIdState] = useState<number | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? Number(stored) : null;
  });

  function setActiveClientId(id: number | null) {
    setActiveClientIdState(id);
    if (id !== null) {
      localStorage.setItem(STORAGE_KEY, String(id));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  return (
    <ActiveClientContext.Provider value={{ activeClientId, setActiveClientId }}>
      {children}
    </ActiveClientContext.Provider>
  );
}

export function useActiveClient() {
  const context = useContext(ActiveClientContext);
  if (context === undefined) {
    throw new Error('useActiveClient must be used within an ActiveClientProvider');
  }
  return context;
}
