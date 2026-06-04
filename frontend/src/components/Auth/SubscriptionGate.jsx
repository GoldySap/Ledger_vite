import { useState, useEffect, useCallback, createContext, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { useApi } from "../API/useApi";
import { useAuth } from "../Auth/AuthContext";
import "./SubscriptionGate.css";

const AccessContext = createContext(null);

export function useAccess() {
    return useContext(AccessContext);
}

export function AccessProvider({ children }) {
    const { call } = useApi();
    const { user } = useAuth();

    const [access, setAccess] = useState(null);  
    const [allPlans, setAllPlans] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchAccess = useCallback(async () => {
        if (!user) { setLoading(false); return; }
        setLoading(true);
        try {
            const [userSub, subs] = await Promise.all([
                call("/api/subscription/user"),
                call("/api/subscription/subs"),
            ]);

            const plans = Array.isArray(subs) ? subs : [];
            setAllPlans(plans);

            const match = plans.find(
                s => s.label?.toLowerCase() === userSub?.label?.toLowerCase()
            );
            setAccess(match?.access ?? {});
        } catch {
            setAccess({});
            setAllPlans([]);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => { fetchAccess(); }, [fetchAccess]);

    return (
        <AccessContext.Provider value={{ access, allPlans, loading, refresh: fetchAccess }}>
            {children}
        </AccessContext.Provider>
    );
}

export function SubscriptionGate({ feature, children, fallback }) {
    const ctx = useContext(AccessContext);

    const { call } = useApi();
    const [localAccess, setLocalAccess] = useState(null);
    const [localPlans, setLocalPlans] = useState([]);
    const [localLoading, setLocalLoading] = useState(ctx === null);

    useEffect(() => {
        if (ctx !== null) return;
        let cancelled = false;
        (async () => {
            try {
                const [userSub, subs] = await Promise.all([
                    call("/api/subscription/user"),
                    call("/api/subscription/subs"),
                ]);
                if (cancelled) return;
                const plans = Array.isArray(subs) ? subs : [];
                setLocalPlans(plans);
                const match = plans.find(
                    s => s.label?.toLowerCase() === userSub?.label?.toLowerCase()
                );
                setLocalAccess(match?.access ?? {});
            } catch {
                setLocalAccess({});
            } finally {
                if (!cancelled) setLocalLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    const access  = ctx !== null ? ctx.access   : localAccess;
    const allPlans = ctx !== null ? ctx.allPlans : localPlans;
    const loading = ctx !== null ? ctx.loading  : localLoading;

    if (loading) return <GateLoading />;

    if (access?.[feature] === true) return children;

    return fallback ?? <UpgradeWall feature={feature} allPlans={allPlans} />;
}

const FEATURE_LABELS = {
    has_finance_access: { label: "Finance", icon: "ti-wallet", desc: "Access wallet management, deposits, withdrawals, and transfers." },
    has_investment_access: { label: "Investments",  icon: "ti-stats-up", desc: "Track your portfolio, explore live markets, and manage your watchlist." },
    has_analytics_access: { label: "Analytics", icon: "ti-bar-chart", desc: "View spending breakdowns, balance trends, and portfolio performance." },
    can_export_data: { label: "Data export",  icon: "ti-download", desc: "Export all your financial data as JSON or CSV." },
};

const ACCESS_FIELD_LABELS = {
    has_finance_access: "Finance access",
    has_investment_access: "Investment access",
    has_analytics_access: "Analytics",
    can_export_data: "Data export",
};

function UpgradeWall({ feature, allPlans }) {
    const navigate = useNavigate();
    const meta = FEATURE_LABELS[feature] ?? {
        label: feature,
        icon: "ti-lock",
        desc: "This feature requires an upgraded plan.",
    };

    const plans = allPlans.map(plan => ({
        ...plan,
        hasFeature: plan.access?.[feature] === true,
    }));

    const unlockingPlans = plans
        .filter(p => p.hasFeature)
        .sort((a, b) => (a.price ?? 0) - (b.price ?? 0));

    const upgradePlan = unlockingPlans[0] ?? null;

    const fmtPrice = (price) =>
        price === 0 ? "Free" : `$${price}/mo`;

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

                {plans.length > 0 && (
                    <div className="gate-plans">
                        {plans.map(plan => (
                            <div
                                key={plan.id ?? plan.label}
                                className={`gate-plan${plan.hasFeature ? " highlight" : ""}`}
                            >
                                <div className="gate-plan-info">
                                    <span className="gate-plan-name">{plan.label}</span>
                                    <span className="gate-plan-price">{fmtPrice(plan.price)}</span>
                                </div>
                                {plan.hasFeature ? (
                                    <span className="gate-plan-status on">
                                        <i className="ti ti-check" /> Included
                                    </span>
                                ) : (
                                    <span className="gate-plan-status off">
                                        <i className="ti ti-x" /> Not included
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {upgradePlan ? (
                    <>
                        <button
                            className="gate-upgrade-btn"
                            onClick={() => navigate("/dashboard/user/settings")}
                        >
                            <i className="ti ti-crown" /> Upgrade to {upgradePlan.label}
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
                    </>
                ) : (
                    <p className="gate-sub">
                        {plans.length > 0
                            ? "This feature is not available on any current plan. Contact support for more information."
                            : "Contact support to unlock this feature."}
                    </p>
                )}
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
                <div className="gate-skel gate-skel-plan" />
                <div className="gate-skel gate-skel-plan" />
            </div>
        </div>
    );
}
