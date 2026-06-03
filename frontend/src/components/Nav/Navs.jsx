import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../Auth/AuthContext";

export function NavTop() {
    const { user, loading } = useAuth();
    return (
        <header className="top-nav">
        <NavLink to="/" className="logo">Ledger</NavLink>
        <nav>
            <NavLink to="/">Home</NavLink>
            <NavLink to="/features">Features</NavLink>
            <NavLink to="/plans">Plans</NavLink>
            <NavLink to="/support">Support</NavLink>
            {!loading && (
            user ? (
                <NavLink to={!user ? "/dashboard/user" : "/dashboard/" + user.role}>Dashboard</NavLink>
            ) : (
                <NavLink to="/login">Login</NavLink>
            )
            )}
        </nav>
        </header>
    );
}
export function NavSide({ children }) {
    const navigate = useNavigate();
    const { logout } = useAuth();

    async function handleLogout() {
        await logout();
        navigate("/");
    }

    const nav = [
        { to: "/dashboard/user/finances", icon: "ti-credit-card", label: "Finances" },
        { to: "/dashboard/user/investments", icon: "ti-stats-up", label: "Investments" },
        { to: "/dashboard/user/analytics", icon: "ti-bar-chart", label: "Analytics" },
    ];

    return (
        <div className="dashboard">
            <nav className="sidebar">
                <NavLink to="/dashboard/user/home" className="logo"><strong>Ledger</strong></NavLink>

                <div className="nav-section">
                    <NavLink to="/dashboard/user/home" className={({ isActive }) => isActive ? "primary" : "" }><i className={`ti ti-home`} /> Overview</NavLink>
                    <NavLink to="/dashboard/user/settings" className={({ isActive }) => isActive ? "primary" : "" }><i className={`ti ti-settings`} /> Settings</NavLink>
                </div>

                <div className="spacer"><hr /></div>

                <div className="nav-section">
                    {nav.map(n => (
                        <NavLink key={n.to} to={n.to} className={({ isActive }) => isActive ? "primary" : ""}>
                            <i className={`ti ${n.icon}`} /> {n.label}
                        </NavLink>
                    ))}
                </div>

                <div className="spacer"><hr /></div>

                <div className="nav-section">
                    <NavLink to="/" className={({ isActive }) => isActive ? "primary" : "" }><i className={`ti ti-back-left`} /> Back</NavLink>
                    <NavLink onClick={()=>{handleLogout()}} to="/" className={({ isActive }) => isActive ? "exits primary" : "exits" }><i className={`ti ti-power-off`} /> Logout</NavLink>
                </div>
            </nav>

            <main>
                {children}
            </main>
        </div>
    )
}

export function AdminNavSide({ children }) {
    const navigate = useNavigate();
    const { logout } = useAuth();

    async function handleLogout() {
        await logout();
        navigate("/");
    }

    const nav = [
        { to: "/dashboard/admin/management", icon: "ti-user", label: "Management" },
        { to: "/dashboard/admin/analytics", icon: "ti-bar-chart", label: "Analytics" },
        { to: "/dashboard/admin/auditlogs", icon: "ti-search", label: "Audit Logs" },
        { to: "/dashboard/admin/faq", icon: "ti-help-alt", label: "FAQ" },
    ];

    return (
        <div className="dashboard">
            <nav className="sidebar">
                <NavLink to="/dashboard/admin/home" className="logo"><strong>Ledger</strong></NavLink>

                <div className="nav-section">
                    <NavLink to="/dashboard/admin/home" className={({ isActive }) => isActive ? "primary" : "" }>Overview</NavLink>
                </div>

                <div className="spacer"><hr /></div>

                <div className="nav-section">
                    {nav.map(n => (
                        <NavLink key={n.to} to={n.to} className={({ isActive }) => isActive ? "primary" : ""}>
                            <i className={`ti ${n.icon}`} /> {n.label}
                        </NavLink>
                    ))}
                </div>

                <div className="spacer"><hr /></div>

                <div className="nav-section">
                    <NavLink to="/" className={({ isActive }) => isActive ? "primary" : "" }>Back</NavLink>
                    <NavLink onClick={()=>{handleLogout()}} to="/" className={({ isActive }) => isActive ? "exits primary" : "exits" }>Logout</NavLink>
                </div>
            </nav>

            <main>
                {children}
            </main>
        </div>
    )
}