export interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
}

export interface AuthContextType {
    user: User | null;
    loading: boolean;
    authenticated: boolean;
    login: () => Promise<void>;
    logout: () => void;
}