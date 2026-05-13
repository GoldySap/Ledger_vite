import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthPage } from "./components/Auth/Login";
import { Home } from "./components/Pages/HomePages/Home";
import { HomeLayout } from "./components/Layout/HomeLayout";
import Dashboard from "./components/Pages/DashboardPages/Dashboard";
import { Settings, Finances, Investments, Analytics } from "./components/Pages/DashboardPages/DashboardSubpages";
import { Management, AdminAnalytics, Logs } from "./components/Pages/Admin/AdminDashboardSubPages";
import { DashboardLayout, AdminDashboardLayout } from "./components/Layout/DashboardLayout";
import { AuthProvider } from "./components/Auth/AuthContext";
import { ProtectedRoute  } from "./components/Auth/ProtectedRoute";
import { VerificationProvider } from "./components/Auth/VerificationContext";
import FaqPage from "./components/Pages/HomePages/faq";
import "./components/Nav/Nav.css";
import "./App.css";

function App() {
  return (
    <AuthProvider>
      <VerificationProvider>
        <BrowserRouter>
          <Routes>
            {/* PUBLIC */}
            <Route path="/" element={<HomeLayout />}>
              <Route index element={<Home />} />
              <Route path="features" element={<h1>Features</h1>} />
              <Route path="pricing" element={<h1>Pricing</h1>} />
              <Route path="support" element={<FaqPage />} />
              <Route path="login" element={<AuthPage />} />
              <Route path="*" element={<h1>404 Not Found</h1>} />
            </Route>
            
            {/* AUTH ROUTES */}
            <Route path="/2fa" element={<h1>Two Factor</h1>} />

            {/* DASHBOARD USER */}
            <Route path="/dashboard/user/*" element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }>
              <Route index element={<Navigate to="home" />} />
              <Route path="home" element={<Dashboard />} />
              <Route path="settings" element={<Settings />} />
              <Route path="finances" element={<Finances />} />
              <Route path="investments/*" element={<Investments />} />
              <Route path="analytics" element={<Analytics />} />
            </Route>

            {/* DASHBOARD ADMIN */}
            <Route path="/dashboard/admin/*" element={
                <ProtectedRoute>
                  <AdminDashboardLayout />
                </ProtectedRoute>
              }>
              <Route index element={<Navigate to="home" />} />
              <Route path="home" element={<Dashboard />} />
              <Route path="management" element={<Management />} />
              <Route path="analytics" element={<AdminAnalytics />} />
              <Route path="auditlogs" element={<Logs />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </VerificationProvider>
    </AuthProvider>
  );
}

export default App;