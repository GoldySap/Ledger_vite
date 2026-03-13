const API_URL = import.meta.env.VITE_BACKEND_URL || "";

export async function api(path, options = {}) {

  const res = await fetch(`${API_URL}${path}`, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...options.headers
    },
    body: options.body,
    credentials: "include"
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "API error");
  }

  return data;
}