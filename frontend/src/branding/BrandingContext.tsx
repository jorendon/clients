import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { applyTheme } from './theme';

export interface ContactField {
  id: string;
  value: string;
  isPrimary: boolean;
}

export interface Branding {
  companyName: string;
  tagline: string;
  logoUrl: string;
  emails: ContactField[];
  phones: ContactField[];
  addresses: ContactField[];
  primaryColor: string;
  sidebarColor: string;
}

const STORAGE_KEY = 'clients-branding';

export const DEFAULT_BRANDING: Branding = {
  companyName: 'Clients',
  tagline: 'Clients & Contractors',
  logoUrl: '',
  emails: [],
  phones: [],
  addresses: [],
  primaryColor: '#2563eb',
  sidebarColor: '#0f172a',
};

function loadBranding(): Branding {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_BRANDING;
    const parsed = JSON.parse(raw);

    const generateId = () => Math.random().toString(36).substr(2, 9);

    const emails = parsed.emails ?? (parsed.email ? [{ id: generateId(), value: parsed.email, isPrimary: true }] : []);
    const phones = parsed.phones ?? (parsed.phone ? [{ id: generateId(), value: parsed.phone, isPrimary: true }] : []);
    const addresses = parsed.addresses ?? (parsed.address ? [{ id: generateId(), value: parsed.address, isPrimary: true }] : []);

    return { 
      ...DEFAULT_BRANDING, 
      ...parsed,
      emails,
      phones,
      addresses
    };
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
