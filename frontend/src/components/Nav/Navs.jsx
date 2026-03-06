import { NavLink } from "react-router-dom";

export function NavTop() {
  return (
    <header className="top-nav">
      <NavLink  to="/" className="logo">Ledger</NavLink>
      <nav>
        <NavLink to="/" className={({ isActive }) => isActive ? "primary" : "" }>Features</NavLink>
        <NavLink to="/" className={({ isActive }) => isActive ? "primary" : "" }>Pricing</NavLink>
        <NavLink to="/" className={({ isActive }) => isActive ? "primary" : "" }>About</NavLink>
        <NavLink to="/dashboard" className={({ isActive }) => isActive ? "primary" : "" }>Login</NavLink>
      </nav>
    </header>
  );
}

export function NavSide({ children }) {
  return (
    <div className="dashboard">
        <nav className="sidebar">
            <NavLink to="/dashboard" className="logo">Ledger</NavLink>

            <div className="nav-section">
                <NavLink to="/dashboard" className={({ isActive }) => isActive ? "primary" : "" }>Home</NavLink>
                <NavLink to="/dashboard/settings" className={({ isActive }) => isActive ? "primary" : "" }>Settings</NavLink>
            </div>

            <div className="spacer"><hr /></div>

            <div className="nav-section">
                <NavLink to="/dashboard/accounts" className={({ isActive }) => isActive ? "primary" : "" }>Accounts</NavLink>
                <NavLink to="/dashboard/investments" className={({ isActive }) => isActive ? "primary" : "" }>Investments</NavLink>
                <NavLink to="/dashboard/transactions" className={({ isActive }) => isActive ? "primary" : "" }>Transactions</NavLink>
                <NavLink to="/dashboard/analytics" className={({ isActive }) => isActive ? "primary" : "" }>Analytics</NavLink>
            </div>

            <div className="spacer"><hr /></div>

            <div className="nav-section exits">
                <NavLink to="/" className={({ isActive }) => isActive ? "primary" : "" }>Exit</NavLink>
                <NavLink to="/" className={({ isActive }) => isActive ? "primary" : "" }>Logout</NavLink>
            </div>
        </nav>

        <main>
            {children}
        </main>
    </div>
  )
}