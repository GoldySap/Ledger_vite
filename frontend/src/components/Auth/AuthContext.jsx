import { createContext, useContext, useState, useEffect } from "react";
import { useApi } from "../API/useApi";
const { call } = useApi();

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  function login(userData) {
    setUser(userData);
  }

  function logout() {
    setUser(null);
    call("/api/auth/logout", { method: "POST" });
  }

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await call("/api/auth/me");
        setUser(res);
      } catch {
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