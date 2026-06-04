import { useState, useEffect, createContext, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { useApi } from "../API/useApi";
import { useAuth } from "../Auth/AuthContext";
import "./SubscriptionGate.css"

const AccessContext = createContext(null);

export function useAccess() {
    return useContext(AccessContext);
}

// AccessProvider can be wrapped with DashboardLayout so every page can call useAccess() without re-fetching.

export function AccessProvider({ children }) {
    const { call } = useApi();
    const { user } = useAuth();
    const [access, setAccess] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) { setLoading(false); return; }
        call("/api/subscription/user")
            .then(sub => {
                return call("/api/subscription/subs");
            })
            .then(subs => {
                if (!Array.isArray(subs)) { setLoading(false); return; }
                call("/api/subscription/user").then(userSub => {
                    const match = subs.find(s =>
                        s.label?.toLowerCase() === userSub?.label?.toLowerCase()
                    );
                    setAccess(match?.access ?? {});
                    setLoading(false);
                });
            })
            .catch(() => { setAccess({}); setLoading(false); });
    }, [user]);

    return (
        <AccessContext.Provider value={{ access, loading }}>
            {children}
        </AccessContext.Provider>
    );
}

export function SubscriptionGate({ feature, children, fallback }) {
    const ctx = useContext(AccessContext);

    const { call } = useApi();
    const [access, setAccess] = useState(ctx?.access ?? null);
    const [loading, setLoading]  = useState(ctx ? ctx.loading : true);

    useEffect(() => {
        if (ctx !== null) {
            setAccess(ctx.access);
            setLoading(ctx.loading);
            return;
        }
        call("/api/subscription/subs").then(subs => {
            call("/api/subscription/user").then(userSub => {
                if (!Array.isArray(subs)) { setLoading(false); return; }
                const match = subs.find(s =>
                    s.label?.toLowerCase() === userSub?.label?.toLowerCase()
                );
                setAccess(match?.access ?? {});
                setLoading(false);
            });
        }).catch(() => { setAccess({}); setLoading(false); });
    }, [ctx]);

    if (loading) return <GateLoading />;

    const hasAccess = access?.[feature] === true;

    if (hasAccess) return children;

    return fallback ?? <UpgradeWall feature={feature} />;
}

const FEATURE_LABELS = {
    has_finance_access: { label: "Finance", icon: "ti-wallet", desc: "Access wallet management, deposits, withdrawals, and transfers." },
    has_investment_access: { label: "Investments", icon: "ti-trending-up",desc: "Track your portfolio, explore live markets, and manage your watchlist." },
    has_analytics_access: { label: "Analytics", icon: "ti-chart-bar", desc: "View spending breakdowns, balance trends, and portfolio performance." },
    can_export_data: { label: "Data export", icon: "ti-download", desc: "Export all your financial data as JSON or CSV." },
};

function UpgradeWall({ feature }) {
    const navigate = useNavigate();
    const meta = FEATURE_LABELS[feature] ?? { label: feature, icon: "ti-lock", desc: "This feature requires an upgraded plan." };

    return (
        <div className="gate-wall">
            <div className="gate-card">
                <div className="gate-icon-wrap">
                    <i className={`ti ${meta.icon} gate-feature-icon`} />
                    <div className="gate-lock-badge">
                        <i className="ti ti-lock" />
                    </div>
                </div>

                <h2 className="gate-title">{meta.label} is locked</h2>
                <p className="gate-desc">{meta.desc}</p>

                <div className="gate-plans">
                    <div className="gate-plan">
                        <span className="gate-plan-name">Free</span>
                        <span className="gate-plan-status off">
                            <i className="ti ti-x" /> Not included
                        </span>
                    </div>
                    <div className="gate-plan highlight">
                        <span className="gate-plan-name">Pro</span>
                        <span className="gate-plan-status on">
                            <i className="ti ti-check" /> Included
                        </span>
                    </div>
                </div>

                <button
                    className="gate-upgrade-btn"
                    onClick={() => navigate("/dashboard/user/settings")}
                >
                    <i className="ti ti-crown" /> Upgrade to Pro
                </button>

                <p className="gate-sub">
                    Manage your subscription in{" "}
                    <button
                        className="gate-link"
                        onClick={() => navigate("/dashboard/user/settings")}
                    >
                        Settings → Subscription
                    </button>
                </p>
            </div>
        </div>
    );
}

function GateLoading() {
    return (
        <div className="gate-wall">
            <div className="gate-card">
                <div className="gate-skel gate-skel-icon" />
                <div className="gate-skel gate-skel-title" />
                <div className="gate-skel gate-skel-desc" />
            </div>
        </div>
    );
}
