function getCookie(name) {
  return document.cookie
    .split("; ")
    .find(row => row.startsWith(name + "="))
    ?.split("=")[1];
}

function getCSRF(endpoint) {
  if (endpoint.includes("/auth/refresh")) {
    return getCookie("csrf_refresh_token");
  }
  return getCookie("csrf_access_token");
}

export async function api(endpoint, options = {}) {
    const BURL = import.meta.env.VITE_BACKEND_URL
    const flaskState = import.meta.env.VITE_FLASK_ENV;
    const flaskDBLocal = import.meta.env.VITE_FLASK_USE;
    const backendUrl = (flaskState == "production") ? BURL : (flaskDBLocal == "external") ? BURL : BURL;
    const url = `${backendUrl}${endpoint.startsWith("/") ? endpoint : "/" + endpoint}`;
    const csrfToken = getCSRF(endpoint);

    const headers = {
        "Content-Type": "application/json",
        "X-CSRF-TOKEN": csrfToken,
        ...(options.headers || {})
    };

    async function request() {
        return fetch(url, {
            ...options,
            headers,
            credentials: "include",
        });
    }

    let res = await request();

    if (res.status === 401 && endpoint.includes("/api/auth/me")) {
        return null;
    }

    if (res.status === 401 && !endpoint.includes("/auth/login") && !endpoint.includes("/auth/register") && !endpoint.includes("/auth/refresh")) {
        const refreshRes = await fetch(`${backendUrl}/api/auth/refresh`, {
            headers: {
                "Content-Type": "application/json",
                "X-CSRF-TOKEN": getCookie("csrf_refresh_token")
            },
            credentials: "include",
            method: "POST",
            ...options
        });

        if (refreshRes.ok) {
            res = await request();
        } else {
            throw { 
                type: "SESSION_EXPIRED"
            }
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