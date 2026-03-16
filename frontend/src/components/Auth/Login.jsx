import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { api } from "../API/api";

export function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      let data;

      if (isLogin) {
        data = await api("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });
      } else {
        data = await api("/api/auth/register", {
          method: "POST",
          body: JSON.stringify({
            email,
            password,
            role: "user",
            subscription_id: 1,
          }),
        });
        data = await api("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
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

  // async function handleGoogleLogin() {
  //   setLoading(true);
  //   setError("");

  //   try {
  //     const googleEmail = "googleuser@example.com";

  //     const data = await api("/api/auth/google-login", {
  //       method: "POST",
  //       body: JSON.stringify({ email: googleEmail }),
  //     });

  //     if (!data.user) throw new Error("Google login failed");

  //     login(data.user);

  //     const role = data.user.role || "user";
  //     if (role === "admin") {
  //       navigate("/dashboard/admin/home");
  //     } else {
  //       navigate("/dashboard/user/home");
  //     }
  //   } catch (err) {
  //     console.error(err);
  //     setError(err.message || "Google login failed");
  //   }

  //   setLoading(false);
  // }

  return (
    <div className="auth-page">
      <h2>{isLogin ? "Login" : "Register"}</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}

      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button disabled={loading}>
          {loading
            ? isLogin
              ? "Logging in..."
              : "Creating..."
            : isLogin
            ? "Login"
            : "Register"}
        </button>
      </form>

      <p>
        {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
        <button type="button" onClick={() => setIsLogin(!isLogin)}>
          {isLogin ? "Register" : "Login"}
        </button>
      </p>

      {/* <p>Or login with:</p>
      <button onClick={handleGoogleLogin} disabled={loading}>
        Google
      </button> */}
    </div>
  );
}