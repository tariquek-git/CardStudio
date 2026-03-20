import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { apiRegister, apiLogin, apiLogout, apiRefreshToken, apiGetMe, type ApiUser } from '../api/auth';
import { setAccessToken } from '../api/client';

interface AuthContextType {
  user: ApiUser | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Try to restore session on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await apiRefreshToken();
        if (result && !cancelled) {
          const me = await apiGetMe();
          setUser(me);
        }
      } catch {
        // No valid session — that's fine, anonymous mode
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      const { user: u } = await apiLogin(email, password);
      setUser(u);
    } catch (e: any) {
      const msg = e?.body?.error || e?.message || 'Login failed';
      setError(msg);
      throw e;
    }
  }, []);

  const register = useCallback(async (email: string, password: string, name?: string) => {
    setError(null);
    try {
      const { user: u } = await apiRegister(email, password, name);
      setUser(u);
    } catch (e: any) {
      const msg = e?.body?.error || e?.message || 'Registration failed';
      setError(msg);
      throw e;
    }
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setAccessToken(null);
    setUser(null);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN',
        login,
        register,
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
