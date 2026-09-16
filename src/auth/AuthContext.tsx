import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type {
  AuthContextType,
  AuthStatus,
  User,
} from "../types/auth";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface Props {
  children: ReactNode;
}

export function AuthProvider({ children }: Props) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  const loadCurrentUser = useCallback(async () => {
    try {
      const response = await fetch("/api/v1/auth/me", {
        credentials: "include",
      });

      if (response.ok) {
        const currentUser: User = await response.json();

        setUser(currentUser);
        setStatus("authenticated");
        return;
      }

      if (response.status === 401) {
        setUser(null);
        setStatus("unauthenticated");
        return;
      }

      if (response.status === 403) {
        setUser(null);
        setStatus("unauthorized");
        return;
      }

      console.error(
        `Unexpected authentication response: ${response.status}`
      );

      setUser(null);
      setStatus("unauthenticated");
    } catch (error) {
      console.error("Failed to load current user:", error);
      setUser(null);
      setStatus("unauthenticated");
    }
  }, []);

  useEffect(() => {
    void loadCurrentUser();
  }, [loadCurrentUser]);

  const login = useCallback(() => {
    window.location.assign("/oauth2/authorization/google");
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setStatus("unauthenticated");
    window.location.assign("/logout");
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      status,
      loading: status === "loading",
      authenticated: status === "authenticated",
      login,
      logout,
      refreshUser: loadCurrentUser,
    }),
    [user, status, login, logout, loadCurrentUser]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}