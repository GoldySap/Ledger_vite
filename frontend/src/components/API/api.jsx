export async function api(endpoint, options = {}) {
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    const url = `${backendUrl}${endpoint.startsWith("/") ? endpoint : "/" + endpoint}`;

    async function request() {
        return fetch(url, {
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        ...options,
        });
    }

    let res = await request();

    if (res.status === 401 || res.status === 422) {
        const refreshRes = await fetch(`${backendUrl}/api/auth/refresh`, {
            credentials: "include",
            method: "POST",
        });

        if (refreshRes.ok) {
        res = await request();
        } else {
        throw new Error("Session expired");
        }
    }

    const text = await res.text();
    if (!text) return {};

    try {
        const data = JSON.parse(text);
        if (!res.ok) throw new Error(data.msg || data.error || "Request failed");
        return data;
    } catch {
        console.error("RAW RESPONSE:", text);
        if (!text) {
            throw new Error("Response was not JSON");
        } else {
            const data = JSON.parse(text);
            throw new Error(data.error);
        }
    }
}