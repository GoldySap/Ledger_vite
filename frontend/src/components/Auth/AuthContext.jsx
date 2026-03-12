import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../API/api";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      setLoading(false);
      return;
    }

    api("/api/auth/me")
      .then(data => {
        setUser(data.user);
      })
      .catch(() => {
        localStorage.removeItem("token");
      })
      .finally(() => setLoading(false));

  }, []);

  function login(token, user) {
    localStorage.setItem("token", token);
    setUser(user);
  }

  function logout() {
    localStorage.removeItem("token");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

// export async function api(url,options={}){

//   const token = localStorage.getItem("token")

//   return fetch(url,{
//     ...options,
//     headers:{
//       "Content-Type":"application/json",
//       Authorization:`Bearer ${token}`,
//       ...options.headers
//     }
//   })
// }