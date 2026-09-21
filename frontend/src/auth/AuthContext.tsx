import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { apiClient } from '../api/client';

export type AppRole = 'ADMIN' | 'EMPLEADO';

export interface SessionUser {
  id: number;
  email: string;
  name: string;
  role: AppRole;
}

const TOKEN_KEY = 'clients-token';
const USER_KEY = 'clients-user';

interface AuthContextValue {
  user: SessionUser | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateSessionUser: (updates: Partial<Pick<SessionUser, 'name' | 'email'>>) => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  token: null,
  login: async () => {},
  logout: () => {},
  updateSessionUser: () => {},
  isAdmin: false,
});

function loadSession(): { user: SessionUser | null; token: string | null } {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const rawUser = localStorage.getItem(USER_KEY);
    if (!token || !rawUser) return { user: null, token: null };
    return { user: JSON.parse(rawUser) as SessionUser, token };
  } catch {
    return { user: null, token: null };
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState(loadSession);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await apiClient.post<{ accessToken: string; user: SessionUser }>(
      '/auth/login',
      { email, password },
    );
    localStorage.setItem(TOKEN_KEY, data.accessToken);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    setSession({ user: data.user, token: data.accessToken });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setSession({ user: null, token: null });
  }, []);

  const updateSessionUser = useCallback((updates: Partial<Pick<SessionUser, 'name' | 'email'>>) => {
    setSession((prev) => {
      if (!prev.user) return prev;
      const updated = { ...prev.user, ...updates };
      localStorage.setItem(USER_KEY, JSON.stringify(updated));
      return { ...prev, user: updated };
    });
  }, []);

  const value = useMemo(
    () => ({ ...session, login, logout, updateSessionUser, isAdmin: session.user?.role === 'ADMIN' }),
    [session, login, logout, updateSessionUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearStoredSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
