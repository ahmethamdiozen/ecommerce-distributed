import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import axios from "axios";
import { AUTH_URL } from "../config/api";

interface User {
    id: number;
    email: string;
    role: string;
}

interface AuthContextType {
    user: User | null;
    accessToken: string | null;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // On mount, restore session from localStorage
    useEffect(() => {
        const token = localStorage.getItem("accessToken");
        const storedUser = localStorage.getItem("user");

        if (token && storedUser) {
            setAccessToken(token);
            setUser(JSON.parse(storedUser));
        }

        setLoading(false);
    }, []);

    const login = async (email: string, password: string) => {
        const res = await axios.post(`${AUTH_URL}/auth/login`, { email, password });
        const { accessToken, refreshToken, user } = res.data;

        localStorage.setItem("accessToken", accessToken);
        localStorage.setItem("refreshToken", refreshToken);
        localStorage.setItem("user", JSON.stringify(user));

        setAccessToken(accessToken);
        setUser(user);
    };

    const register = async (email: string, password: string) => {
        const res = await axios.post(`${AUTH_URL}/auth/register`, { email, password });
        const { accessToken, refreshToken, user } = res.data;

        localStorage.setItem("accessToken", accessToken);
        localStorage.setItem("refreshToken", refreshToken);
        localStorage.setItem("user", JSON.stringify(user));

        setAccessToken(accessToken);
        setUser(user);
    };

    const logout = async () => {
        const refreshToken = localStorage.getItem("refreshToken");

        if (refreshToken) {
            try {
                await axios.post(`${AUTH_URL}/auth/logout`, { refreshToken });
            } catch {
                // Even if logout request fails, clear local state
            }
        }

        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");

        setAccessToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, accessToken, login, register, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
};
