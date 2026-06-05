import { useState, useEffect, useCallback } from "react";
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
                {[
                    { id: "wallet", icon: "ti-wallet",  label: "Wallet" },
                    { id: "transactions", icon: "ti-receipt", label: "Transactions" },
                ].map(t => (
                    <button
                        key={t.id}
                        className={`fin-tab ${tab === t.id ? "active" : ""}`}
                        onClick={() => setTab(t.id)}
                    >
                        <i className={`ti ${t.icon}`} /> {t.label}
                    </button>
                ))}
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
    const [mode, setMode] = useState("view"); // view, create, edit
    const [editingAccount, setEditingAccount] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isHovered, setIsHovered] = useState(false);
    const [cardsFor, setCardsFor] = useState(null);
    const [limitError, setLimitError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [error, setError] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        const res = await call("/api/accounts/get");
        setAccounts(res || []);
        setLoading(false);
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        if (!success) return;

        const timer = setTimeout(() => {
            setSuccess(null);
        }, 3000);

        return () => clearTimeout(timer);
    }, [success]);

    useEffect(() => {
        if (!error) return;

        const timer = setTimeout(() => {
            setError(null);
        }, 5000);

        return () => clearTimeout(timer);
    }, [error]);

    async function create(data) {
        const res = await call("/api/accounts/create", { method: "POST", body: JSON.stringify(data) });
        if (res?.error) { setLimitError(res.error); return; }
        setSuccess("Account created successfully.");
        setMode("view"); 
        setLimitError(null); 
        load();
    }

    async function update(data) {
        await call(`/api/accounts/${editingAccount.id}/update`, { method: "PUT", body: JSON.stringify(data) });
        setSuccess("Account updated successfully.");
        setMode("view");
        setEditingAccount(null);
        load();
    }

    async function remove(id) {
        await call(`/api/accounts/${id}/delete`, { method: "DELETE" });
        setSuccess("Account deleted.");
        setSelected(null);
        load();
    }

    async function setPrimary(id) {
        await call(`/api/accounts/${id}/primary`, { method: "POST" });
        setSuccess("Primary account updated.");
        load();
    }

    if (mode === "create") return <AccountForm onSubmit={create} onCancel={() => { setMode("view"); setLimitError(null); }} error={limitError} />;
    if (mode === "edit")   return (
        <AccountForm
            initial={editingAccount}
            onSubmit={update}
            onCancel={() => { setMode("view"); setEditingAccount(null); }}
        />
    );

    if (cardsFor) return (
        <CardsPanel
            account={cardsFor}
            onBack={() => { setCardsFor(null); load(); }}
        />
    );

    const total = accounts.reduce((s, a) => s + (a.balance ?? 0), 0);
    const primary = accounts.find(a => a.is_primary);
    const selected_acc = accounts.find(a => a.id === selected);

    return (
        <>
            <SuccessMessage
                message={success}
                onDismiss={() => setSuccess(null)}
            />

            <ErrorMessage
                error={error}
                onDismiss={() => setError(null)}
            />
            
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
                                    <path d="M 0 20 C 0 10, 5 10, 10 10 C 20 10, 25 25, 40 25 L 240 25 C 255 25, 260 10, 270 10 C 275 10, 280 10, 280 20 L 280 120 C 280 155, 260 160, 240 160 L 40 160 C 20 160, 0 155, 0 120 Z" fill="#1e341e" />
                                    <path d="M 8 22 C 8 16, 12 16, 15 16 C 23 16, 27 29, 40 29 L 240 29 C 253 29, 257 16, 265 16 C 268 16, 272 16, 272 22 L 272 120 C 272 150, 255 152, 240 152 L 40 152 C 25 152, 8 152, 8 120 Z" stroke="#3d5635" strokeWidth="1.5" strokeDasharray="6 4" />
                                </svg>
                                <div className="pocket-content">
                                    <div style={{position: "relative", height: "24px", width: "100%"}}>
                                        <div className="balance-stars">******</div>
                                        <div className="balance-real">{fmt(total)}</div>
                                    </div>
                                    <div style={{color: "#698263", fontSize: "12px", fontWeight: 500}}>Hover To View Total Balance</div>
                                    <div className="eye-icon-wrapper">
                                        <svg className="eye-icon eye-slash" width="20" height="20" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                            <circle cx="12" cy="12" r="3"></circle>
                                            <line x1="3" y1="3" x2="21" y2="21"></line>
                                        </svg>
                                        <svg className="eye-icon eye-open" style={{opacity: 0}} width="20" height="20" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                            <button className="drawer-btn" onClick={() => setCardsFor(selected_acc)}>
                                <i className="ti ti-credit-card" /> Cards
                                {selected_acc.card_count > 0 && (
                                    <span className="drawer-badge">{selected_acc.card_count}</span>
                                )}
                            </button>
                            <button className="drawer-btn" onClick={() => { setEditingAccount(selected_acc); setMode("edit"); }}>
                                <i className="ti ti-pencil-alt2" /> Edit
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
        </>
    );
}

function CardsPanel({ account, onBack }) {
    const { call } = useApi();
    const [cards, setCards] = useState(null);
    const [creating, setCreating] = useState(false);
    const [editing, setEditing] = useState(null);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const load = useCallback(async () => {
        const res = await call(`/api/accounts/${account.id}/cards`);
        setCards(Array.isArray(res) ? res : []);
    }, [account.id]);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        if (!success) return;

        const timer = setTimeout(() => {
            setSuccess(null);
        }, 3000);

        return () => clearTimeout(timer);
    }, [success]);

    useEffect(() => {
        if (!error) return;

        const timer = setTimeout(() => {
            setError(null);
        }, 5000);

        return () => clearTimeout(timer);
    }, [error]);


    async function addCard(data) {
        const res = await call(`/api/accounts/${account.id}/cards`, {
            method: "POST",
            body: JSON.stringify(data),
        });
        if (res?.error) { 
            setError(res.error); 
            return; 
        }
        setSuccess("Card added successfully.");
        setCreating(false);
        setError(null);
        load();
    }

    async function deleteCard(cardId) {
        await call(`/api/accounts/${account.id}/cards/${cardId}/delete`, { method: "DELETE" });
        setSuccess("Card removed.");
        load();
    }

    async function setDefaultCard(cardId) {
        const res = await call(`/api/accounts/${account.id}/cards/${cardId}/default`, { method: "POST" });
        if (res?.error) { setError(res.error); return; }
        setSuccess("Default card updated.");
        load();
    }

    if (creating) return (
        <CardForm
            currency={account.currency}
            onSubmit={addCard}
            onCancel={() => { setCreating(false); setError(null); }}
            error={error}
        />
    );

    return (
        <>
            <SuccessMessage
                message={success}
                onDismiss={() => setSuccess(null)}
            />

            <ErrorMessage
                error={error}
                onDismiss={() => setError(null)}
            />
            
            <div className="cards-panel">
                <div className="cards-panel-header">
                    <button className="fin-btn" onClick={onBack}>
                        <i className="ti ti-arrow-left" /> Back
                    </button>
                    <div>
                        <h2>{account.name}</h2>
                        <p className="muted">{fmt(account.balance)} · {account.currency}</p>
                    </div>
                    <button className="add-btn" onClick={() => setCreating(true)}>
                        <i className="ti ti-plus" /> Add card
                    </button>
                </div>

                {error && <p className="fin-error">{error}</p>}

                {!cards ? (
                    <p className="muted loading-text">Loading cards…</p>
                ) : cards.length === 0 ? (
                    <div className="empty-state">
                        <i className="ti ti-credit-card-off" />
                        <p>No cards linked to this account</p>
                        <button className="add-btn" onClick={() => setCreating(true)}>Add a card</button>
                    </div>
                ) : (
                    <div className="linked-cards-list">
                        {cards.map(card => (
                            <div key={card.id} className="linked-card-row">
                                <div className="linked-card-icon" >
                                    <i className={`ti ${card.is_card ? "ti-credit-card" : "ti-building-bank"}`} />
                                </div>
                                <div className="linked-card-info">
                                    <div className="linked-card-name-row">
                                        <span className="linked-card-provider">{card.provider ?? "Card"}</span>
                                        {card.is_default && (
                                            <span className="default-card-badge">
                                                <i className="ti ti-star-filled" /> Default
                                            </span>
                                        )}
                                    </div>
                                    <span className="muted linked-card-num">
                                        {card.is_card
                                            ? `•••• •••• •••• ${card.last4 ?? "????"}  `
                                            : `Account: ${card.accountnumber_masked ?? "—"}`
                                        }
                                    </span>
                                    {card.expires_at && (
                                        <span className="muted linked-card-exp">
                                            Expires {new Date(card.expires_at).toLocaleDateString("en-US", { month: "2-digit", year: "2-digit" })}
                                        </span>
                                    )}
                                </div>
                                <span className="linked-card-currency">{card.currency}</span>
                                {!card.is_default && (
                                    <button className="drawer-btn" onClick={() => setDefaultCard(card.id)} title="Set as default">
                                        <i className="ti ti-star" />
                                    </button>
                                )}
                                <button className="drawer-btn danger" onClick={() => deleteCard(card.id)}>
                                    <i className="ti ti-trash" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}

export function ErrorMessage({ error, onDismiss }) {
    if (!error) return null;

    return (
        <div className="error-banner">
            <div className="error-content">
                <i className="ti ti-alert-circle" />
                <div className="error-text">
                    <p className="error-title">Error</p>
                    <p className="error-message">{error}</p>
                </div>
            </div>
            {onDismiss && (
                <button className="error-dismiss" onClick={onDismiss}>
                    <i className="ti ti-x" />
                </button>
            )}
        </div>
    );
}


export function SuccessMessage({ message, onDismiss }) {
    if (!message) return null;

    return (
        <div className="success-banner">
            <div className="success-content">
                <i className="ti ti-check-circle" />
                <div className="success-text">
                    <p className="success-title">Success</p>
                    <p className="success-message">{message}</p>
                </div>
            </div>
            {onDismiss && (
                <button className="success-dismiss" onClick={onDismiss}>
                    <i className="ti ti-x" />
                </button>
            )}
        </div>
    );
}


function CardForm({ currency, onSubmit, onCancel, error }) {
    const [isCard, setIsCard] = useState(true);
    const [provider, setProvider] = useState("");
    const [cardnumber, setCardnumber] = useState("");
    const [securitycode, setSecuritycode] = useState("");
    const [expiresMonth, setExpiresMonth] = useState("");
    const [expiresYear, setExpiresYear] = useState("");
    const [accountnumber, setAccountnumber] = useState("");
    const [cur, setCur] = useState(currency ?? "USD");
    const [validationErrors, setValidationErrors] = useState({});

    function validateForm() {
        const errors = {};

        if (!provider.trim()) {
            errors.provider = "Provider is required";
        }

        if (isCard) {
            const cleanCardNumber = cardnumber.replace(/\s/g, "");
            if (cleanCardNumber.length < 12) {
                errors.cardnumber = "Card number must be at least 12 digits";
            }
            }
            if (expiresMonth || expiresYear) {
                if (!expiresMonth || !expiresYear) {
                    errors.expires = "Both month and year are required";
                } else if (Number(expiresMonth) < 1 || Number(expiresMonth) > 12) {
                    errors.expires = "Month must be between 01 and 12";
                }
        } else {
            const cleanAccountNumber = accountnumber.trim();
            if (cleanAccountNumber.length < 8) {
                errors.accountnumber = "Account number must be at least 8 characters";
            }
        }

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    }

    function handleSubmit() {
        if (!validateForm()) return;

        const expires_at = isCard && expiresMonth && expiresYear
            ? (() => {
                const fullYear = Number(`20${expiresYear}`);
                const month = Number(expiresMonth);
                const lastDay = new Date(fullYear, month, 0).getDate();
                const expDate = new Date(fullYear, month - 1, lastDay, 23, 59, 59);
                return expDate.toISOString().split('.')[0];
            })()
            : null;

        onSubmit({
            is_card: isCard,
            provider,
            cardnumber: isCard ? cardnumber.replace(/\s/g, "") : null,
            securitycode,
            expires_at,
            accountnumber: !isCard ? accountnumber : null,
            currency: cur,
        });
    }

    return (
        <div className="account-form-wrap">
            <div className="account-form">
                <h2>Add card / account</h2>

                {error && (
                    <div className="form-error-banner">
                        <i className="ti ti-alert-circle" />
                        <span>{error}</span>
                    </div>
                )}

                <div className="card-type-toggle">
                    <button
                        className={`card-type-btn ${isCard ? "active" : ""}`}
                        onClick={() => { setIsCard(true); setValidationErrors({}); }}
                    >
                        <i className="ti ti-credit-card" /> Physical card
                    </button>
                    <button
                        className={`card-type-btn ${!isCard ? "active" : ""}`}
                        onClick={() => { setIsCard(false); setValidationErrors({}); }}
                    >
                        <i className="ti ti-building-bank" /> Account number
                    </button>
                </div>

                <div className="form-grid">                    
                    <div className="form-field">
                        <label>Currency</label>
                        <select value={cur} onChange={e => setCur(e.target.value)}>
                            {["USD","EUR","GBP","NOK","SEK","DKK"].map(c => <option key={c}>{c}</option>)}
                        </select>
                    </div>

                    {isCard ? (
                        <>
                            <div className={`form-field ${validationErrors.provider ? "error" : ""}`}>
                                <label>Provider</label>
                                <input 
                                    placeholder="e.g. Visa, Mastercard" 
                                    value={provider} 
                                    onChange={e => setProvider(e.target.value)} 
                                />
                                {validationErrors.provider && (
                                    <p className="field-error">{validationErrors.provider}</p>
                                )}
                            </div>
                            <div className={`form-field full ${validationErrors.cardnumber ? "error" : ""}`}>
                                <label>Card number</label>
                                <input
                                    placeholder="1234 5678 9012 3456"
                                    maxLength={19}
                                    value={cardnumber}
                                    onChange={e => setCardnumber(e.target.value.replace(/[^\d\s]/g, ""))}
                                />
                                {validationErrors.cardnumber && (
                                    <p className="field-error">{validationErrors.cardnumber}</p>
                                )}
                            </div>

                            <div className={`form-field ${validationErrors.securitycode ? "error" : ""}`}>
                                <label>CVV / Security code</label>
                                <input
                                    placeholder="123"
                                    maxLength={4}
                                    value={securitycode}
                                    onChange={e => setSecuritycode(e.target.value.replace(/\D/g, ""))}
                                />
                                {validationErrors.securitycode && (
                                    <p className="field-error">{validationErrors.securitycode}</p>
                                )}
                            </div>
                            <div className={`form-field ${validationErrors.expires ? "error" : ""}`}>
                                <label>Expires (MM / YY)</label>
                                <div style={{ display: "flex", gap: "0.5rem" }}>
                                    <input 
                                        placeholder="MM" 
                                        maxLength={2} 
                                        value={expiresMonth} 
                                        onChange={e => setExpiresMonth(e.target.value.replace(/\D/g, ""))} 
                                        style={{ width: "4rem" }} 
                                    />
                                    <input 
                                        placeholder="YY" 
                                        maxLength={2} 
                                        value={expiresYear}  
                                        onChange={e => setExpiresYear(e.target.value.replace(/\D/g, ""))}  
                                        style={{ width: "4rem" }} 
                                    />
                                </div>
                                {validationErrors.expires && (
                                    <p className="field-error">{validationErrors.expires}</p>
                                )}
                            </div>
                        </>
                    ) : (
                            <>
                            <div className={`form-field ${validationErrors.provider ? "error" : ""}`}>
                                <label>Provider</label>
                                <input 
                                    placeholder="e.g. Visa, Mastercard" 
                                    value={provider} 
                                    onChange={e => setProvider(e.target.value)} 
                                />
                                {validationErrors.provider && (
                                    <p className="field-error">{validationErrors.provider}</p>
                                )}
                            </div>
                            <div className={`form-field full ${validationErrors.accountnumber ? "error" : ""}`}>
                                <label>Account number</label>
                                <input 
                                    placeholder="e.g. NO12 3456 7890" 
                                    value={accountnumber} 
                                    onChange={e => setAccountnumber(e.target.value)} 
                                />
                                {validationErrors.accountnumber && (
                                    <p className="field-error">{validationErrors.accountnumber}</p>
                                )}
                            </div>
                        </>
                    )}
                </div>

                <div className="form-actions">
                    <button className="fin-btn" onClick={onCancel}>Cancel</button>
                    <button className="fin-btn primary" onClick={handleSubmit}>Add</button>
                </div>
            </div>
        </div>
    );
}


function AccountForm({ initial = {}, onSubmit, onCancel, error }) {
    const isEdit = Boolean(initial.id);

    const [name, setName] = useState(initial.name ?? "");
    const [currency, setCurrency] = useState(initial.currency ?? "USD");

    const [isCard, setIsCard] = useState(true);
    const [provider, setProvider] = useState("");
    const [cardnumber, setCardnumber] = useState("");
    const [securitycode, setSecuritycode] = useState("");
    const [expiresMonth, setExpiresMonth] = useState("");
    const [expiresYear, setExpiresYear] = useState("");
    const [accountnumber, setAccountnumber] = useState("");

    const [validationErrors, setValidationErrors] = useState({});

    function validate() {
        const errs = {};
        if (!name.trim()) errs.name = "Account name is required";

        if (!isEdit) {
            if (!provider.trim()) errs.provider = "Provider is required";
            if (isCard) {
                const clean = cardnumber.replace(/\s/g, "");
                if (clean.length < 12) errs.cardnumber = "Card number must be at least 12 digits";
                    if ((expiresMonth || expiresYear) && (!expiresMonth || !expiresYear))
                    errs.expires = "Both month and year are required";
                if (expiresMonth && (Number(expiresMonth) < 1 || Number(expiresMonth) > 12))
                    errs.expires = "Month must be 01–12";
            } else {
                if (accountnumber.trim().length < 8)
                    errs.accountnumber = "Account number must be at least 8 characters";
            }
        }

        setValidationErrors(errs);
        return Object.keys(errs).length === 0;
    }

    function handleSubmit() {
        if (!validate()) return;

        const payload = { name: name.trim(), currency };

        if (!isEdit) {
            const expires_at = isCard && expiresMonth && expiresYear
                ? (() => {
                    const fullYear = Number(`20${expiresYear}`);
                    const month = Number(expiresMonth);
                    const lastDay = new Date(fullYear, month, 0).getDate();
                    return new Date(fullYear, month - 1, lastDay, 23, 59, 59).toISOString().split(".")[0];
                })()
                : null;

            payload.card = {
                is_card: isCard,
                provider: provider.trim(),
                cardnumber: isCard ? cardnumber.replace(/\s/g, "") : null,
                securitycode,
                expires_at,
                accountnumber: !isCard ? accountnumber.trim() : null,
                currency,
            };
        }

        onSubmit(payload);
    }

    return (
        <div className="account-form-wrap">
            <div className="account-form">
                <h2>{isEdit ? "Edit account" : "New account"}</h2>

                {error && (
                    <div className="form-error-banner">
                        <i className="ti ti-alert-circle" />
                        <span>{error}</span>
                    </div>
                )}

                <p className="form-section-label">Account details</p>
                <div className="form-grid">
                    <div className={`form-field ${validationErrors.name ? "error" : ""}`}>
                        <label>Account name</label>
                        <input
                            placeholder="e.g. Main checking"
                            value={name}
                            onChange={e => setName(e.target.value)}
                        />
                        {validationErrors.name && <p className="field-error">{validationErrors.name}</p>}
                    </div>
                    <div className="form-field">
                        <label>Currency</label>
                        <select value={currency} onChange={e => setCurrency(e.target.value)}>
                            {["USD","EUR","GBP","NOK","SEK","DKK"].map(c => <option key={c}>{c}</option>)}
                        </select>
                    </div>
                </div>

                {!isEdit && (
                    <>
                        <p className="form-section-label">Default card</p>

                        <div className="card-type-toggle">
                            <button
                                className={`card-type-btn ${isCard ? "active" : ""}`}
                                onClick={() => { setIsCard(true); setValidationErrors({}); }}
                            >
                                <i className="ti ti-credit-card" /> Physical card
                            </button>
                            <button
                                className={`card-type-btn ${!isCard ? "active" : ""}`}
                                onClick={() => { setIsCard(false); setValidationErrors({}); }}
                            >
                                <i className="ti ti-building-bank" /> Account number
                            </button>
                        </div>

                        <div className="form-grid">
                            {isCard ? (
                                <>
                                    <div className={`form-field ${validationErrors.provider ? "error" : ""}`}>
                                        <label>Card Provider</label>
                                        <input
                                            placeholder="e.g. Visa, Mastercard"
                                            value={provider}
                                            onChange={e => setProvider(e.target.value)}
                                        />
                                        {validationErrors.provider && <p className="field-error">{validationErrors.provider}</p>}
                                    </div>
                                    <div className={`form-field full ${validationErrors.cardnumber ? "error" : ""}`}>
                                        <label>Card number</label>
                                        <input
                                            placeholder="1234 5678 9012 3456"
                                            maxLength={19}
                                            value={cardnumber}
                                            onChange={e => setCardnumber(e.target.value.replace(/[^\d\s]/g, ""))}
                                        />
                                        {validationErrors.cardnumber && <p className="field-error">{validationErrors.cardnumber}</p>}
                                    </div>
                                    <div className={`form-field ${validationErrors.securitycode ? "error" : ""}`}>
                                        <label>CVV / Security code</label>
                                        <input
                                            placeholder="123"
                                            maxLength={4}
                                            value={securitycode}
                                            onChange={e => setSecuritycode(e.target.value.replace(/\D/g, ""))}
                                        />
                                        {validationErrors.securitycode && (
                                            <p className="field-error">{validationErrors.securitycode}</p>
                                        )}
                                    </div>
                                    <div className={`form-field ${validationErrors.expires ? "error" : ""}`}>
                                        <label>Expires (MM / YY)</label>
                                        <div style={{ display: "flex", gap: "0.5rem" }}>
                                            <input 
                                                placeholder="MM" 
                                                maxLength={2} 
                                                value={expiresMonth} 
                                                onChange={e => setExpiresMonth(e.target.value.replace(/\D/g, ""))} 
                                                style={{ width: "4rem" }} 
                                            />
                                            <input 
                                                placeholder="YY" 
                                                maxLength={2} 
                                                value={expiresYear}  
                                                onChange={e => setExpiresYear(e.target.value.replace(/\D/g, ""))}  
                                                style={{ width: "4rem" }} 
                                            />
                                        </div>
                                        {validationErrors.expires && (
                                            <p className="field-error">{validationErrors.expires}</p>
                                        )}
                                    </div>
                                </>
                            ) : (
                                    <>
                                    <div className={`form-field ${validationErrors.provider ? "error" : ""}`}>
                                        <label>Bank Provider</label>
                                        <input
                                            placeholder="e.g. DNB, Wells Fargo"
                                            value={provider}
                                            onChange={e => setProvider(e.target.value)}
                                        />
                                        {validationErrors.provider && <p className="field-error">{validationErrors.provider}</p>}
                                    </div>
                                    <div className={`form-field full ${validationErrors.accountnumber ? "error" : ""}`}>
                                        <label>Account number</label>
                                        <input
                                            placeholder="e.g. NO12 3456 7890"
                                            value={accountnumber}
                                            onChange={e => setAccountnumber(e.target.value)}
                                        />
                                        {validationErrors.accountnumber && <p className="field-error">{validationErrors.accountnumber}</p>}
                                    </div>
                                </>
                            )}
                        </div>
                    </>
                )}

                <div className="form-actions">
                    <button className="fin-btn" onClick={onCancel}>Cancel</button>
                    <button className="fin-btn primary" onClick={handleSubmit}>
                        {isEdit ? "Save changes" : "Create account"}
                    </button>
                </div>
            </div>
        </div>
    );
}


function TransactionsTab() {
    const { call } = useApi();
    const [txns, setTxns] = useState(null);
    const [filter, setFilter] = useState("all");
    const [error, setError] = useState(null);

    useEffect(() => {
        call("/api/transactions")
            .then(data => setTxns(Array.isArray(data) ? data : []))
            .catch(() => setError("Could not load transactions."));
    }, []);

    if (error) return <p className="muted">{error}</p>;
    if (!txns) return <p className="muted loading-text">Loading…</p>;

    const categories = ["all", ...new Set(txns.map(t => t.category).filter(Boolean))];
    const visible    = filter === "all" ? txns : txns.filter(t => t.category === filter);

    return (
        <div className="txns-tab">
            <div className="txns-filters">
                {categories.map(c => (
                    <button key={c} className={`filter-chip ${filter === c ? "active" : ""}`} onClick={() => setFilter(c)}>
                        {c}
                    </button>
                ))}
            </div>
            {visible.length === 0 ? (
                <div className="empty-state"><i className="ti ti-receipt-off" /><p>No transactions</p></div>
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
                background: pal.bg, color: pal.text,
                bottom: `${20 + idx * 25}px`,
                zIndex: isHoveringCard ? 100 : 40 - (idx * 5),
                animationDelay: `${idx * 0.1}s`,
                transitionDelay: isHoveringCard ? "0s" : "",
                transform: isHovered
                    ? `translateY(-${30 + (idx * 20)}px) rotate(${idx % 2 ? "" : "-"}${4 - idx}deg)`
                    : "translateY(0px) rotate(0deg)",
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
                    <span className="card-provider">{acc.default_card?.provider ?? "Account"}</span>
                    <div className="card-chip" />
                </div>
                <div className="card-number">
                    <span>••••</span><span>••••</span><span>••••</span>
                    <span>{acc.default_card?.last4 ?? "????"}  </span>
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
            {acc.card_count > 0 && (
                <span className="card-count-badge" style={{ background: pal.accent, color: "#111" }}>
                    <i className="ti ti-credit-card" /> {acc.card_count}
                </span>
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