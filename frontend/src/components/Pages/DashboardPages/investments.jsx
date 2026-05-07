import { useState, useEffect, useRef, useCallback } from "react";
import { useApi } from "../../API/useApi";
import "./investments.css";

const API = "/api/investment";

export default function InvestmentsPage() {
    const [tab, setTab] = useState("portfolio");

    const tabs = [
        { id: "portfolio", label: "Portfolio", icon: "ti-briefcase" },
        { id: "market",    label: "Market",    icon: "ti-chart-candle" },
        { id: "watchlist", label: "Watchlist", icon: "ti-eye" },
    ];

    return (
        <div className="inv-page">
            <div className="inv-header">
                <h1>Investments</h1>
                <p>Track your portfolio, explore markets, and manage your watchlist</p>
            </div>

            <div className="inv-tabs">
                {tabs.map(t => (
                    <button
                        key={t.id}
                        className={`inv-tab ${tab === t.id ? "active" : ""}`}
                        onClick={() => setTab(t.id)}
                    >
                        <i className={`ti ${t.icon}`} /> {t.label}
                    </button>
                ))}
            </div>

            {tab === "portfolio" && <PortfolioTab onBrowse={() => setTab("market")} />}
            {tab === "market"    && <MarketTab    onTabChange={setTab} />}
            {tab === "watchlist" && <WatchlistTab onBrowse={() => setTab("market")} />}
        </div>
    );
}

function PortfolioTab({ onBrowse }) {
    const { call } = useApi();
    const [data,  setData]  = useState(null);
    const [trade, setTrade] = useState(null);
    const [chart, setChart] = useState(null); // holding to show chart for
    const [error, setError] = useState(null);

    const load = useCallback(() => {
        call(`${API}/portfolio`)
            .then(d => d?.holdings ? setData(d) : setError("Could not load portfolio."))
            .catch(() => setError("Could not load portfolio."));
    }, []);

    useEffect(() => { load(); }, [load]);

    if (error) return <Notice msg={error} />;
    if (!data)  return <Loading />;

    const pos = data.total_gain_loss >= 0;

    return (
        <div className="portfolio-tab">
            <div className="port-summary">
                <SummaryCard label="Total value"    value={fmt(data.total_value)} />
                <SummaryCard label="Total invested" value={fmt(data.total_invested)} />
                <SummaryCard
                    label="Gain / loss"
                    value={`${pos ? "+" : ""}${fmt(data.total_gain_loss)}`}
                    sub={`${pos ? "+" : ""}${data.total_gain_loss_pct}%`}
                    pos={pos} neg={!pos}
                />
            </div>

            {data.holdings.length === 0 ? (
                <Empty icon="ti-briefcase" msg="No holdings yet">
                    <button className="inv-btn primary" onClick={onBrowse}>Browse market</button>
                </Empty>
            ) : (
                <div className="holdings-list">
                    {data.holdings.map(h => (
                        <HoldingRow
                            key={h.id} h={h}
                            onSell={() => setTrade(h)}
                            onChart={() => setChart(h)}
                        />
                    ))}
                </div>
            )}

            {trade && (
                <TradeModal
                    stock={{ ...trade, id: trade.investment_id }}
                    mode="sell" holdingId={trade.id} maxQty={trade.quantity}
                    onClose={() => setTrade(null)}
                    onDone={() => { setTrade(null); load(); }}
                />
            )}

            {chart && (
                <ChartModal
                    investment={{ id: chart.investment_id, symbol: chart.symbol, name: chart.name }}
                    onClose={() => setChart(null)}
                />
            )}
        </div>
    );
}

function HoldingRow({ h, onSell, onChart }) {
    const pos = h.gain_loss_pct >= 0;
    return (
        <div className="holding-row">
            <div className="holding-symbol">
                <span className="symbol-tag">{h.symbol}</span>
                <span className="inv-muted holding-name">{h.name}</span>
            </div>
            <div className="holding-stats">
                <Stat label="Qty"        value={h.quantity} />
                <Stat label="Avg cost"   value={fmt(h.avg_buy_price)} />
                <Stat label="Price"      value={fmt(h.current_price)} sub={changePill(h.change_pct)} />
                <Stat label="Value"      value={fmt(h.current_value)} />
                <Stat label="Gain / loss"
                    value={`${pos ? "+" : ""}${fmt(h.gain_loss)}`}
                    sub={`${pos ? "+" : ""}${h.gain_loss_pct}%`}
                    pos={pos} neg={!pos}
                />
            </div>
            <div className="holding-actions">
                <button className="inv-btn sm" onClick={onChart} title="Price chart">
                    <i className="ti ti-chart-line" />
                </button>
                <button className="inv-btn sm danger" onClick={onSell}>
                    <i className="ti ti-trending-down" /> Sell
                </button>
            </div>
        </div>
    );
}

function MarketTab({ onTabChange }) {
    const { call } = useApi();
    const [results,  setResults]  = useState([]);
    const [query,    setQuery]    = useState("");
    const [busy,     setBusy]     = useState(false);
    const [selected, setSelected] = useState(null);
    const [chart,    setChart]    = useState(null);
    const [watchlistIds, setWatchlistIds] = useState(new Set());
    const intervalRef = useRef(null);

    // Load watchlist so we can show ★ on already-watched items
    const loadWatchlist = useCallback(async () => {
        const res = await call(`${API}/watchlist`);
        if (res?.watchlist) {
            setWatchlistIds(new Set(res.watchlist.map(w => w.investment_id)));
        }
    }, []);

    const fetchLive = useCallback(async () => {
        const res = await call(`${API}/market/live`);
        if (Array.isArray(res) && !query) setResults(res);
    }, [query]);

    async function search(q) {
        if (!q) { fetchLive(); return; }
        setBusy(true);
        const res = await call(`${API}/investments/search?q=${encodeURIComponent(q)}`);
        if (res?.results) setResults(res.results);
        setBusy(false);
    }

    useEffect(() => {
        fetchLive();
        loadWatchlist();
        intervalRef.current = setInterval(fetchLive, 15000);
        return () => clearInterval(intervalRef.current);
    }, []);

    useEffect(() => {
        const t = setTimeout(() => search(query), 400);
        return () => clearTimeout(t);
    }, [query]);

    async function toggleWatchlist(inv) {
        if (watchlistIds.has(inv.id)) return;
        const res = await call(`${API}/watchlist`, {
            method: "POST",
            body: JSON.stringify({ investment_id: inv.id }),
        });
        if (res) {
            setWatchlistIds(prev => new Set([...prev, inv.id]));
            onTabChange?.("watchlist");
        }
    }

    return (
        <div className="market-tab">
            <div className="market-search-row">
                <div className="search-wrap">
                    <i className="ti ti-search search-icon" />
                    <input
                        className="market-search"
                        placeholder="Search stocks by name or symbol…"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                    />
                    {busy && <i className="ti ti-loader-2 spin search-spinner" />}
                </div>
                <span className="inv-muted live-badge">
                    <i className="ti ti-circle-filled live-dot" /> Live
                </span>
            </div>

            {results.length === 0 ? (
                <Empty icon="ti-chart-candle" msg={query ? "No results found" : "Loading market data…"} />
            ) : (
                <div className="market-list">
                    <div className="market-header-row">
                        <span>Symbol / Name</span>
                        <span>Price</span>
                        <span>Change</span>
                        <span></span>
                    </div>
                    {results.map(r => (
                        <MarketRow
                            key={r.id ?? r.symbol}
                            r={r}
                            watched={watchlistIds.has(r.id)}
                            onTrade={() => setSelected(r)}
                            onChart={() => setChart(r)}
                            onWatch={() => toggleWatchlist(r)}
                        />
                    ))}
                </div>
            )}

            {selected && (
                <TradeModal
                    stock={selected} mode="buy"
                    onClose={() => setSelected(null)}
                    onDone={() => setSelected(null)}
                />
            )}
            {chart && (
                <ChartModal investment={chart} onClose={() => setChart(null)} />
            )}
        </div>
    );
}

function MarketRow({ r, watched, onTrade, onChart, onWatch }) {
    const pos = (r.change ?? 0) >= 0;
    return (
        <div className="market-row">
            <div className="market-symbol-col">
                <span className="symbol-tag sm">{r.symbol}</span>
                <span className="inv-muted">{r.name}</span>
            </div>
            <span className="market-price">{fmt(r.current_price)}</span>
            <span className={`change-pill ${pos ? "pos" : "neg"}`}>
                {pos ? "+" : ""}{(r.change ?? 0).toFixed(2)}%
            </span>
            <div className="market-row-actions">
                <button className="inv-btn sm" title="Price chart" onClick={onChart}>
                    Chart
                    <i className="ti ti-chart-line" />
                </button>
                <button
                    className={`inv-btn sm ${watched ? "watched" : ""}`}
                    title={watched ? "In watchlist" : "Add to watchlist"}
                    onClick={onWatch}
                > Watch
                    <i className={`ti ${watched ? "ti-star-filled" : "ti-star"}`} />
                </button>
                <button className="inv-btn sm primary" onClick={onTrade}>
                    <i className="ti ti-plus" /> Trade
                </button>
            </div>
        </div>
    );
}

function WatchlistTab({ onBrowse }) {
    const { call } = useApi();
    const [items,  setItems]  = useState(null);
    const [error,  setError]  = useState(null);
    const [trade,  setTrade]  = useState(null);
    const [chart,  setChart]  = useState(null);

    const load = useCallback(() => {
        call(`${API}/watchlist`)
            .then(res => res?.watchlist ? setItems(res.watchlist) : setError("Could not load watchlist."))
            .catch(() => setError("Could not load watchlist."));
    }, []);

    useEffect(() => { load(); }, [load]);

    async function remove(id) {
        await call(`${API}/watchlist/${id}`, { method: "DELETE" });
        load();
    }

    if (error)  return <Notice msg={error} />;
    if (!items) return <Loading />;

    return (
        <div className="watchlist-tab">
            {items.length === 0 ? (
                <Empty icon="ti-eye-off" msg="Your watchlist is empty">
                    <button className="inv-btn primary" onClick={onBrowse}>Browse market</button>
                </Empty>
            ) : (
                <div className="market-list">
                    <div className="market-header-row">
                        <span>Symbol / Name</span>
                        <span>Price</span>
                        <span>Change</span>
                        <span></span>
                    </div>
                    {items.map(i => {
                        const pos = (i.change ?? 0) >= 0;
                        return (
                            <div key={i.id} className="market-row">
                                <div className="market-symbol-col">
                                    <span className="symbol-tag sm">{i.symbol}</span>
                                    <span className="inv-muted">{i.name}</span>
                                </div>
                                <span className="market-price">{fmt(i.current_price)}</span>
                                <span className={`change-pill ${pos ? "pos" : "neg"}`}>
                                    {pos ? "+" : ""}{(i.change ?? 0).toFixed(2)}%
                                </span>
                                <div className="wl-actions">
                                    <button className="inv-btn sm" title="Price chart" onClick={() => setChart(i)}>
                                        <i className="ti ti-chart-line" />
                                    </button>
                                    <button className="inv-btn sm primary" onClick={() => setTrade(i)}>
                                        <i className="ti ti-plus" /> Trade
                                    </button>
                                    <button className="inv-btn sm danger" onClick={() => remove(i.id)}>
                                        <i className="ti ti-trash" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {trade && (
                <TradeModal
                    stock={trade} mode="buy"
                    onClose={() => setTrade(null)}
                    onDone={() => { setTrade(null); load(); }}
                />
            )}
            {chart && (
                <ChartModal
                    investment={{ id: chart.investment_id, symbol: chart.symbol, name: chart.name }}
                    onClose={() => setChart(null)}
                />
            )}
        </div>
    );
}


function TradeModal({ stock, mode, holdingId, maxQty, onClose, onDone }) {
    const { call } = useApi();
    const [qty,     setQty]     = useState(1);
    const [loading, setLoading] = useState(false);
    const [err,     setErr]     = useState(null);

    const total = (qty * (stock.current_price ?? 0)).toFixed(2);

    async function execute() {
        if (qty <= 0) { setErr("Quantity must be positive."); return; }
        if (mode === "sell" && qty > maxQty) { setErr(`Max ${maxQty} shares.`); return; }
        setLoading(true);
        setErr(null);
        try {
            if (mode === "buy") {
                // FIX: ensure investment_id is a number, not undefined
                if (!stock.id) { setErr("Invalid stock."); setLoading(false); return; }
                await call(`${API}/holdings/buy`, {
                    method: "POST",
                    body: JSON.stringify({ investment_id: Number(stock.id), quantity: Number(qty) }),
                });
            } else {
                await call(`${API}/holdings/${holdingId}/sell`, {
                    method: "POST",
                    body: JSON.stringify({ quantity: Number(qty) }),
                });
            }
            onDone();
        } catch {
            setErr("Trade failed. Please try again.");
        }
        setLoading(false);
    }

    return (
        <div className="inv-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="inv-modal">
                <div className="modal-top">
                    <div>
                        <span className="symbol-tag">{stock.symbol}</span>
                        <h3 className="modal-stock-name">{stock.name}</h3>
                    </div>
                    <button className="inv-btn sm" onClick={onClose}><i className="ti ti-x" /></button>
                </div>

                <div className="modal-price-row">
                    <span className="modal-price">{fmt(stock.current_price)}</span>
                    {changePill(stock.change ?? stock.change_pct)}
                </div>

                <div className="modal-field">
                    <label>Shares</label>
                    <div className="qty-row">
                        <button className="qty-btn" onClick={() => setQty(q => Math.max(1, q - 1))}>−</button>
                        <input
                            type="number" min={1}
                            max={mode === "sell" ? maxQty : undefined}
                            value={qty}
                            onChange={e => setQty(Math.max(1, Number(e.target.value)))}
                        />
                        <button className="qty-btn" onClick={() => setQty(q => q + 1)}>+</button>
                    </div>
                    {mode === "sell" && maxQty != null && (
                        <span className="inv-muted qty-hint">Available: {maxQty} shares</span>
                    )}
                </div>

                <div className="modal-total-row">
                    <span className="inv-muted">Total</span>
                    <span className="modal-total">{fmt(total)}</span>
                </div>

                {err && <p className="modal-err">{err}</p>}

                <div className="modal-actions">
                    <button className="inv-btn" onClick={onClose}>Cancel</button>
                    <button
                        className={`inv-btn primary ${mode === "sell" ? "sell-btn" : ""}`}
                        onClick={execute} disabled={loading}
                    >
                        {loading ? "Processing…" : mode === "buy" ? "Buy shares" : "Sell shares"}
                    </button>
                </div>
            </div>
        </div>
    );
}

function ChartModal({ investment, onClose }) {
    const { call }   = useApi();
    const [history, setHistory] = useState(null);
    const [range,   setRange]   = useState(30);
    const canvasRef = useRef(null);

    useEffect(() => {
        call(`${API}/investments/${investment.id}/history?limit=${range}`)
            .then(data => Array.isArray(data) ? setHistory(data) : setHistory([]))
            .catch(() => setHistory([]));
    }, [investment.id, range]);

    // Draw SVG sparkline
    useEffect(() => {
        if (!history || history.length < 2) return;
        const canvas = canvasRef.current;
        if (!canvas) return;

        const W = canvas.clientWidth  || 560;
        const H = canvas.clientHeight || 200;

        const prices = history.map(h => h.price);
        const minP   = Math.min(...prices);
        const maxP   = Math.max(...prices);
        const range_ = maxP - minP || 1;

        const pts = prices.map((p, i) => {
            const x = (i / (prices.length - 1)) * (W - 40) + 20;
            const y = H - ((p - minP) / range_) * (H - 40) - 20;
            return `${x},${y}`;
        });

        const positive = prices[prices.length - 1] >= prices[0];
        const color    = positive ? "#16a34a" : "#dc2626";

        const fillPts = [
            `20,${H - 20}`,
            ...pts,
            `${W - 20},${H - 20}`,
        ].join(" ");

        canvas.innerHTML = `
            <svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%">
                <defs>
                    <linearGradient id="fillGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="${color}" stop-opacity="0.25"/>
                        <stop offset="100%" stop-color="${color}" stop-opacity="0.01"/>
                    </linearGradient>
                </defs>
                <polygon points="${fillPts}" fill="url(#fillGrad)"/>
                <polyline points="${pts.join(" ")}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
                <circle cx="${pts[pts.length - 1].split(",")[0]}" cy="${pts[pts.length - 1].split(",")[1]}" r="4" fill="${color}"/>
                <text x="20" y="16" font-size="11" fill="#888">${fmt(minP)}</text>
                <text x="20" y="${H - 4}" font-size="11" fill="#888">${fmt(maxP)}</text>
            </svg>`;
    }, [history]);

    const first = history?.[0]?.price;
    const last  = history?.[history?.length - 1]?.price;
    const delta = first && last ? ((last - first) / first * 100) : null;

    return (
        <div className="inv-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="inv-modal chart-modal">
                <div className="modal-top">
                    <div>
                        <span className="symbol-tag">{investment.symbol}</span>
                        <h3 className="modal-stock-name">{investment.name}</h3>
                    </div>
                    <button className="inv-btn sm" onClick={onClose}><i className="ti ti-x" /></button>
                </div>

                {last != null && (
                    <div className="chart-price-row">
                        <span className="modal-price">{fmt(last)}</span>
                        {delta != null && changePill(delta)}
                        <span className="inv-muted chart-range-label">over {range}d</span>
                    </div>
                )}

                <div className="chart-range-btns">
                    {[7, 30, 90].map(d => (
                        <button
                            key={d}
                            className={`inv-btn sm ${range === d ? "primary" : ""}`}
                            onClick={() => setRange(d)}
                        >
                            {d}d
                        </button>
                    ))}
                </div>

                <div className="chart-area" ref={canvasRef}>
                    {!history && <p className="inv-muted" style={{textAlign:"center",paddingTop:"4rem"}}>Loading…</p>}
                    {history?.length === 0 && (
                        <p className="inv-muted" style={{textAlign:"center",paddingTop:"4rem"}}>
                            No price history yet. Prices are recorded each time the market is refreshed.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

function SummaryCard({ label, value, sub, pos, neg }) {
    return (
        <div className="port-summary-card">
            <span className="summary-label">{label}</span>
            <span className={`summary-val ${pos ? "pos" : neg ? "neg" : ""}`}>{value}</span>
            {sub && <span className={`summary-sub ${pos ? "pos" : neg ? "neg" : ""}`}>{sub}</span>}
        </div>
    );
}

function Stat({ label, value, sub, pos, neg }) {
    return (
        <div className="stat-col">
            <span className="stat-label">{label}</span>
            <span className={`stat-val ${pos ? "pos" : neg ? "neg" : ""}`}>{value}</span>
            {sub && <span className={`stat-sub ${pos ? "pos" : neg ? "neg" : ""}`}>{sub}</span>}
        </div>
    );
}

function Empty({ icon, msg, children }) {
    return (
        <div className="inv-empty">
            <i className={`ti ${icon}`} />
            <p>{msg}</p>
            {children}
        </div>
    );
}

function Notice({ msg }) {
    return <p className="inv-muted" style={{ padding: "1rem 0" }}>{msg}</p>;
}

function Loading() {
    return <p className="inv-muted inv-loading">Loading…</p>;
}

function changePill(pct) {
    if (pct == null) return null;
    const pos = Number(pct) >= 0;
    return (
        <span className={`change-pill ${pos ? "pos" : "neg"}`}>
            {pos ? "+" : ""}{Number(pct).toFixed(2)}%
        </span>
    );
}

function fmt(n) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n ?? 0);
}
