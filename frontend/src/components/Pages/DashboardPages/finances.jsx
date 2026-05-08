import { useState, useEffect } from "react";
import { useApi } from "../../API/useApi";
import "./finances.css";

export default function FinancesPage() {
    const [tab, setTab] = useState("wallet");

    return (
        <div className="fin-page">
            <div className="fin-header">
                <h1>Finances</h1>
                <p>Manage your accounts and transactions</p>
            </div>

            <div className="fin-tabs">
                <button
                    className={`fin-tab ${tab === "wallet" ? "active" : ""}`}
                    onClick={() => setTab("wallet")}
                >
                    <i className="ti ti-wallet" /> Wallet
                </button>
                <button
                    className={`fin-tab ${tab === "transactions" ? "active" : ""}`}
                    onClick={() => setTab("transactions")}
                >
                    <i className="ti ti-receipt" /> Transactions
                </button>
            </div>

            {tab === "wallet" && <WalletTab />}
            {tab === "transactions" && <TransactionsTab />}
        </div>
    );
}

function WalletTab() {
    const { call } = useApi();
    const [accounts, setAccounts] = useState([]);
    const [selected, setSelected] = useState(null);
    const [mode, setMode] = useState("view");
    const [editingAccount, setEditingAccount] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isHovered, setIsHovered] = useState(false);


    useEffect(() => { load(); }, []);

    async function load() {
        setLoading(true);
        const res = await call("/api/accounts/get");
        setAccounts(res || []);
        setLoading(false);
    }

    async function create(data) {
        await call("/api/accounts/create", { method: "POST", body: JSON.stringify(data) });
        setMode("view");
        load();
    }

    async function update(data) {
        await call(`/api/accounts/${editingAccount.id}/update`, {
            method: "PUT",
            body: JSON.stringify(data),
        });
        setMode("view");
        setEditingAccount(null);
        load();
    }

    async function remove(id) {
        await call(`/api/accounts/${id}/delete`, { method: "DELETE" });
        setSelected(null);
        load();
    }

    async function setPrimary(id) {
        await call(`/api/accounts/${id}/primary`, { method: "POST" });
        load();
    }

    if (mode === "create") {
        return <AccountForm onSubmit={create} onCancel={() => setMode("view")} />;
    }
    if (mode === "edit") {
        return (
            <AccountForm
                initial={editingAccount}
                onSubmit={update}
                onCancel={() => { setMode("view"); setEditingAccount(null); }}
            />
        );
    }

    const total = accounts.reduce((s, a) => s + (a.balance ?? 0), 0);
    const primary  = accounts.find(a => a.is_primary);
    const selected_acc = accounts.find(a => a.id === selected);

    return (
        <div className="wallet-tab">
            <div className="wallet-summary">
                <div className="summary-card">
                    <span className="summary-label">Total balance</span>
                    <span className="summary-value">{fmt(total)}</span>
                </div>
                <div className="summary-card">
                    <span className="summary-label">Accounts</span>
                    <span className="summary-value">{accounts.length}</span>
                </div>
                {primary && (
                    <div className="summary-card">
                        <span className="summary-label">Primary account</span>
                        <span className="summary-value sm">{primary.name}</span>
                    </div>
                )}
                <button className="add-btn" onClick={() => setMode("create")}>
                    <i className="ti ti-plus" /> Add account
                </button>
            </div>

            {loading ? (
                <p className="muted loading-text">Loading accounts…</p>
            ) : accounts.length === 0 ? (
                <div className="empty-state">
                    <i className="ti ti-credit-card" />
                    <p>No accounts yet</p>
                    <button className="add-btn" onClick={() => setMode("create")}>Add your first account</button>
                </div>
            ) : (
                /* From Uiverse.io by byllzz */
                <div className="app-container">
                    <div className="wallet"
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    >
                        <div className="wallet-back"></div>
                        <div className="cards">
                            {accounts.map((acc, idx) => (
                                <BankCard
                                    key={acc.id}
                                    acc={acc}
                                    idx={idx}
                                    selected={selected === acc.id}
                                    onClick={() => setSelected(selected === acc.id ? null : acc.id)}
                                    isHovered={isHovered}
                                />
                            ))}
                        </div>
                        <div className="pocket">
                            <svg className="pocket-svg" viewBox="0 0 280 160" fill="none">
                                <path
                                d="M 0 20 C 0 10, 5 10, 10 10 C 20 10, 25 25, 40 25 L 240 25 C 255 25, 260 10, 270 10 C 275 10, 280 10, 280 20 L 280 120 C 280 155, 260 160, 240 160 L 40 160 C 20 160, 0 155, 0 120 Z"
                                fill="#1e341e"
                                ></path>
                                <path
                                d="M 8 22 C 8 16, 12 16, 15 16 C 23 16, 27 29, 40 29 L 240 29 C 253 29, 257 16, 265 16 C 268 16, 272 16, 272 22 L 272 120 C 272 150, 255 152, 240 152 L 40 152 C 25 152, 8 152, 8 120 Z"
                                stroke="#3d5635"
                                strokeWidth="1.5"
                                strokeDasharray="6 4"
                                ></path>
                            </svg>
                            <div className="pocket-content">
                                <div style={{position: "relative", height: "24px", width: "100%"}}>
                                    <div className="balance-stars">******</div>
                                    <div className="balance-real">{fmt(total)}</div>
                                </div>
                                <div style={{color: "#698263", fontSize: "12px", fontWeight: 500}}>Hover To View Total Balance</div>
                                <div className="eye-icon-wrapper">
                                    <svg
                                        className="eye-icon eye-slash"
                                        width="20"
                                        height="20"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                        <circle cx="12" cy="12" r="3"></circle>
                                        <line x1="3" y1="3" x2="21" y2="21"></line>
                                    </svg>
                                    <svg
                                        className="eye-icon eye-open"
                                        style={{opacity: 0}}
                                        width="20"
                                        height="20"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                        <circle cx="12" cy="12" r="3"></circle>
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {selected_acc && (
                <div className="action-drawer">
                    <div className="drawer-info">
                        <span className="drawer-name">{selected_acc.name}</span>
                        <span className="drawer-balance">{fmt(selected_acc.balance)}</span>
                    </div>
                    <div className="drawer-actions">
                        <button className="drawer-btn" onClick={() => {
                            setEditingAccount(selected_acc);
                            setMode("edit");
                        }}>
                            <i className="ti ti-edit" /> Edit
                        </button>
                        <button className="drawer-btn" onClick={() => setPrimary(selected_acc.id)}>
                            <i className="ti ti-star" /> Set primary
                        </button>
                        <button className="drawer-btn danger" onClick={() => remove(selected_acc.id)}>
                            <i className="ti ti-trash" /> Delete
                        </button>
                        <button className="drawer-btn close-btn" onClick={() => setSelected(null)}>
                            <i className="ti ti-x" /> Deselect
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

const CARD_PALETTES = [
    { bg: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)", text: "#e2e8f0", accent: "#4ade80" },
    { bg: "linear-gradient(135deg, #134e4a 0%, #065f46 100%)", text: "#ecfdf5", accent: "#34d399" },
    { bg: "linear-gradient(135deg, #1e3a5f 0%, #1e40af 100%)", text: "#dbeafe", accent: "#93c5fd" },
    { bg: "linear-gradient(135deg, #3b0764 0%, #6d28d9 100%)", text: "#ede9fe", accent: "#c4b5fd" },
    { bg: "linear-gradient(135deg, #450a0a 0%, #991b1b 100%)", text: "#fee2e2", accent: "#fca5a5" },
];

function BankCard({ acc, idx, selected, onClick, isHovered }) {
    const pal = CARD_PALETTES[idx % CARD_PALETTES.length];
    const [isHoveringCard, setIsHoveringCard] = useState(false);
    return (
        <div
            className={`card ${selected ? "selected" : ""}`}
            onMouseEnter={() => setIsHoveringCard(true)}
            onMouseLeave={() => setIsHoveringCard(false)}
            style={{
                background: pal.bg,
                color: pal.text,
                bottom: `${20 + idx * 25}px`,
                zIndex: isHoveringCard ? 100 : 40 - (idx * 5),
                animationDelay: `${idx * 0.1}s`,
                transitionDelay: isHoveringCard ? `0s` : "",
                transform: isHovered
                    ? `translateY(-${30 + (idx * 20)}px) rotate(${idx % 2 ? "" : "-"}${4 -idx}deg)`
                    : `translateY(0px) rotate(0deg)`,
                }}
            onClick={onClick}
        >
            {acc.is_primary && (
                <span className="primary-badge" style={{ color: pal.accent }}>
                    <i className="ti ti-star-filled" /> Primary
                </span>
            )}
            <div className="card-inner">
                <div className="card-top">
                    <span className="card-provider">{acc.provider ?? "Account"}</span>
                    <div className="card-chip" />
                </div>
                <div className="card-number">
                        <span>••••</span><span>••••</span><span>••••</span>
                        <span>{acc.last4 ?? "????"}  </span>
                    </div>
                <div className="card-bottom">
                    <div className="card-info">
                        <div className="card-meta-label">Account name</div>
                        <div className="card-meta-value">{acc.name}</div>
                    </div>
                    <div className="card-balance" style={{ color: pal.accent }}>
                        {fmt(acc.balance)}
                        <span className="card-currency">{acc.currency}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function AccountForm({ initial = {}, onSubmit, onCancel }) {
    const [name, setName] = useState(initial.name ?? "");
    const [provider, setProvider] = useState(initial.provider ?? "");
    const [cardNumber, setCardNumber] = useState("");
    const [currency, setCurrency] = useState(initial.currency ?? "USD");

    function handleSubmit() {
        if (!name || !provider) { alert("Name and provider are required"); return; }
        if (!initial.id && cardNumber.length < 12) { alert("Card number must be at least 12 digits"); return; }
        onSubmit({ name, provider, currency, last4: initial.id ? initial.last4 : cardNumber.slice(-4) });
    }

    return (
        <div className="account-form-wrap">
            <div className="account-form">
                <h2>{initial.id ? "Edit account" : "New account"}</h2>
                <div className="form-grid">
                    <div className="form-field">
                        <label>Account name</label>
                        <input placeholder="e.g. Main checking" value={name} onChange={e => setName(e.target.value)} />
                    </div>
                    <div className="form-field">
                        <label>Provider</label>
                        <input placeholder="e.g. Visa, Chase" value={provider} onChange={e => setProvider(e.target.value)} />
                    </div>
                    {!initial.id && (
                        <>
                            <div className="form-field full">
                                <label>Card number</label>
                                <input
                                    placeholder="12+ digits"
                                    value={cardNumber}
                                    maxLength={19}
                                    onChange={e => setCardNumber(e.target.value.replace(/\D/g, ""))}
                                />
                            </div>
                        </>
                    )}
                    <div className="form-field">
                        <label>Currency</label>
                        <select value={currency} onChange={e => setCurrency(e.target.value)}>
                            {["USD", "EUR", "GBP", "NOK", "SEK", "DKK"].map(c => (
                                <option key={c}>{c}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="form-actions">
                    <button className="fin-btn" onClick={onCancel}>Cancel</button>
                    <button className="fin-btn primary" onClick={handleSubmit}>
                        {initial.id ? "Save changes" : "Create account"}
                    </button>
                </div>
            </div>
        </div>
    );
}

function TransactionsTab() {
    const { call } = useApi();
    const [txns,    setTxns]    = useState(null);
    const [filter,  setFilter]  = useState("all");
    const [error,   setError]   = useState(null);

    useEffect(() => {
        call("/api/transactions")
            .then(data => setTxns(Array.isArray(data) ? data : []))
            .catch(() => setError("Could not load transactions."));
    }, []);

    if (error) return <p className="muted">{error}</p>;
    if (!txns) return <p className="muted loading-text">Loading…</p>;

    const categories = ["all", ...new Set(txns.map(t => t.category).filter(Boolean))];
    const visible = filter === "all" ? txns : txns.filter(t => t.category === filter);

    return (
        <div className="txns-tab">
            <div className="txns-filters">
                {categories.map(c => (
                    <button
                        key={c}
                        className={`filter-chip ${filter === c ? "active" : ""}`}
                        onClick={() => setFilter(c)}
                    >
                        {c}
                    </button>
                ))}
            </div>

            {visible.length === 0 ? (
                <div className="empty-state">
                    <i className="ti ti-receipt-off" />
                    <p>No transactions</p>
                </div>
            ) : (
                <div className="txns-list">
                    {visible.map(t => (
                        <div key={t.id} className="txn-row">
                            <div className={`txn-icon-wrap cat-${slugify(t.category)}`}>
                                <i className={`ti ${categoryIcon(t.category)}`} />
                            </div>
                            <div className="txn-info">
                                <span className="txn-category">{t.category}</span>
                                <span className="txn-id muted">#{t.id}</span>
                            </div>
                            <span className={`txn-amount ${t.amount >= 0 ? "positive" : "negative"}`}>
                                {t.amount >= 0 ? "+" : ""}{fmt(t.amount)}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function fmt(n) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n ?? 0);
}

function slugify(s) {
    return (s ?? "").toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

function categoryIcon(cat) {
    const map = {
        food: "ti-tools-kitchen-2", groceries: "ti-shopping-cart",
        transport: "ti-car", entertainment: "ti-device-gamepad-2",
        health: "ti-heart-rate-monitor", utilities: "ti-bolt",
        shopping: "ti-shopping-bag", salary: "ti-cash",
        transfer: "ti-transfer", investment: "ti-trending-up",
    };
    return map[(cat ?? "").toLowerCase()] ?? "ti-receipt";
}