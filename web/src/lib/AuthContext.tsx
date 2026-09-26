import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { apiFetch, setSessionExpiredHandler, setTokens } from './api';
import type { User } from './types';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setSessionExpiredHandler(() => setUser(null));
    return () => setSessionExpiredHandler(null);
  }, []);

  useEffect(() => {
    const hasTokens = localStorage.getItem('rated.tokens');
    if (!hasTokens) {
      setLoading(false);
      return;
    }
    apiFetch<User>('/users/me')
      .then(setUser)
      .catch(() => setTokens(null))
      .finally(() => setLoading(false));
  }, []);

  async function login(identifier: string, password: string) {
    const data = await apiFetch<{ user: User; tokens: { access_token: string; refresh_token: string } }>(
      '/auth/login',
      { method: 'POST', body: { identifier, password }, auth: false },
    );
    setTokens(data.tokens);
    setUser(data.user);
  }

  async function register(email: string, username: string, password: string) {
    const data = await apiFetch<{ user: User; tokens: { access_token: string; refresh_token: string } }>(
      '/auth/register',
      { method: 'POST', body: { email, username, password }, auth: false },
    );
    setTokens(data.tokens);
    setUser(data.user);
  }

  function logout() {
    setTokens(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
