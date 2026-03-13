export async function api(endpoint, options = {}) {
  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  const res = await fetch(`${backendUrl}${endpoint}`, {
    credentials: 'include',
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const text = await res.text();
  let data = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch (err) {
      console.error("Failed to parse JSON:", text);
    }
  }

  if (!res.ok) {
    throw new Error(data.error || data.msg || "Network response not ok");
  }

  return data;
}