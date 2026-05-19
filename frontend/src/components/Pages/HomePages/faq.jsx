import { useState, useEffect, useMemo } from "react";
import { useApi } from "../../API/useApi";
import { useAuth } from "../../Auth/AuthContext";
import "./faq.css";

const CATEGORIES = [
    { id: "account", label: "Account", icon: "ti-user" },
    { id: "security", label: "Security", icon: "ti-shield-lock" },
    { id: "privacy", label: "Privacy", icon: "ti-lock" },
    { id: "finance", label: "Finances", icon: "ti-wallet" },
    { id: "investments", label: "Investments", icon: "ti-trending-up" },
    { id: "subscription", label: "Subscription", icon: "ti-crown" },
];

export default function FaqPage() {
    const { call }                          = useApi();
    const { user }                          = useAuth();
    const [grouped,   setGrouped]           = useState(null);
    const [error,     setError]             = useState(null);
    const [query,     setQuery]             = useState("");
    const [activeCat, setActiveCat]         = useState("all");
    const [openId,    setOpenId]            = useState(null);
    const [panel,     setPanel]             = useState(null);

    useEffect(() => {
        call("/api/faq")
            .then(data => data ? setGrouped(data) : setError("Could not load FAQ."))
            .catch(() => setError("Could not load FAQ."));
    }, []);

    const visible = useMemo(() => {
        if (!grouped) return {};
        const q = query.toLowerCase().trim();
        const result = {};
        CATEGORIES.forEach(({ id }) => {
            const items = grouped[id] ?? [];
            const filtered = items.filter(item => {
                if (activeCat !== "all" && activeCat !== id) return false;
                if (!q) return true;
                return (
                    item.question.toLowerCase().includes(q) ||
                    item.answer.toLowerCase().includes(q)
                );
            });
            if (filtered.length) result[id] = filtered;
        });
        return result;
    }, [grouped, query, activeCat]);

    const totalVisible = Object.values(visible).reduce((s, arr) => s + arr.length, 0);

    function toggle(id) {
        setOpenId(prev => (prev === id ? null : id));
    }

    if (error) return <div className="faq-page"><p className="faq-muted">{error}</p></div>;

    return (
        <div className="faq-page">
            <div className="faq-hero">
                <h1>How can we help?</h1>
                <p className="faq-muted">
                    Find answers about accounts, security, privacy, finances, and more.
                </p>
                <div className="faq-search-wrap">
                    <i className="ti ti-search faq-search-icon" aria-hidden="true" />
                    <input
                        className="faq-search"
                        type="text"
                        placeholder="Search questions…"
                        aria-label="Search FAQ"
                        value={query}
                        onChange={e => { setQuery(e.target.value); setActiveCat("all"); }}
                    />
                    {query && (
                        <button className="faq-search-clear" onClick={() => setQuery("")} aria-label="Clear search">
                            <i className="ti ti-x" aria-hidden="true" />
                        </button>
                    )}
                </div>
            </div>

            {!query && (
                <div className="faq-cats" role="tablist">
                    <button
                        role="tab"
                        aria-selected={activeCat === "all"}
                        className={`faq-cat ${activeCat === "all" ? "active" : ""}`}
                        onClick={() => setActiveCat("all")}
                    >
                        All
                    </button>
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat.id}
                            role="tab"
                            aria-selected={activeCat === cat.id}
                            className={`faq-cat ${activeCat === cat.id ? "active" : ""}`}
                            onClick={() => setActiveCat(cat.id)}
                        >
                            <i className={`ti ${cat.icon}`} aria-hidden="true" />
                            {cat.label}
                        </button>
                    ))}
                </div>
            )}

            {!grouped && !error && (
                <div className="faq-skeleton">
                    {[1,2,3,4,5].map(n => <div key={n} className="faq-skel-item" />)}
                </div>
            )}

            {grouped && totalVisible === 0 && (
                <div className="faq-empty">
                    <i className="ti ti-search-off" aria-hidden="true" />
                    <p>No results for "<strong>{query || activeCat}</strong>"</p>
                    <button
                        className="faq-link-btn"
                        onClick={() => { setQuery(""); setActiveCat("all"); }}
                    >
                        Clear filter
                    </button>
                </div>
            )}

            {grouped && totalVisible > 0 && (
                <div className="faq-groups">
                    {CATEGORIES.map(cat => {
                        const items = visible[cat.id];
                        if (!items?.length) return null;
                        return (
                            <div key={cat.id} className="faq-group">
                                <div className="faq-group-label">
                                    <i className={`ti ${cat.icon}`} aria-hidden="true" />
                                    {cat.label}
                                </div>
                                {items.map(item => (
                                    <FaqItem
                                        key={item.id}
                                        item={item}
                                        open={openId === item.id}
                                        onToggle={() => toggle(item.id)}
                                        highlight={query}
                                    />
                                ))}
                            </div>
                        );
                    })}
                </div>
            )}

            <div className="faq-action-strip">
                <button
                    className={`faq-strip-btn ${panel === "ask" ? "active" : ""}`}
                    onClick={() => setPanel(p => p === "ask" ? null : "ask")}
                >
                    <i className="ti ti-message-question" aria-hidden="true" />
                    Ask a question
                </button>
                <button
                    className={`faq-strip-btn ghost ${panel === "gdpr" ? "active" : ""}`}
                    onClick={() => setPanel(p => p === "gdpr" ? null : "gdpr")}
                >
                    <i className="ti ti-trash" aria-hidden="true" />
                    Delete my submitted data
                </button>
            </div>

            {panel === "ask" && (
                <AskPanel
                    user={user}
                    call={call}
                    onClose={() => setPanel(null)}
                />
            )}

            {panel === "gdpr" && (
                <GdprPanel
                    call={call}
                    onClose={() => setPanel(null)}
                />
            )}
        </div>
    );
}

function AskPanel({ user, call, onClose }) {
    const [name,     setName]     = useState("");
    const [email,    setEmail]    = useState("");
    const [question, setQuestion] = useState("");
    const [busy,     setBusy]     = useState(false);
    const [msg,      setMsg]      = useState(null); // { text, ok }

    async function submit() {
        const q = question.trim();
        if (!q) { setMsg({ text: "Please enter your question.", ok: false }); return; }
        if (!user && (!name.trim() || !email.trim())) {
            setMsg({ text: "Please enter your name and email.", ok: false });
            return;
        }

        setBusy(true);
        setMsg(null);

        const body = { question: q };
        if (!user) { body.name = name.trim(); body.email = email.trim(); }

        const res = await call("/api/faq/questions", {
            method: "POST",
            body: JSON.stringify(body),
        });

        setBusy(false);

        if (res?.message) {
            setMsg({ text: res.message, ok: true });
            setQuestion(""); setName(""); setEmail("");
        } else {
            setMsg({ text: res?.error ?? "Something went wrong.", ok: false });
        }
    }

    return (
        <div className="faq-panel">
            <div className="faq-panel-header">
                <div>
                    <div className="faq-panel-title">
                        <i className="ti ti-message-question" aria-hidden="true" /> Ask a question
                    </div>
                    <p className="faq-muted" style={{ marginBottom: 0 }}>
                        Can't find what you need? We'll get back to you by email.
                    </p>
                </div>
                <button className="faq-panel-close" onClick={onClose} aria-label="Close">
                    <i className="ti ti-x" aria-hidden="true" />
                </button>
            </div>

            {user ? (
                <p className="faq-panel-user-note">
                    <i className="ti ti-user-check" aria-hidden="true" />
                    Submitting as <strong>{user.email}</strong>
                </p>
            ) : (
                <div className="faq-panel-fields">
                    <div className="faq-field">
                        <label htmlFor="faq-name">Your name</label>
                        <input
                            id="faq-name"
                            type="text"
                            placeholder="Jane Doe"
                            value={name}
                            onChange={e => setName(e.target.value)}
                        />
                    </div>
                    <div className="faq-field">
                        <label htmlFor="faq-email">Email address</label>
                        <input
                            id="faq-email"
                            type="email"
                            placeholder="jane@example.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                        />
                    </div>
                </div>
            )}

            <div className="faq-field" style={{ marginTop: user ? "0.75rem" : 0 }}>
                <label htmlFor="faq-question">Your question</label>
                <textarea
                    id="faq-question"
                    className="faq-textarea"
                    placeholder="What would you like to know?"
                    rows={4}
                    value={question}
                    onChange={e => setQuestion(e.target.value)}
                />
            </div>

            {msg && <p className={`faq-msg ${msg.ok ? "ok" : "err"}`}>{msg.text}</p>}

            <div className="faq-panel-actions">
                <button className="faq-btn" onClick={onClose}>Cancel</button>
                <button className="faq-btn primary" onClick={submit} disabled={busy}>
                    {busy ? "Sending…" : "Submit question"}
                </button>
            </div>

            <p className="faq-privacy-note">
                <i className="ti ti-lock" aria-hidden="true" />
                Your name and email are stored only to respond to your question and are
                never shared with third parties. You can request removal at any time using
                the <em>Delete my submitted data</em> option below.
            </p>
        </div>
    );
}

function GdprPanel({ call, onClose }) {
    const [email, setEmail] = useState("");
    const [busy,  setBusy]  = useState(false);
    const [msg,   setMsg]   = useState(null);

    async function submit() {
        const e = email.trim();
        if (!e || !e.includes("@")) {
            setMsg({ text: "Please enter a valid email address.", ok: false });
            return;
        }
        setBusy(true);
        setMsg(null);
        const res = await call("/api/faq/questions/gdpr-delete", {
            method: "POST",
            body: JSON.stringify({ email: e }),
        });
        setBusy(false);
        if (res?.message) {
            setMsg({ text: res.message, ok: true });
            setEmail("");
        } else {
            setMsg({ text: res?.error ?? "Something went wrong.", ok: false });
        }
    }

    return (
        <div className="faq-panel gdpr-panel">
            <div className="faq-panel-header">
                <div>
                    <div className="faq-panel-title">
                        <i className="ti ti-trash" aria-hidden="true" /> Delete my submitted data
                    </div>
                    <p className="faq-muted" style={{ marginBottom: 0 }}>
                        Right to erasure — GDPR Article 17
                    </p>
                </div>
                <button className="faq-panel-close" onClick={onClose} aria-label="Close">
                    <i className="ti ti-x" aria-hidden="true" />
                </button>
            </div>

            <div className="gdpr-info">
                <i className="ti ti-info-circle" aria-hidden="true" />
                <p>
                    Entering your email below will <strong>anonymise</strong> all questions
                    you have submitted using that address. Your name and email will be
                    replaced so you can no longer be identified, while the question text is
                    retained anonymously to help other users.
                </p>
            </div>

            <div className="faq-field">
                <label htmlFor="gdpr-email">Email address used when submitting</label>
                <input
                    id="gdpr-email"
                    type="email"
                    placeholder="jane@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && submit()}
                />
            </div>

            {msg && <p className={`faq-msg ${msg.ok ? "ok" : "err"}`}>{msg.text}</p>}

            <div className="faq-panel-actions">
                <button className="faq-btn" onClick={onClose}>Cancel</button>
                <button className="faq-btn danger" onClick={submit} disabled={busy}>
                    {busy ? "Processing…" : "Remove my data"}
                </button>
            </div>

            <p className="faq-privacy-note">
                <i className="ti ti-shield-check" aria-hidden="true" />
                We will not confirm or deny whether the email address exists in our
                system — this protects your privacy regardless of the outcome.
            </p>
        </div>
    );
}

function FaqItem({ item, open, onToggle, highlight }) {
    return (
        <div className={`faq-item ${open ? "open" : ""}`}>
            <button
                className="faq-q"
                onClick={onToggle}
                aria-expanded={open}
                aria-controls={`faq-ans-${item.id}`}
            >
                <span className="faq-q-text">
                    {highlight
                        ? <Highlighted text={item.question} query={highlight} />
                        : item.question}
                </span>
                <i className="ti ti-chevron-down faq-chevron" aria-hidden="true" />
            </button>

            {open && (
                <div
                    id={`faq-ans-${item.id}`}
                    className="faq-a"
                    role="region"
                >
                    {item.answer.split("\n").filter(Boolean).map((para, i) => (
                        <p key={i}>
                            {highlight
                                ? <Highlighted text={para} query={highlight} />
                                : para}
                        </p>
                    ))}
                </div>
            )}
        </div>
    );
}

function Highlighted({ text, query }) {
    if (!query) return text;
    const regex = new RegExp(
        `(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"
    );
    const parts = text.split(regex);
    return (
        <>
            {parts.map((part, i) =>
                regex.test(part)
                    ? <mark key={i} className="faq-highlight">{part}</mark>
                    : part
            )}
        </>
    );
}