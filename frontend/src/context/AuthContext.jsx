import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { fetchMe, loginTenant, registerTenant } from '../services/api';

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
  const [token, setToken] = useState(() => {
    const saved = localStorage.getItem('fanchatbot_token');
    // Drop a token that has already expired instead of showing a dashboard
    // whose every request would fail.
    const exp = saved ? decodeJwtPayload(saved)?.exp : null;
    if (saved && (!exp || exp * 1000 < Date.now())) {
      localStorage.removeItem('fanchatbot_token');
      return null;
    }
    return saved;
  });
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(() => !!token);

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

  const logout = useCallback(() => {
    persistToken(null);
    setUser(null);
  }, [persistToken]);

  // Confirm the saved token with the server once per sign-in and load the
  // account (name, company, plan). A 401 here means it was revoked or the
  // server's secret changed, so sign out.
  const refreshUser = useCallback(async () => {
    const data = await fetchMe();
    setUser(data.user);
    return data.user;
  }, []);

  useEffect(() => {
    if (!token) {
      setChecking(false);
      return undefined;
    }
    let cancelled = false;
    setChecking(true);
    fetchMe()
      .then((data) => {
        if (!cancelled) setUser(data.user);
      })
      .catch((err) => {
        if (!cancelled && err.response?.status === 401) logout();
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, logout]);

  const isPlatformAdmin = useMemo(
    () => (user ? !!user.isPlatformAdmin : token ? !!decodeJwtPayload(token)?.isPlatformAdmin : false),
    [token, user]
  );

  const value = useMemo(
    () => ({
      token,
      user,
      checking,
      isAuthenticated: !!token,
      isPlatformAdmin,
      login,
      register,
      logout,
      refreshUser,
      setTokenDirectly: persistToken,
    }),
    [token, user, checking, isPlatformAdmin, login, register, logout, refreshUser, persistToken]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
