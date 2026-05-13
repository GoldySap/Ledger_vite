import { useState, useEffect, useMemo } from "react";
import { useApi } from "../../API/useApi";
import "./faq.css";

const CATEGORIES = [
    { id: "account",      label: "Account",      icon: "ti-user" },
    { id: "security",     label: "Security",      icon: "ti-shield-lock" },
    { id: "privacy",      label: "Privacy",       icon: "ti-lock" },
    { id: "finance",      label: "Finances",      icon: "ti-wallet" },
    { id: "investments",  label: "Investments",   icon: "ti-trending-up" },
    { id: "subscription", label: "Subscription",  icon: "ti-crown" },
];

export default function FaqPage() {
    const { call }                      = useApi();
    const [grouped,  setGrouped]        = useState(null);
    const [error,    setError]          = useState(null);
    const [query,    setQuery]          = useState("");
    const [activeCat, setActiveCat]     = useState("all");
    const [openId,   setOpenId]         = useState(null);

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
                <p className="faq-muted">Find answers about accounts, security, privacy, finances, and more.</p>
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
                    <button className="faq-link-btn" onClick={() => { setQuery(""); setActiveCat("all"); }}>
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

            <div className="faq-contact">
                <div>
                    <div className="faq-contact-title">Still have questions?</div>
                    <div className="faq-muted">Email us at <a href="mailto:support@ledger.app">support@ledger.app</a> — we aim to reply within one business day.</div>
                </div>
                <a href="mailto:support@ledger.app" className="faq-contact-btn">
                    <i className="ti ti-mail" aria-hidden="true" /> Contact support
                </a>
            </div>
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
                    {highlight ? <Highlighted text={item.question} query={highlight} /> : item.question}
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
                        <p key={i}>{highlight ? <Highlighted text={para} query={highlight} /> : para}</p>
                    ))}
                </div>
            )}
        </div>
    );
}

function Highlighted({ text, query }) {
    if (!query) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
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
