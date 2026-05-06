import { useState, useEffect } from "react";
import { useApi } from "../../API/useApi";
import "./settings.css";

export default function SettingsPage() {
    const [tab, setTab] = useState("account");

    const tabs = [
        { id: "account", label: "Account" },
        { id: "security", label: "Security" },
        { id: "subscription", label: "Subscription" },
        { id: "activity", label: "Activity" }
    ];

    return (
        <div className="settings-settings">
            <aside className="sidebar">
                <h2 className="logo">Dashboard</h2>
                {tabs.map(t => (
                    <button
                        key={t.id}
                        className={`sidebar-item ${tab === t.id ? "active" : ""}`}
                        onClick={() => setTab(t.id)}
                    >
                        {t.label}
                    </button>
                ))}
            </aside>

            <main className="content">
                <Header tab={tab} />

                {tab === "account" && <Account />}
                {tab === "security" && <Security />}
                {tab === "subscription" && <Subscription />}
                {tab === "activity" && <Activity />}
            </main>
        </div>
    );
}

function Header({ tab }) {
    return (
        <div className="header">
            <h1>{tab.charAt(0).toUpperCase() + tab.slice(1)}</h1>
            <p>Manage your {tab}</p>
        </div>
    );
}

function Account() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState({
        email: "",
        phone: ""
    });

    useEffect(() => {
        setTimeout(() => {
            setForm({ email: "user@email.com", phone: "12345678" });
            setLoading(false);
        }, 500);
    }, []);

    async function handleSubmit(e) {
        e.preventDefault();
        setSaving(true);

        await new Promise(r => setTimeout(r, 800));

        setSaving(false);
        alert("Saved!");
    }

    if (loading) return <Card><p>Loading...</p></Card>;

    return (
        <Card>
            <h2>Profile</h2>

            <form onSubmit={handleSubmit}>
                <Input
                    label="Email"
                    value={form.email}
                    onChange={v => setForm({ ...form, email: v })}
                />

                <Input
                    label="Phone"
                    value={form.phone}
                    onChange={v => setForm({ ...form, phone: v })}
                />

                <button className="primary" disabled={saving}>
                    {saving ? "Saving..." : "Save changes"}
                </button>
            </form>
        </Card>
    );
}

function Security() {
    const { call } = useApi();
    const [sec, setSec] = useState(null);
    const [showTotpModal, setShowTotpModal] = useState(false);
    const [qr, setQr] = useState(null);
    const [code, setCode] = useState("");

    useEffect(() => {
        load();
    }, []);

    async function load() {
        const data = await call("/api/security");
        setSec(data);
    }

    async function toggleEmail2FA() {
        const res = await call("/api/security/email-2fa", { method: "POST" });
        setSec(prev => ({ ...prev, ...res }));
    }

    async function startTOTPSetup() {
        const res = await call("/api/security/totp/setup", { method: "POST" });
        setQr(res.qr);
        setShowTotpModal(true);
    }

    async function verifyTOTP() {
        const res = await call("/api/security/totp/verify", {
            method: "POST",
            body: JSON.stringify({ code })
        });

        if (res.success) {
            setShowTotpModal(false);
            load();
        }
    }

    if (!sec) return <p>Loading...</p>;

    return (
        <div>
            <h2>Security</h2>

            <div className="">
                <h3>Two-Factor Authentication</h3>

                <button onClick={toggleEmail2FA}>
                    Email 2FA: {sec.email_2fa_enabled ? "On" : "Off"}
                </button>
            </div>

            <div className="">
                <h3>Authenticator App (TOTP)</h3>

                <p>Status: {sec.totp_enabled ? "Enabled" : "Disabled"}</p>

                {!sec.totp_enabled ? (
                    <button onClick={startTOTPSetup}>Enable Authenticator</button>
                ) : (
                    <button onClick={() => call("/api/security/totp/disable", { method: "POST" })}>
                        Disable
                    </button>
                )}
            </div>

            {showTotpModal && (
                <div className="modal">
                    <div className="modal-box">
                        <h3>Scan this QR code</h3>

                        <img src={qr} alt="TOTP QR" />

                        <input
                            placeholder="Enter 6-digit code"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                        />

                        <button onClick={verifyTOTP}>
                            Verify
                        </button>

                        <button onClick={() => setShowTotpModal(false)}>
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function Subscription() {
    const { call } = useApi();
    const [sub, setSub] = useState(null);

    useEffect(() => {
        call("/api/subscription").then(setSub);
    }, []);

    async function upgrade() {
        await call("/api/subscription/upgrade", { method: "POST" });
        const updated = await call("/api/subscription");
        setSub(updated);
    }

    if (!sub) return <p>Loading...</p>;

    return (
        <div className="">
            <h2>Subscription</h2>

            <p><b>Plan:</b> {sub.label}</p>
            <p><b>Price:</b> ${sub.price}/month</p>

            {sub.label !== "pro" && (
                <button onClick={upgrade}>
                    Upgrade to Pro
                </button>
            )}
        </div>
    );
}

function Activity() {
    const { call } = useApi();
    const [logs, setLogs] = useState([]);

    useEffect(() => {
        call("/api/security/history").then(setLogs);
    }, []);

    return (
        <div className="">
            <h2>Activity</h2>

            {logs.length === 0 ? (
                <p>No activity yet</p>
            ) : (
                <ul>
                    {logs.map(l => (
                        <li key={l.id}>
                            {l.action} – {l.status}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

function Card({ children, danger }) {
    return (
        <div className={` ${danger ? "danger-card" : ""}`}>
            {children}
        </div>
    );
}

function Input({ label, value, onChange }) {
    return (
        <div className="input-group">
            <label>{label}</label>
            <input value={value} onChange={e => onChange(e.target.value)} />
        </div>
    );
}

function Toggle({ label, enabled, onClick }) {
    return (
        <div className="toggle">
            <span>{label}</span>
            <button onClick={onClick} className={enabled ? "on" : ""}>
                {enabled ? "Enabled" : "Disabled"}
            </button>
        </div>
    );
}