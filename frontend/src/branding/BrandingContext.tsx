import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { applyTheme } from './theme';

export interface Branding {
  companyName: string;
  tagline: string;
  logoUrl: string;
  email: string;
  phone: string;
  address: string;
  primaryColor: string;
  sidebarColor: string;
}

const STORAGE_KEY = 'w9-branding';

export const DEFAULT_BRANDING: Branding = {
  companyName: 'OurClients',
  tagline: 'Clients & Contractors',
  logoUrl: '',
  email: '',
  phone: '',
  address: '',
  primaryColor: '#2563eb',
  sidebarColor: '#0f172a',
};

function loadBranding(): Branding {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_BRANDING;
    return { ...DEFAULT_BRANDING, ...(JSON.parse(raw) as Partial<Branding>) };
  } catch {
    return DEFAULT_BRANDING;
  }
}

interface BrandingContextValue {
  branding: Branding;
  saveBranding: (next: Branding) => void;
  resetBranding: () => void;
}

const BrandingContext = createContext<BrandingContextValue>({
  branding: DEFAULT_BRANDING,
  saveBranding: () => {},
  resetBranding: () => {},
});

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [branding, setBranding] = useState<Branding>(loadBranding);

  useEffect(() => {
    applyTheme(branding);
  }, [branding]);

  const saveBranding = useCallback((next: Branding) => {
    setBranding(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const resetBranding = useCallback(() => {
    setBranding(DEFAULT_BRANDING);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const value = useMemo(
    () => ({ branding, saveBranding, resetBranding }),
    [branding, saveBranding, resetBranding],
  );

  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
}

export function useBranding() {
  return useContext(BrandingContext);
}
