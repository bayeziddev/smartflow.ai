import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { loginTenant, registerTenant } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('fanchatbot_token'));

  const persistToken = useCallback((t) => {
    if (t) {
      localStorage.setItem('fanchatbot_token', t);
    } else {
      localStorage.removeItem('fanchatbot_token');
    }
    setToken(t);
  }, []);

  const login = useCallback(
    async (email, password) => {
      const data = await loginTenant({ email, password });
      persistToken(data.token);
      return data;
    },
    [persistToken]
  );

  const register = useCallback(
    async (payload) => {
      const data = await registerTenant(payload);
      persistToken(data.token);
      return data;
    },
    [persistToken]
  );

  const logout = useCallback(() => persistToken(null), [persistToken]);

  const value = useMemo(
    () => ({ token, isAuthenticated: !!token, login, register, logout, setTokenDirectly: persistToken }),
    [token, login, register, logout, persistToken]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
