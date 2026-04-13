import { useEffect, useState } from "react";
import { useApi } from "../../API/useApi";

export default function Dashboard() {
    const { call } = useApi();

    const [backendStatus, setBackendStatus] = useState("Checking...");
    const [error, setError] = useState(null);
    
    useEffect(() => {
        call("/api/health")
        .then(data => {
            setBackendStatus(data.status);
        })
        .catch(err => {
            setError(err.message);
            setBackendStatus("Failed");
        });
    }, []);
    return (
        <>
            <div className="page-header">
                <h1>Dashboard</h1>
                <p>Overview of your finances</p>
            </div>

            <div className="stats-grid">
                <div className="stat-card">
                <p>Total Balance</p>
                <h2>$24,430</h2>
                </div>

                <div className="stat-card">
                <p>Investments</p>
                <h2>$11,240</h2>
                </div>

                <div className="stat-card">
                <p>Monthly Income</p>
                <h2>$3,200</h2>
                </div>

                <div className="stat-card">
                <p>Expenses</p>
                <h2>$1,540</h2>
                </div>
            </div>

            <h1>Ledger Test</h1>
            <p>Backend status: {backendStatus}</p>
            {error && <p style={{ color: "red" }}>Error: {error}</p>}
        </>
    );
}