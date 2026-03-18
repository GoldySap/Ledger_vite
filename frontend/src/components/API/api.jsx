export async function api(endpoint, options = {}) {
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const url = `${backendUrl}${endpoint.startsWith("/") ? endpoint : "/" + endpoint}`;
  
  const res = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  const text = await res.text();
  if (!text) return {};
  const data = JSON.parse(text);

  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}