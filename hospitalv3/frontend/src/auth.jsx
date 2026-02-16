/* eslint-disable react-hooks/exhaustive-deps, react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api, { configureApiAuth } from "./api";

const AuthContext = createContext(null);

const ACCESS_TOKEN_KEY = "hms_v3_access_token";
const REFRESH_TOKEN_KEY = "hms_v3_refresh_token";
const USER_KEY = "hms_v3_user";

function readStoredState() {
  const at = localStorage.getItem(ACCESS_TOKEN_KEY);
  const rt = localStorage.getItem(REFRESH_TOKEN_KEY);
  return {
    accessToken: at && at.trim() ? at : null,
    refreshToken: rt && rt.trim() ? rt : null,
    user: (() => {
      try {
        const raw = localStorage.getItem(USER_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    })(),
  };
}

export function AuthProvider({ children }) {
  const [accessToken, setAccessToken] = useState(() => readStoredState().accessToken);
  const [refreshToken, setRefreshToken] = useState(() => readStoredState().refreshToken);
  const [user, setUser] = useState(() => readStoredState().user);
  const [loading, setLoading] = useState(false);

  const persist = (payload) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, payload.accessToken || "");
    localStorage.setItem(REFRESH_TOKEN_KEY, payload.refreshToken || "");
    if (payload.user) {
      localStorage.setItem(USER_KEY, JSON.stringify(payload.user));
    }
    setAccessToken(payload.accessToken || null);
    setRefreshToken(payload.refreshToken || null);
    if (payload.user) {
      setUser(payload.user);
    }
  };

  const clear = () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
    // Forzar redirección a login cuando la sesión expira (401)
    const path = (typeof window !== "undefined" && window.location.pathname) || "";
    if (path !== "/login" && path !== "/change-password") {
      setTimeout(() => {
        if (typeof window !== "undefined") window.location.href = "/login";
      }, 0);
    }
  };

  useEffect(() => {
    configureApiAuth({
      getAccessToken: () => accessToken,
      getRefreshToken: () => refreshToken,
      setTokens: (tokens) => {
        persist(tokens);
      },
      onSessionExpired: clear,
    });
  }, [accessToken, refreshToken]);

  const login = async (username, password) => {
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { username, password });
      persist(data);
      return data;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      if (refreshToken) {
        await api.post("/auth/logout", { refreshToken });
      }
    } catch {
      // logout local even if backend call fails
    } finally {
      clear();
      if (typeof window !== "undefined") window.location.href = "/login";
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    await api.post("/auth/change-password", { currentPassword, newPassword });
    if (user) {
      setUser({ ...user, mustChangePassword: false });
    }
  };

  const refreshProfile = async () => {
    if (!accessToken) return null;
    const { data } = await api.get("/auth/profile");
    setUser((prev) => ({
      ...prev,
      ...data,
      roles: data.roles || prev?.roles || [],
    }));
    localStorage.setItem(
      USER_KEY,
      JSON.stringify({
        ...user,
        ...data,
        roles: data.roles || user?.roles || [],
      })
    );
    return data;
  };

  useEffect(() => {
    if (!accessToken || user) return;
    refreshProfile().catch(() => clear());
  }, [accessToken]);

  const value = useMemo(
    () => ({
      user,
      accessToken,
      refreshToken,
      isAuthenticated: Boolean(accessToken && user),
      loading,
      login,
      logout,
      changePassword,
      refreshProfile,
      hasAnyRole: (roles) => {
        if (!roles?.length) return true;
        const userRoles = user?.roles || [];
        return roles.some((r) => userRoles.includes(r));
      },
    }),
    [user, accessToken, refreshToken, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
}
