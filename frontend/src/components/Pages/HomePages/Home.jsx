import { NavLink } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../../Auth/AuthContext";
import { api } from "../../API/api";

export function Home() {
  const { user } = useAuth();

  const [backendStatus, setBackendStatus] = useState("Checking...");
  const [error, setError] = useState(null);
  
  useEffect(() => {
      api("/api/health")
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
          <NavLink to={!user ? "/dashboard/user" : "/dashboard/" + user.role}>Open Dashboard</NavLink> 
        </section>
        <h1>Ledger Test</h1>
            <p>Backend status: {backendStatus}</p>
            {error && <p style={{ color: "red" }}>Error: {error}</p>}
      </main>
    </>
  );
}