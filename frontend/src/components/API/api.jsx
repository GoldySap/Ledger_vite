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
    const EURL = import.meta.env.VITE_BACKEND_URL
    const LURL = import.meta.env.VITE_LOCAL_BACKEND; 
    const flaskState = import.meta.env.VITE_FLASK_ENV;
    const flaskDBLocal = import.meta.env.VITE_FLASK_USE;
    const backendUrl = (flaskState == "production") ? EURL : (flaskDBLocal == "external") ? EURL : LURL;
    const url = `${backendUrl}${endpoint.startsWith("/") ? endpoint : "/" + endpoint}`;
    let csrfAccessToken = null;
    let csrfRefreshToken = null;

    const headers = {
        "Content-Type": "application/json",
        "X-CSRF-TOKEN": csrfAccessToken,
        ...(options.headers || {})
    };

    async function request() {
        console.log("CSRF Access token:", csrfAccessToken);
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
        console.log("CSRF Refresh token:", csrfAccessToken);
        const refreshRes = await fetch(`${backendUrl}/api/auth/refresh`, {
            headers: {
                "Content-Type": "application/json",
                "X-CSRF-TOKEN": csrfRefreshToken
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