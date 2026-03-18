export async function api(endpoint, options = {}) {
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const url = `${backendUrl}${endpoint.startsWith("/") ? endpoint : "/" + endpoint}`;

  const res = await fetch(url, {
    credentials: "include",
    headers: {
      ...(options.body && { "Content-Type": "application/json" }),
      ...options.headers,
    },
    ...options,
  });

  const text = await res.text();

  console.log("RAW RESPONSE:", text);

  if (!text) return {};

  try {
    const data = JSON.parse(text);
    if (!res.ok) throw new Error(data.error || "Request failed");
    return data;
  } catch (err) {
    throw new Error("Response was not JSON");
  }
}