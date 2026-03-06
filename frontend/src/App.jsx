import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Home } from "./components/Pages/Home";
import { Dashboard } from "./components/Pages/DashboardPages/Dashboard";
import { DashboardLayout } from "./components/Layout/DashboardLayout";
import "./components/Nav/Nav.css";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* PUBLIC */}
        <Route path="/" element={<Home />} />

        {/* AUTH ROUTES */}
        <Route path="/login" element={<h1>Login Page</h1>} />
        <Route path="/2fa" element={<h1>Two Factor</h1>} />

        {/* DASHBOARD */}
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="accounts" element={<h1>Accounts</h1>} />
          <Route path="investments" element={<h1>Investments</h1>} />
          <Route path="transactions" element={<h1>Transactions</h1>} />
          <Route path="analytics" element={<h1>Analytics</h1>} />
          <Route path="settings" element={<h1>Settings</h1>} />

        </Route>

      </Routes>
    </BrowserRouter>
  );
}

export default App;