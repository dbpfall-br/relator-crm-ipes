import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, tokenStore } from '../lib/api.js';
import { disconnectSocket, reconnectSocket } from '../lib/socket.js';
import type { User } from '../lib/types.js';

interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Ao carregar, se houver token, recupera o perfil (/auth/me).
  useEffect(() => {
    (async () => {
      if (!tokenStore.access) {
        setLoading(false);
        return;
      }
      try {
        const me = await api<User>('/auth/me');
        setUser(me);
        reconnectSocket();
      } catch {
        tokenStore.clear();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function login(email: string, password: string) {
    const res = await api<AuthResponse>('/auth/login', {
      method: 'POST',
      auth: false,
      body: { email, password },
    });
    tokenStore.set(res.accessToken, res.refreshToken);
    setUser(res.user);
    reconnectSocket();
  }

  async function logout() {
    try {
      if (tokenStore.refresh) {
        await api('/auth/logout', {
          method: 'POST',
          auth: false,
          body: { refreshToken: tokenStore.refresh },
        });
      }
    } finally {
      tokenStore.clear();
      disconnectSocket();
      setUser(null);
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
