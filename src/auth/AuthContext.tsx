import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { AuthContextType, User } from "../types/auth";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface Props {
  children: ReactNode;
}

export function AuthProvider({ children }: Props) {
  const [user, setUser] = useState<User | null>(null);

  const loading = false;

  async function login() {
    // Temporary fake login
    setUser({
      id: "1",
      email: "developer@test.com",
      firstName: "Dental",
      lastName: "Volunteer",
      role: "Admin",
    });
  }

  function logout() {
    setUser(null);
  }

  const value = useMemo(
    () => ({
      user,
      authenticated: user !== null,
      loading,
      login,
      logout,
    }),
    [user]
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