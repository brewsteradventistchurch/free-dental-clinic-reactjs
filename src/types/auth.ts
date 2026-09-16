export type UserRole = "ADMIN" | "VOLUNTEER";

export type AuthStatus =
  | "loading"
  | "unauthenticated"
  | "authenticated"
  | "unauthorized";

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

export interface AuthContextType {
  user: User | null;
  status: AuthStatus;
  loading: boolean;
  authenticated: boolean;
  login: () => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}