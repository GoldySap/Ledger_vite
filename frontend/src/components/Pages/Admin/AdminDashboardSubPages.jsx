import { useState, useEffect, useCallback } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useApi } from "../../API/useApi";
import { useAuth } from "../../Auth/AuthContext";
import "./admin.css";

export function AdminOverview() {
    const { call } = useApi();
    const [stats, setStats] = useState(null);

    useEffect(() => {
        call("/api/admin/stats").then(d => d && setStats(d));
    }, []);

    if (!stats) return <PageShell title="Overview"><p className="adm-muted">Loading…</p></PageShell>;

    return (
        <PageShell title="Overview" sub="System health at a glance">
            <div className="adm-kpi-row">
                <KpiCard icon="ti-users" color="blue"   label="Total users" value={stats.total_users} />
                <KpiCard icon="ti-user-check" color="green"  label="Active users" value={stats.active_users} />
                <KpiCard icon="ti-user-plus" color="purple" label="New this week" value={stats.new_this_week} />
                <KpiCard icon="ti-receipt" color="amber"  label="Transactions" value={stats.total_transactions} />
                <KpiCard icon="ti-message-question" color="red" label="Pending questions" value={stats.pending_questions} />
            </div>

            <div className="adm-grid-2">
                <div className="adm-card">
                    <div className="adm-card-title">
                        <i className="ti ti-crown" /> Subscription breakdown
                    </div>
                    {stats.subscription_breakdown.map(s => (
                        <div key={s.label} className="adm-bar-row">
                            <span className="adm-bar-label">{s.label}</span>
                            <div className="adm-bar-track">
                                <div
                                    className="adm-bar-fill"
                                    style={{
                                        width: `${Math.min(100, (s.count / stats.total_users) * 100)}%`,
                                    }}
                                />
                            </div>
                            <span className="adm-bar-val">{s.count}</span>
                        </div>
                    ))}
                </div>

                <div className="adm-card">
                    <div className="adm-card-title">
                        <i className="ti ti-activity" /> Recent activity
                    </div>
                    <div className="adm-log-list">
                        {stats.recent_logs.map(l => (
                            <div key={l.id} className="adm-log-row">
                                <span className={`adm-dot ${l.status}`} />
                                <span className="adm-log-action">{l.action.replace(/_/g, " ")}</span>
                                <span className="adm-log-uid">uid {l.user_id}</span>
                                <span className="adm-log-time">{fmtTime(l.created_at)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </PageShell>
    );
}

export function Management() {
    const [tab, setTab] = useState("users");

    const tabs = [
        { id: "users", label: "Users", icon: "ti-users" },
        { id: "subscriptions", label: "Subscriptions", icon: "ti-crown" },
    ];

    return (
        <PageShell title="Management" sub="Manage users and subscription plans">
            <div className="adm-tabs">
                {tabs.map(t => (
                    <button
                        key={t.id}
                        className={`adm-tab ${tab === t.id ? "active" : ""}`}
                        onClick={() => setTab(t.id)}
                    >
                        <i className={`ti ${t.icon}`} /> {t.label}
                    </button>
                ))}
            </div>
            {tab === "users" && <UsersTab />}
            {tab === "subscriptions" && <SubscriptionsTab />}
        </PageShell>
    );
}

function UsersTab() {
    const { call } = useApi();
    const [users, setUsers] = useState([]);
    const [subs, setSubs] = useState([]);
    const [search, setSearch] = useState("");
    const [editing, setEditing] = useState(null);
    const [creating, setCreating] = useState(false);
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState(null);

    const load = useCallback(() => {
        call("/api/admin/users").then(res => res?.data && setUsers(res.data));
        call("/api/admin/subscriptions").then(res => res && setSubs(res));
    }, []);

    useEffect(() => { load(); }, [load]);

    async function saveUser(data) {
        setBusy(true); setMsg(null);
        const res = editing
            ? await call(`/api/admin/users/${editing.id}`, { method: "PUT", body: JSON.stringify(data) })
            : await call("/api/admin/users", { method: "POST", body: JSON.stringify(data) });
        setBusy(false);
        if (res?.msg) { setMsg({ text: res.msg, ok: true }); setEditing(null); setCreating(false); load(); }
        else setMsg({ text: res?.error ?? "Failed", ok: false });
    }

    async function deleteUser(id) {
        if (!confirm("Delete this user? This cannot be undone.")) return;
        await call(`/api/admin/users/${id}`, { method: "DELETE" });
        load();
    }

    const filtered = users.filter(u =>
        !search ||
        u.email?.toLowerCase().includes(search.toLowerCase()) ||
        String(u.id).includes(search)
    );

    return (
        <div>
            <div className="adm-toolbar">
                <div className="adm-search-wrap">
                    <i className="ti ti-search" />
                    <input
                        placeholder="Search by email or ID…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <button className="adm-btn primary" onClick={() => { setCreating(true); setEditing(null); }}>
                    <i className="ti ti-plus" /> New user
                </button>
            </div>

            {(creating || editing) && (
                <UserForm
                    initial={editing}
                    subs={subs}
                    busy={busy}
                    msg={msg}
                    onSubmit={saveUser}
                    onCancel={() => { setEditing(null); setCreating(false); setMsg(null); }}
                />
            )}

            <div className="adm-table-wrap">
                <table className="adm-table">
                    <thead>
                        <tr>
                            <th>ID</th><th>Email</th><th>Role</th>
                            <th>Subscription</th><th>Active</th><th>Created</th><th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map(u => (
                            <tr key={u.id}>
                                <td className="adm-muted">{u.id}</td>
                                <td>{u.email}</td>
                                <td><RoleBadge role={u.role} /></td>
                                <td>{u.subscription_label ?? `#${u.subscription_id}`}</td>
                                <td>
                                    <span className={`adm-status ${u.active ? "on" : "off"}`}>
                                        {u.active ? "Active" : "Inactive"}
                                    </span>
                                </td>
                                <td className="adm-muted">{fmtDate(u.created_at)}</td>
                                <td>
                                    <div className="adm-row-actions">
                                        <button className="adm-icon-btn" title="Edit" onClick={() => { setEditing(u); setCreating(false); setMsg(null); }}>
                                            <i className="ti ti-pencil-alt2" />
                                        </button>
                                        <button className="adm-icon-btn danger" title="Delete" onClick={() => deleteUser(u.id)}>
                                            <i className="ti ti-trash" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function UserForm({ initial, subs, busy, msg, onSubmit, onCancel }) {
    const [form, setForm] = useState({
        email:           initial?.email           ?? "",
        password:        "",
        role:            initial?.role            ?? "user",
        subscription_id: initial?.subscription_id ?? 1,
        active:          initial?.active          ?? true,
    });
    const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

    return (
        <div className="adm-form-card">
            <div className="adm-form-title">{initial ? "Edit user" : "Create user"}</div>
            <div className="adm-form-grid">
                <Field label="Email">
                    <input type="email" value={form.email} onChange={e => f("email", e.target.value)} />
                </Field>
                {!initial && (
                    <Field label="Password">
                        <input type="password" value={form.password} onChange={e => f("password", e.target.value)} />
                    </Field>
                )}
                <Field label="Role">
                    <select value={form.role} onChange={e => f("role", e.target.value)}>
                        <option value="user">user</option>
                        <option value="admin">admin</option>
                    </select>
                </Field>
                <Field label="Subscription">
                    <select value={form.subscription_id} onChange={e => f("subscription_id", Number(e.target.value))}>
                        {subs.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                </Field>
                <Field label="Active">
                    <label className="adm-toggle">
                        <input type="checkbox" checked={form.active} onChange={e => f("active", e.target.checked)} />
                        <span className="adm-toggle-track" />
                    </label>
                </Field>
            </div>
            {msg && <p className={`adm-msg ${msg.ok ? "ok" : "err"}`}>{msg.text}</p>}
            <div className="adm-form-actions">
                <button className="adm-btn" onClick={onCancel}>Cancel</button>
                <button className="adm-btn primary" onClick={() => onSubmit(form)} disabled={busy}>
                    {busy ? "Saving…" : initial ? "Save changes" : "Create user"}
                </button>
            </div>
        </div>
    );
}

function SubscriptionsTab() {
    const { call } = useApi();
    const [subs, setSubs] = useState([]);
    const [editing, setEditing] = useState(null);
    const [creating, setCreating] = useState(false);
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState(null);

    const load = useCallback(() => {
        call("/api/admin/subscriptions").then(res => res && setSubs(res));
    }, []);

    useEffect(() => { load(); }, [load]);

    async function saveSub(data) {
        setBusy(true); setMsg(null);
        const res = editing
            ? await call(`/api/admin/subscriptions/${editing.id}`, { method: "PUT", body: JSON.stringify(data) })
            : await call("/api/admin/subscriptions", { method: "POST", body: JSON.stringify(data) });
        setBusy(false);
        if (res?.msg) { setMsg({ text: res.msg, ok: true }); setEditing(null); setCreating(false); load(); }
        else setMsg({ text: res?.error ?? "Failed", ok: false });
    }

    async function deleteSub(id) {
        if (!confirm("Delete this subscription plan?")) return;
        await call(`/api/admin/subscriptions/${id}`, { method: "DELETE" });
        load();
    }

    return (
        <div>
            <div className="adm-toolbar">
                <button className="adm-btn primary" onClick={() => { setCreating(true); setEditing(null); }}>
                    <i className="ti ti-plus" /> New plan
                </button>
            </div>

            {(creating || editing) && (
                <SubForm
                    initial={editing}
                    busy={busy}
                    msg={msg}
                    onSubmit={saveSub}
                    onCancel={() => { setEditing(null); setCreating(false); setMsg(null); }}
                />
            )}

            <div className="adm-sub-grid">
                {subs.map(s => (
                    <div key={s.id} className="adm-sub-card">
                        <div className="adm-sub-card-header">
                            <div>
                                <div className="adm-sub-name">{s.label}</div>
                                <div className="adm-muted">${s.price}/mo · {s.user_count} users</div>
                            </div>
                            <div className="adm-row-actions">
                                <button className="adm-icon-btn" onClick={() => { setEditing(s); setCreating(false); }}>
                                    <i className="ti ti-pencil-alt2" />
                                </button>
                                <button className="adm-icon-btn danger" onClick={() => deleteSub(s.id)}>
                                    <i className="ti ti-trash" />
                                </button>
                            </div>
                        </div>
                        <div className="adm-access-grid">
                            {Object.entries(s.access ?? {}).map(([k, v]) => (
                                <div key={k} className="adm-access-row">
                                    <span className="adm-access-key">{k.replace(/_/g, " ")}</span>
                                    <span className={`adm-access-val ${v === true ? "yes" : v === false ? "no" : ""}`}>
                                        {typeof v === "boolean" ? (v ? "✓" : "✗") : v}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function SubForm({ initial, busy, msg, onSubmit, onCancel }) {
    const [form, setForm] = useState({
        label: initial?.label ?? "",
        price: initial?.price ?? 0,
        can_export_data: initial?.access?.can_export_data ?? false,
        has_finance_access: initial?.access?.has_finance_access ?? false,
        has_investment_access: initial?.access?.has_investment_access ?? false,
        has_analytics_access: initial?.access?.has_analytics_access ?? false,
        max_accounts: initial?.access?.max_accounts ?? 1,
        max_portfolio_transfer_rate: initial?.access?.max_portfolio_transfer_rate ?? 100,
    });
    const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

    const boolFields = [
        "can_export_data", "has_finance_access",
        "has_investment_access", "has_analytics_access",
    ];

    return (
        <div className="adm-form-card">
            <div className="adm-form-title">{initial ? "Edit plan" : "New plan"}</div>
            <div className="adm-form-grid">
                <Field label="Label">
                    <input value={form.label} onChange={e => f("label", e.target.value)} />
                </Field>
                <Field label="Price ($/mo)">
                    <input type="number" min="0" step="0.01" value={form.price} onChange={e => f("price", e.target.value)} />
                </Field>
                <Field label="Max accounts">
                    <input type="number" min="1" value={form.max_accounts} onChange={e => f("max_accounts", Number(e.target.value))} />
                </Field>
                <Field label="Transfer limit ($/mo)">
                    <input type="number" min="0" value={form.max_portfolio_transfer_rate} onChange={e => f("max_portfolio_transfer_rate", Number(e.target.value))} />
                </Field>
                {boolFields.map(k => (
                    <Field key={k} label={k.replace(/_/g, " ")}>
                        <label className="adm-toggle">
                            <input type="checkbox" checked={form[k]} onChange={e => f(k, e.target.checked)} />
                            <span className="adm-toggle-track" />
                        </label>
                    </Field>
                ))}
            </div>
            {msg && <p className={`adm-msg ${msg.ok ? "ok" : "err"}`}>{msg.text}</p>}
            <div className="adm-form-actions">
                <button className="adm-btn" onClick={onCancel}>Cancel</button>
                <button className="adm-btn primary" onClick={() => onSubmit(form)} disabled={busy}>
                    {busy ? "Saving…" : initial ? "Save changes" : "Create plan"}
                </button>
            </div>
        </div>
    );
}

export function Logs() {
    const { call } = useApi();
    const [logs, setLogs] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [filters, setFilters] = useState({ action: "", status: "", user_id: "" });
    const [loading, setLoading] = useState(false);

    const load = useCallback(() => {
        setLoading(true);
        const params = new URLSearchParams({ page, per_page: 50 });
        if (filters.action)  params.set("action",  filters.action);
        if (filters.status)  params.set("status",  filters.status);
        if (filters.user_id) params.set("user_id", filters.user_id);
        call(`/api/admin/audit-logs?${params}`)
            .then(res => {
                if (res) {
                    setLogs(res.logs);
                    setTotal(res.total);
                    setPages(res.pages);
                }
            })
            .finally(() => setLoading(false));
    }, [page, filters]);

    useEffect(() => { load(); }, [load]);

    return (
        <PageShell title="Audit Logs" sub={`${total} total events`}>
            <div className="adm-toolbar wrap">
                <div className="adm-search-wrap">
                    <i className="ti ti-filter" />
                    <input
                        placeholder="Filter by action…"
                        value={filters.action}
                        onChange={e => { setFilters(p => ({ ...p, action: e.target.value })); setPage(1); }}
                    />
                </div>
                <select
                    className="adm-select"
                    value={filters.status}
                    onChange={e => { setFilters(p => ({ ...p, status: e.target.value })); setPage(1); }}
                >
                    <option value="">All statuses</option>
                    <option value="success">Success</option>
                    <option value="failed">Failed</option>
                </select>
                <div className="adm-search-wrap" style={{ maxWidth: "9rem" }}>
                    <i className="ti ti-user" />
                    <input
                        placeholder="User ID…"
                        value={filters.user_id}
                        onChange={e => { setFilters(p => ({ ...p, user_id: e.target.value })); setPage(1); }}
                    />
                </div>
            </div>

            <div className="adm-table-wrap">
                <table className="adm-table">
                    <thead>
                        <tr>
                            <th>ID</th><th>User</th><th>Action</th>
                            <th>Status</th><th>IP</th><th>Time</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={6} style={{ textAlign: "center", padding: "2rem" }} className="adm-muted">Loading…</td></tr>
                        ) : logs.map(l => (
                            <tr key={l.id}>
                                <td className="adm-muted">{l.id}</td>
                                <td className="adm-muted">{l.user_id}</td>
                                <td>{l.action?.replace(/_/g, " ")}</td>
                                <td><span className={`adm-dot ${l.status}`} style={{ marginRight: "0.4rem" }} />{l.status}</td>
                                <td className="adm-muted">{l.ip_address ?? "—"}</td>
                                <td className="adm-muted">{fmtTime(l.created_at)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {pages > 1 && (
                <div className="adm-pagination">
                    <button className="adm-btn sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                        <i className="ti ti-chevron-left" />
                    </button>
                    <span className="adm-muted">Page {page} of {pages}</span>
                    <button className="adm-btn sm" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>
                        <i className="ti ti-chevron-right" />
                    </button>
                </div>
            )}
        </PageShell>
    );
}

export function AdminFaq() {
    const [tab, setTab] = useState("questions");

    const tabs = [
        { id: "questions", label: "User questions", icon: "ti-message-question" },
        { id: "items", label: "Published FAQ", icon: "ti-list" },
    ];

    return (
        <PageShell title="FAQ Management" sub="Handle user questions and published answers">
            <div className="adm-tabs">
                {tabs.map(t => (
                    <button
                        key={t.id}
                        className={`adm-tab ${tab === t.id ? "active" : ""}`}
                        onClick={() => setTab(t.id)}
                    >
                        <i className={`ti ${t.icon}`} /> {t.label}
                    </button>
                ))}
            </div>
            {tab === "questions" && <UserQuestionsTab />}
            {tab === "items" && <FaqItemsTab />}
        </PageShell>
    );
}

function UserQuestionsTab() {
    const { call } = useApi();
    const [questions, setQuestions] = useState(null);
    const [filter, setFilter] = useState("pending");

    const load = useCallback(() => {
        const params = filter ? `?status=${filter}` : "";
        call(`/api/admin/faq/questions${params}`).then(res => res && setQuestions(res));
    }, [filter]);

    useEffect(() => { load(); }, [load]);

    async function setStatus(id, status) {
        await call(`/api/admin/faq/questions/${id}`, {
            method: "PUT",
            body: JSON.stringify({ status }),
        });
        load();
    }

    return (
        <div>
            <div className="adm-toolbar">
                {["pending", "answered", "closed", ""].map(s => (
                    <button
                        key={s || "all"}
                        className={`adm-btn sm ${filter === s ? "primary" : ""}`}
                        onClick={() => setFilter(s)}
                    >
                        {s || "All"}
                    </button>
                ))}
            </div>

            {!questions ? (
                <p className="adm-muted">Loading…</p>
            ) : questions.length === 0 ? (
                <div className="adm-empty">
                    <i className="ti ti-inbox" />
                    <p>No {filter || ""} questions</p>
                </div>
            ) : (
                <div className="adm-q-list">
                    {questions.map(q => (
                        <div key={q.id} className={`adm-q-card status-${q.status}`}>
                            <div className="adm-q-meta">
                                <span className="adm-q-name">{q.name ?? "Anonymous"}</span>
                                <span className="adm-muted">{q.email ?? "—"}</span>
                                <span className="adm-muted">{fmtTime(q.created_at)}</span>
                                <span className={`adm-q-status ${q.status}`}>{q.status}</span>
                            </div>
                            <p className="adm-q-text">{q.question}</p>
                            <div className="adm-q-actions">
                                {q.status !== "answered" && (
                                    <button className="adm-btn sm primary" onClick={() => setStatus(q.id, "answered")}>
                                        <i className="ti ti-check" /> Mark answered
                                    </button>
                                )}
                                {q.status !== "closed" && (
                                    <button className="adm-btn sm" onClick={() => setStatus(q.id, "closed")}>
                                        <i className="ti ti-x" /> Close
                                    </button>
                                )}
                                {q.status !== "pending" && (
                                    <button className="adm-btn sm" onClick={() => setStatus(q.id, "pending")}>
                                        <i className="ti ti-refresh" /> Reopen
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function FaqItemsTab() {
    const { call }                     = useApi();
    const [items,   setItems]          = useState(null);
    const [editing, setEditing]        = useState(null);
    const [creating, setCreating]      = useState(false);
    const [busy,    setBusy]           = useState(false);
    const [msg,     setMsg]            = useState(null);

    const CATS = ["account","security","privacy","finance","investments","subscription"];

    const load = useCallback(() => {
        call("/api/admin/faq/items").then(res => res && setItems(res));
    }, []);

    useEffect(() => { load(); }, [load]);

    async function saveItem(data) {
        setBusy(true); setMsg(null);
        const res = editing
            ? await call(`/api/admin/faq/items/${editing.id}`, { method: "PUT",    body: JSON.stringify(data) })
            : await call("/api/admin/faq/items",               { method: "POST",   body: JSON.stringify(data) });
        setBusy(false);
        if (res?.id || res?.question) { setEditing(null); setCreating(false); load(); }
        else setMsg({ text: res?.error ?? "Failed", ok: false });
    }

    async function deleteItem(id) {
        if (!confirm("Delete this FAQ item?")) return;
        await call(`/api/admin/faq/items/${id}`, { method: "DELETE" });
        load();
    }

    async function togglePublished(item) {
        await call(`/api/admin/faq/items/${item.id}`, {
            method: "PUT",
            body: JSON.stringify({ published: !item.published }),
        });
        load();
    }

    return (
        <div>
            <div className="adm-toolbar">
                <button className="adm-btn primary" onClick={() => { setCreating(true); setEditing(null); }}>
                    <i className="ti ti-plus" /> New FAQ item
                </button>
            </div>

            {(creating || editing) && (
                <FaqItemForm
                    initial={editing}
                    categories={CATS}
                    busy={busy}
                    msg={msg}
                    onSubmit={saveItem}
                    onCancel={() => { setEditing(null); setCreating(false); setMsg(null); }}
                />
            )}

            {!items ? (
                <p className="adm-muted">Loading…</p>
            ) : (
                <div className="adm-faq-list">
                    {items.map(item => (
                        <div key={item.id} className={`adm-faq-item ${!item.published ? "unpublished" : ""}`}>
                            <div className="adm-faq-item-header">
                                <span className="adm-faq-cat">{item.category}</span>
                                <span className="adm-faq-q">{item.question}</span>
                            </div>
                            <p className="adm-faq-a adm-muted">{item.answer.slice(0, 120)}{item.answer.length > 120 ? "…" : ""}</p>
                            <div className="adm-q-actions">
                                <button
                                    className={`adm-btn sm ${item.published ? "" : "primary"}`}
                                    onClick={() => togglePublished(item)}
                                >
                                    <i className={`ti ${item.published ? "ti-eye-off" : "ti-eye"}`} />
                                    {item.published ? "Unpublish" : "Publish"}
                                </button>
                                <button className="adm-btn sm" onClick={() => { setEditing(item); setCreating(false); }}>
                                    <i className="ti ti-pencil-alt2" />    
                                </button>
                                <button className="adm-btn sm danger" onClick={() => deleteItem(item.id)}>
                                    <i className="ti ti-trash" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function FaqItemForm({ initial, categories, busy, msg, onSubmit, onCancel }) {
    const [form, setForm] = useState({
        category:   initial?.category   ?? "account",
        question:   initial?.question   ?? "",
        answer:     initial?.answer     ?? "",
        sort_order: initial?.sort_order ?? 0,
        published:  initial?.published  ?? true,
    });
    const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

    return (
        <div className="adm-form-card">
            <div className="adm-form-title">{initial ? "Edit FAQ item" : "New FAQ item"}</div>
            <div className="adm-form-grid col1">
                <Field label="Category">
                    <select value={form.category} onChange={e => f("category", e.target.value)}>
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </Field>
                <Field label="Question">
                    <input value={form.question} onChange={e => f("question", e.target.value)} />
                </Field>
                <Field label="Answer">
                    <textarea
                        rows={4}
                        style={{ resize: "vertical", fontFamily: "inherit", lineHeight: 1.5 }}
                        value={form.answer}
                        onChange={e => f("answer", e.target.value)}
                    />
                </Field>
                <div style={{ display: "flex", gap: "1rem" }}>
                    <Field label="Sort order">
                        <input type="number" value={form.sort_order} onChange={e => f("sort_order", Number(e.target.value))} style={{ width: "6rem" }} />
                    </Field>
                    <Field label="Published">
                        <label className="adm-toggle" style={{ marginTop: "0.5rem" }}>
                            <input type="checkbox" checked={form.published} onChange={e => f("published", e.target.checked)} />
                            <span className="adm-toggle-track" />
                        </label>
                    </Field>
                </div>
            </div>
            {msg && <p className={`adm-msg ${msg.ok ? "ok" : "err"}`}>{msg.text}</p>}
            <div className="adm-form-actions">
                <button className="adm-btn" onClick={onCancel}>Cancel</button>
                <button className="adm-btn primary" onClick={() => onSubmit(form)} disabled={busy}>
                    {busy ? "Saving…" : initial ? "Save changes" : "Create item"}
                </button>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   ANALYTICS placeholder (reuse your existing AnalyticsPage)
═══════════════════════════════════════════════════════════════ */

export function AdminAnalytics() {
    return (
        <PageShell title="Analytics" sub="Platform-wide statistics">
            <p className="adm-muted">Connect your analytics component here.</p>
        </PageShell>
    );
}

/* ═══════════════════════════════════════════════════════════════
   SHARED PRIMITIVES
═══════════════════════════════════════════════════════════════ */

function PageShell({ title, sub, children }) {
    return (
        <div className="adm-page">
            <div className="adm-page-header">
                <h1>{title}</h1>
                {sub && <p className="adm-muted">{sub}</p>}
            </div>
            {children}
        </div>
    );
}

function KpiCard({ icon, color, label, value }) {
    return (
        <div className={`adm-kpi adm-kpi-${color}`}>
            <i className={`ti ${icon} adm-kpi-icon`} />
            <div className="adm-kpi-val">{value ?? "—"}</div>
            <div className="adm-kpi-label">{label}</div>
        </div>
    );
}

function RoleBadge({ role }) {
    return (
        <span className={`adm-role-badge ${role}`}>{role}</span>
    );
}

function Field({ label, children }) {
    return (
        <div className="adm-field">
            <label>{label}</label>
            {children}
        </div>
    );
}

function fmtDate(s) {
    if (!s) return "—";
    return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtTime(s) {
    if (!s) return "—";
    return new Date(s).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}