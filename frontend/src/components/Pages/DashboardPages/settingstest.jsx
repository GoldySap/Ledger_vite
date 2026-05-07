import { useState, useEffect } from "react";
import QRCode from "qrcode";
import { useApi } from "../../API/useApi";
import "./settingstest.css";

export default function SettingsPage() {
    const [tab, setTab] = useState("account");

    const tabs = [
        { id: "account",      label: "Account",      icon: "ti-user" },
        { id: "security",     label: "Security",     icon: "ti-shield-lock" },
        { id: "subscription", label: "Subscription", icon: "ti-crown" },
        { id: "activity",     label: "Activity",     icon: "ti-list" },
    ];

    return (
        <div className="settings-page">
            <div className="settings-header">
                <h1>Settings</h1>
                <p>Manage your account, security, and subscription</p>
            </div>

            <div className="settings-tabs" role="tablist">
                {tabs.map(t => (
                    <button
                        key={t.id}
                        role="tab"
                        aria-selected={tab === t.id}
                        className={`settings-tab ${tab === t.id ? "active" : ""}`}
                        onClick={() => setTab(t.id)}
                    >
                        <i className={`ti ${t.icon}`} aria-hidden="true" />
                        {t.label}
                    </button>
                ))}
            </div>

            <div className="settings-content">
                {tab === "account"      && <AccountTab />}
                {tab === "security"     && <SecurityTab />}
                {tab === "subscription" && <SubscriptionTab />}
                {tab === "activity"     && <ActivityTab />}
            </div>
        </div>
    );
}

function AccountTab() {
    const { call } = useApi();
    const [loading,   setLoading]   = useState(true);
    const [saving,    setSaving]    = useState(false);
    const [deleting,  setDeleting]  = useState(false);
    const [form,      setForm]      = useState({ email: "", phone: "" });
    const [showDelete, setShowDelete] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState("");

    useEffect(() => {
        call("/api/auth/me").then(user => {
            if (user) setForm({ email: user.email ?? "", phone: user.phonenumber ?? "" });
            setLoading(false);
        });
    }, []);

    async function handleSave() {
        setSaving(true);
        await call("/api/auth/update", {
            method: "PUT",
            body: JSON.stringify({ email: form.email }),
        });
        setSaving(false);
    }

    async function handleDelete() {
        if (deleteConfirm !== "DELETE") return;
        setDeleting(true);
        // await call("/api/auth/delete", { method: "DELETE" });
        alert("Account deletion not yet implemented on the backend.");
        setDeleting(false);
        setShowDelete(false);
        setDeleteConfirm("");
    }

    if (loading) return <Section><p className="muted">Loading…</p></Section>;

    return (
        <>
            <Section title="Profile" icon="ti-user-circle">
                <div className="two-col">
                    <Field label="Email address">
                        <input
                            type="email"
                            value={form.email}
                            onChange={e => setForm({ ...form, email: e.target.value })}
                        />
                    </Field>
                    <Field label="Phone number">
                        <input
                            type="tel"
                            value={form.phone}
                            onChange={e => setForm({ ...form, phone: e.target.value })}
                            disabled
                            title="Phone updates coming soon"
                        />
                    </Field>
                </div>
                <div className="align-right">
                    <Btn primary onClick={handleSave} disabled={saving}>
                        <i className="ti ti-check" aria-hidden="true" />
                        {saving ? "Saving…" : "Save changes"}
                    </Btn>
                </div>
            </Section>

            <Section title="Danger zone" icon="ti-trash">
                <div className="row-between">
                    <div>
                        <div className="field-title">Delete account</div>
                        <div className="muted sm">Permanently remove your account and all data</div>
                    </div>
                    <Btn danger sm onClick={() => setShowDelete(true)}>
                        <i className="ti ti-trash" aria-hidden="true" /> Delete
                    </Btn>
                </div>
            </Section>

            {showDelete && (
                <Modal title="Delete account" onClose={() => { setShowDelete(false); setDeleteConfirm(""); }}>
                    <p>This is permanent and cannot be undone. Type <strong>DELETE</strong> to confirm.</p>
                    <input
                        placeholder="Type DELETE to confirm"
                        value={deleteConfirm}
                        onChange={e => setDeleteConfirm(e.target.value)}
                    />
                    <div className="modal-actions">
                        <Btn onClick={() => { setShowDelete(false); setDeleteConfirm(""); }}>Cancel</Btn>
                        <Btn danger onClick={handleDelete} disabled={deleteConfirm !== "DELETE" || deleting}>
                            {deleting ? "Deleting…" : "Delete account"}
                        </Btn>
                    </div>
                </Modal>
            )}
        </>
    );
}

function SecurityTab() {
    const { call } = useApi();
    const [sec,      setSec]      = useState(null);
    const [modal,    setModal]    = useState(null);
    const [qr,       setQr]       = useState(null);
    const [code,     setCode]     = useState("");
    const [newCodes, setNewCodes] = useState([]);

    useEffect(() => { load(); }, []);

    async function load() {
        const data = await call("/api/security");
        if (data) setSec(data);
    }

    async function toggleEmail2FA() {
        const res = await call("/api/security/email-2fa", { method: "POST" });
        if (res) setSec(prev => ({ ...prev, email_2fa_enabled: res.email_2fa_enabled }));
    }

    async function startSetup() {
        const res = await call("/api/security/totp/setup", { method: "POST" });
        if (!res?.qr) return;
        const img = await QRCode.toDataURL(res.qr);
        setQr(img);
        setCode("");
        setModal("setup");
    }

    async function confirmTOTP() {
        const res = await call("/api/security/totp/confirm", {
            method: "POST",
            body: JSON.stringify({ code }),
        });
        if (res?.success) {
            setNewCodes(res.backup_codes ?? []);
            setCode("");
            setModal("backup-new");
            load();
        }
    }

    async function disableTOTP() {
        const res = await call("/api/security/totp/disable", {
            method: "POST",
            body: JSON.stringify({ code }),
        });
        if (res?.totp_enabled === false) {
            setCode("");
            setModal(null);
            setSec(prev => ({ ...prev, totp_enabled: false, backup_codes: null }));
        }
    }

    async function viewBackupCodes() {
        if (!sec?.totp_enabled) { setModal("backup-empty"); return; }
        const data = await call("/api/security");
        if (data) setSec(data);
        setModal("backup-view");
    }

    if (!sec) return <Section><p className="muted">Loading…</p></Section>;

    return (
        <>
            <Section title="Email 2FA" icon="ti-mail">
                <ToggleRow
                    title="Email verification"
                    desc="Receive a one-time code via email on each login"
                    checked={!!sec.email_2fa_enabled}
                    onChange={toggleEmail2FA}
                />
            </Section>

            <Section title="Authenticator app (TOTP)" icon="ti-device-mobile">
                <div className="toggle-row">
                    <div className="tr-info">
                        <h4>Time-based one-time password</h4>
                        <p>Use Google Authenticator, Authy, or similar</p>
                    </div>
                    <div className="inline-gap">
                        <span className={`badge ${sec.totp_enabled ? "enabled" : "disabled"}`}>
                            {sec.totp_enabled ? "Enabled" : "Disabled"}
                        </span>
                        <Btn sm onClick={sec.totp_enabled
                            ? () => { setCode(""); setModal("disable"); }
                            : startSetup
                        }>
                            {sec.totp_enabled ? "Disable" : "Enable"}
                        </Btn>
                    </div>
                </div>
            </Section>

            <Section title="Backup codes" icon="ti-key">
                <div className="row-between">
                    <div>
                        <div className="field-title">Recovery codes</div>
                        <div className="muted sm">One-time codes if you lose access to your authenticator</div>
                    </div>
                    <Btn sm onClick={viewBackupCodes}>
                        <i className="ti ti-eye" aria-hidden="true" /> View
                    </Btn>
                </div>
            </Section>

            {modal === "setup" && (
                <Modal title="Set up authenticator" onClose={() => setModal(null)}>
                    <p>Scan the QR code with your app, then enter the 6-digit code to confirm.</p>
                    {qr && <img src={qr} alt="TOTP QR code" className="qr-img" />}
                    <input
                        placeholder="6-digit code"
                        maxLength={6}
                        value={code}
                        onChange={e => setCode(e.target.value)}
                    />
                    <div className="modal-actions">
                        <Btn onClick={() => setModal(null)}>Cancel</Btn>
                        <Btn primary onClick={confirmTOTP}>Confirm</Btn>
                    </div>
                </Modal>
            )}

            {modal === "disable" && (
                <Modal title="Disable authenticator" onClose={() => setModal(null)}>
                    <p>Enter your current TOTP code or a backup code to confirm.</p>
                    <input
                        placeholder="Enter code"
                        maxLength={8}
                        value={code}
                        onChange={e => setCode(e.target.value)}
                    />
                    <div className="modal-actions">
                        <Btn onClick={() => setModal(null)}>Cancel</Btn>
                        <Btn danger onClick={disableTOTP}>Disable</Btn>
                    </div>
                </Modal>
            )}

            {modal === "backup-new" && (
                <Modal title="Save your backup codes" onClose={() => setModal(null)}>
                    <p>Store these somewhere safe. Each code can only be used once and <strong>will not be shown again</strong>.</p>
                    <BackupGrid codes={newCodes} />
                    <div className="modal-actions">
                        <CopyBtn text={newCodes.join("\n")} />
                        <Btn primary onClick={() => setModal(null)}>I've saved them</Btn>
                    </div>
                </Modal>
            )}

            {modal === "backup-view" && (
                <Modal title="Backup codes" onClose={() => setModal(null)}>
                    {sec.backup_codes?.length > 0 ? (
                        <>
                            <p>Your remaining recovery codes. Used codes are automatically removed.</p>
                            <BackupGrid codes={sec.backup_codes} />
                            <div className="modal-actions">
                                <CopyBtn text={sec.backup_codes.join("\n")} />
                                <Btn primary onClick={() => setModal(null)}>Close</Btn>
                            </div>
                        </>
                    ) : (
                        <>
                            <p>All backup codes have been used. Disable and re-enable your authenticator to generate new ones.</p>
                            <div className="modal-actions">
                                <Btn primary onClick={() => setModal(null)}>Close</Btn>
                            </div>
                        </>
                    )}
                </Modal>
            )}

            {modal === "backup-empty" && (
                <Modal title="No backup codes" onClose={() => setModal(null)}>
                    <p>Enable the authenticator app first to generate backup codes.</p>
                    <div className="modal-actions">
                        <Btn primary onClick={() => setModal(null)}>Close</Btn>
                    </div>
                </Modal>
            )}
        </>
    );
}

function SubscriptionTab() {
    const { call } = useApi();
    const [sub,   setSub]   = useState(null);
    const [subdata, setSubData] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        call("/api/subscription/user")
            .then(data => {
                if (data?.label) setSub(data);
                else setError("Could not load subscription data.");
            })
            .catch(() => setError("Could not load subscription data."));
        call("/api/subscriptions/subs")
            .then(data => {
                if (data) setSubData(data);
                else setError("Could not load subscription data.");
            })
            .catch(() => setError("Could not load subscription data."));
    }, []);

    async function upgrade() {
        const res = await call("/api/subscription/upgrade", { method: "POST" });
        if (res?.label) setSub(res);
    }

    if (error) return <Section><p className="muted">{error}</p></Section>;
    if (!sub)  return <Section><p className="muted">Loading…</p></Section>;

    const isPro = sub.label?.toLowerCase() === "pro";

    return (
        <>
            {Array.isArray(subdata) &&
                subdata.map((s, i) => (
                    <PlanCard
                        key={i}
                        name={s.name}
                        price={s.price}
                    />
                ))
            }
            <PlanCard
                name="Free"
                price="$0 / month"
                current={!isPro}
                features={["2 accounts", "$1,000/mo transfers", "Basic analytics"]}
            />
            <PlanCard
                name="Pro"
                price="$12 / month"
                current={isPro}
                recommended
                features={[
                    "Unlimited accounts",
                    "Unlimited transfers",
                    "Finance & investments",
                    "Advanced analytics",
                    "Data export",
                ]}
                action={!isPro
                    ? <Btn primary onClick={upgrade}><i className="ti ti-arrow-up" aria-hidden="true" /> Upgrade</Btn>
                    : null
                }
            />
        </>
    );
}

function ActivityTab() {
    const { call } = useApi();
    const [logs,  setLogs]  = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        call("/api/security/history")
            .then(data => {
                if (Array.isArray(data)) setLogs(data);
                else setError("Could not load activity log.");
            })
            .catch(() => setError("Could not load activity log."));
    }, []);

    if (error) return <Section><p className="muted">{error}</p></Section>;
    if (!logs) return <Section><p className="muted">Loading…</p></Section>;

    return (
        <Section title="Recent activity" icon="ti-list">
            {logs.length === 0 ? (
                <p className="muted">No activity yet.</p>
            ) : (
                <table className="logs-table">
                    <thead>
                        <tr>
                            <th>Event</th>
                            <th>Status</th>
                            <th>Time</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.map(l => (
                            <tr key={l.id}>
                                <td>{l.action.replace(/_/g, " ")}</td>
                                <td>
                                    <span className={`status-dot ${l.status}`} />
                                    {l.status}
                                </td>
                                <td className="muted">
                                    {new Date(l.created_at).toLocaleString("en-US", {
                                        month: "short", day: "numeric",
                                        hour: "2-digit", minute: "2-digit",
                                    })}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </Section>
    );
}

function Section({ title, icon, children }) {
    return (
        <div className="settings-section">
            {title && (
                <div className="section-title">
                    {icon && <i className={`ti ${icon}`} aria-hidden="true" />}
                    {title}
                </div>
            )}
            {children}
        </div>
    );
}

function Field({ label, children }) {
    return (
        <div className="field">
            <label>{label}</label>
            {children}
        </div>
    );
}

function ToggleRow({ title, desc, checked, onChange }) {
    return (
        <div className="toggle-row">
            <div className="tr-info">
                <h4>{title}</h4>
                <p>{desc}</p>
            </div>
            <label className="switch">
                <input type="checkbox" checked={checked} onChange={onChange} />
                <span className="switch-track" />
            </label>
        </div>
    );
}

function Btn({ children, primary, danger, sm, onClick, disabled }) {
    const cls = ["btn", primary && "primary", danger && "danger", sm && "sm"]
        .filter(Boolean).join(" ");
    return (
        <button className={cls} onClick={onClick} disabled={disabled}>
            {children}
        </button>
    );
}

function Modal({ title, children, onClose }) {
    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal-box">
                <h3>{title}</h3>
                {children}
            </div>
        </div>
    );
}

function BackupGrid({ codes }) {
    return (
        <div className="backup-grid">
            {(codes ?? []).map((c, i) => (
                <div key={i} className="backup-code">{c}</div>
            ))}
        </div>
    );
}

function CopyBtn({ text }) {
    const [copied, setCopied] = useState(false);
    function copy() {
        navigator.clipboard?.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    }
    return (
        <Btn onClick={copy}>
            <i className={`ti ${copied ? "ti-check" : "ti-copy"}`} aria-hidden="true" />
            {copied ? "Copied" : "Copy all"}
        </Btn>
    );
}

function PlanCard({ name, price, current, recommended, features, action }) {
    return (
        <div className={`plan-card ${current ? "current" : ""} ${recommended && !current ? "recommended" : ""}`}>
            <div className="plan-info">
                <div className="plan-header">
                    <span className="plan-name">{name}</span>
                    {current              && <span className="badge free">Current plan</span>}
                    {recommended && !current && <span className="badge pro">Recommended</span>}
                </div>
                <div className="plan-price">{price}</div>
                <div className="plan-features">
                    {features.map((f, i) => (
                        <span key={i} className="plan-feature">
                            <i className="ti ti-check" aria-hidden="true" /> {f}
                        </span>
                    ))}
                </div>
            </div>
            {action && <div className="plan-action">{action}</div>}
        </div>
    );
}