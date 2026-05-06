import { useState, useEffect } from "react";
import QRCode from "qrcode";
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

    const [modalType, setModalType] = useState(null); 

    const [qr, setQr] = useState(null);
    const [code, setCode] = useState("");
    const [backupCodes, setBackupCodes] = useState(null);

    useEffect(() => {
        load();
    }, []);

    async function load() {
        const data = await call("/api/security");
        setSec(data);
    }

    async function toggleEmail2FA() {
        const res = await call("/api/security/email-2fa", { method: "POST" });

        setSec(prev => ({
            ...prev,
            email_2fa_enabled: res.email_2fa_enabled
        }));
    }

    async function startTOTPSetup() {
        const res = await call("/api/security/totp/setup", { method: "POST" });

        if (!res?.qr) {
            console.error("No QR received");
            return;
        }

        const qrImage = await QRCode.toDataURL(res.qr);

        setQr(qrImage);
        setModalType("setup");
    }

    async function confirmTOTP() {
        const res = await call("/api/security/totp/confirm", {
            method: "POST",
            body: JSON.stringify({ code })
        });

        if (res.success) {
            setCode("");
            setBackupCodes(res.backup_codes);
            setModalType("backup");

            await load();
        }
    }

    function startDisable() {
        setModalType("disable");
    }

    async function disableTOTP() {
        const res = await call("/api/security/totp/disable", {
            method: "POST",
            body: JSON.stringify({ code })
        });

        if (res.totp_enabled === false) {
            setCode("");
            setModalType(null);

            setSec(prev => ({
                ...prev,
                totp_enabled: false
            }));
        }
    }

    if (!sec) return <p>Loading...</p>;

    return (
        <div>
            <h2>Security</h2>

            <div>
                <h3>Email 2FA</h3>
                <button onClick={toggleEmail2FA}>
                    {sec.email_2fa_enabled ? "Disable" : "Enable"}
                </button>
            </div>

            <div>
                <h3>Authenticator (TOTP)</h3>
                <p>Status: {sec.totp_enabled ? "Enabled" : "Disabled"}</p>

                {!sec.totp_enabled ? (
                    <button onClick={startTOTPSetup}>
                        Enable Authenticator
                    </button>
                ) : (
                    <button onClick={startDisable}>
                        Disable Authenticator
                    </button>
                )}
            </div>
            {modalType === "setup" && (
                <div className="modal">
                    <div className="modal-box">
                        <h3>Scan QR Code</h3>

                        <img src={qr} alt="QR" />

                        <input
                            placeholder="Enter 6-digit code"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                        />

                        <button onClick={confirmTOTP}>Confirm</button>
                        <button onClick={() => setModalType(null)}>Cancel</button>
                    </div>
                </div>
            )}
            {modalType === "disable" && (
                <div className="modal">
                    <div className="modal-box">
                        <h3>Disable Authenticator</h3>

                        <p>Enter TOTP code</p>

                        <input
                            placeholder="Enter code"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                        />

                        <button onClick={disableTOTP}>Disable</button>
                        <button onClick={() => setModalType(null)}>Cancel</button>
                    </div>
                </div>
            )}
            {modalType === "backup" && backupCodes && (
                <div className="modal">
                    <div className="modal-box">
                        <h3>Backup Codes</h3>

                        <p>These codes are one time use and can be used instead of the generated authenticator code if needed.</p>
                        <p>Backup codes should only be used as a last resort incases like: losing or changing of mobile device, losing access to authenticator or the assosiated profile, etc.</p>

                        <ul>
                            {backupCodes.map((c, i) => (
                                <li key={i}>{c}</li>
                            ))}
                        </ul>

                        <p>Save these codes. They will not be shown again.</p>

                        <button onClick={() => setModalType(null)}>I saved them</button>
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

            {sub.label !== "pro" && (<button onClick={upgrade}>Upgrade to Pro</button>)}
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
                        <li key={l.id}>{l.action} – {l.status}</li>
                    ))}
                </ul>
            )}
        </div>
    );
}

function Card({ children, danger }) {
    return (
        <div className={` ${danger ? "danger-card" : ""}`}>{children}</div>
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