export function NavTop() {
    return (
        <>
            <header>
                <p>Ledger</p>
                <nav className="head-nav">
                    <div>
                        <button>1</button>
                        <button>2</button>
                        <button>3</button>
                    </div>
                </nav>
            </header>
        </>
    )
}

export function NavSide({ children }) {
  return (
    <div className="dashboard">
      <nav className="sidebar">
        <div className="logo">Ledger</div>

        <div className="nav-section">
          <button>Home</button>
        </div>

        <div className="spacer"></div>

        <div className="nav-section">
          <button>Accounts</button>
          <button>Investments</button>
          <button>Transactions</button>
          <button>Analytics</button>
          <button>Settings</button>
        </div>

        <div className="spacer"></div>

        <div className="nav-section">
          <button>Logout</button>
        </div>
      </nav>

      <main className="main">
        {children}
      </main>
    </div>
  )
}