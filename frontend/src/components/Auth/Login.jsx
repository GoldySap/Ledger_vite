import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

export function Login() {
  const [backendStatus, setBackendStatus] = useState("Checking...");
  
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const flaskState = import.meta.env.FLASK_ENV
  const flaskUseState = import.meta.env.FLASK_USE
  let fetchRoute = (flaskState == "production") ? `${backendUrl}/api/health` : (flaskUseState == "external") ? `${backendUrl}/api/health` : `/api/health`;
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState("");

  async function handleLogin(e){
    e.preventDefault();
    setLoading(true);
    setError("");

    try{
      const data = await api("/api/auth/login",{
        method:"POST",
        body:JSON.stringify({email,password})
      });

      if(data.token){
        login(data.token,data.user);
        navigate("/dashboard/home");
      }else{
        setError(data.error || "Login failed");
      }

    }catch(err){
      setError(err.message);
    }

    setLoading(false);
  }

  useEffect(() => {
      fetch(fetchRoute)
      .then(res => {
          if (!res.ok) throw new Error("Network response not ok");
          return res.json();
      })
      .then(data => setBackendStatus(data.status))
      .catch(err => {
          setError(err.message);
          setBackendStatus("Failed");
      });
  }, []);

  return(
    <>
      <form onSubmit={handleLogin}>
        <h2>Login</h2>
        {error && <p style={{color:"red"}}>{error}</p>}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e=>setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e=>setPassword(e.target.value)}
          required
        />

        <button disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>

      <h1>Ledger Test</h1>
      <p>Backend status: {backendStatus}</p>
      {error && <p style={{ color: "red" }}>Error: {error}</p>}
    </>
  );
}

export function Logout(){
  const { logout } = useAuth();
  const navigate = useNavigate();

  useEffect(()=>{
    logout();
    navigate("/");
  },[]);

  return <p>Logging out...</p>;
}

export function Register(){
  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");
  const [loading,setLoading] = useState(false);
  
  const navigate = useNavigate();

  async function handleRegister(e){
    e.preventDefault();
    setLoading(true);

    const data = await api("/api/auth/register",{method:"POST", body:JSON.stringify({email,password})});

    if(data.message){
      navigate("/login");
    }

    setLoading(false);
  }
  return(
    <form onSubmit={handleRegister}>

      <h2>Register</h2>

      <input
        type="email"
        value={email}
        onChange={e=>setEmail(e.target.value)}
        required
      />

      <input
        type="password"
        value={password}
        onChange={e=>setPassword(e.target.value)}
        required
      />

      <button disabled={loading}>
        {loading ? "Creating..." : "Create Account"}
      </button>
    </form>
  );
}