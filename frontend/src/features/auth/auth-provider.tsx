"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  clearMemoryTokens,
  setAccessToken,
  setRefreshToken,
  setUnauthorizedHandler,
} from "@/lib/api/client";
import { authService } from "@/lib/api/services";
import { permissionFallback } from "@/lib/permissions";
import type { CurrentUser, LoginRequest, Permission } from "@/types";

type Status = "loading" | "authenticated" | "anonymous";

interface AuthContextValue {
  user: CurrentUser | null;
  status: Status;
  permissions: readonly Permission[];
  usingPermissionFallback: boolean;
  login: (input: LoginRequest) => Promise<CurrentUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [status, setStatus] = useState<Status>("loading");

  const applyUser = useCallback((next: CurrentUser | null) => {
    setUser(next);
    setStatus(next ? "authenticated" : "anonymous");
  }, []);

  const refreshUser = useCallback(async () => {
    const next = await authService.me();
    applyUser(next);
  }, [applyUser]);

  useEffect(() => {
    let active = true;
    Promise.resolve()
      .then(() => authService.me())
      .then((next) => {
        if (active) applyUser(next);
      })
      .catch(() => {
        if (active) applyUser(null);
      });
    return () => {
      active = false;
    };
  }, [applyUser]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearMemoryTokens();
      applyUser(null);
      router.replace("/session-expired");
    });
    return () => setUnauthorizedHandler(null);
  }, [applyUser, router]);

  const login = useCallback(
    async (input: LoginRequest) => {
      const result = await authService.login(input);
      if (result.access) setAccessToken(result.access);
      if (result.refresh) setRefreshToken(result.refresh);
      const next = result.user ?? (await authService.me());
      applyUser(next);
      return next;
    },
    [applyUser],
  );

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      clearMemoryTokens();
      applyUser(null);
      router.replace("/login");
    }
  }, [applyUser, router]);

  const usingPermissionFallback = Boolean(user && user.permissions.length === 0);
  const permissions = useMemo(
    () => (user ? (user.permissions.length ? user.permissions : permissionFallback(user.role)) : []),
    [user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      permissions,
      usingPermissionFallback,
      login,
      logout,
      refreshUser,
    }),
    [user, status, permissions, usingPermissionFallback, login, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider.");
  return context;
}
