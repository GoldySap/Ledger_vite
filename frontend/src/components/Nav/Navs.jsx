import { NavLink } from "react-router-dom";

export function NavTop() {
  return (
    <header className="top-nav">
      <NavLink  to="/" className="logo">Ledger</NavLink>
      <nav>
        <NavLink to="/" className={({ isActive }) => isActive ? "primary" : "" }>Home</NavLink>
        <NavLink to="/features" className={({ isActive }) => isActive ? "primary" : "" }>Features</NavLink>
        <NavLink to="/pricing" className={({ isActive }) => isActive ? "primary" : "" }>Pricing</NavLink>
        <NavLink to="/about" className={({ isActive }) => isActive ? "primary" : "" }>About</NavLink>
        <NavLink to="/login" className={({ isActive }) => isActive ? "primary" : "" }>Login</NavLink>
      </nav>
    </header>
  );
}

export function NavSide({ children }) {
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
                <NavLink to="/dashboard/user/accounts" className={({ isActive }) => isActive ? "primary" : "" }>Accounts</NavLink>
                <NavLink to="/dashboard/user/investments" className={({ isActive }) => isActive ? "primary" : "" }>Investments</NavLink>
                <NavLink to="/dashboard/user/transactions" className={({ isActive }) => isActive ? "primary" : "" }>Transactions</NavLink>
                <NavLink to="/dashboard/user/analytics" className={({ isActive }) => isActive ? "primary" : "" }>Analytics</NavLink>
            </div>

            <div className="spacer"><hr /></div>

            <div className="nav-section">
                <NavLink to="/" className={({ isActive }) => isActive ? "primary" : "" }>Back</NavLink>
                <NavLink onClick={()=>{logout()}} to="/" className={({ isActive }) => isActive ? "exits primary" : "exits" }>Logout</NavLink>
            </div>
        </nav>

        <main>
            {children}
        </main>
    </div>
  )
}

export function AdminNavSide({ children }) {
  return (
    <div className="dashboard">
        <nav className="sidebar">
            <NavLink to="/dashboard/admin/home" className="logo"><strong>Ledger</strong></NavLink>

            <div className="nav-section">
                <NavLink to="/dashboard/admin/home" className={({ isActive }) => isActive ? "primary" : "" }>Overview</NavLink>
            </div>

            <div className="spacer"><hr /></div>

            <div className="nav-section">
                <NavLink to="/dashboard/admin/users" className={({ isActive }) => isActive ? "primary" : "" }>Users</NavLink>
                <NavLink to="/dashboard/admin/subscriptions" className={({ isActive }) => isActive ? "primary" : "" }>Subscriptions</NavLink>
                <NavLink to="/dashboard/admin/analytics" className={({ isActive }) => isActive ? "primary" : "" }>Analytics</NavLink>
                <NavLink to="/dashboard/admin/auditlogs" className={({ isActive }) => isActive ? "primary" : "" }>Audit Logs</NavLink>
            </div>

            <div className="spacer"><hr /></div>

            <div className="nav-section">
                <NavLink to="/" className={({ isActive }) => isActive ? "primary" : "" }>Back</NavLink>
                <NavLink onClick={()=>{logout()}} to="/" className={({ isActive }) => isActive ? "exits primary" : "exits" }>Logout</NavLink>
            </div>
        </nav>

        <main>
            {children}
        </main>
    </div>
  )
}