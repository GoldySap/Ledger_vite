import { useAuth } from "../components/AuthContext";
import { api } from "./api";

export function useApi() {
  const { logout } = useAuth();

  async function call(endpoint, options = {}) {
    try {
      return await api(endpoint, options);
    } catch (err) {
      if (err.message === "Session expired") {
        logout();
      }
      throw err;
    }
  }

  return { call };
}