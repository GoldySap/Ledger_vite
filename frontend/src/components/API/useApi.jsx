import { useAuth } from "../Auth/AuthContext";
import { api } from "./api";

export function useApi() {
  const { logout } = useAuth();

  async function call(endpoint, options = {}) {
    try {
      return await api(endpoint, options);
    } catch (err) {
      if (err?.type === "SESSION_EXPIRED") logout();
      throw err;
    }
  }

  return { call };
}