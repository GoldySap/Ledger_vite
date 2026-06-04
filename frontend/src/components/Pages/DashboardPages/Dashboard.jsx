import { useEffect, useState } from "react";
import { useApi } from "../../API/useApi";

export default function Dashboard() {
    const { call } = useApi();

    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [backendStatus, setBackendStatus] = useState("Checking...");
    
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

    useEffect(() => {
        async function fetchStats() {
            try {
                const [accounts, analytics] = await Promise.all([
                    call("/api/accounts/get"),
                    call("/api/analytics"),
                ]);
 
                setStats({
                    totalBalance: analytics?.totalBalance ?? (Array.isArray(accounts)
                        ? accounts.reduce((sum, a) => sum + (a.balance || 0), 0)
                        : 0),
                    totalSpent: analytics?.totalSpent ?? 0,
                    totalIncome: analytics?.totalIncome ?? 0,
                    investmentValue: analytics?.investmentValue ?? 0,
                });
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }
        fetchStats();
    }, []);
 
    const fmt = (n) =>
        new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n ?? 0);

    return (
        <>
            <div className="page-header">
                <h1>Dashboard</h1>
                <p>Overview of your finances</p>
            </div>
 
            {error && <p style={{ color: "red" }}>Error: {error}</p>}
 
            <div className="stats-grid">
                <div className="stat-card">
                    <p>Total Balance</p>
                    <h2>{loading ? "—" : fmt(stats?.totalBalance)}</h2>
                </div>
 
                <div className="stat-card">
                    <p>Investments</p>
                    <h2>{loading ? "—" : fmt(stats?.investmentValue)}</h2>
                </div>
 
                <div className="stat-card">
                    <p>Monthly Income</p>
                    <h2>{loading ? "—" : fmt(stats?.totalIncome)}</h2>
                </div>
 
                <div className="stat-card">
                    <p>Expenses</p>
                    <h2>{loading ? "—" : fmt(stats?.totalSpent)}</h2>
                </div>
            </div>
            
            <h1>Ledger Test</h1>
            <p>Backend status: {backendStatus}</p>
            {error && <p style={{ color: "red" }}>Error: {error}</p>}
        </>
    );
}