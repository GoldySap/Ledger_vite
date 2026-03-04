import { useEffect, useState } from "react";
import "./App.css";

function App() {
  const [backendStatus, setBackendStatus] = useState("Checking...");
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("/api/health")
      .then((res) => {
        if (!res.ok) {
          throw new Error("Network response not ok");
        }
        return res.json();
      })
      .then((data) => {
        setBackendStatus(data.status);
      })
      .catch((err) => {
        setError(err.message);
        setBackendStatus("Failed");
      });
  }, []);

  return (
    <>
      <h1>Ledger Test</h1>
      <p>Backend status: {backendStatus}</p>
      {error && <p style={{ color: "red" }}>Error: {error}</p>}
    </>
  );
}

export default App;
