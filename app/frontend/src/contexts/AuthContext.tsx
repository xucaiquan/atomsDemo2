import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { client } from '@/lib/atoms';

export interface AuthUser {
  id: string;
  email?: string;
  name?: string;
  role?: string;
}

type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

interface AuthContextValue {
  user: AuthUser | null;
  status: AuthStatus;
  loading: boolean;
  isAdmin: boolean;
  login: () => void;
  logout: () => Promise<void>;
  refetch: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth 必须在 AuthProvider 内使用');
  return value;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  const refetch = useCallback(async () => {
    setStatus('loading');
    try {
      const response = await client.auth.me();
      const payload = response.data?.data ?? response.data;
      const nextUser = payload?.user ?? payload;
      if (nextUser?.id) {
        setUser(nextUser);
        setStatus('authenticated');
      } else {
        setUser(null);
        setStatus('anonymous');
      }
    } catch {
      setUser(null);
      setStatus('anonymous');
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const login = useCallback(() => client.auth.toLogin(), []);
  const logout = useCallback(async () => {
    await client.auth.logout();
    setUser(null);
    setStatus('anonymous');
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      loading: status === 'loading',
      isAdmin: user?.role === 'admin',
      login,
      logout,
      refetch,
    }),
    [login, logout, refetch, status, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
