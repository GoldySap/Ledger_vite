import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { useApi } from "../API/useApi";

export function AuthPage() {
  const { call } = useApi();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const turnstileRef = useRef(null);
  const [captchaToken, setCaptchaToken] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!window.turnstile || !turnstileRef.current) return;

    turnstileRef.current.innerHTML = "";

    window.turnstile.render(turnstileRef.current, {
      sitekey: import.meta.env.VITE_TURNSTILE_SITE_KEY,
      callback: (token) => {
        console.log("CAPTCHA:", token);
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
      } else {
        data = await call("/api/auth/register", {
          method: "POST",
          body: JSON.stringify({
            email,
            password,
            captcha: captchaToken,
            role: "user",
            subscription_id: 1,
          }),
        });
        data = await call("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ 
            email, 
            password, 
            captcha: captchaToken
          }),
        });
      }

      if (!data.user) throw new Error("User data missing from backend");

      login(data.user);

      const role = data.user.role || "user";
      if (role === "admin") {
        navigate("/dashboard/admin/home");
      } else {
        navigate("/dashboard/user/home");
      }
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
        
        <div ref={turnstileRef}></div>

        <button disabled={loading}>
          {loading ? isLogin ? "Logging in..." : "Creating..." : isLogin ? "Login" : "Register"}
        </button>
      </form>


      <p>
        {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
        <button type="button" onClick={() => setIsLogin(!isLogin)} disabled={loading}>
          {isLogin ? "Register" : "Login"}
        </button>
      </p>
    </div>
  );
}