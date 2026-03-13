import { NavLink } from "react-router-dom";
import { NavTop } from "../../Nav/Navs";


export function Home() {
  return (
    <>
      <main className="home">
        <section className="hero">
          <h1>Manage your finances with clarity</h1>
          <p>
            Ledger helps you track accounts, investments, and transactions
            in one powerful dashboard.
          </p>
          <NavLink to="/dashboard/user">Open Dashboard</NavLink> 
        </section>
      </main>
    </>
  );
}