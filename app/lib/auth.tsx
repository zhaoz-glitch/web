/**
 * Auth context — manages token storage, current user, and the
 * "authRestored" flag that gates the loading spinner on initial load.
 *
 * Flow:
 *   1. On mount, read token from localStorage.
 *   2. If no token → authRestored = true, user = null (show login).
 *   3. If token exists → GET /api/auth/me
 *      - success → setUser, authRestored = true (show app)
 *      - failure → clear token, authRestored = true (show login)
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  created_at: string | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  authRestored: boolean;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const TOKEN_KEY = "lc_token";

/** Read the stored token (or null). */
function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

/** Persist / clear the token. */
function setStoredToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* localStorage unavailable (SSR / privacy mode) */
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [authRestored, setAuthRestored] = useState(false);

  // Restore auth on mount
  useEffect(() => {
    const stored = getStoredToken();
    if (!stored) {
      setAuthRestored(true);
      return;
    }

    setToken(stored);

    // Validate the token by calling /api/auth/me
    fetch("/api/auth/me", {
      headers: { Authorization: stored },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("token invalid");
        const data = await res.json();
        setUser(data.user);
      })
      .catch(() => {
        // Token expired or invalid — clear it
        setStoredToken(null);
        setToken(null);
        setUser(null);
      })
      .finally(() => setAuthRestored(true));
  }, []);

  const login = useCallback((newToken: string, newUser: AuthUser) => {
    setStoredToken(newToken);
    setToken(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(() => {
    setStoredToken(null);
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, token, authRestored, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/** Hook to access the auth context. */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

/** Get the raw token (for use outside React components, e.g. api.ts). */
export function getAuthToken(): string | null {
  return getStoredToken();
}
