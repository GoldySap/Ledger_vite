import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import QRCode from "qrcode";
import { useApi } from "../../API/useApi";
import { useAuth } from "../../Auth/AuthContext";
import { useAccess } from "../../Auth/SubscriptionGate";
import "./settings.css";

export default function SettingsPage() {
    const [tab, setTab] = useState("account");

    const tabs = [
        { id: "account", label: "Account", icon: "ti-user" },
        { id: "security", label: "Security", icon: "ti-shield-lock" },
        { id: "subscription", label: "Subscription", icon: "ti-crown" },
        { id: "activity", label: "Activity", icon: "ti-list" },
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
                {tab === "account" && <AccountTab />}
                {tab === "security" && <SecurityTab />}
                {tab === "subscription" && <SubscriptionTab />}
                {tab === "activity" && <ActivityTab />}
            </div>
        </div>
    );
}

function AccountTab() {
    const { call } = useApi();
    const { logout } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ email: "", phone: "" });
    const [showDelete, setShowDelete] = useState(false);
    const [deleteStep, setDeleteStep] = useState(1);
    const [deleteInput, setDeleteInput] = useState("");
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState(null);
 
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
        if (deleteInput !== "DELETE") return;
        setDeleting(true);
        setDeleteError(null);
        const res = await call("/api/auth/delete", { method: "DELETE" });
        setDeleting(false);
        if (res?.error) {
            setDeleteError(res.error);
            return;
        }
        await logout();
        navigate("/");
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
 
            <Section title="Danger zone" icon="ti-alert-triangle">
                <div className="row-between">
                    <div>
                        <div className="field-title">Delete account</div>
                        <div className="muted sm">
                            Permanently anonymises your personal data in accordance with GDPR Article 17.
                            Transaction history is retained for accounting purposes but can no longer be
                            linked to your identity.
                        </div>
                    </div>
                    <Btn danger sm onClick={() => { setShowDelete(true); setDeleteStep(1); setDeleteInput(""); setDeleteError(null); }}>
                        <i className="ti ti-trash" aria-hidden="true" /> Delete
                    </Btn>
                </div>
            </Section>
 
            {showDelete && (
                <Modal
                    title={deleteStep === 1 ? "Before you delete…" : "Confirm deletion"}
                    onClose={() => { setShowDelete(false); setDeleteStep(1); setDeleteInput(""); }}
                >
                    {deleteStep === 1 ? (
                        <>
                            <div className="gdpr-info-box">
                                <i className="ti ti-info-circle" aria-hidden="true" />
                                <div>
                                    <strong>What happens to your data (GDPR Art. 17)</strong>
                                    <ul className="gdpr-list">
                                        <li>Your email, phone number, and password are permanently removed</li>
                                        <li>Your account is deactivated and anonymised as <em>deleted_[id]@removed.local</em></li>
                                        <li>Linked bank accounts are anonymised (name/provider scrubbed)</li>
                                        <li>Cards linked to accounts are anonymised</li>
                                        <li>Transaction history is <strong>retained</strong> — required by bookkeeping law — but can no longer be linked to you</li>
                                        <li>Investment holdings, watchlist, and price alerts are permanently deleted</li>
                                        <li>FAQ questions you submitted are anonymised (name/email removed)</li>
                                        <li>Security settings and verification codes are permanently deleted</li>
                                    </ul>
                                </div>
                            </div>
                            <div className="modal-actions" style={{ marginTop: "0.75rem" }}>
                                <Btn onClick={() => { setShowDelete(false); setDeleteStep(1); }}>Cancel</Btn>
                                <Btn danger onClick={() => setDeleteStep(2)}>
                                    I understand, continue
                                </Btn>
                            </div>
                        </>
                    ) : (
                        <>
                            <p>Type <strong>DELETE</strong> to permanently anonymise your account. This cannot be undone.</p>
                            <input
                                placeholder="Type DELETE to confirm"
                                value={deleteInput}
                                onChange={e => setDeleteInput(e.target.value)}
                                style={{ borderColor: deleteInput && deleteInput !== "DELETE" ? "#dc2626" : undefined }}
                            />
                            {deleteError && (
                                <p style={{ color: "#dc2626", fontSize: "0.875rem", margin: "0.5rem 0 0" }}>{deleteError}</p>
                            )}
                            <div className="modal-actions">
                                <Btn onClick={() => { setShowDelete(false); setDeleteStep(1); setDeleteInput(""); }}>Cancel</Btn>
                                <Btn
                                    danger
                                    onClick={handleDelete}
                                    disabled={deleteInput !== "DELETE" || deleting}
                                >
                                    {deleting ? "Deleting…" : "Delete my account"}
                                </Btn>
                            </div>
                        </>
                    )}
                </Modal>
            )}
        </>
    );
}

function SecurityTab() {
    const { call } = useApi();
    const [sec, setSec] = useState(null);
    const [modal, setModal] = useState(null);
    const [qr, setQr] = useState(null);
    const [code, setCode] = useState("");
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
    const { refresh } = useAccess() ?? {};
    const [sub,   setSub]   = useState(null);
    const [plans, setPlans] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        call("/api/subscription/user")
            .then(data => {
                if (data?.label) setSub(data);
                else setError("Could not load subscription data.");
            })
            .catch(() => setError("Could not load subscription data."));
        call("/api/subscription/subs")
            .then(data => {
                if (Array.isArray(data)) {
                    setPlans(data);
                } else if (Array.isArray(data?.data)) {
                    setPlans(data.data);
                } else {
                    setPlans([]);
                }
            })
            .catch(() => setError("Could not load subscription data."));
    }, []);

    async function upgrade(planId) {
        const res = await call("/api/subscription/upgrade", {
            method: "POST",
            body: JSON.stringify({ subscription_id: planId }),
        });

        if (res?.label) {
            setSub(res);
            refresh?.();   // re-evaluate all SubscriptionGates on the page
        }
    }

    if (error) return <Section><p className="muted">{error}</p></Section>;
    if (!sub)  return <Section><p className="muted">Loading…</p></Section>;

    return (
        <>
            {plans.map(plan => {
                const current =
                    sub.label?.toLowerCase() === plan.label?.toLowerCase();

                return (
                    <PlanCard
                        key={plan.id}
                        name={plan.label}
                        price={`$${plan.price} / month`}
                        current={current}
                        recommended={plan.label?.toLowerCase() === "pro"}
                        features={plan.features || []}
                        action={
                            !current ? (
                                <Btn
                                    primary
                                    onClick={() => upgrade(plan.id)}
                                >
                                    <i className="ti ti-arrow-up" aria-hidden="true"/>Upgrade
                                </Btn>
                            ) : null
                        }
                    />
                );
            })}
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
                    {current && <span className="badge current">Current plan</span>}
                    {recommended && !current && <span className="badge recommended">Recommended</span>}
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