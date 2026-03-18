import { NavLink } from "react-router-dom";
import { useEffect, useState } from "react";


export function Home() {
  const [backendStatus, setBackendStatus] = useState("Checking...");
  const [error, setError] = useState(null);
  
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const flaskState = import.meta.env.FLASK_ENV
  const flaskDBLocal = import.meta.env.FLASK_FLASK_USE
  let fetchRoute = (flaskState == "production") ? `${backendUrl}/api/health` : (flaskDBLocal == "external") ? `${backendUrl}/api/health` : `/api/health`;

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
  return (
    <>
      <main className="home">
        <section className="hero">
          <h1>Manage your finances with clarity</h1>
          <p>
            Ledger helps you track accounts, investments, and transactions
            in one powerful dashboard.
          </p>
          <NavLink to="/dashboard/user">Open Dashboard</NavLink> 
        </section>
        <h1>Ledger Test</h1>
            <p>Backend status: {backendStatus}</p>
            {error && <p style={{ color: "red" }}>Error: {error}</p>}
      </main>
    </>
  );
}