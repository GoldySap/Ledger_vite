import { useState, useEffect } from "react";
import { useApi } from "../../API/useApi";
import "./analytics.css";

export default function AnalyticsPage() {
    const { call } = useApi();
    const [data, setData] = useState(null);
    const [range, setRange] = useState("30d");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        setLoading(true);
        call(`/api/analytics?range=${range}`)
            .then(d => { if (d) setData(d); else setError("No data."); })
            .catch(() => setError("Could not load analytics."))
            .finally(() => setLoading(false));
    }, [range]);

    if (loading) return <div className="an-page"><p className="an-muted">Loading…</p></div>;
    if (error) return <div className="an-page"><p className="an-muted">{error}</p></div>;
    if (!data) return null;

    const ranges = [
        { key: "7d",  label: "7 days"  },
        { key: "30d", label: "30 days" },
        { key: "90d", label: "90 days" },
        { key: "1y",  label: "1 year"  },
    ];

    return (
        <div className="an-page">
            <div className="an-header">
                <div>
                    <h1>Analytics</h1>
                    <p className="an-muted">Financial overview across all accounts and investments</p>
                </div>
                <div className="an-ranges">
                    {ranges.map(r => (
                        <button
                            key={r.key}
                            className={`an-range-btn ${range === r.key ? "active" : ""}`}
                            onClick={() => setRange(r.key)}
                        >
                            {r.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="an-kpi-row">
                <KpiCard icon="ti-wallet" label="Total balance" value={fmt(data.totalBalance)}     delta={data.balanceChange} />
                <KpiCard icon="ti-cash" label="Total spent" value={fmt(data.totalSpent)} delta={-data.spentChange} invert />
                <KpiCard icon="ti-trending-up" label="Investment value" value={fmt(data.investmentValue)}  delta={data.investmentChange} />
                <KpiCard icon="ti-chart-line" label="Portfolio return" value={`${data.portfolioReturn.toFixed(2)}%`} delta={data.portfolioReturnChange} pct />
            </div>

            <div className="an-grid-2">
                <Panel title="Spending by category" icon="ti-chart-pie-2">
                    <PieChart data={data.spendingByCategory} />
                </Panel>
                <Panel title="Account balances" icon="ti-building-bank">
                    <HBarChart data={data.accountBalances} />
                </Panel>
            </div>

            <Panel title="Balance trend" icon="ti-chart-area">
                <LineChart data={data.balanceTrend} />
            </Panel>

            <div className="an-grid-2">
                <Panel title="Top holdings" icon="ti-certificate">
                    <HoldingsList holdings={data.topHoldings} />
                </Panel>
                <Panel title="Asset allocation" icon="ti-chart-donut">
                    <DonutChart data={data.assetAllocation} />
                </Panel>
            </div>

            <Panel title="Recent transactions" icon="ti-list">
                <TxTable transactions={data.recentTransactions} />
            </Panel>
        </div>
    );
}

function KpiCard({ icon, label, value, delta, invert, pct }) {
    const positive = invert ? delta <= 0 : delta >= 0;
    const sign = delta >= 0 ? "+" : "";
    const deltaStr = pct
        ? `${sign}${delta?.toFixed(2)}%`
        : `${sign}${fmt(delta ?? 0)}`;

    return (
        <div className="an-kpi">
            <div className="an-kpi-top">
                <span className="an-kpi-label">{label}</span>
                <i className={`ti ${icon} an-kpi-icon`} />
            </div>
            <div className="an-kpi-value">{value}</div>
            {delta != null && (
                <div className={`an-kpi-delta ${positive ? "pos" : "neg"}`}>
                    <i className={`ti ${positive ? "ti-trending-up" : "ti-trending-down"}`} />
                    {deltaStr}
                    <span className="an-kpi-period">vs prev period</span>
                </div>
            )}
        </div>
    );
}

function Panel({ title, icon, children }) {
    return (
        <div className="an-panel">
            <div className="an-panel-title">
                <i className={`ti ${icon}`} />
                {title}
            </div>
            {children}
        </div>
    );
}

const PALETTE = ["#1D9E75","#3b82f6","#f59e0b","#ef4444","#8b5cf6","#ec4899","#14b8a6","#f97316"];

function PieChart({ data }) {
    if (!data?.length) return <Empty />;
    const total = data.reduce((s, d) => s + d.value, 0);
    let angle   = -90;

    return (
        <div className="pie-wrap">
            <svg viewBox="0 0 200 200" className="pie-svg">
                {data.map((item, i) => {
                    const sweep = (item.value / total) * 360;
                    const slice = <PieSlice key={i} start={angle} end={angle + sweep} color={PALETTE[i % PALETTE.length]} />;
                    angle += sweep;
                    return slice;
                })}
            </svg>
            <Legend data={data} />
        </div>
    );
}

function PieSlice({ start, end, color }) {
    const sr = (start * Math.PI) / 180, er = (end * Math.PI) / 180;
    const x1 = 100 + 85 * Math.cos(sr), y1 = 100 + 85 * Math.sin(sr);
    const x2 = 100 + 85 * Math.cos(er), y2 = 100 + 85 * Math.sin(er);
    const la = end - start > 180 ? 1 : 0;
    return <path d={`M100,100 L${x1},${y1} A85,85 0 ${la} 1 ${x2},${y2}Z`} fill={color} stroke="var(--panel)" strokeWidth="2" />;
}

function DonutChart({ data }) {
    if (!data?.length) return <Empty />;
    const total = data.reduce((s, d) => s + d.value, 0);
    let angle = -90;

    return (
        <div className="pie-wrap">
            <svg viewBox="0 0 200 200" className="pie-svg">
                {data.map((item, i) => {
                    const sweep = (item.value / total) * 360;
                    const slice = <DonutSlice key={i} start={angle} end={angle + sweep} color={PALETTE[i % PALETTE.length]} />;
                    angle += sweep;
                    return slice;
                })}
                <circle cx="100" cy="100" r="38" fill="var(--panel)" />
                <text x="100" y="97" textAnchor="middle" fontSize="9" fill="var(--muted)" fontWeight="600" textTransform="uppercase">Total</text>
                <text x="100" y="111" textAnchor="middle" fontSize="11" fill="var(--text, #111)" fontWeight="700">{fmtShort(total)}</text>
            </svg>
            <Legend data={data} pct total={total} />
        </div>
    );
}

function DonutSlice({ start, end, color }) {
    const sr = (start * Math.PI) / 180, er = (end * Math.PI) / 180;
    const R = 70, r = 42;
    const x1 = 100 + R * Math.cos(sr), y1 = 100 + R * Math.sin(sr);
    const x2 = 100 + R * Math.cos(er), y2 = 100 + R * Math.sin(er);
    const x3 = 100 + r * Math.cos(er), y3 = 100 + r * Math.sin(er);
    const x4 = 100 + r * Math.cos(sr), y4 = 100 + r * Math.sin(sr);
    const la = end - start > 180 ? 1 : 0;
    return <path d={`M${x1},${y1} A${R},${R} 0 ${la} 1 ${x2},${y2} L${x3},${y3} A${r},${r} 0 ${la} 0 ${x4},${y4}Z`} fill={color} stroke="var(--panel)" strokeWidth="1.5" />;
}

function Legend({ data, pct, total }) {
    return (
        <div className="an-legend">
            {data.map((item, i) => (
                <div key={i} className="an-legend-row">
                    <span className="an-legend-dot" style={{ background: PALETTE[i % PALETTE.length] }} />
                    <span className="an-legend-label">{item.label}</span>
                    <span className="an-legend-val">
                        {pct ? `${((item.value / total) * 100).toFixed(1)}%` : fmt(item.value)}
                    </span>
                </div>
            ))}
        </div>
    );
}

function HBarChart({ data }) {
    if (!data?.length) return <Empty />;
    const max = Math.max(...data.map(d => d.value));
    return (
        <div className="hbar-wrap">
            {data.map((item, i) => (
                <div key={i} className="hbar-row">
                    <span className="hbar-label">{item.label}</span>
                    <div className="hbar-track">
                        <div
                            className="hbar-fill"
                            style={{ width: `${(item.value / max) * 100}%`, background: PALETTE[i % PALETTE.length] }}
                        />
                    </div>
                    <span className="hbar-val">{fmt(item.value)}</span>
                </div>
            ))}
        </div>
    );
}

function LineChart({ data }) {
    if (!data?.length) return <Empty />;

    const vals = data.map(d => d.value);
    const min  = Math.min(...vals);
    const max  = Math.max(...vals);
    const rng  = max - min || 1;
    const W = 560, H = 140, PAD = 24;

    const pts = vals.map((v, i) => ({
        x: PAD + (i / (vals.length - 1)) * (W - PAD * 2),
        y: H - PAD - ((v - min) / rng) * (H - PAD * 2),
    }));

    const linePath  = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
    const areaPath  = `${linePath} L${pts[pts.length-1].x},${H-PAD} L${pts[0].x},${H-PAD}Z`;
    const positive  = vals[vals.length-1] >= vals[0];
    const lineColor = positive ? "#1D9E75" : "#ef4444";

    const step = Math.max(1, Math.floor(data.length / 6));

    return (
        <div className="line-wrap">
            <svg viewBox={`0 0 ${W} ${H}`} className="line-svg" preserveAspectRatio="none">
                <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor={lineColor} stopOpacity="0.2" />
                        <stop offset="100%" stopColor={lineColor} stopOpacity="0.01" />
                    </linearGradient>
                </defs>
                <path d={areaPath} fill="url(#areaGrad)" />
                <path d={linePath} fill="none" stroke={lineColor} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                {pts.map((p, i) => i % step === 0 && (
                    <g key={i}>
                        <circle cx={p.x} cy={p.y} r="3" fill={lineColor} />
                        <text x={p.x} y={H - 4} textAnchor="middle" fontSize="9" fill="var(--muted)">
                            {data[i].date}
                        </text>
                    </g>
                ))}
                <text x={PAD} y="14" fontSize="10" fill="var(--muted)">{fmt(max)}</text>
                <text x={PAD} y={H - PAD - 4} fontSize="10" fill="var(--muted)">{fmt(min)}</text>
            </svg>
        </div>
    );
}

function HoldingsList({ holdings }) {
    if (!holdings?.length) return <Empty msg="No holdings" />;
    return (
        <div className="holdings-wrap">
            {holdings.map((h, i) => {
                const pos = h.return >= 0;
                return (
                    <div key={h.id} className="holding-row">
                        <span className="holding-rank">{i + 1}</span>
                        <div className="holding-info">
                            <span className="holding-symbol">{h.symbol}</span>
                            <span className="an-muted">{h.quantity} shares</span>
                        </div>
                        <div className="holding-right">
                            <span className="holding-value">{fmt(h.currentValue)}</span>
                            <span className={`holding-ret ${pos ? "pos" : "neg"}`}>
                                {pos ? "+" : ""}{h.return.toFixed(2)}%
                            </span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function TxTable({ transactions }) {
    if (!transactions?.length) return <Empty msg="No transactions" />;
    return (
        <div className="tx-table">
            <div className="tx-header">
                <span>Account</span>
                <span>Category</span>
                <span>Date</span>
                <span className="tx-right">Amount</span>
            </div>
            {transactions.map(tx => (
                <div key={tx.id} className="tx-row">
                    <span className="tx-desc">{tx.description}</span>
                    <span className="tx-cat">{tx.category}</span>
                    <span className="an-muted">{fmtDate(tx.createdAt)}</span>
                    <span className={`tx-amount tx-right ${tx.amount >= 0 ? "pos" : "neg"}`}>
                        {tx.amount >= 0 ? "+" : ""}{fmt(tx.amount)}
                    </span>
                </div>
            ))}
        </div>
    );
}

function Empty({ msg = "No data" }) {
    return <p className="an-muted an-empty">{msg}</p>;
}

function fmt(n) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n ?? 0);
}

function fmtShort(n) {
    if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
    return fmt(n);
}

function fmtDate(d) {
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(d));
}