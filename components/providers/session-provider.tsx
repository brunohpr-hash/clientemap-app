"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import type { SessionUser } from "@/types";

interface SessionContextValue {
  user: SessionUser | null;
  setUser: (user: SessionUser | null) => void;
  logout: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

// ── Auth-path check ───────────────────────────────────────────
const AUTH_PATHS = ["/api/auth/login", "/api/auth/logout", "/api/auth/refresh"];

function isAuthUrl(url: string): boolean {
  try {
    const { pathname } = new URL(url, window.location.origin);
    return AUTH_PATHS.some((p) => pathname.startsWith(p));
  } catch {
    return false;
  }
}

// ── Token refresh logic (singleton promise to avoid duplicate calls) ──
let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const res = await originalFetch("/api/auth/refresh", { method: "POST" });
      return res.ok;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// ── Global fetch interceptor ──────────────────────────────────
// Keep a reference to the browser's native fetch so the interceptor
// can call it without recursion.
const originalFetch = typeof window !== "undefined" ? window.fetch.bind(window) : fetch;
let interceptorInstalled = false;

function installFetchInterceptor(onSessionExpired: () => void) {
  if (typeof window === "undefined" || interceptorInstalled) return;
  interceptorInstalled = true;

  window.fetch = async function patchedFetch(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;

    const response = await originalFetch(input, init);

    // Only intercept 401s on non-auth API routes
    if (response.status === 401 && !isAuthUrl(url)) {
      const refreshed = await refreshAccessToken();

      if (refreshed) {
        // Retry the original request — cookies are already updated by the
        // refresh endpoint so the retry will carry the new access_token.
        return originalFetch(input, init);
      }

      // Refresh failed → session fully expired
      onSessionExpired();
    }

    return response;
  };
}

// ── Background refresh interval (every 10 min) ───────────────
const REFRESH_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

export function SessionProvider({
  children,
  initialUser,
}: {
  children: ReactNode;
  initialUser: SessionUser | null;
}) {
  const [user, setUser] = useState<SessionUser | null>(initialUser);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    window.location.href = "/login";
  }, []);

  // Install the global fetch interceptor once
  useEffect(() => {
    installFetchInterceptor(() => {
      // Called when token refresh fails → force re-login
      setUser(null);
      window.location.href = "/login";
    });
  }, []);

  // Background token refresh every 10 minutes
  useEffect(() => {
    if (!user) return;

    intervalRef.current = setInterval(async () => {
      await refreshAccessToken();
    }, REFRESH_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [user]);

  return (
    <SessionContext.Provider value={{ user, setUser, logout }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
