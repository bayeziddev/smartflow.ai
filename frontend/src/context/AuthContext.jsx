import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { loginTenant, registerTenant } from '../services/api';

const AuthContext = createContext(null);

/**
 * Reads the (non-secret) payload of a JWT without verifying its
 * signature — fine here, since this is only used to decide what UI to
 * show (e.g. the admin nav link). The actual security check always
 * happens server-side; a tampered token would just get a 403 from the
 * API, not real access.
 */
function decodeJwtPayload(token) {
  try {
    const payload = token.split('.')[1];
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

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

  const isPlatformAdmin = useMemo(() => (token ? !!decodeJwtPayload(token)?.isPlatformAdmin : false), [token]);

  const value = useMemo(
    () => ({ token, isAuthenticated: !!token, isPlatformAdmin, login, register, logout, setTokenDirectly: persistToken }),
    [token, isPlatformAdmin, login, register, logout, persistToken]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
