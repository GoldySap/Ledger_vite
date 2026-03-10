import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

 async function handleLogin(e) {
    e.preventDefault();

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error);
      return;
    }

    login(data.token);
    
    navigate("/dashboard/home");
  }

  return (
    <form onSubmit={handleLogin}>
      <h2>Login</h2>

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={e => setEmail(e.target.value)}
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={e => setPassword(e.target.value)}
      />

      <button type="submit">Login</button>
    </form>
  );
}

export function Logout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    logout();
    navigate("/");
  }, []);

  return <p>Logging out...</p>;
}

export function Register() {
  const [email,setEmail] = useState("")
  const [password,setPassword] = useState("")
  async function handleRegister(e){
    e.preventDefault()

    const res = await fetch("/api/auth/register",{
      method:"POST",
      headers:{
        "Content-Type":"application/json"
      },
      body:JSON.stringify({email,password})
    })
    const data = await res.json()
    if(res.ok){
      alert("Account created")
    } else {
      alert(data.error)
    }
  }

  return(
    <form onSubmit={handleRegister}>
      <h2>Register</h2>

      <input
      type="email"
      value={email}
      onChange={e=>setEmail(e.target.value)}
      />

      <input
      type="password"
      value={password}
      onChange={e=>setPassword(e.target.value)}
      />

      <button>Create Account</button>
    </form>
  )
}