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
            <NavLink to="/pricing">Pricing</NavLink>
            <NavLink to="/about">About</NavLink>
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
    return (
        <div className="dashboard">
            <nav className="sidebar">
                <NavLink to="/dashboard/user/home" className="logo"><strong>Ledger</strong></NavLink>

                <div className="nav-section">
                    <NavLink to="/dashboard/user/home" className={({ isActive }) => isActive ? "primary" : "" }>Overview</NavLink>
                    <NavLink to="/dashboard/user/settings" className={({ isActive }) => isActive ? "primary" : "" }>Settings</NavLink>
                </div>

                <div className="spacer"><hr /></div>

                <div className="nav-section">
                    <NavLink to="/dashboard/user/finances" className={({ isActive }) => isActive ? "primary" : "" }>Finances</NavLink>
                    <NavLink to="/dashboard/user/investments" className={({ isActive }) => isActive ? "primary" : "" }>Investments</NavLink>
                    <NavLink to="/dashboard/user/analytics" className={({ isActive }) => isActive ? "primary" : "" }>Analytics</NavLink>
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

export function AdminNavSide({ children }) {
    const navigate = useNavigate();
    const { logout } = useAuth();

    async function handleLogout() {
        await logout();
        navigate("/");
    }
    return (
        <div className="dashboard">
            <nav className="sidebar">
                <NavLink to="/dashboard/admin/home" className="logo"><strong>Ledger</strong></NavLink>

                <div className="nav-section">
                    <NavLink to="/dashboard/admin/home" className={({ isActive }) => isActive ? "primary" : "" }>Overview</NavLink>
                </div>

                <div className="spacer"><hr /></div>

                <div className="nav-section">
                    <NavLink to="/dashboard/admin/management" className={({ isActive }) => isActive ? "primary" : "" }>Management</NavLink>
                    <NavLink to="/dashboard/admin/analytics" className={({ isActive }) => isActive ? "primary" : "" }>Analytics</NavLink>
                    <NavLink to="/dashboard/admin/auditlogs" className={({ isActive }) => isActive ? "primary" : "" }>Audit Logs</NavLink>
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