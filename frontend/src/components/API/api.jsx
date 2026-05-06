// function getCookie(name) {
//     return document.cookie
//         .split("; ")
//         .find(row => row.startsWith(name + "="))
//         ?.split("=")[1];
// }

const getCsrfToken = (name) => {
  const fetchName = name + "=";
  const decodedCookie = decodeURIComponent(document.cookie);
  const ca = decodedCookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i].trim();
    if (c.indexOf(fetchName) === 0) {
      return c.substring(fetchName.length, c.length);
    }
  }
  return "";
};

export async function api(endpoint, options = {}) {
    const EURL = import.meta.env.VITE_BACKEND_URL
    const LURL = import.meta.env.VITE_LOCAL_BACKEND; 
    const flaskState = import.meta.env.VITE_FLASK_ENV;
    const flaskDBLocal = import.meta.env.VITE_FLASK_USE;
    const backendUrl = (flaskState == "production") ? EURL : (flaskDBLocal == "external") ? EURL : LURL;
    const url = `${backendUrl}${endpoint.startsWith("/") ? endpoint : "/" + endpoint}`;

    const headers = {
        "Content-Type": "application/json",
        "X-CSRF-TOKEN": getCsrfToken("csrf_access_token"),
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
                "X-CSRF-TOKEN": getCsrfToken("csrf_refresh_token")
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