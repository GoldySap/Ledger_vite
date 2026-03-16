export async function api(endpoint, options = {}) {
  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  console.log("BACKEND URL:", backendUrl);

  const url = `${backendUrl}${endpoint.startsWith("/") ? endpoint : "/" + endpoint}`;
  
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  const text = await res.text();
  if (!text) return {};
  const data = JSON.parse(text);

  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}