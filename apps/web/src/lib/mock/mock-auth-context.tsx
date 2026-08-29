"use client";

/**
 * Module 10.5 / ADR 0005: drop-in replacement for `lib/auth-context.tsx`
 * in the static-demo build only (see next.config.js's webpack alias).
 * `lib/auth-context.tsx` itself is untouched -- every other build
 * variant still resolves `@/lib/auth-context` to the real file.
 *
 * No JWT, no cookies, no login form: "authentication" is just a role
 * flag ("teacher" | "learner") persisted to localStorage so a page
 * refresh doesn't drop you back to the role picker. See
 * `mock-role.ts` for the picker's own entry point into this state.
 */
import { ReactNode, createContext, useCallback, useContext, useEffect, useState } from "react";
import { MOCK_LEARNER, MOCK_TEACHER } from "./mock-data";
import type { AuthUser } from "../api";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";
export const MOCK_ROLE_STORAGE_KEY = "questlearn-static-demo-role";

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  accessToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  applySession: (accessToken: string, user: AuthUser) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function userForRole(role: string | null): AuthUser | null {
  if (role === "teacher") return MOCK_TEACHER;
  if (role === "learner") return MOCK_LEARNER;
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem(MOCK_ROLE_STORAGE_KEY) : null;
    const resolved = userForRole(stored);
    setUser(resolved);
    setStatus(resolved ? "authenticated" : "unauthenticated");
  }, []);

  // Real login() takes email/password against a real backend; the
  // static demo has neither. The role picker (`/demo`) calls
  // `applySession` directly instead of this -- `login` only exists so
  // any reused page that destructures it from useAuth() doesn't crash
  // on a missing property.
  const login = useCallback(async () => {
    throw new Error("Sign-in isn't available in the static demo -- use the role picker on the demo's home page.");
  }, []);

  const applySession = useCallback((_token: string, sessionUser: AuthUser) => {
    const role = sessionUser.role;
    if (typeof window !== "undefined") window.localStorage.setItem(MOCK_ROLE_STORAGE_KEY, role);
    setUser(sessionUser);
    setStatus("authenticated");
  }, []);

  const logout = useCallback(async () => {
    if (typeof window !== "undefined") window.localStorage.removeItem(MOCK_ROLE_STORAGE_KEY);
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  return (
    <AuthContext.Provider value={{ status, user, accessToken: user ? "mock-access-token" : null, login, logout, applySession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
