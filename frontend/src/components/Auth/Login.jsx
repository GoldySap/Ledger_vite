import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { useApi } from "../API/useApi";
import { useVerification } from "./VerificationContext";

export function AuthPage() {
  const { call } = useApi();
  const { requestVerification } = useVerification();
  const { login } = useAuth();
  const navigate = useNavigate();

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const turnstileRef = useRef(null);
  const [captchaToken, setCaptchaToken] = useState("");
  const widgetId = useRef(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!window.turnstile || !turnstileRef.current) return;

    turnstileRef.current.innerHTML = "";

    widgetId.current = window.turnstile.render(turnstileRef.current, {
      sitekey: import.meta.env.VITE_TURNSTILE_SITE_KEY,
      callback: (token) => {
        setCaptchaToken(token);
      },
    });
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      let data;

      if (isLogin) {
        data = await call("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ 
            email, 
            password, 
            captcha: captchaToken 
          }),
        });

        if (data["2fa_required"]) {
          const code = await requestVerification();

          data = await call("/api/auth/login/verify", {
            method: "POST",
            body: JSON.stringify({ email, code })
          });
        }
      } else {
        const res = await call("/api/auth/register", {
          method: "POST",
          body: JSON.stringify({
            email,
            password,
            captcha: captchaToken,
            role: "user",
            subscription_id: 1,
          }),
        });

        if (res.verify_required) {
          const code = await requestVerification();

          data = await call("/api/auth/register/verify", {
            method: "POST",
            body: JSON.stringify({ email, code })
          });
        } else {
          data = res;
        }
      }

      if (!data.user) throw new Error("User data missing from backend");

      login(data.user);

      const role = data.user.role || "user";
      if (role === "admin") {
        navigate("/dashboard/admin/home");
      } else {
        navigate("/dashboard/user/home");
      }
      setCaptchaToken("");
      window.turnstile.reset(widgetId.current);
    } catch (err) {
      console.error(err);
      setError(err.message || "Something went wrong");
    }

    setLoading(false);
  }

  return (
    <div className="auth-page">
      <h2>{isLogin ? "Login" : "Register"}</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}

      <form onSubmit={handleSubmit}>
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value.toLowerCase())}
          required
        />
        <input
          type="password"
          name="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        
        <div id="turnstile" ref={turnstileRef}></div>

        <button disabled={loading}>
          {loading ? isLogin ? "Logging in..." : "Creating..." : isLogin ? "Login" : "Register"}
        </button>
      </form>


      <p>
        {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
        <button type="button" onClick={() => {setIsLogin(!isLogin), setCaptchaToken(""), window.turnstile.reset(widgetId.current);}} disabled={loading}>
          {isLogin ? "Register" : "Login"}
        </button>
      </p>
    </div>
  );
}