import { createContext, useContext, useState, useEffect } from "react";
import { api } from "../API/api";

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    function login(userData) {
        setUser(userData);
    }

    async function logout() {
        try {
            await api("/api/auth/logout", { method: "POST" });
        } catch (err) {
            console.error("Logout failed:", err);
        }

        setUser(null);
    }

    useEffect(() => {
        async function fetchUser() {
            try {
                const user = await api("/api/auth/me");
                setUser(user);
            } catch (err) {
                if (err.message !== "Request failed") {
                    console.error(err);
                }
                setUser(null);
            }
            setLoading(false);
        }
        fetchUser();
    }, []);

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
        {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}